import { useState, useRef, useEffect } from 'react';

const REACTIONS = ['👍', '👎', '🎉', '❤️', '😄', '😕', '👀', '🚀'];

export function ReactionPicker({ onSelect, onClose }) {
  const pickerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="reaction-picker" ref={pickerRef}>
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          className="reaction-picker-btn"
          onClick={() => {
            onSelect?.(emoji);
            onClose?.();
          }}
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
