import { useState } from 'react';
import { formatTime } from '../utils/github';

export function DashboardCommentCard({ comment, onNavigateToGist }) {
  const [avatarError, setAvatarError] = useState(false);

  const gistUrl = `https://gist.${comment.gistDomain || 'github.com'}/${comment.gistOwner}/${comment.gistId}`;
  const contextInfo = comment.filename
    ? `${comment.filename}:${comment.lineStart}`
    : 'General comment';

  const handleViewGist = () => {
    onNavigateToGist(gistUrl, comment.id);
  };

  return (
    <div className="dashboard-comment-card" data-comment-id={comment.id}>
      <div className="dashboard-gist-context">
        <div className="gist-info">
          <span className="gist-title">{comment.gistDescription}</span>
          <span className="gist-meta">
            by {comment.gistOwner} · {contextInfo} · {formatTime(comment.timestamp)}
          </span>
        </div>
        <button className="view-gist-btn" onClick={handleViewGist}>
          View Gist →
        </button>
      </div>
      <div className="dashboard-comment-content">
        <div className="comment-header">
          <div className="comment-author">
            {comment.authorAvatar && !avatarError ? (
              <img
                className="avatar-img"
                src={comment.authorAvatar}
                alt={comment.author}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className="avatar">
                {comment.author.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="author-name">{comment.author}</span>
            <span className="comment-time">{formatTime(comment.timestamp)}</span>
          </div>
          <div className="comment-badges">
            {comment.isGistOwner && <span className="owner-badge">Owner</span>}
            {comment.isCommentAuthor && <span className="author-badge">Author</span>}
          </div>
        </div>
        <div className="comment-body">
          <p className="comment-text">{comment.text}</p>
        </div>
        {comment.replies.length > 0 && (
          <div className="replies-count">
            {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
          </div>
        )}
      </div>
    </div>
  );
}
