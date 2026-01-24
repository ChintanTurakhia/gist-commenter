import { useState, useRef, useEffect, useCallback } from 'react';

export function GistPanel({ gist, comments, onAddComment, githubToken, onShare }) {
  const [selectionTooltip, setSelectionTooltip] = useState(null);
  const filesRef = useRef(null);

  const getHighlightedRanges = useCallback(() => {
    const ranges = [];
    comments.forEach(comment => {
      if (comment.filename && comment.lineStart) {
        ranges.push({
          filename: comment.filename,
          lineStart: comment.lineStart,
          lineEnd: comment.lineEnd || comment.lineStart,
          commentId: comment.id
        });
      }
    });
    return ranges;
  }, [comments]);

  const handleMouseUp = useCallback((e) => {
    // Don't remove tooltip if clicking on it
    if (selectionTooltip && e.target.closest('.selection-tooltip')) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionTooltip(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setSelectionTooltip(null);
      return;
    }

    // Find the file block containing the selection
    const range = selection.getRangeAt(0);
    const fileBlock = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer.closest('.file-block')
      : range.commonAncestorContainer.parentElement?.closest('.file-block');

    if (!fileBlock) {
      setSelectionTooltip(null);
      return;
    }

    const filename = fileBlock.dataset.filename;

    // Get line numbers
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    const startRow = startContainer.nodeType === 1
      ? startContainer.closest('tr')
      : startContainer.parentElement?.closest('tr');
    const endRow = endContainer.nodeType === 1
      ? endContainer.closest('tr')
      : endContainer.parentElement?.closest('tr');

    if (!startRow || !endRow) {
      setSelectionTooltip(null);
      return;
    }

    const lineStart = parseInt(startRow.dataset.line, 10);
    const lineEnd = parseInt(endRow.dataset.line, 10);

    // Position the tooltip
    const rect = range.getBoundingClientRect();
    const containerRect = filesRef.current.getBoundingClientRect();

    setSelectionTooltip({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 40,
      selectedText,
      filename,
      lineStart,
      lineEnd
    });
  }, [selectionTooltip]);

  const handleTooltipClick = () => {
    if (!selectionTooltip) return;

    onAddComment({
      filename: selectionTooltip.filename,
      lineStart: selectionTooltip.lineStart,
      lineEnd: selectionTooltip.lineEnd,
      selectedText: selectionTooltip.selectedText
    });

    setSelectionTooltip(null);
    window.getSelection()?.removeAllRanges();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectionTooltip && !e.target.closest('.selection-tooltip')) {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          setSelectionTooltip(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionTooltip]);

  const renderFileContent = (filename, content) => {
    const lines = content.split('\n');
    const highlightedRanges = getHighlightedRanges().filter(r => r.filename === filename);

    return (
      <table className="code-table">
        <tbody>
          {lines.map((line, index) => {
            const lineNum = index + 1;
            const isHighlighted = highlightedRanges.some(
              r => lineNum >= r.lineStart && lineNum <= r.lineEnd
            );

            return (
              <tr key={lineNum} data-line={lineNum}>
                <td className="line-number">{lineNum}</td>
                <td className={`line-content ${isHighlighted ? 'highlighted-text' : ''}`}>
                  {line || ' '}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  if (!gist) {
    return (
      <div className="gist-panel">
        <div className="gist-header">
          <h2 id="gist-title">No gist loaded</h2>
          <span id="gist-author"></span>
        </div>
        <div className="gist-files">
          <p className="placeholder-text">Enter a gist URL above to get started</p>
        </div>
      </div>
    );
  }

  const files = Object.entries(gist.files || {});

  const formatCreatedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="gist-panel">
      <div className="gist-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
          <h2 id="gist-title" style={{ margin: 0 }}>{gist.description || 'Untitled Gist'}</h2>
          {githubToken && (
            <button
              onClick={onShare}
              className="share-btn"
              title="Copy gist URL to clipboard"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 1H9.5C9.22386 1 9 1.22386 9 1.5C9 1.77614 9.22386 2 9.5 2H12.2929L6.14645 8.14645C5.95118 8.34171 5.95118 8.65829 6.14645 8.85355C6.34171 9.04882 6.65829 9.04882 6.85355 8.85355L13 2.70711V5.5C13 5.77614 13.2239 6 13.5 6C13.7761 6 14 5.77614 14 5.5V1.5C14 1.22386 13.7761 1 13.5 1Z" fill="currentColor"/>
                <path d="M5 3C3.89543 3 3 3.89543 3 5V11C3 12.1046 3.89543 13 5 13H11C12.1046 13 13 12.1046 13 11V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V11C12 11.5523 11.5523 12 11 12H5C4.44772 12 4 11.5523 4 11V5C4 4.44772 4.44772 4 5 4H7.5C7.77614 4 8 3.77614 8 3.5C8 3.22386 7.77614 3 7.5 3H5Z" fill="currentColor"/>
              </svg>
              Share
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span id="gist-author">by {gist.owner?.login || 'Unknown'}</span>
          {gist.created_at && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Created {formatCreatedDate(gist.created_at)}
            </span>
          )}
        </div>
      </div>
      <div className="gist-files" ref={filesRef} onMouseUp={handleMouseUp}>
        {files.map(([filename, file]) => (
          <div key={filename} className="file-block" data-filename={filename}>
            <div className="file-header">
              <span className="file-icon">📄</span>
              <span>{filename}</span>
            </div>
            <div className="file-content">
              {renderFileContent(filename, file.content)}
            </div>
          </div>
        ))}

        {selectionTooltip && githubToken && (
          <div
            className="selection-tooltip active"
            style={{
              left: selectionTooltip.x,
              top: selectionTooltip.y,
              transform: 'translateX(-50%)'
            }}
            onClick={handleTooltipClick}
          >
            💬 Add Comment
          </div>
        )}
      </div>
    </div>
  );
}
