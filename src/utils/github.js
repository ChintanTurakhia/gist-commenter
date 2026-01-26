// GitHub API utilities

export function parseGistUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    let domain;
    const hostname = urlObj.hostname;
    if (hostname === 'gist.github.com') {
      domain = 'github.com';
    } else if (hostname.startsWith('gist.')) {
      domain = hostname.substring(5);
    } else {
      domain = hostname;
    }

    if (pathParts.length >= 2) {
      return { owner: pathParts[0], gistId: pathParts[1], domain };
    } else if (pathParts.length === 1) {
      return { owner: null, gistId: pathParts[0], domain };
    }
  } catch (e) {
    if (/^[a-f0-9]+$/i.test(url)) {
      return { gistId: url, owner: null, domain: 'github.com' };
    }
  }
  return null;
}

export function getApiBase(domain) {
  if (domain === 'github.com') {
    return 'https://api.github.com';
  }
  return `https://${domain}/api/v3`;
}

// Helper to encode Unicode string to base64
function utoa(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// Helper to decode base64 to Unicode string
function atou(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeCommentMeta(meta) {
  const metaJson = JSON.stringify(meta);
  return `<!-- GIST_COMMENTER:${utoa(metaJson)} -->\n`;
}

export function decodeCommentMeta(body) {
  const match = body.match(/<!-- GIST_COMMENTER:([A-Za-z0-9+/=]+) -->/);
  if (match) {
    try {
      const meta = JSON.parse(atou(match[1]));
      const text = body.replace(/<!-- GIST_COMMENTER:[A-Za-z0-9+/=]+ -->\n?/, '');
      return { meta, text };
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

export function truncate(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
