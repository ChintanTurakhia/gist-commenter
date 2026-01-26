import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing keyboard shortcuts
 * @param {Object} options - Configuration options
 * @param {Array} options.comments - Array of comments for navigation
 * @param {Function} options.onShowHelp - Callback when help modal should show
 * @param {Function} options.onFocusInput - Callback to focus gist URL input
 * @param {Function} options.onReply - Callback when reply is triggered (receives commentId)
 * @param {Function} options.onResolve - Callback when resolve is triggered (receives commentId)
 * @returns {Object} - Shortcut state and handlers
 */
export function useKeyboardShortcuts({
  comments = [],
  onShowHelp,
  onFocusInput,
  onReply,
  onResolve,
  enabled = true
}) {
  const [focusedCommentIndex, setFocusedCommentIndex] = useState(-1);
  const [focusedCommentId, setFocusedCommentId] = useState(null);

  // Update focused comment ID when index changes
  useEffect(() => {
    if (focusedCommentIndex >= 0 && focusedCommentIndex < comments.length) {
      setFocusedCommentId(comments[focusedCommentIndex]?.id || null);
    } else {
      setFocusedCommentId(null);
    }
  }, [focusedCommentIndex, comments]);

  // Reset focus when comments change significantly
  useEffect(() => {
    if (focusedCommentIndex >= comments.length) {
      setFocusedCommentIndex(comments.length > 0 ? comments.length - 1 : -1);
    }
  }, [comments.length, focusedCommentIndex]);

  // Check if we're in an input field
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || activeElement?.isContentEditable;
  }, []);

  // Navigate to next comment
  const navigateNext = useCallback(() => {
    if (comments.length === 0) return;
    setFocusedCommentIndex(prev => {
      if (prev >= comments.length - 1) return 0; // Wrap around
      return prev + 1;
    });
  }, [comments.length]);

  // Navigate to previous comment
  const navigatePrev = useCallback(() => {
    if (comments.length === 0) return;
    setFocusedCommentIndex(prev => {
      if (prev <= 0) return comments.length - 1; // Wrap around
      return prev - 1;
    });
  }, [comments.length]);

  // Clear focus
  const clearFocus = useCallback(() => {
    setFocusedCommentIndex(-1);
    setFocusedCommentId(null);
  }, []);

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Skip if typing in input
      if (isInputFocused() && e.key !== 'Escape') {
        return;
      }

      console.log('Keyboard shortcut:', e.key, 'comments:', comments.length, 'focusedIndex:', focusedCommentIndex);

      switch (e.key) {
        case '/':
          // Focus gist URL input
          e.preventDefault();
          onFocusInput?.();
          break;

        case 'ArrowDown':
        case 'j':
          // Navigate to next comment
          if (!isInputFocused()) {
            e.preventDefault();
            navigateNext();
          }
          break;

        case 'ArrowUp':
        case 'k':
          // Navigate to previous comment
          if (!isInputFocused()) {
            e.preventDefault();
            navigatePrev();
          }
          break;

        case 'r':
          // Reply to focused comment
          if (!isInputFocused() && focusedCommentId) {
            e.preventDefault();
            onReply?.(focusedCommentId);
          }
          break;

        case 's':
          // Toggle resolve on focused comment
          if (!isInputFocused() && focusedCommentId) {
            e.preventDefault();
            onResolve?.(focusedCommentId);
          }
          break;

        case '?':
          // Show shortcuts help modal
          if (!isInputFocused()) {
            e.preventDefault();
            onShowHelp?.();
          }
          break;

        case 'Escape':
          // Close modals / clear focus
          if (focusedCommentId) {
            e.preventDefault();
            clearFocus();
          }
          break;

        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    isInputFocused,
    navigateNext,
    navigatePrev,
    focusedCommentId,
    onShowHelp,
    onFocusInput,
    onReply,
    onResolve,
    clearFocus
  ]);

  // Note: Scroll behavior for focused comments is now handled by useSyncScroll hook
  // to prevent competing scroll operations and feedback loops

  return {
    focusedCommentId,
    focusedCommentIndex,
    setFocusedCommentIndex,
    clearFocus,
    navigateNext,
    navigatePrev
  };
}

// List of all available shortcuts for the help modal
export const KEYBOARD_SHORTCUTS = [
  { key: '/', description: 'Focus gist URL input' },
  { key: '↑ / k', description: 'Navigate to previous comment' },
  { key: '↓ / j', description: 'Navigate to next comment' },
  { key: 'r', description: 'Reply to focused comment' },
  { key: 's', description: 'Toggle resolve on focused comment' },
  { key: '?', description: 'Show keyboard shortcuts help' },
  { key: 'Esc', description: 'Close modals / clear focus' }
];
