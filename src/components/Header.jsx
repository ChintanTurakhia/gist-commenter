import { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';

const MAX_RECENTS = 5;

function getRecentGists() {
  try {
    return JSON.parse(localStorage.getItem('recent-gists') || '[]');
  } catch {
    return [];
  }
}

export function addRecentGist(gist) {
  if (!gist?.id) return;
  const recents = getRecentGists();
  const exists = recents.findIndex(r => r.id === gist.id);
  if (exists >= 0) {
    recents.splice(exists, 1);
  }
  recents.unshift({
    id: gist.id,
    url: gist.html_url || `https://gist.github.com/${gist.owner?.login}/${gist.id}`,
    description: gist.description || 'Untitled Gist',
    owner: gist.owner?.login || 'Unknown'
  });
  localStorage.setItem('recent-gists', JSON.stringify(recents.slice(0, MAX_RECENTS)));
}

export function Header({ currentUser, onLoadGist, onAuthClick, onSignOut, loading, theme, onThemeToggle, onDashboardClick, pendingCount, githubDomain }) {
  const [gistUrl, setGistUrl] = useState('');
  const [showRecents, setShowRecents] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [recents, setRecents] = useState([]);
  const [avatarError, setAvatarError] = useState(false);
  const containerRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    setRecents(getRecentGists());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowRecents(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLoadGist = () => {
    if (gistUrl.trim()) {
      onLoadGist(gistUrl.trim());
      setShowRecents(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLoadGist();
    }
    if (e.key === 'Escape') {
      setShowRecents(false);
    }
  };

  const handleRecentClick = (url) => {
    setGistUrl(url);
    onLoadGist(url);
    setShowRecents(false);
  };

  const handleFocus = () => {
    setRecents(getRecentGists());
    setShowRecents(true);
  };

  return (
    <header className="header">
      <Logo />
      <div className="gist-input-container" ref={containerRef}>
        <div className="gist-input-wrapper">
          <input
            type="text"
            id="gist-url"
            placeholder="Paste a GitHub Gist URL..."
            value={gistUrl}
            onChange={(e) => setGistUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
          />
          {showRecents && recents.length > 0 && (
            <div className="recents-dropdown">
              <div className="recents-header">Recents</div>
              {recents.map((recent) => (
                <button
                  key={recent.id}
                  className="recent-item"
                  onClick={() => handleRecentClick(recent.url)}
                >
                  <span className="recent-title">{recent.description}</span>
                  <span className="recent-owner">by {recent.owner}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button id="load-gist" onClick={handleLoadGist} disabled={loading}>
          <span className="btn-content">
            {loading && <span className="loading-spinner" />}
            {loading ? 'Loading' : 'Load Gist'}
          </span>
        </button>
      </div>
      <div className="header-actions" ref={userMenuRef}>
        {currentUser ? (
          <>
            <button
              className="dashboard-btn"
              onClick={onDashboardClick}
              title="Pending Comments"
            >
              <span className="dashboard-icon">📋</span>
              <span className="dashboard-label">Pending Comments</span>
              {pendingCount > 0 && (
                <span className="dashboard-count">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>
            <button
              className="avatar-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              title={currentUser.login}
            >
              {currentUser.avatar_url && !avatarError ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.login}
                  className="header-avatar"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span className="header-avatar-fallback">
                  {currentUser.login?.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-header">
                  <div className="user-menu-avatar">
                    {currentUser.avatar_url && !avatarError ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.login}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <span>{currentUser.login?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="user-menu-info">
                    <span className="user-menu-name">{currentUser.login}</span>
                    <span className="user-menu-status">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 4a2.5 2.5 0 1 0-5 0v2h5Z"/>
                      </svg>
                      Authenticated
                    </span>
                    <span className="user-menu-domain">{githubDomain || 'github.com'}</span>
                  </div>
                </div>
                <div className="user-menu-divider" />
                <div className="user-menu-item">
                  <span>Theme</span>
                  <button
                    className="theme-toggle"
                    onClick={onThemeToggle}
                  >
                    <span className={`theme-option ${theme === 'light' ? 'active' : ''}`}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 8a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm2-6a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 2Zm0 10a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 12ZM2 8a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 8Zm10 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 12 8Zm-1.17-4.24a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm-6.72 6.72a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm7.78 0a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM5.17 4.82a.75.75 0 0 1 0 1.06L4.11 6.94a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0Z"/>
                      </svg>
                    </span>
                    <span className={`theme-option ${theme === 'dark' ? 'active' : ''}`}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M9.598 1.591a.75.75 0 0 1 .785-.175 7 7 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.5 5.5 0 1 0 7.678-7.678Z"/>
                      </svg>
                    </span>
                  </button>
                </div>
                <div className="user-menu-divider" />
                <button className="user-menu-item user-menu-signout" onClick={() => { onSignOut(); setShowUserMenu(false); }}>
                  Sign out
                </button>
              </div>
            )}
          </>
        ) : (
          <button
            id="auth-btn"
            className="auth-btn"
            onClick={onAuthClick}
          >
            <span className="auth-icon">🔑</span>
            <span id="auth-status">Sign in with GitHub</span>
          </button>
        )}
      </div>
    </header>
  );
}
