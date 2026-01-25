import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBase, decodeCommentMeta } from '../utils/github';

export function usePendingCommentsDashboard(githubToken, githubDomain, currentUser) {
  const [dashboardComments, setDashboardComments] = useState([]);
  const [dashboardGists, setDashboardGists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const fetchUserGists = useCallback(async (page = 1, perPage = 100) => {
    if (!githubToken) return [];

    const apiBase = getApiBase(githubDomain);
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${githubToken}`
    };

    try {
      const response = await fetch(
        `${apiBase}/gists?per_page=${perPage}&page=${page}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch gists: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error('Error fetching user gists:', err);
      return [];
    }
  }, [githubToken, githubDomain]);

  const fetchGistComments = useCallback(async (gistId, domain = null) => {
    const apiBase = domain
      ? getApiBase(domain)
      : getApiBase(githubDomain);

    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (githubToken) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    try {
      const response = await fetch(
        `${apiBase}/gists/${gistId}/comments`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Error fetching comments for gist ${gistId}:`, err);
      return [];
    }
  }, [githubToken, githubDomain]);

  const fetchMultipleGistComments = useCallback(async (gists, onProgress) => {
    const results = [];
    const concurrencyLimit = 5;
    let completed = 0;

    for (let i = 0; i < gists.length; i += concurrencyLimit) {
      const batch = gists.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (gist) => {
        const comments = await fetchGistComments(gist.id, gist.domain || githubDomain);
        completed++;
        if (onProgress) {
          onProgress(completed, gists.length);
        }
        return { gist, comments };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }, [fetchGistComments, githubDomain]);

  const getTrackedGists = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('tracked-gists') || '[]');
    } catch {
      return [];
    }
  }, []);

  const addTrackedGist = useCallback((gist) => {
    const tracked = getTrackedGists();
    if (!tracked.find(g => g.id === gist.id)) {
      tracked.push({
        id: gist.id,
        description: gist.description,
        owner: gist.owner?.login,
        domain: gist.domain || githubDomain
      });
      localStorage.setItem('tracked-gists', JSON.stringify(tracked));
    }
  }, [getTrackedGists, githubDomain]);

  const refresh = useCallback(async () => {
    if (!githubToken) return;

    setLoading(true);
    setError(null);
    setLoadingProgress({ current: 0, total: 0 });

    try {
      // Fetch user's gists from GitHub API
      const userGists = await fetchUserGists();

      // Merge with locally tracked gists
      const trackedGists = getTrackedGists();
      const allGistsMap = new Map();

      userGists.forEach(gist => {
        allGistsMap.set(gist.id, {
          id: gist.id,
          description: gist.description,
          owner: gist.owner?.login,
          domain: githubDomain,
          files: gist.files
        });
      });

      trackedGists.forEach(gist => {
        if (!allGistsMap.has(gist.id)) {
          allGistsMap.set(gist.id, gist);
        }
      });

      const allGists = Array.from(allGistsMap.values());
      setDashboardGists(allGists);

      // Fetch comments for all gists
      const gistComments = await fetchMultipleGistComments(
        allGists,
        (current, total) => {
          setLoadingProgress({ current, total });
        }
      );

      // Process and filter for unresolved comments
      const pendingComments = [];
      const currentUserLogin = currentUser?.login;

      gistComments.forEach(({ gist, comments }) => {
        comments.forEach(gc => {
          const decoded = decodeCommentMeta(gc.body);

          // Determine if this is an unresolved comment we care about
          const isGistOwner = gist.owner === currentUserLogin;
          const isCommentAuthor = gc.user.login === currentUserLogin;

          // Skip resolved comments
          if (decoded && decoded.meta.resolved) return;

          // Include if user is gist owner or comment author
          if (isGistOwner || isCommentAuthor) {
            pendingComments.push({
              id: gc.id.toString(),
              githubCommentId: gc.id,
              gistId: gist.id,
              gistDescription: gist.description || 'Untitled Gist',
              gistOwner: gist.owner,
              gistDomain: gist.domain,
              filename: decoded?.meta.filename || null,
              lineStart: decoded?.meta.lineStart || null,
              lineEnd: decoded?.meta.lineEnd || null,
              highlightedText: decoded?.meta.highlightedText || null,
              text: decoded?.text || gc.body,
              author: gc.user.login,
              authorAvatar: gc.user.avatar_url,
              timestamp: new Date(gc.created_at).getTime(),
              resolved: decoded?.meta.resolved || false,
              replies: decoded?.meta.replies || [],
              isGistOwner,
              isCommentAuthor
            });
          }
        });
      });

      // Sort by timestamp (newest first)
      pendingComments.sort((a, b) => b.timestamp - a.timestamp);
      setDashboardComments(pendingComments);

    } catch (err) {
      console.error('Error refreshing dashboard:', err);
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [githubToken, githubDomain, currentUser, fetchUserGists, getTrackedGists, fetchMultipleGistComments]);

  // Auto-fetch on mount when authenticated
  const hasFetched = useRef(false);
  useEffect(() => {
    if (githubToken && currentUser && !hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, [githubToken, currentUser, refresh]);

  return {
    dashboardComments,
    dashboardGists,
    loading,
    loadingProgress,
    error,
    refresh,
    addTrackedGist,
    pendingCount: dashboardComments.length
  };
}
