import { useState } from 'react';
import { formatTime, truncate } from '../utils/github';

function Avatar({ src, name, size = 28 }) {
  const [imgError, setImgError] = useState(false);
  const initial = name?.charAt(0).toUpperCase() || '?';

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt=""
        className="avatar"
        style={{ width: size, height: size, objectFit: 'cover' }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.43 }}>
      {initial}
    </div>
  );
}

export function CommentCard({ comment, currentUser, onResolve, onReply, onDelete }) {
  const [replyText, setReplyText] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  const canModify = currentUser && comment.author === currentUser.login;

  return (
    <div className={`comment-card ${comment.resolved ? 'resolved' : ''}`}>
      {comment.highlightedText && (
        <div className="comment-highlight-preview">
          {comment.filename}:{comment.lineStart}
          {comment.lineEnd !== comment.lineStart && `-${comment.lineEnd}`}
          {' | '}
          {truncate(comment.highlightedText, 50)}
        </div>
      )}

      <div className="comment-header">
        <div className="comment-author">
          <Avatar src={comment.authorAvatar} name={comment.author} />
          <span className="author-name">{comment.author}</span>
          <span className="comment-time">{formatTime(comment.timestamp)}</span>
        </div>

        <div className="comment-actions">
          {comment.resolved && (
            <span className="resolved-badge">✓ Resolved</span>
          )}
          {currentUser && (
            <button
              className="comment-action-btn resolve-btn"
              onClick={() => onResolve(comment.id)}
            >
              {comment.resolved ? 'Reopen' : 'Resolve'}
            </button>
          )}
          {canModify && (
            <button
              className="comment-action-btn delete-btn"
              onClick={() => onDelete(comment.id)}
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="comment-body">
        <p className="comment-text">{comment.text}</p>
      </div>

      {(comment.replies?.length > 0 || showReplyForm) && (
        <div className="comment-replies">
          {comment.replies?.map((reply, index) => (
            <div key={index} className="reply">
              <div className="reply-header">
                <Avatar name={reply.author} size={20} />
                <span className="reply-author">{reply.author}</span>
                <span className="reply-time">{formatTime(reply.timestamp)}</span>
              </div>
              <p className="reply-text">{reply.text}</p>
            </div>
          ))}

          {showReplyForm && currentUser && (
            <div className="reply-form">
              <input
                type="text"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
              />
              <button onClick={handleReply}>Reply</button>
            </div>
          )}
        </div>
      )}

      {currentUser && !showReplyForm && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="comment-action-btn"
            onClick={() => setShowReplyForm(true)}
            style={{ fontSize: '12px' }}
          >
            Reply
          </button>
        </div>
      )}
    </div>
  );
}
