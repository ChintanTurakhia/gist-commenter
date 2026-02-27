import { useState, useEffect } from 'react';

export function AuthModal({ isOpen, onClose, onAuthenticate, onSignOut, currentUser, githubDomain }) {
  const [token, setToken] = useState('');
  const [domainType, setDomainType] = useState('github.com');
  const [enterpriseDomain, setEnterpriseDomain] = useState('');
  const [error, setError] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setToken('');
      setError(null);
      setDomainType('github.com');
      setEnterpriseDomain('');
    }
  }, [isOpen]);

  const getDomain = () => {
    return domainType === 'enterprise' ? enterpriseDomain : 'github.com';
  };

  const getTokenSettingsUrl = () => {
    const domain = getDomain();
    if (domain === 'github.com') {
      return 'https://github.com/settings/tokens/new?scopes=gist&description=Gist+Commenter';
    }
    return `https://${domain}/settings/tokens/new?scopes=gist&description=Gist+Commenter`;
  };

  const handleSaveToken = async () => {
    const domain = getDomain();
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }
    if (domainType === 'enterprise' && !enterpriseDomain.trim()) {
      setError('Please enter your enterprise domain');
      return;
    }

    setAuthenticating(true);
    setError(null);

    try {
      await onAuthenticate(token.trim(), domain);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{currentUser ? 'GitHub Authentication Status' : 'GitHub Authentication'}</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        {currentUser ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '15px', marginBottom: '8px' }}>
              Signed in as <strong>{currentUser.login}</strong>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {githubDomain || 'github.com'}
            </p>
            <div className="modal-actions" style={{ marginTop: '20px', justifyContent: 'center', padding: '12px 24px' }}>
              <button className="btn-secondary" onClick={handleSignOut}>Sign Out</button>
              <button className="btn-primary" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <div className="auth-instructions">
              <p>To create and manage comments, you need a GitHub Personal Access Token with <code>gist</code> scope.</p>
              <div className="domain-selector">
                <label>GitHub Instance:</label>
                <div className="domain-options">
                  <label className="domain-option">
                    <input
                      type="radio"
                      name="github-domain"
                      value="github.com"
                      checked={domainType === 'github.com'}
                      onChange={() => setDomainType('github.com')}
                    />
                    <span>github.com</span>
                  </label>
                  <label className="domain-option">
                    <input
                      type="radio"
                      name="github-domain"
                      value="enterprise"
                      checked={domainType === 'enterprise'}
                      onChange={() => setDomainType('enterprise')}
                    />
                    <span>GitHub Enterprise</span>
                  </label>
                </div>
                {domainType === 'enterprise' && (
                  <input
                    type="text"
                    id="enterprise-domain"
                    placeholder="github.yourcompany.com"
                    value={enterpriseDomain}
                    onChange={(e) => setEnterpriseDomain(e.target.value)}
                    autoComplete="off"
                  />
                )}
              </div>
              <ol>
                <li>Go to your GitHub instance's <a href={getTokenSettingsUrl()} target="_blank" rel="noopener noreferrer">Token Settings</a></li>
                <li>The <strong>gist</strong> scope will be pre-selected — just add a name and generate</li>
                <li>Copy and paste the token below</li>
              </ol>
            </div>
            <input
              type="password"
              id="github-token-input"
              placeholder="ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              autoComplete="off"
            />
            {error && (
              <p style={{ color: 'var(--danger)', margin: '8px 16px', fontSize: '14px' }}>{error}</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveToken} disabled={authenticating}>
                {authenticating ? 'Authenticating...' : 'Save Token'}
              </button>
            </div>
            <p className="auth-note">Your token is stored locally in your browser and never sent to any server except GitHub's API.</p>
          </>
        )}
      </div>
    </div>
  );
}
