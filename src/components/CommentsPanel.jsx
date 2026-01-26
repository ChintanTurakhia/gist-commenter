import { useState } from 'react';
import { CommentCard } from './CommentCard';

export function CommentsPanel({
  comments,
  currentUser,
  onResolve,
  onReply,
  onDelete,
  onToggleReaction,
  isReplyNew,
  focusedCommentId,
  focusReplyCommentId,
  commentsListRef,
  registerCommentElement,
  onScrollToLine
}) {
  const [filter, setFilter] = useState('all');

  const filteredComments = comments.filter(comment => {
    if (filter === 'open') return !comment.resolved;
    if (filter === 'resolved') return comment.resolved;
    return true;
  });

  const sortedComments = [...filteredComments].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="comments-panel">
      <div className="comments-header">
        <h2>Comments</h2>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'open' ? 'active' : ''}`}
            onClick={() => setFilter('open')}
          >
            Open
          </button>
          <button
            className={`filter-btn ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </button>
        </div>
      </div>
      <div className="comments-list" ref={commentsListRef}>
        {sortedComments.length === 0 ? (
          <p className="placeholder-text">
            {comments.length === 0
              ? 'Select text in the gist to add a comment'
              : 'No comments match the current filter'}
          </p>
        ) : (
          sortedComments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onResolve={onResolve}
              onReply={onReply}
              onDelete={onDelete}
              onToggleReaction={onToggleReaction}
              isReplyNew={isReplyNew}
              isFocused={focusedCommentId === comment.id}
              focusReply={focusReplyCommentId === comment.id}
              registerElement={registerCommentElement}
              onScrollToLine={onScrollToLine}
            />
          ))
        )}
      </div>
    </div>
  );
}
