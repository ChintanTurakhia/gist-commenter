import { useRef, useCallback, useEffect, useMemo } from 'react';

/**
 * Central hook for managing bidirectional scroll synchronization between
 * the gist panel and comments panel.
 *
 * Features:
 * - Gist scroll → Comments scroll: When scrolling gist, shows relevant comments
 * - Keyboard navigation → Gist scroll: When navigating comments, gist scrolls to line
 * - Scroll lock to prevent feedback loops
 */
export function useSyncScroll({
  comments = [],
  focusedCommentId = null
}) {
  // Refs for scroll containers
  const gistFilesRef = useRef(null);
  const commentsListRef = useRef(null);

  // Map of comment IDs to their DOM elements
  const commentElementsRef = useRef(new Map());

  // Scroll lock to prevent feedback loops
  const scrollLockRef = useRef({
    isLocked: false,
    source: null,
    timeoutId: null
  });

  // Debounce timer for gist scroll
  const gistScrollDebounceRef = useRef(null);

  // Build a map of filename → line ranges → comment info for quick lookup
  const lineToCommentsMap = useMemo(() => {
    const map = new Map(); // filename -> [{lineStart, lineEnd, commentId}]

    comments.forEach(comment => {
      if (comment.filename && comment.lineStart) {
        const key = comment.filename;
        if (!map.has(key)) {
          map.set(key, []);
        }
        map.get(key).push({
          lineStart: comment.lineStart,
          lineEnd: comment.lineEnd || comment.lineStart,
          commentId: comment.id
        });
      }
    });

    return map;
  }, [comments]);

  /**
   * Acquire scroll lock to prevent feedback loops
   * @param {string} source - 'gist' | 'keyboard' | 'manual'
   */
  const acquireScrollLock = useCallback((source) => {
    // Clear any existing timeout
    if (scrollLockRef.current.timeoutId) {
      clearTimeout(scrollLockRef.current.timeoutId);
    }

    scrollLockRef.current.isLocked = true;
    scrollLockRef.current.source = source;

    // Release lock after 500ms
    scrollLockRef.current.timeoutId = setTimeout(() => {
      scrollLockRef.current.isLocked = false;
      scrollLockRef.current.source = null;
    }, 500);
  }, []);

  /**
   * Check if we can handle a scroll from a given source
   */
  const canHandleScroll = useCallback((source) => {
    const lock = scrollLockRef.current;
    // Can handle if not locked or if locked by the same source
    return !lock.isLocked || lock.source === source;
  }, []);

  /**
   * Get visible lines in the gist panel viewport
   */
  const getVisibleLines = useCallback(() => {
    const container = gistFilesRef.current;
    if (!container) return [];

    const containerRect = container.getBoundingClientRect();
    const visibleLines = [];

    // Find all file blocks
    const fileBlocks = container.querySelectorAll('.file-block[data-filename]');

    fileBlocks.forEach(fileBlock => {
      const filename = fileBlock.dataset.filename;
      const rows = fileBlock.querySelectorAll('tr[data-line]');

      rows.forEach(row => {
        const rowRect = row.getBoundingClientRect();

        // Check if row is visible in viewport
        if (rowRect.bottom >= containerRect.top && rowRect.top <= containerRect.bottom) {
          const lineNum = parseInt(row.dataset.line, 10);

          // Calculate visibility score (higher = more centered in viewport)
          const rowCenter = rowRect.top + rowRect.height / 2;
          const containerCenter = containerRect.top + containerRect.height / 2;
          const distanceFromCenter = Math.abs(rowCenter - containerCenter);
          const visibility = 1 - (distanceFromCenter / (containerRect.height / 2));

          visibleLines.push({
            filename,
            line: lineNum,
            visibility: Math.max(0, visibility)
          });
        }
      });
    });

    return visibleLines;
  }, []);

  /**
   * Find comments that match the visible lines
   */
  const findRelevantComments = useCallback((visibleLines) => {
    const matchingComments = [];

    visibleLines.forEach(({ filename, line, visibility }) => {
      const fileComments = lineToCommentsMap.get(filename);
      if (!fileComments) return;

      fileComments.forEach(({ lineStart, lineEnd, commentId }) => {
        if (line >= lineStart && line <= lineEnd) {
          // Check if we already added this comment
          const existing = matchingComments.find(c => c.commentId === commentId);
          if (existing) {
            // Update visibility to the higher value
            existing.visibility = Math.max(existing.visibility, visibility);
          } else {
            matchingComments.push({ commentId, visibility });
          }
        }
      });
    });

    // Sort by visibility (most centered first)
    matchingComments.sort((a, b) => b.visibility - a.visibility);

    return matchingComments;
  }, [lineToCommentsMap]);

  /**
   * Scroll a comment card into view
   */
  const scrollCommentIntoView = useCallback((commentId) => {
    const element = commentElementsRef.current.get(commentId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  /**
   * Scroll the gist panel to show a specific line
   * Scrolls only the .gist-files container, not the whole page
   */
  const scrollGistToLine = useCallback((filename, lineStart) => {
    acquireScrollLock('manual');

    // Find the scrollable container
    const container = gistFilesRef.current || document.querySelector('.gist-files');
    if (!container) return;

    // Find the line element
    const lineEl = document.querySelector(
      `[data-filename="${filename}"] [data-line="${lineStart}"]`
    );

    if (lineEl) {
      const lineRect = lineEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate scroll position to center the line in the container
      const targetScrollTop = container.scrollTop +
        (lineRect.top - containerRect.top) -
        (containerRect.height / 2) +
        (lineRect.height / 2);

      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });

      // Flash highlight the line
      lineEl.classList.add('flash-highlight');
      setTimeout(() => lineEl.classList.remove('flash-highlight'), 1500);
    }
  }, [acquireScrollLock]);

  /**
   * Scroll gist to show the line for a specific comment
   */
  const scrollGistToComment = useCallback((commentId) => {
    const comment = comments.find(c => c.id === commentId);
    if (comment?.filename && comment?.lineStart) {
      scrollGistToLine(comment.filename, comment.lineStart);
    }
  }, [comments, scrollGistToLine]);

  /**
   * Register a comment element for scroll tracking
   */
  const registerCommentElement = useCallback((id, element) => {
    if (element) {
      commentElementsRef.current.set(id, element);
    } else {
      commentElementsRef.current.delete(id);
    }
  }, []);

  /**
   * Handle scroll events from the gist panel
   * Debounced to avoid excessive processing
   */
  const handleGistScroll = useCallback(() => {
    // Don't process if scroll lock is held by a different source
    if (!canHandleScroll('gist')) return;

    // Clear existing debounce timer
    if (gistScrollDebounceRef.current) {
      clearTimeout(gistScrollDebounceRef.current);
    }

    // Debounce the actual scroll handling
    gistScrollDebounceRef.current = setTimeout(() => {
      const visibleLines = getVisibleLines();
      const relevantComments = findRelevantComments(visibleLines);

      // Scroll the first (most visible) relevant comment into view
      if (relevantComments.length > 0) {
        acquireScrollLock('gist');
        scrollCommentIntoView(relevantComments[0].commentId);
      }
    }, 100);
  }, [canHandleScroll, getVisibleLines, findRelevantComments, acquireScrollLock, scrollCommentIntoView]);

  // Effect for keyboard navigation: when focused comment changes, scroll gist to show it
  useEffect(() => {
    if (focusedCommentId) {
      // Find the comment and scroll to its line
      const comment = comments.find(c => c.id === focusedCommentId);
      if (comment?.filename && comment?.lineStart) {
        acquireScrollLock('keyboard');
        scrollGistToLine(comment.filename, comment.lineStart);
      }

      // Also scroll the comment into view in the comments panel
      setTimeout(() => {
        scrollCommentIntoView(focusedCommentId);
      }, 50);
    }
  }, [focusedCommentId, comments, acquireScrollLock, scrollGistToLine, scrollCommentIntoView]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollLockRef.current.timeoutId) {
        clearTimeout(scrollLockRef.current.timeoutId);
      }
      if (gistScrollDebounceRef.current) {
        clearTimeout(gistScrollDebounceRef.current);
      }
    };
  }, []);

  return {
    gistFilesRef,
    commentsListRef,
    handleGistScroll,
    registerCommentElement,
    scrollGistToLine,
    scrollGistToComment
  };
}
