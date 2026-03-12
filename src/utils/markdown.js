import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

// Whitelist of safe HTML tags
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's', 'del',
  'code', 'pre', 'blockquote',
  'a', 'img',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'span', 'div', 'mark'
];

// Whitelist of safe attributes
const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class',
  'target', 'rel',
  'data-line-start', 'data-line-end'
];

// Configure DOMPurify
DOMPurify.setConfig({
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOW_DATA_ATTR: true,
});

// Add hook to make links open in new tab
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Parse markdown text and return sanitized HTML
 * @param {string} text - The markdown text to parse
 * @returns {string} - Sanitized HTML
 */
export function parseMarkdown(text) {
  if (!text) return '';

  try {
    // Parse markdown to HTML
    const html = marked.parse(text);
    // Sanitize HTML to prevent XSS
    const sanitized = DOMPurify.sanitize(html);
    return sanitized;
  } catch (error) {
    console.warn('Markdown parsing failed:', error);
    // Return escaped text on failure
    return escapeHtml(text);
  }
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
