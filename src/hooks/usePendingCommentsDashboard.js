import { useState, useCallback, useEffect, useRef } from 'react';
import { getApiBase, decodeCommentMeta } from '../utils/github';

export function usePendingCommentsDashboard(accounts = {}, currentUser) {
  const [dashboardComments, setDashboardComments] = useState([]);
  const [dashboardGists, setDashboardGists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);

  const hasAnyAccount = Object.keys(accounts).length > 0;

  // Get auth headers for a specific domain
  const getAuthHeaders = useCallback((domain) => {
    const auth = accounts[domain || 'github.com'];
    if (!auth) return {};
    return { 'Authorization': `${auth.tokenType} ${auth.token}` };
  }, [accounts]);

  const fetchUserGists = useCallback(async (domain, page = 1, perPage = 100) => {
    const auth = accounts[domain];
    if (!auth) return [];

    const apiBase = getApiBase(domain);
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `${auth.tokenType} ${auth.token}`
    };

    try {
      const response = await fetch(
        `${apiBase}/gists?per_page=${perPage}&page=${page}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch gists: ${response.status}`);
      }

      const gists = await response.json();
      // Tag each gist with its domain
      return gists.map(g => ({ ...g, domain }));
    } catch (err) {
      console.error(`Error fetching user gists from ${domain}:`, err);
      return [];
    }
  }, [accounts]);

  const fetchGistComments = useCallback(async (gistId, domain) => {
    const apiBase = getApiBase(domain);
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...getAuthHeaders(domain)
    };

    try {
      const response = await fetch(
        `${apiBase}/gists/${gistId}/comments`,
        { headers }
      );

      if (!response.ok) {
        // 401/403/404 are expected for gists the token can't access — skip silently
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch comments: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Error fetching comments for gist ${gistId}:`, err);
      return [];
    }
  }, [getAuthHeaders]);

  const fetchMultipleGistComments = useCallback(async (gists, onProgress) => {
    const results = [];
    const concurrencyLimit = 5;
    let completed = 0;

    for (let i = 0; i < gists.length; i += concurrencyLimit) {
      const batch = gists.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (gist) => {
        const domain = gist.domain || 'github.com';
        const comments = await fetchGistComments(gist.id, domain);
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
  }, [fetchGistComments]);

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
        domain: gist.domain || 'github.com'
      });
      localStorage.setItem('tracked-gists', JSON.stringify(tracked));
    }
  }, [getTrackedGists]);

  const refresh = useCallback(async () => {
    if (!hasAnyAccount) return;

    setLoading(true);
    setError(null);
    setLoadingProgress({ current: 0, total: 0 });

    try {
      // Fetch gists from all authenticated domains in parallel
      const domains = Object.keys(accounts);
      const allUserGists = (await Promise.all(
        domains.map(domain => fetchUserGists(domain))
      )).flat();

      // Merge with locally tracked gists
      const trackedGists = getTrackedGists();
      const allGistsMap = new Map();

      allUserGists.forEach(gist => {
        allGistsMap.set(gist.id, {
          id: gist.id,
          description: gist.description,
          owner: gist.owner?.login,
          domain: gist.domain || 'github.com',
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
  }, [accounts, hasAnyAccount, currentUser, fetchUserGists, getTrackedGists, fetchMultipleGistComments]);

  // Auto-fetch on mount when authenticated
  const hasFetched = useRef(false);
  useEffect(() => {
    if (hasAnyAccount && currentUser && !hasFetched.current) {
      hasFetched.current = true;
      refresh();
    }
  }, [hasAnyAccount, currentUser, refresh]);

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
