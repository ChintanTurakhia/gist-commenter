import { useState, useCallback } from 'react';
import { Agentation } from 'agentation';
import { useGistCommenter } from './hooks/useGistCommenter';
import {
  Header,
  AuthModal,
  GistPanel,
  CommentsPanel,
  CommentModal,
  ToastContainer
} from './components';
import './App.css';

function App() {
  const {
    currentGist,
    comments,
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
    authenticate,
    signOut
  } = useGistCommenter();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleLoadGist = async (url) => {
    try {
      await loadGist(url);
      addToast('Gist loaded successfully');
    } catch (err) {
      addToast(err.message, 'error');
    }
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

  return (
    <div className="app-container">
      <Header
        currentUser={currentUser}
        loading={loading}
        onLoadGist={handleLoadGist}
        onAuthClick={() => setAuthModalOpen(true)}
        currentGist={currentGist}
        onShare={() => {
          const gistUrl = currentGist?.html_url || `https://gist.github.com/${currentGist?.owner?.login}/${currentGist?.id}`;
          navigator.clipboard.writeText(gistUrl).then(() => {
            addToast('Gist URL copied to clipboard!');
          });
        }}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticate={authenticate}
        onSignOut={signOut}
        currentUser={currentUser}
        githubDomain={githubDomain}
      />

      <main className="main-content">
        <GistPanel
          gist={currentGist}
          comments={comments}
          githubToken={githubToken}
          onAddComment={handleAddComment}
        />

        <CommentsPanel
          comments={comments}
          currentUser={currentUser}
          onResolve={handleResolve}
          onReply={handleReply}
          onDelete={handleDelete}
        />
      </main>

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        onSubmit={handleSubmitComment}
        selection={currentSelection}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

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
