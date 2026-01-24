import { useState, useEffect, useRef } from 'react';

export function CommentModal({ isOpen, onClose, onSubmit, selection }) {
  const [commentText, setCommentText] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCommentText('');
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (commentText.trim() && selection) {
      onSubmit(selection, selection.selectedText, commentText.trim());
      setCommentText('');
      onClose();
    }
  };

  if (!isOpen || !selection) return null;

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Comment</h3>
          <button className="close-modal" onClick={onClose}>&times;</button>
        </div>
        <div className="selected-text-preview">
          {selection.filename}:{selection.lineStart}
          {selection.lineEnd !== selection.lineStart && `-${selection.lineEnd}`}
          <br />
          {selection.selectedText}
        </div>
        <textarea
          ref={textareaRef}
          id="comment-input"
          placeholder="Write your comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={!commentText.trim()}>
            Add Comment
          </button>
        </div>
      </div>
    </div>
  );
}
