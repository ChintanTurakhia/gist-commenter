import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Agentation } from 'agentation';
import { useGistCommenter } from './hooks/useGistCommenter';
import { usePendingCommentsDashboard } from './hooks/usePendingCommentsDashboard';
import { useNotifications } from './hooks/useNotifications';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSyncScroll } from './hooks/useSyncScroll';
import {
  Header,
  AuthModal,
  GistPanel,
  CommentsPanel,
  CommentModal,
  ToastContainer,
  PendingCommentsDashboard,
  addRecentGist
} from './components';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import './App.css';

function App() {
  const {
    currentGist,
    comments,
    accounts,
    githubToken,
    githubDomain,
    currentUser,
    loading,
    error,
    loadGist,
    createComment,
    resolveComment,
    addReply,
    deleteComment,
    toggleReaction,
    authenticate,
    signOut
  } = useGistCommenter();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [focusReplyCommentId, setFocusReplyCommentId] = useState(null);
  const gistInputRef = useRef(null);

  // Dashboard hook
  const {
    dashboardComments,
    dashboardGists,
    loading: dashboardLoading,
    loadingProgress: dashboardLoadingProgress,
    refresh: refreshDashboard,
    addTrackedGist,
    pendingCount
  } = usePendingCommentsDashboard(accounts, currentUser);

  // Sort comments by timestamp (newest first) to match CommentsPanel display order
  const sortedComments = useMemo(() => {
    return [...comments].sort((a, b) => b.timestamp - a.timestamp);
  }, [comments]);

  // Notifications hook
  const {
    isReplyNew
  } = useNotifications(currentGist?.id, comments);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleThemeToggle = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load gist from URL on mount: supports /{owner}/{gistId} paths and legacy ?gist= param
  useEffect(() => {
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 2) {
      const [owner, gistId] = pathParts;
      const params = new URLSearchParams(window.location.search);
      const domain = params.get('domain') || 'github.com';
      const gistUrl = `https://gist.${domain}/${owner}/${gistId}`;
      loadGist(gistUrl).catch(() => {});
    } else {
      // Legacy query param support
      const params = new URLSearchParams(window.location.search);
      const gistUrl = params.get('gist');
      if (gistUrl) {
        loadGist(gistUrl).catch(() => {});
      }
    }
  }, []);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLoadGist = async (url) => {
    try {
      const gist = await loadGist(url);
      addRecentGist(gist);
      addTrackedGist(gist); // Track for dashboard

      // Update URL to clean path format
      const owner = gist.owner?.login;
      const gistId = gist.id;
      if (owner && gistId) {
        const domain = gist.domain || 'github.com';
        const pathUrl = `/${owner}/${gistId}${domain !== 'github.com' ? `?domain=${encodeURIComponent(domain)}` : ''}`;
        window.history.pushState(null, '', pathUrl);
      }

      addToast('Gist loaded successfully');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleNavigateToGist = (gistUrl, commentId) => {
    setDashboardOpen(false);
    handleLoadGist(gistUrl).then(() => {
      // Scroll to comment after loading
      setTimeout(() => {
        const commentCard = document.querySelector(`.comment-card[data-comment-id="${commentId}"]`);
        if (commentCard) {
          commentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          commentCard.style.animation = 'none';
          commentCard.offsetHeight;
          commentCard.style.animation = 'pulse 0.5s ease';
        }
      }, 500);
    });
  };

  const handleAddComment = (selection) => {
    setCurrentSelection(selection);
    setCommentModalOpen(true);
  };

  const handleSubmitComment = async (selection, selectedText, commentText) => {
    try {
      await createComment(selection, selectedText, commentText);
      addToast('Comment added successfully');
    } catch (err) {
      addToast(err.message || 'Failed to add comment', 'error');
    }
  };

  const handleResolve = async (commentId) => {
    try {
      const newState = await resolveComment(commentId);
      addToast(newState ? 'Comment resolved' : 'Comment reopened');
    } catch (err) {
      addToast(err.message || 'Failed to update comment', 'error');
    }
  };

  const handleReply = async (commentId, replyText) => {
    try {
      await addReply(commentId, replyText);
      addToast('Reply added');
    } catch (err) {
      addToast(err.message || 'Failed to add reply', 'error');
    }
  };

  const handleDelete = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deleteComment(commentId);
      addToast('Comment deleted');
    } catch (err) {
      addToast(err.message || 'Failed to delete comment', 'error');
    }
  };

  const handleToggleReaction = async (commentId, emoji) => {
    try {
      await toggleReaction(commentId, emoji);
    } catch (err) {
      addToast(err.message || 'Failed to update reaction', 'error');
    }
  };

  // Keyboard shortcuts hook - use sortedComments to match visual order
  const { focusedCommentId } = useKeyboardShortcuts({
    comments: sortedComments,
    onShowHelp: () => setShortcutsModalOpen(true),
    onFocusInput: () => gistInputRef.current?.focus(),
    onReply: (commentId) => {
      setFocusReplyCommentId(commentId);
      // Reset after a short delay
      setTimeout(() => setFocusReplyCommentId(null), 100);
    },
    onResolve: handleResolve,
    enabled: !authModalOpen && !commentModalOpen && !dashboardOpen && !shortcutsModalOpen
  });

  // Synchronized scrolling between gist panel and comments panel
  const {
    gistFilesRef,
    commentsListRef,
    handleGistScroll,
    registerCommentElement,
    scrollGistToLine
  } = useSyncScroll({
    comments: sortedComments,
    focusedCommentId
  });

  return (
    <div className="app-container">
      <Header
        currentUser={currentUser}
        loading={loading}
        onLoadGist={handleLoadGist}
        onAuthClick={() => setAuthModalOpen(true)}
        onSignOut={signOut}
        theme={theme}
        onThemeToggle={handleThemeToggle}
        onDashboardClick={() => setDashboardOpen(true)}
        pendingCount={pendingCount}
        githubDomain={githubDomain}
        inputRef={gistInputRef}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticate={authenticate}
        onSignOut={signOut}
        accounts={accounts}
      />

      <main className="main-content">
        <GistPanel
          gist={currentGist}
          comments={comments}
          githubToken={githubToken}
          onAddComment={handleAddComment}
          onShare={() => {
            const owner = currentGist?.owner?.login;
            const gistId = currentGist?.id;
            const domain = currentGist?.domain || 'github.com';
            const domainParam = domain !== 'github.com' ? `?domain=${encodeURIComponent(domain)}` : '';
            const siteUrl = `${window.location.origin}/${owner}/${gistId}${domainParam}`;
            navigator.clipboard.writeText(siteUrl).then(() => {
              addToast('Share link copied to clipboard!');
            });
          }}
          filesRef={gistFilesRef}
          onScroll={handleGistScroll}
        />

        <CommentsPanel
          comments={comments}
          currentUser={currentUser}
          onResolve={handleResolve}
          onReply={handleReply}
          onDelete={handleDelete}
          onToggleReaction={handleToggleReaction}
          isReplyNew={isReplyNew}
          focusedCommentId={focusedCommentId}
          focusReplyCommentId={focusReplyCommentId}
          commentsListRef={commentsListRef}
          registerCommentElement={registerCommentElement}
          onScrollToLine={scrollGistToLine}
          missingAuthDomain={currentGist && !githubToken ? (currentGist.domain || 'github.com') : null}
          onAuthClick={() => setAuthModalOpen(true)}
        />
      </main>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        onSubmit={handleSubmitComment}
        selection={currentSelection}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      <PendingCommentsDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        comments={dashboardComments}
        gists={dashboardGists}
        loading={dashboardLoading}
        loadingProgress={dashboardLoadingProgress}
        onRefresh={refreshDashboard}
        onNavigateToGist={handleNavigateToGist}
      />

      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {error && (
        <div style={{ position: 'fixed', bottom: 80, right: 24, color: 'var(--danger)' }}>
          {error}
        </div>
      )}

      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
