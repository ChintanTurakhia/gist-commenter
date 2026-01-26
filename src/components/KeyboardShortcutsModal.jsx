import { useEffect } from 'react';
import { KEYBOARD_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal active keyboard-shortcuts-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="close-modal" onClick={onClose}>×</button>
        </div>
        <div className="shortcuts-list">
          {KEYBOARD_SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="shortcut-item">
              <kbd className="shortcut-key">{key}</kbd>
              <span className="shortcut-description">{description}</span>
            </div>
          ))}
        </div>
        <div className="shortcuts-footer">
          <span className="shortcuts-tip">
            Press <kbd>?</kbd> anytime to show this help
          </span>
        </div>
      </div>
    </div>
  );
}
