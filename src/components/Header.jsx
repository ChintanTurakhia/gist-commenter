import { useState } from 'react';
import { Logo } from './Logo';

export function Header({ currentUser, onLoadGist, onAuthClick, loading }) {
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
      <div className="auth-container">
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
