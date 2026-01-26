import { useState, useEffect, useCallback } from 'react';
import { parseGistUrl, getApiBase, encodeCommentMeta, decodeCommentMeta } from '../utils/github';

export function useGistCommenter() {
  const [currentGist, setCurrentGist] = useState(null);
  const [comments, setComments] = useState([]);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('github-token') || null);
  const [githubDomain, setGithubDomain] = useState(() => localStorage.getItem('github-domain') || 'github.com');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('github-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getGistApiBase = useCallback(() => {
    const domain = currentGist?.domain || githubDomain || 'github.com';
    return getApiBase(domain);
  }, [currentGist, githubDomain]);

  const loadGist = useCallback(async (url) => {
    const parsed = parseGistUrl(url);
    if (!parsed) {
      throw new Error('Invalid gist URL format');
    }

    setLoading(true);
    setError(null);

    try {
      const apiBase = getApiBase(parsed.domain);
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (githubToken && githubDomain === parsed.domain) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

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
  }, [githubToken, githubDomain]);

  const loadComments = useCallback(async () => {
    if (!currentGist || currentGist.id === 'demo') {
      setComments([]);
      return;
    }

    try {
      const apiBase = getGistApiBase();
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (githubToken) {
        headers['Authorization'] = `Bearer ${githubToken}`;
      }

      const response = await fetch(`${apiBase}/gists/${currentGist.id}/comments`, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const githubComments = await response.json();

      const parsedComments = githubComments.map(gc => {
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
            reactions: decoded.meta.reactions || {}
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
            reactions: {}
          };
        }
      });

      setComments(parsedComments);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    }
  }, [currentGist, githubToken, getGistApiBase]);

  const createComment = useCallback(async (selectedRange, selectedText, commentText) => {
    if (!githubToken || !currentGist || currentGist.id === 'demo') {
      throw new Error('Cannot create comment');
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
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ body })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to create comment');
    }

    await loadComments();
  }, [githubToken, currentGist, getGistApiBase, loadComments]);

  const resolveComment = useCallback(async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !comment.githubCommentId || !githubToken) {
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
          'Authorization': `Bearer ${githubToken}`,
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
  }, [comments, githubToken, currentGist, getGistApiBase, loadComments]);

  const addReply = useCallback(async (commentId, replyText) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !comment.githubCommentId || !githubToken) {
      return;
    }

    const newReply = {
      text: replyText,
      author: currentUser?.login || 'Unknown',
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
          'Authorization': `Bearer ${githubToken}`,
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
  }, [comments, githubToken, currentUser, currentGist, getGistApiBase, loadComments]);

  const deleteComment = useCallback(async (commentId) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !comment.githubCommentId || !githubToken) {
      return;
    }

    const response = await fetch(
      `${getGistApiBase()}/gists/${currentGist.id}/comments/${comment.githubCommentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete comment');
    }

    await loadComments();
  }, [comments, githubToken, currentGist, getGistApiBase, loadComments]);

  const toggleReaction = useCallback(async (commentId, emoji) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !comment.githubCommentId || !githubToken || !currentUser) {
      return;
    }

    // Get current reactions or initialize empty object
    const currentReactions = comment.reactions || {};
    const currentUsers = currentReactions[emoji] || [];
    const userLogin = currentUser.login;

    // Toggle user in the reaction list
    let updatedUsers;
    if (currentUsers.includes(userLogin)) {
      updatedUsers = currentUsers.filter(u => u !== userLogin);
    } else {
      updatedUsers = [...currentUsers, userLogin];
    }

    // Build updated reactions object
    const updatedReactions = { ...currentReactions };
    if (updatedUsers.length > 0) {
      updatedReactions[emoji] = updatedUsers;
    } else {
      delete updatedReactions[emoji];
    }

    // Update local state immediately for responsive UI
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        return { ...c, reactions: updatedReactions };
      }
      return c;
    }));

    // Update on GitHub (store reactions in comment metadata)
    const meta = {
      filename: comment.filename,
      lineStart: comment.lineStart,
      lineEnd: comment.lineEnd,
      highlightedText: comment.highlightedText,
      resolved: comment.resolved,
      replies: comment.replies,
      reactions: updatedReactions
    };

    const body = encodeCommentMeta(meta) + comment.text;

    try {
      const response = await fetch(
        `${getGistApiBase()}/gists/${currentGist.id}/comments/${comment.githubCommentId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ body })
        }
      );

      if (!response.ok) {
        // Revert on failure
        await loadComments();
        throw new Error('Failed to update reaction');
      }
    } catch (error) {
      // Revert on failure
      await loadComments();
      throw error;
    }
  }, [comments, githubToken, currentUser, currentGist, getGistApiBase, loadComments]);

  const authenticate = useCallback(async (token, domain) => {
    const apiBase = getApiBase(domain);

    let response = await fetch(`${apiBase}/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok && response.status === 401) {
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

    const user = await response.json();
    setCurrentUser(user);
    setGithubToken(token);
    setGithubDomain(domain);
    localStorage.setItem('github-token', token);
    localStorage.setItem('github-domain', domain);
    localStorage.setItem('github-user', JSON.stringify(user));

    return user;
  }, []);

  const signOut = useCallback(() => {
    setGithubToken(null);
    setCurrentUser(null);
    setGithubDomain('github.com');
    localStorage.removeItem('github-token');
    localStorage.removeItem('github-domain');
    localStorage.removeItem('github-user');
  }, []);

  useEffect(() => {
    if (currentGist) {
      loadComments();
    }
  }, [currentGist, loadComments]);

  return {
    currentGist,
    comments,
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
