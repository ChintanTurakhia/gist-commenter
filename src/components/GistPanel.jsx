import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { detectLanguage, highlight } from '../utils/syntaxHighlight';
import { parseMarkdown } from '../utils/markdown';

// Memoized file content component to prevent re-renders from clearing selection
const FileContent = memo(function FileContent({ filename, content, highlightedRanges }) {
  const language = detectLanguage(filename);
  const lines = content.split('\n');

  // Memoize the highlighted HTML to prevent recalculation
  const highlightedLines = useMemo(() => {
    const highlightedContent = highlight(content, language);
    return highlightedContent.split('\n');
  }, [content, language]);

  return (
    <table className="code-table">
      <tbody>
        {lines.map((line, index) => {
          const lineNum = index + 1;
          const isHighlighted = highlightedRanges.some(
            r => lineNum >= r.lineStart && lineNum <= r.lineEnd
          );
          const highlightedLine = highlightedLines[index] || '';

          return (
            <tr key={lineNum} data-line={lineNum}>
              <td className="line-number">{lineNum}</td>
              <td
                className={`line-content ${isHighlighted ? 'highlighted-text' : ''}`}
                dangerouslySetInnerHTML={{ __html: highlightedLine || ' ' }}
              />
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if content or filename changes
  // or if highlightedRanges actually changed in content
  if (prevProps.filename !== nextProps.filename) return false;
  if (prevProps.content !== nextProps.content) return false;
  if (prevProps.highlightedRanges.length !== nextProps.highlightedRanges.length) return false;
  // Deep compare ranges
  for (let i = 0; i < prevProps.highlightedRanges.length; i++) {
    const prev = prevProps.highlightedRanges[i];
    const next = nextProps.highlightedRanges[i];
    if (prev.lineStart !== next.lineStart || prev.lineEnd !== next.lineEnd) return false;
  }
  return true;
});

// Check if a file is a markdown file
function isMarkdownFile(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  return ['md', 'markdown', 'mdown', 'mkd', 'mkdn'].includes(ext);
}

// Memoized markdown preview component
const MarkdownPreview = memo(function MarkdownPreview({ content }) {
  const html = useMemo(() => parseMarkdown(content), [content]);
  return (
    <div
      className="markdown-preview markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export function GistPanel({ gist, comments, onAddComment, githubToken, onShare, filesRef: externalFilesRef, onScroll }) {
  const [selectionTooltip, setSelectionTooltip] = useState(null);
  const [viewMode, setViewMode] = useState('raw'); // 'raw' or 'preview'
  const internalFilesRef = useRef(null);
  // Use external ref if provided, otherwise use internal
  const filesRef = externalFilesRef || internalFilesRef;

  // Check if any file is a markdown file
  const hasMarkdownFiles = useMemo(() => {
    if (!gist?.files) return false;
    return Object.keys(gist.files).some(isMarkdownFile);
  }, [gist?.files]);

  // Memoize highlighted ranges grouped by filename to prevent re-renders
  const highlightedRangesByFile = useMemo(() => {
    const rangesByFile = {};
    comments.forEach(comment => {
      if (comment.filename && comment.lineStart) {
        if (!rangesByFile[comment.filename]) {
          rangesByFile[comment.filename] = [];
        }
        rangesByFile[comment.filename].push({
          filename: comment.filename,
          lineStart: comment.lineStart,
          lineEnd: comment.lineEnd || comment.lineStart,
          commentId: comment.id
        });
      }
    });
    return rangesByFile;
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

    // Position tooltip above the selection, accounting for scroll
    const containerRect = filesRef.current.getBoundingClientRect();
    const scrollTop = filesRef.current.scrollTop;

    // Get all rects from the selection - use the last one for positioning
    const rects = range.getClientRects();
    const lastRect = rects.length > 0 ? rects[rects.length - 1] : range.getBoundingClientRect();

    let tooltipX, tooltipY;

    if (lineStart === lineEnd) {
      // Single line: center above the selection
      tooltipX = lastRect.left + lastRect.width / 2 - containerRect.left;
    } else {
      // Multi-line: center horizontally in the visible container
      tooltipX = containerRect.width / 2;
    }

    tooltipY = lastRect.top - containerRect.top + scrollTop - 45;

    setSelectionTooltip({
      x: tooltipX,
      y: tooltipY,
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

  // Hide tooltip when selection is cleared
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionTooltip(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);


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
              title="Copy share link to clipboard"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13.5 1H9.5C9.22386 1 9 1.22386 9 1.5C9 1.77614 9.22386 2 9.5 2H12.2929L6.14645 8.14645C5.95118 8.34171 5.95118 8.65829 6.14645 8.85355C6.34171 9.04882 6.65829 9.04882 6.85355 8.85355L13 2.70711V5.5C13 5.77614 13.2239 6 13.5 6C13.7761 6 14 5.77614 14 5.5V1.5C14 1.22386 13.7761 1 13.5 1Z" fill="currentColor"/>
                <path d="M5 3C3.89543 3 3 3.89543 3 5V11C3 12.1046 3.89543 13 5 13H11C12.1046 13 13 12.1046 13 11V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V11C12 11.5523 11.5523 12 11 12H5C4.44772 12 4 11.5523 4 11V5C4 4.44772 4.44772 4 5 4H7.5C7.77614 4 8 3.77614 8 3.5C8 3.22386 7.77614 3 7.5 3H5Z" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span id="gist-author">by {gist.owner?.login || 'Unknown'}</span>
            {gist.created_at && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Created {formatCreatedDate(gist.created_at)}
              </span>
            )}
          </div>
          {hasMarkdownFiles && (
            <div className="view-mode-toggle">
              <button
                className={`toggle-option ${viewMode === 'raw' ? 'active' : ''}`}
                onClick={() => setViewMode('raw')}
              >
                Raw
              </button>
              <button
                className={`toggle-option ${viewMode === 'preview' ? 'active' : ''}`}
                onClick={() => setViewMode('preview')}
              >
                Preview
              </button>
              <div className={`toggle-slider ${viewMode === 'preview' ? 'right' : 'left'}`} />
            </div>
          )}
        </div>
      </div>
      <div className="gist-files" ref={filesRef} onMouseUp={handleMouseUp} onScroll={onScroll}>
        {files.map(([filename, file]) => {
          const isMd = isMarkdownFile(filename);
          const showPreview = viewMode === 'preview' && isMd;

          return (
            <div key={filename} className="file-block" data-filename={filename}>
              <div className="file-header">
                <span className="file-icon">{isMd ? '📝' : '📄'}</span>
                <span>{filename}</span>
                {isMd && (
                  <span className="file-badge">Markdown</span>
                )}
              </div>
              <div className={`file-content ${showPreview ? 'preview-mode' : ''}`}>
                {showPreview ? (
                  <MarkdownPreview content={file.content} />
                ) : (
                  <FileContent
                    filename={filename}
                    content={file.content}
                    highlightedRanges={highlightedRangesByFile[filename] || []}
                  />
                )}
              </div>
            </div>
          );
        })}

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
