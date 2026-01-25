import { useState, useEffect, useMemo, useRef } from 'react';
import { DashboardCommentCard } from './DashboardCommentCard';
import { formatTime, truncate } from '../utils/github';

export function PendingCommentsDashboard({
  isOpen,
  onClose,
  comments,
  gists,
  loading,
  loadingProgress,
  onRefresh,
  onNavigateToGist
}) {
  const [filter, setFilter] = useState('all');
  const [gistFilter, setGistFilter] = useState('');
  const [showGistDropdown, setShowGistDropdown] = useState(false);
  const gistDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (gistDropdownRef.current && !gistDropdownRef.current.contains(e.target)) {
        setShowGistDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      onRefresh();
    }
  }, [isOpen]);

  const filteredComments = useMemo(() => {
    let result = [...comments];

    // Apply filter type
    if (filter === 'my-gists') {
      result = result.filter(c => c.isGistOwner);
    } else if (filter === 'my-comments') {
      result = result.filter(c => c.isCommentAuthor);
    }

    // Apply gist filter
    if (gistFilter) {
      result = result.filter(c => c.gistId === gistFilter);
    }

    return result;
  }, [comments, filter, gistFilter]);

  const uniqueGists = useMemo(() => {
    const gistMap = new Map();
    comments.forEach(c => {
      if (!gistMap.has(c.gistId)) {
        gistMap.set(c.gistId, {
          id: c.gistId,
          description: c.gistDescription
        });
      }
    });
    return Array.from(gistMap.values());
  }, [comments]);

  if (!isOpen) return null;

  return (
    <div className="modal dashboard-modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dashboard-container">
        <div className="dashboard-header">
          <div className="dashboard-title-section">
            <h2>Pending Comments</h2>
            {comments.length > 0 && (
              <span className="dashboard-count">
                {comments.length > 99 ? '99+' : comments.length}
              </span>
            )}
          </div>
          <div className="dashboard-header-actions">
            <button
              className="dashboard-refresh-btn"
              onClick={onRefresh}
              disabled={loading}
              title="Refresh"
            >
              {loading ? '⏳' : '🔄'}
            </button>
            <button
              className="dashboard-close-btn"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="dashboard-filters">
          <div className="dashboard-filter-tabs">
            <button
              className={`dashboard-filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`dashboard-filter-tab ${filter === 'my-gists' ? 'active' : ''}`}
              onClick={() => setFilter('my-gists')}
            >
              On My Gists
            </button>
            <button
              className={`dashboard-filter-tab ${filter === 'my-comments' ? 'active' : ''}`}
              onClick={() => setFilter('my-comments')}
            >
              My Comments
            </button>
          </div>
          <div className="dashboard-gist-dropdown" ref={gistDropdownRef}>
            <button
              className="dashboard-gist-dropdown-btn"
              onClick={() => setShowGistDropdown(!showGistDropdown)}
            >
              <span>{gistFilter ? truncate(uniqueGists.find(g => g.id === gistFilter)?.description || 'Untitled', 25) : 'All Gists'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showGistDropdown && (
              <div className="dashboard-gist-dropdown-menu">
                <button
                  className={`dashboard-gist-dropdown-item ${gistFilter === '' ? 'active' : ''}`}
                  onClick={() => { setGistFilter(''); setShowGistDropdown(false); }}
                >
                  All Gists
                </button>
                {uniqueGists.map(gist => (
                  <button
                    key={gist.id}
                    className={`dashboard-gist-dropdown-item ${gistFilter === gist.id ? 'active' : ''}`}
                    onClick={() => { setGistFilter(gist.id); setShowGistDropdown(false); }}
                  >
                    {truncate(gist.description || 'Untitled', 35)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          {loading && (
            <div className="dashboard-loading-overlay">
              <div className="dashboard-loading-spinner" />
              <p className="dashboard-progress-text">
                Loading comments... {loadingProgress.current}/{loadingProgress.total} gists
              </p>
              <div className="dashboard-progress-container">
                <div
                  className="dashboard-progress-bar"
                  style={{
                    width: loadingProgress.total > 0
                      ? `${(loadingProgress.current / loadingProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
            </div>
          )}

          <div className="dashboard-comments-list">
            {!loading && filteredComments.length === 0 && (
              <div className="dashboard-empty-state">
                <div className="empty-icon">💬</div>
                <p>No pending comments found</p>
                <span>Comments on your gists and comments you've authored will appear here</span>
              </div>
            )}

            {filteredComments.map(comment => (
              <DashboardCommentCard
                key={comment.id}
                comment={comment}
                onNavigateToGist={onNavigateToGist}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
