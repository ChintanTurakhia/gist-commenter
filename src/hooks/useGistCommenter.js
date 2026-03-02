import { useState, useEffect, useCallback, useMemo } from 'react';
import { parseGistUrl, getApiBase, encodeCommentMeta, decodeCommentMeta, EMOJI_TO_CONTENT, CONTENT_TO_EMOJI } from '../utils/github';

const ACCOUNTS_KEY = 'github-accounts';

function loadAccounts() {
  try {
    const stored = localStorage.getItem(ACCOUNTS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

  // Migrate from legacy single-token storage
  const token = localStorage.getItem('github-token');
  if (token) {
    const tokenType = localStorage.getItem('github-token-type') || 'Bearer';
    const domain = localStorage.getItem('github-domain') || 'github.com';
    let user = null;
    try { user = JSON.parse(localStorage.getItem('github-user')); } catch {}
    const accounts = {};
    if (user) {
      accounts[domain] = { token, tokenType, user };
    }
    // Persist migrated data and clean up legacy keys
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    localStorage.removeItem('github-token');
    localStorage.removeItem('github-token-type');
    localStorage.removeItem('github-domain');
    localStorage.removeItem('github-user');
    return accounts;
  }

  return {};
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function useGistCommenter() {
  const [currentGist, setCurrentGist] = useState(null);
  const [comments, setComments] = useState([]);
  const [accounts, setAccounts] = useState(loadAccounts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Look up auth credentials for a specific domain
  const getAuthForDomain = useCallback((domain) => {
    return accounts[domain || 'github.com'] || null;
  }, [accounts]);

  // The "active" domain is the current gist's domain
  const activeDomain = currentGist?.domain || 'github.com';

  // Derived values for components that need them
  const currentUser = useMemo(() => {
    const auth = accounts[activeDomain];
    if (auth) return auth.user;
    // Fall back to first available account
    const domains = Object.keys(accounts);
    return domains.length > 0 ? accounts[domains[0]].user : null;
  }, [accounts, activeDomain]);

  // Whether the user has a token for the current gist's domain
  const githubToken = useMemo(() => {
    const auth = accounts[activeDomain];
    return auth?.token || null;
  }, [accounts, activeDomain]);

  // For components that still check domain
  const githubDomain = activeDomain;

  const getGistApiBase = useCallback(() => {
    const domain = currentGist?.domain || 'github.com';
    return getApiBase(domain);
  }, [currentGist]);

  // Build auth headers for a given domain, returns {} if no token available
  const authHeaders = useCallback((domain) => {
    const auth = getAuthForDomain(domain);
    if (!auth) return {};
    return { 'Authorization': `${auth.tokenType} ${auth.token}` };
  }, [getAuthForDomain]);

  const loadGist = useCallback(async (url) => {
    const parsed = parseGistUrl(url);
    if (!parsed) {
      throw new Error('Invalid gist URL format');
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase(parsed.domain);
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        ...authHeaders(parsed.domain)
      };

      const response = await fetch(`${apiBase}/gists/${parsed.gistId}`, { headers });

      if (!response.ok) {
        if (response.status === 401 || response.status === 404) {
          throw new Error('Gist not found or requires authentication');
        }
        throw new Error(`Failed to fetch gist: ${response.status}`);
      }

      const gist = await response.json();
      gist.domain = parsed.domain;
      setCurrentGist(gist);
      return gist;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [accounts, authHeaders]);

  const loadComments = useCallback(async () => {
    if (!currentGist || currentGist.id === 'demo') {
      setComments([]);
      return;
    }

    try {
      const apiBase = getGistApiBase();
      const gistDomain = currentGist.domain || 'github.com';
      const headers = {
        'Accept': 'application/vnd.github+json',
        ...authHeaders(gistDomain)
      };

      const response = await fetch(`${apiBase}/gists/${currentGist.id}/comments`, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Comments require authentication. Please sign in to view and add comments.');
          setComments([]);
          return;
        }
        throw new Error('Failed to fetch comments');
      }

      const githubComments = await response.json();

      // Try to fetch detailed reactions (with per-user info) from the native API.
      // GitHub's gist comment reactions endpoint may block CORS preflight from browsers,
      // so we fall back to summary counts from the comment response if it fails.
      const reactionResults = new Map();
      let detailedReactionsAvailable = false;

      const commentsWithReactions = githubComments.filter(
        gc => gc.reactions && gc.reactions.total_count > 0
      );

      if (commentsWithReactions.length > 0) {
        try {
          const batchSize = 5;
          for (let i = 0; i < commentsWithReactions.length; i += batchSize) {
            const batch = commentsWithReactions.slice(i, i + batchSize);
            const results = await Promise.all(
              batch.map(async (gc) => {
                const res = await fetch(
                  `${apiBase}/gists/${currentGist.id}/comments/${gc.id}/reactions`,
                  { headers }
                );
                if (res.ok) {
                  return { commentId: gc.id, reactions: await res.json() };
                }
                return { commentId: gc.id, reactions: null };
              })
            );
            for (const r of results) {
              if (r.reactions !== null) {
                reactionResults.set(r.commentId, r.reactions);
                detailedReactionsAvailable = true;
              }
            }
          }
        } catch {
          // CORS or network error — fall back to summary counts
          detailedReactionsAvailable = false;
        }
      }

      const parsedComments = githubComments.map(gc => {
        let reactions = {};

        if (detailedReactionsAvailable && reactionResults.has(gc.id)) {
          for (const r of reactionResults.get(gc.id)) {
            const emoji = CONTENT_TO_EMOJI[r.content];
            if (emoji) {
              if (!reactions[emoji]) reactions[emoji] = [];
              reactions[emoji].push({ login: r.user.login, reactionId: r.id });
            }
          }
        } else if (gc.reactions && gc.reactions.total_count > 0) {
          for (const [content, count] of Object.entries(gc.reactions)) {
            if (typeof count === 'number' && count > 0 && CONTENT_TO_EMOJI[content]) {
              const emoji = CONTENT_TO_EMOJI[content];
              reactions[emoji] = Array.from({ length: count }, () => ({ login: '', reactionId: -1 }));
            }
          }
        }

        const decoded = decodeCommentMeta(gc.body);
        if (decoded) {
          return {
            id: gc.id.toString(),
            githubCommentId: gc.id,
            gistId: currentGist.id,
            filename: decoded.meta.filename,
            lineStart: decoded.meta.lineStart,
            lineEnd: decoded.meta.lineEnd || decoded.meta.lineStart,
            highlightedText: decoded.meta.highlightedText,
            text: decoded.text,
            author: gc.user.login,
            authorAvatar: gc.user.avatar_url,
            timestamp: new Date(gc.created_at).getTime(),
            resolved: decoded.meta.resolved || false,
            replies: decoded.meta.replies || [],
            reactions
          };
        } else {
          return {
            id: gc.id.toString(),
            githubCommentId: gc.id,
            gistId: currentGist.id,
            filename: null,
            lineStart: null,
            highlightedText: null,
            text: gc.body,
            author: gc.user.login,
            authorAvatar: gc.user.avatar_url,
            timestamp: new Date(gc.created_at).getTime(),
            resolved: false,
            replies: [],
            reactions
          };
        }
      });

      setComments(parsedComments);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    }
  }, [currentGist, accounts, getGistApiBase, authHeaders]);

  const createComment = useCallback(async (selectedRange, selectedText, commentText) => {
    const gistDomain = currentGist?.domain || 'github.com';
    const auth = getAuthForDomain(gistDomain);
    if (!auth || !currentGist || currentGist.id === 'demo') {
      throw new Error(auth ? 'Cannot create comment' : `Not signed in to ${gistDomain}. Add a token for this domain to comment.`);
    }

    const meta = {
      filename: selectedRange.filename,
      lineStart: selectedRange.lineStart,
      lineEnd: selectedRange.lineEnd,
      highlightedText: selectedText,
      resolved: false,
      replies: []
    };

    const body = encodeCommentMeta(meta) + commentText;

    const response = await fetch(
      `${getGistApiBase()}/gists/${currentGist.id}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `${auth.tokenType} ${auth.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Failed to create comment: gist not found. If the gist exists, your token may be missing the "gist" scope.');
      }
      throw new Error('Failed to create comment');
    }

    await loadComments();
  }, [currentGist, getAuthForDomain, getGistApiBase, loadComments]);

  const resolveComment = useCallback(async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    const gistDomain = currentGist?.domain || 'github.com';
    const auth = getAuthForDomain(gistDomain);
    if (!comment || !comment.githubCommentId || !auth) {
      return;
    }

    const newResolvedState = !comment.resolved;
    const meta = {
      filename: comment.filename,
      lineStart: comment.lineStart,
      lineEnd: comment.lineEnd,
      highlightedText: comment.highlightedText,
      resolved: newResolvedState,
      replies: comment.replies
    };

    const body = encodeCommentMeta(meta) + comment.text;

    const response = await fetch(
      `${getGistApiBase()}/gists/${currentGist.id}/comments/${comment.githubCommentId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `${auth.tokenType} ${auth.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update comment');
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    await loadComments();
    return newResolvedState;
  }, [comments, currentGist, getAuthForDomain, getGistApiBase, loadComments]);

  const addReply = useCallback(async (commentId, replyText) => {
    const comment = comments.find(c => c.id === commentId);
    const gistDomain = currentGist?.domain || 'github.com';
    const auth = getAuthForDomain(gistDomain);
    if (!comment || !comment.githubCommentId || !auth) {
      return;
    }

    const activeUser = auth.user;
    const newReply = {
      text: replyText,
      author: activeUser?.login || 'Unknown',
      timestamp: Date.now()
    };

    const updatedReplies = [...comment.replies, newReply];

    const meta = {
      filename: comment.filename,
      lineStart: comment.lineStart,
      lineEnd: comment.lineEnd,
      highlightedText: comment.highlightedText,
      resolved: comment.resolved,
      replies: updatedReplies
    };

    const body = encodeCommentMeta(meta) + comment.text;

    const response = await fetch(
      `${getGistApiBase()}/gists/${currentGist.id}/comments/${comment.githubCommentId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `${auth.tokenType} ${auth.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to add reply');
    }

    await loadComments();
  }, [comments, currentGist, getAuthForDomain, getGistApiBase, loadComments]);

  const deleteComment = useCallback(async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    const gistDomain = currentGist?.domain || 'github.com';
    const auth = getAuthForDomain(gistDomain);
    if (!comment || !comment.githubCommentId || !auth) {
      return;
    }

    const response = await fetch(
      `${getGistApiBase()}/gists/${currentGist.id}/comments/${comment.githubCommentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `${auth.tokenType} ${auth.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Cannot delete this comment. You can only delete comments you authored.');
      }
      throw new Error('Failed to delete comment');
    }

    await loadComments();
  }, [comments, currentGist, getAuthForDomain, getGistApiBase, loadComments]);

  const toggleReaction = useCallback(async (commentId, emoji) => {
    const comment = comments.find(c => c.id === commentId);
    const gistDomain = currentGist?.domain || 'github.com';
    const auth = getAuthForDomain(gistDomain);
    if (!comment || !comment.githubCommentId || !auth) {
      return;
    }

    const apiBase = getGistApiBase();
    const currentReactions = comment.reactions || {};
    const currentUsers = currentReactions[emoji] || [];
    const userLogin = auth.user.login;
    const content = EMOJI_TO_CONTENT[emoji];
    if (!content) return;

    // Check if user has an existing reaction with a known reactionId
    const existing = currentUsers.find(u => u.login === userLogin && u.reactionId > 0);

    if (existing) {
      // We know the exact reaction ID — DELETE directly
      const updatedReactions = { ...currentReactions };
      const updatedUsers = currentUsers.filter(u => u.login !== userLogin);
      if (updatedUsers.length > 0) {
        updatedReactions[emoji] = updatedUsers;
      } else {
        delete updatedReactions[emoji];
      }

      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, reactions: updatedReactions } : c
      ));

      try {
        const response = await fetch(
          `${apiBase}/gists/${currentGist.id}/comments/${comment.githubCommentId}/reactions/${existing.reactionId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `${auth.tokenType} ${auth.token}`,
              'Accept': 'application/vnd.github+json'
            }
          }
        );

        if (!response.ok) {
          await loadComments();
          throw new Error('Failed to remove reaction');
        }
      } catch (error) {
        await loadComments();
        throw error;
      }
    } else {
      // POST the reaction. GitHub returns:
      //   201 = newly created
      //   200 = already exists (user already reacted with this content)
      // If 200, the user intended to toggle OFF — so DELETE it.
      const placeholderUser = { login: userLogin, reactionId: -1 };
      const updatedReactions = { ...currentReactions };
      updatedReactions[emoji] = [...currentUsers, placeholderUser];

      setComments(prev => prev.map(c =>
        c.id === commentId ? { ...c, reactions: updatedReactions } : c
      ));

      try {
        const response = await fetch(
          `${apiBase}/gists/${currentGist.id}/comments/${comment.githubCommentId}/reactions`,
          {
            method: 'POST',
            headers: {
              'Authorization': `${auth.tokenType} ${auth.token}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
          }
        );

        if (!response.ok) {
          await loadComments();
          throw new Error('Failed to add reaction');
        }

        const reactionData = await response.json();

        if (response.status === 200) {
          // Reaction already existed — user wants to remove it. DELETE it.
          const removeReactions = { ...currentReactions };
          const removeUsers = currentUsers.filter(u => u.login !== userLogin);
          if (removeUsers.length > 0) {
            removeReactions[emoji] = removeUsers;
          } else {
            delete removeReactions[emoji];
          }

          setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, reactions: removeReactions } : c
          ));

          const delResponse = await fetch(
            `${apiBase}/gists/${currentGist.id}/comments/${comment.githubCommentId}/reactions/${reactionData.id}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `${auth.tokenType} ${auth.token}`,
                'Accept': 'application/vnd.github+json'
              }
            }
          );

          if (!delResponse.ok) {
            await loadComments();
            throw new Error('Failed to remove reaction');
          }
        } else {
          // 201 — newly created, update local state with real reaction ID
          setComments(prev => prev.map(c => {
            if (c.id === commentId) {
              const updReactions = { ...c.reactions };
              updReactions[emoji] = (updReactions[emoji] || []).map(u =>
                u.login === userLogin && u.reactionId === -1
                  ? { login: userLogin, reactionId: reactionData.id }
                  : u
              );
              return { ...c, reactions: updReactions };
            }
            return c;
          }));
        }
      } catch (error) {
        await loadComments();
        throw error;
      }
    }
  }, [comments, currentGist, getAuthForDomain, getGistApiBase, loadComments]);

  const authenticate = useCallback(async (token, domain) => {
    const apiBase = getApiBase(domain);
    let tokenType = 'Bearer';

    let response = await fetch(`${apiBase}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok && (response.status === 401 || response.status === 403)) {
      tokenType = 'token';
      response = await fetch(`${apiBase}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
    }

    if (!response.ok) {
      throw new Error('Invalid token');
    }

    // Check for gist scope on classic PATs
    const scopes = response.headers.get('X-OAuth-Scopes');
    if (scopes !== null) {
      const scopeList = scopes.split(',').map(s => s.trim());
      if (!scopeList.includes('gist')) {
        throw new Error('Your token is missing the "gist" scope. Please create a new token with the gist scope enabled.');
      }
    }

    const user = await response.json();
    setAccounts(prev => {
      const next = { ...prev, [domain]: { token, tokenType, user } };
      saveAccounts(next);
      return next;
    });

    return user;
  }, []);

  const signOut = useCallback((domain) => {
    if (domain) {
      // Sign out of a specific domain
      setAccounts(prev => {
        const next = { ...prev };
        delete next[domain];
        saveAccounts(next);
        return next;
      });
    } else {
      // Sign out of all domains
      setAccounts({});
      saveAccounts({});
    }
  }, []);

  useEffect(() => {
    if (currentGist) {
      loadComments();
    }
  }, [currentGist, loadComments]);

  return {
    currentGist,
    comments,
    accounts,
    githubToken,
    githubDomain,
    currentUser,
    loading,
    error,
    loadGist,
    loadComments,
    createComment,
    resolveComment,
    addReply,
    deleteComment,
    toggleReaction,
    authenticate,
    signOut
  };
}
