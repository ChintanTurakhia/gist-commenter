import { useState } from 'react';
import { Logo } from './Logo';

export function Header({ currentUser, onLoadGist, onAuthClick, loading, currentGist, onShare }) {
  const [gistUrl, setGistUrl] = useState('');

  const handleLoadGist = () => {
    if (gistUrl.trim()) {
      onLoadGist(gistUrl.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleLoadGist();
    }
  };

  return (
    <header className="header">
      <Logo />
      <div className="gist-input-container">
        <input
          type="text"
          id="gist-url"
          placeholder="Paste a GitHub Gist URL..."
          value={gistUrl}
          onChange={(e) => setGistUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button id="load-gist" onClick={handleLoadGist} disabled={loading}>
          {loading ? 'Loading...' : 'Load Gist'}
        </button>
      </div>
      <div className="header-actions">
        {currentGist && (
          <button
            onClick={onShare}
            className="share-btn"
            title="Copy gist URL to clipboard"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13.5 1H9.5C9.22386 1 9 1.22386 9 1.5C9 1.77614 9.22386 2 9.5 2H12.2929L6.14645 8.14645C5.95118 8.34171 5.95118 8.65829 6.14645 8.85355C6.34171 9.04882 6.65829 9.04882 6.85355 8.85355L13 2.70711V5.5C13 5.77614 13.2239 6 13.5 6C13.7761 6 14 5.77614 14 5.5V1.5C14 1.22386 13.7761 1 13.5 1Z" fill="currentColor"/>
              <path d="M5 3C3.89543 3 3 3.89543 3 5V11C3 12.1046 3.89543 13 5 13H11C12.1046 13 13 12.1046 13 11V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V11C12 11.5523 11.5523 12 11 12H5C4.44772 12 4 11.5523 4 11V5C4 4.44772 4.44772 4 5 4H7.5C7.77614 4 8 3.77614 8 3.5C8 3.22386 7.77614 3 7.5 3H5Z" fill="currentColor"/>
            </svg>
            Share
          </button>
        )}
        <button
          id="auth-btn"
          className={`auth-btn ${currentUser ? 'authenticated' : ''}`}
          onClick={onAuthClick}
        >
          <span className="auth-icon">🔑</span>
          <span id="auth-status">
            {currentUser ? currentUser.login : 'Sign in with GitHub'}
          </span>
        </button>
      </div>
    </header>
  );
}
