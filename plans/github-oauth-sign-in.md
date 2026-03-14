# Plan: Add "Sign in with GitHub" OAuth to Gist Commenter

## Overview

Replace the manual PAT (Personal Access Token) paste flow with a one-click "Sign in with GitHub" button using GitHub's OAuth web application flow. Users click a button, approve the `gist` scope on GitHub, and are automatically logged in. The existing PAT flow is kept as a fallback.

**No database. No Okta integration code. No session management beyond short-lived cookies for the OAuth handshake.**

If your GitHub Enterprise org enforces SAML SSO via Okta, GitHub handles the Okta redirect transparently -- the app never interacts with Okta directly.

## Prerequisites (One-Time Setup by App Owner)

### 1. Register a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" -> "New OAuth App"
3. Fill in:
   - **Application name**: `Gist Commenter`
   - **Homepage URL**: your deployed URL (e.g., `https://gist-commenter.vercel.app`)
   - **Authorization callback URL**: `https://<your-app-domain>/api/auth/callback`
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy the **Client Secret**

### 2. Add Environment Variables to Vercel

Go to your Vercel project -> Settings -> Environment Variables and add:

| Variable | Value | Example |
|---|---|---|
| `GITHUB_CLIENT_ID` | Client ID from step 1 | `Iv1.abc123def456` |
| `GITHUB_CLIENT_SECRET` | Client secret from step 1 | `deadbeef1234567890abcdef` |
| `APP_URL` | Your deployed URL (no trailing slash) | `https://gist-commenter.vercel.app` |

That's it for setup. Every user authenticates through this single OAuth App -- they just click a button and approve permissions.

---

## Architecture

```
User clicks "Sign in with GitHub"
  -> Browser navigates to /api/auth/login (Vercel serverless function)
  -> Function generates PKCE code_verifier + code_challenge
  -> Stores verifier + state in short-lived httpOnly cookies (10 min)
  -> Redirects to github.com/login/oauth/authorize?client_id=...&scope=gist&code_challenge=...

  -> GitHub shows login page
     (if org has Okta SSO, GitHub auto-redirects to Okta -> user authenticates -> back to GitHub)
  -> User approves "gist" scope
  -> GitHub redirects to /api/auth/callback?code=XXX&state=YYY

  -> Serverless function validates state cookie (CSRF protection)
  -> Exchanges code + client_secret + code_verifier for access_token
  -> Clears cookies
  -> Redirects browser to /?oauth_token=ACCESS_TOKEN

  -> SPA reads token from URL on mount
  -> Calls existing authenticate() function (validates token, fetches user, stores in localStorage)
  -> Clears token from URL
  -> User is logged in -- all API calls work identically to PAT flow
```

**Why a serverless function?** GitHub's token exchange endpoint requires `client_secret`. This cannot be exposed in browser-side code. The two Vercel functions (~100 lines total) are the only server-side component.

**Why PKCE?** GitHub supports and recommends PKCE (Proof Key for Code Exchange) as of July 2025. It prevents authorization code interception attacks. We use the `S256` challenge method.

---

## Files to Create

### 1. `/api/auth/login.js` — Initiates OAuth flow

Vercel serverless function. Generates PKCE challenge, stores verifier in a cookie, redirects to GitHub.

```js
import crypto from 'crypto';

function base64URLEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateCodeVerifier() {
  return base64URLEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  return base64URLEncode(crypto.createHash('sha256').update(verifier).digest());
}

export default function handler(req, res) {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);
  const state = crypto.randomUUID();

  res.setHeader('Set-Cookie', [
    `pkce_verifier=${verifier}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`
  ]);

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
    scope: 'gist',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    allow_signup: 'false'
  });

  res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
}
```

### 2. `/api/auth/callback.js` — Exchanges code for token

Vercel serverless function. Receives the authorization code from GitHub, exchanges it for an access token using the client secret, and redirects the user back to the SPA with the token.

```js
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    cookies[name] = rest.join('=');
  });
  return cookies;
}

export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(302, `/?oauth_error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return res.redirect(302, '/?oauth_error=missing_params');
  }

  const cookies = parseCookies(req.headers.cookie);

  // Validate state to prevent CSRF
  if (state !== cookies.oauth_state) {
    return res.redirect(302, '/?oauth_error=invalid_state');
  }

  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${process.env.APP_URL}/api/auth/callback`,
        code_verifier: cookies.pkce_verifier
      })
    });

    const data = await response.json();

    if (data.error || !data.access_token) {
      return res.redirect(302, `/?oauth_error=${encodeURIComponent(data.error || 'token_exchange_failed')}`);
    }

    // Clear the PKCE/state cookies
    res.setHeader('Set-Cookie', [
      'pkce_verifier=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
      'oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
    ]);

    res.redirect(302, `/?oauth_token=${data.access_token}`);
  } catch (err) {
    return res.redirect(302, '/?oauth_error=server_error');
  }
}
```

