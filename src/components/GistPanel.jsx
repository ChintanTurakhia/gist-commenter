import { useState, useRef, useEffect, useCallback } from 'react';

export function GistPanel({ gist, comments, onAddComment, githubToken }) {
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
        <h2 id="gist-title">{gist.description || 'Untitled Gist'}</h2>
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
