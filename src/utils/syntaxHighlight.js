import hljs from 'highlight.js';

// Map file extensions to highlight.js language names
const languageMap = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'scss',
  less: 'less',
  xml: 'xml',
  svg: 'xml',

  // Python
  py: 'python',
  pyw: 'python',
  pyx: 'python',

  // Ruby
  rb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',

  // Go
  go: 'go',

  // Rust
  rs: 'rust',

  // Java/Kotlin
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',

  // C/C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',

  // C#
  cs: 'csharp',

  // PHP
  php: 'php',

  // Swift
  swift: 'swift',

  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'bash',

  // PowerShell
  ps1: 'powershell',
  psm1: 'powershell',

  // SQL
  sql: 'sql',

  // Markdown
  md: 'markdown',
  markdown: 'markdown',

  // JSON/YAML/TOML
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',

  // Config files
  ini: 'ini',
  conf: 'ini',
  cfg: 'ini',

  // Docker
  dockerfile: 'dockerfile',

  // Makefile
  makefile: 'makefile',
  make: 'makefile',

  // Lua
  lua: 'lua',

  // Perl
  pl: 'perl',
  pm: 'perl',

  // R
  r: 'r',

  // Scala
  scala: 'scala',

  // Haskell
  hs: 'haskell',

  // Elixir/Erlang
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',

  // Clojure
  clj: 'clojure',
  cljs: 'clojure',

  // Dart
  dart: 'dart',

  // GraphQL
  graphql: 'graphql',
  gql: 'graphql',

  // Terraform
  tf: 'hcl',
  hcl: 'hcl',

  // Nginx
  nginx: 'nginx',

  // Vim
  vim: 'vim',

  // Diff
  diff: 'diff',
  patch: 'diff',
};

/**
 * Detect language from filename extension
 * @param {string} filename - The filename to detect language from
 * @returns {string|null} - The detected language or null
 */
export function detectLanguage(filename) {
  if (!filename) return null;

  // Handle special filenames
  const lowerFilename = filename.toLowerCase();
  if (lowerFilename === 'dockerfile') return 'dockerfile';
  if (lowerFilename === 'makefile') return 'makefile';
  if (lowerFilename === '.gitignore' || lowerFilename === '.dockerignore') return 'bash';
  if (lowerFilename === '.env' || lowerFilename.endsWith('.env.local')) return 'ini';

  // Get extension
  const parts = filename.split('.');
  if (parts.length < 2) return null;

  const ext = parts[parts.length - 1].toLowerCase();
  return languageMap[ext] || null;
}

/**
 * Highlight code with syntax highlighting
 * @param {string} code - The code to highlight
 * @param {string|null} language - The language to use for highlighting
 * @returns {string} - HTML with syntax highlighting applied
 */
export function highlight(code, language) {
  if (!code) return '';

  try {
    if (language && hljs.getLanguage(language)) {
      const result = hljs.highlight(code, { language });
      return result.value;
    }
    // Auto-detect if no language specified
    const result = hljs.highlightAuto(code);
    return result.value;
  } catch (error) {
    console.warn('Syntax highlighting failed:', error);
    // Return escaped HTML on failure
    return escapeHtml(code);
  }
}

/**
 * Highlight a single line of code
 * @param {string} line - The line to highlight
 * @param {string|null} language - The language to use for highlighting
 * @returns {string} - HTML with syntax highlighting applied
 */
export function highlightLine(line, language) {
  return highlight(line, language);
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