---

## Files to Modify

### 3. `vercel.json` — Ensure API routes aren't rewritten

Vercel automatically routes `/api/*` to serverless functions before applying rewrites, so this likely works as-is. If it doesn't, update to:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 4. `src/App.jsx` — Handle OAuth redirect on mount

Add a `useEffect` near the existing URL-parsing effect (around line 83) to extract the OAuth token from the URL after GitHub redirects back:

```js
// Handle OAuth callback - extract token from URL and authenticate
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const oauthToken = params.get('oauth_token');
  const oauthError = params.get('oauth_error');

  if (oauthError) {
    addToast(`GitHub sign-in failed: ${oauthError}`, 'error');
    const url = new URL(window.location);
    url.searchParams.delete('oauth_error');
    window.history.replaceState({}, '', url.pathname + url.search);
    return;
  }

  if (oauthToken) {
    authenticate(oauthToken, 'github.com')
      .then(() => {
        addToast('Signed in with GitHub successfully');
      })
      .catch((err) => {
        addToast(err.message || 'OAuth authentication failed', 'error');
      })
      .finally(() => {
        const url = new URL(window.location);
        url.searchParams.delete('oauth_token');
        window.history.replaceState({}, '', url.pathname + url.search);
      });
  }
}, []);
```

**No changes needed to `useGistCommenter.js`.** The existing `authenticate()` function already validates the token against GitHub's `/user` endpoint, checks for the `gist` scope, and stores it in `localStorage`. OAuth tokens (which start with `gho_`) work identically to PATs.

### 5. `src/components/AuthModal.jsx` — Add OAuth button, make PAT form secondary

Add a state variable for toggling the PAT form:

```js
const [showPatForm, setShowPatForm] = useState(false);
```

In the JSX, after the "Connected accounts" section and before the existing PAT form, add the OAuth sign-in button:

```jsx
{/* OAuth Sign In - primary option for users without an account */}
{!hasAnyAccount && (
  <div style={{ padding: '16px 24px' }}>
    <a
      href="/api/auth/login"
      className="btn-primary"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: '100%',
        padding: '12px',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600
      }}
    >
      <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      Sign in with GitHub
    </a>
    <div style={{ textAlign: 'center', marginTop: '12px' }}>
      <button
        onClick={() => setShowPatForm(!showPatForm)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: '13px',
          padding: '4px'
        }}
      >
        {showPatForm ? 'Hide' : 'Or use a Personal Access Token'}
      </button>
    </div>
  </div>
)}
```

Then wrap the existing PAT form `<div>` (the one starting around line 104 with `<div style={{ padding: hasAnyAccount ? '12px 0 0' : undefined }}>`) so it only renders when appropriate:

```jsx
{(hasAnyAccount || showPatForm) && (
  {/* ... existing PAT form content, unchanged ... */}
)}
```

When the user already has an account connected, the PAT form shows directly (for the "add another account" flow). When they don't have any account, the OAuth button is primary and the PAT form is hidden behind the toggle.

---

## What Does NOT Need to Change

- `src/hooks/useGistCommenter.js` -- the `authenticate()` function already handles OAuth tokens
- `src/utils/github.js` -- no auth logic here, just URL parsing and API helpers
- `src/components/Header.jsx` -- already has the auth button that opens `AuthModal`
- Any other component or hook -- token storage and API call patterns are unchanged

---

## GitHub Enterprise Considerations

The serverless functions above are hardcoded to `github.com` OAuth endpoints. For GitHub Enterprise:

**Option A (Recommended initially):** Keep the existing PAT flow for GHE users. The "Or use a Personal Access Token" toggle already supports enterprise domains.

**Option B (If needed later):** Register a second OAuth App on your GHE instance, add `GHE_CLIENT_ID` and `GHE_CLIENT_SECRET` env vars, and pass a `?domain=github.yourcompany.com` query param to `/api/auth/login` to switch which OAuth endpoints and credentials are used.

---

## Security Notes

- `client_secret` is never exposed to the browser -- it lives in Vercel env vars and is only used server-side
- PKCE (`S256`) protects against authorization code interception
- `state` parameter + cookie validation prevents CSRF attacks
- The `oauth_token` briefly appears in the URL query string during redirect; the SPA immediately reads it and clears it with `history.replaceState`
- Cookies are `HttpOnly`, `Secure`, `SameSite=Lax`, and expire in 10 minutes
- The token stored in `localStorage` is the same security posture as the existing PAT flow

---

## Effort Summary

| Item | Lines of Code |
|---|---|
| `/api/auth/login.js` | ~40 |
| `/api/auth/callback.js` | ~60 |
| `App.jsx` changes | ~20 |
| `AuthModal.jsx` changes | ~40 |
| `vercel.json` (maybe) | ~1 |
| **Total new/changed code** | **~160 lines** |
| Environment variables | 3 values in Vercel dashboard |
| GitHub OAuth App registration | 5 minutes |
