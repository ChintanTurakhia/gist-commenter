import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLastVisit, markVisited, isNew, getNewCount } from '../utils/notifications';

/**
 * Hook for managing notification badges and new content detection
 * @param {string} gistId - The current gist ID
 * @param {Array} comments - Array of comments
 * @param {number} autoMarkDelay - Delay in ms before auto-marking as visited (default: 3000)
 * @returns {Object} - Notification state and functions
 */
export function useNotifications(gistId, comments, autoMarkDelay = 3000) {
  const [lastVisit, setLastVisit] = useState(null);
  const [hasMarkedVisited, setHasMarkedVisited] = useState(false);

  // Load last visit timestamp when gist changes
  useEffect(() => {
    if (gistId) {
      setLastVisit(getLastVisit(gistId));
      setHasMarkedVisited(false);
    }
  }, [gistId]);

  // Auto-mark as visited after delay
  useEffect(() => {
    if (!gistId || hasMarkedVisited) return;

    const timer = setTimeout(() => {
      markVisited(gistId);
      setHasMarkedVisited(true);
    }, autoMarkDelay);

    return () => clearTimeout(timer);
  }, [gistId, hasMarkedVisited, autoMarkDelay]);

  // Check if a comment is new
  const isCommentNew = useCallback((comment) => {
    if (!gistId || !comment?.timestamp) return false;
    return isNew(comment.timestamp, gistId);
  }, [gistId]);

  // Check if a reply is new
  const isReplyNew = useCallback((reply) => {
    if (!gistId || !reply?.timestamp) return false;
    if (!lastVisit) return true;
    return reply.timestamp > lastVisit;
  }, [gistId, lastVisit]);

  // Get count of new comments
  const newCommentsCount = useMemo(() => {
    return getNewCount(comments, gistId, 'timestamp');
  }, [comments, gistId]);

  // Get count of all new replies across all comments
  const newRepliesCount = useMemo(() => {
    if (!comments || !lastVisit) return 0;
    let count = 0;
    comments.forEach(comment => {
      if (comment.replies) {
        count += comment.replies.filter(reply => reply.timestamp > lastVisit).length;
      }
    });
    return count;
  }, [comments, lastVisit]);

  // Total unread count
  const totalUnreadCount = useMemo(() => {
    return newCommentsCount + newRepliesCount;
  }, [newCommentsCount, newRepliesCount]);

  // Manually mark as visited
  const markAsVisited = useCallback(() => {
    if (gistId) {
      markVisited(gistId);
      setLastVisit(Date.now());
      setHasMarkedVisited(true);
    }
  }, [gistId]);

  return {
    lastVisit,
    isCommentNew,
    isReplyNew,
    newCommentsCount,
    newRepliesCount,
    totalUnreadCount,
    markAsVisited,
    hasMarkedVisited
  };
}
