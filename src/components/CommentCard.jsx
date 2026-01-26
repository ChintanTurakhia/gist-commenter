import { useState, useRef, useEffect } from 'react';
import { formatTime, truncate } from '../utils/github';
import { parseMarkdown } from '../utils/markdown';
import { ReactionDisplay } from './ReactionDisplay';

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

export function CommentCard({
  comment,
  currentUser,
  onResolve,
  onReply,
  onDelete,
  onToggleReaction,
  isReplyNew,
  isFocused = false,
  focusReply = false,
  registerElement,
  onScrollToLine
}) {
  const [replyText, setReplyText] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);
  const replyInputRef = useRef(null);
  const cardRef = useRef(null);

  // Register this card's DOM element with the sync scroll hook
  useEffect(() => {
    registerElement?.(comment.id, cardRef.current);
    return () => registerElement?.(comment.id, null);
  }, [comment.id, registerElement]);

  // Focus reply input when focusReply changes to true
  useEffect(() => {
    if (focusReply && replyInputRef.current) {
      setShowReplyForm(true);
      setTimeout(() => replyInputRef.current?.focus(), 0);
    }
  }, [focusReply]);

  // Handle click on highlight preview - scroll gist to the line
  const handleHighlightClick = () => {
    if (comment.filename && comment.lineStart && onScrollToLine) {
      onScrollToLine(comment.filename, comment.lineStart);
    }
  };

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    }
  };

  const canModify = currentUser && comment.author === currentUser.login;

  return (
    <div
      ref={cardRef}
      className={`comment-card ${comment.resolved ? 'resolved' : ''} ${isFocused ? 'focused' : ''}`}
      data-comment-id={comment.id}
    >
      {comment.highlightedText && (
        <div
          className="comment-highlight-preview"
          onClick={handleHighlightClick}
        >
          {comment.filename}:{comment.lineStart}
          {comment.lineEnd !== comment.lineStart && `-${comment.lineEnd}`}
          {' | '}
          {truncate(comment.highlightedText, 50)}
        </div>
      )}

      <div className="comment-header">
        <div className="comment-author">
          <Avatar src={comment.authorAvatar} name={comment.author} />
          <div className="author-info">
            <span className="author-name">{comment.author}</span>
            <span className="comment-time">{formatTime(comment.timestamp)}</span>
          </div>
        </div>

        {currentUser && (
          <div className="comment-actions-segmented">
            <button
              className={`segment-btn ${comment.resolved ? '' : 'active'}`}
              onClick={() => !comment.resolved || onResolve(comment.id)}
              disabled={!comment.resolved}
            >
              Open
            </button>
            <button
              className={`segment-btn ${comment.resolved ? 'active resolved' : ''}`}
              onClick={() => comment.resolved || onResolve(comment.id)}
              disabled={comment.resolved}
            >
              Resolved
            </button>
            {canModify && (
              <button
                className="segment-btn delete"
                onClick={() => onDelete(comment.id)}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      <div className="comment-body">
        <div
          className="comment-text markdown-content"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(comment.text) }}
        />
      </div>

      {/* Reactions */}
      <div className="comment-reactions">
        <ReactionDisplay
          reactions={comment.reactions || {}}
          currentUser={currentUser}
          onToggleReaction={(emoji) => onToggleReaction?.(comment.id, emoji)}
        />
      </div>

      {(comment.replies?.length > 0 || showReplyForm) && (
        <div className="comment-replies">
          {comment.replies?.map((reply, index) => {
            const replyIsNew = isReplyNew?.(reply);
            return (
              <div key={index} className={`reply ${replyIsNew ? 'new' : ''}`}>
                <div className="reply-header">
                  <Avatar name={reply.author} size={20} />
                  <span className="reply-author">{reply.author}</span>
                  <span className="reply-time">{formatTime(reply.timestamp)}</span>
                  {replyIsNew && <span className="new-badge">NEW</span>}
                </div>
                <div
                  className="reply-text markdown-content"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(reply.text) }}
                />
              </div>
            );
          })}

          {showReplyForm && currentUser && (
            <div className="reply-form">
              <input
                ref={replyInputRef}
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
