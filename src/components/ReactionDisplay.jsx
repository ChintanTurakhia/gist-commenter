import { useState } from 'react';
import { ReactionPicker } from './ReactionPicker';

export function ReactionDisplay({ reactions = {}, currentUser, onToggleReaction }) {
  const [showPicker, setShowPicker] = useState(false);

  // Get array of reactions with counts
  const reactionEntries = Object.entries(reactions).filter(
    ([, users]) => users && users.length > 0
  );

  // Check if current user has reacted with a specific emoji
  const hasReacted = (emoji) => {
    const users = reactions[emoji] || [];
    return currentUser && users.includes(currentUser.login);
  };

  // Handle reaction click
  const handleReactionClick = (emoji) => {
    onToggleReaction?.(emoji);
  };

  return (
    <div className="reaction-display">
      {/* Existing reactions */}
      {reactionEntries.map(([emoji, users]) => (
        <button
          key={emoji}
          className={`reaction-btn ${hasReacted(emoji) ? 'active' : ''}`}
          onClick={() => handleReactionClick(emoji)}
          title={users.join(', ')}
          disabled={!currentUser}
        >
          <span className="reaction-emoji">{emoji}</span>
          <span className="reaction-count">{users.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      {currentUser && (
        <div className="reaction-picker-container">
          <button
            className="add-reaction-btn"
            onClick={() => setShowPicker(!showPicker)}
            title="Add reaction"
          >
            😀<span className="add-icon">+</span>
          </button>
          {showPicker && (
            <ReactionPicker
              onSelect={handleReactionClick}
              onClose={() => setShowPicker(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
