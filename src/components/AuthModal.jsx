import { useState, useEffect } from 'react';

export function AuthModal({ isOpen, onClose, onAuthenticate, onSignOut, accounts = {} }) {
  const [token, setToken] = useState('');
  const [domainType, setDomainType] = useState('github.com');
  const [enterpriseDomain, setEnterpriseDomain] = useState('');
  const [error, setError] = useState(null);
  const [authenticating, setAuthenticating] = useState(false);

  const connectedDomains = Object.keys(accounts);
  const hasAnyAccount = connectedDomains.length > 0;

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
      setToken('');
      setError(null);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setAuthenticating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>GitHub Authentication</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>

        {/* Connected accounts */}
        {hasAnyAccount && (
          <div style={{ padding: '16px 24px 0' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Connected accounts</p>
            {connectedDomains.map(domain => {
              const acct = accounts[domain];
              return (
                <div key={domain} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: '8px', marginBottom: '6px',
                  background: 'var(--bg-secondary)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {acct.user.avatar_url && (
                      <img src={acct.user.avatar_url} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />
                    )}
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>{acct.user.login}</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{domain}</span>
                  </div>
                  <button
                    onClick={() => onSignOut(domain)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '12px', padding: '4px 8px'
                    }}
                  >
                    Sign out
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add account form */}
        <div style={{ padding: hasAnyAccount ? '12px 0 0' : undefined }}>
          {hasAnyAccount && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '0 24px', marginBottom: '8px' }}>
              Add another account
            </p>
          )}
          <div className="auth-instructions">
            {!hasAnyAccount && (
              <p>To create and manage comments, you need a GitHub Personal Access Token with <code>gist</code> scope.</p>
            )}
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
            onKeyDown={(e) => e.key === 'Enter' && handleSaveToken()}
            autoComplete="off"
          />
          {error && (
            <p style={{ color: 'var(--danger)', margin: '8px 16px', fontSize: '14px' }}>{error}</p>
          )}
          <div className="modal-actions">
            <button className="btn-secondary" onClick={onClose}>
              {hasAnyAccount ? 'Done' : 'Cancel'}
            </button>
            <button className="btn-primary" onClick={handleSaveToken} disabled={authenticating}>
              {authenticating ? 'Authenticating...' : 'Save Token'}
            </button>
          </div>
          <p className="auth-note">Your token is stored locally in your browser and never sent to any server except GitHub's API.</p>
        </div>
      </div>
    </div>
  );
}
