# Gist Commenter

A modern, collaborative code review tool for GitHub Gists. Add line-specific comments, reactions, and have threaded discussions on any public or private gist.

## Features

- **Line-Specific Comments**: Select text in any gist to add comments tied to specific line numbers
- **Markdown Preview**: Toggle between raw code view and rendered markdown preview for `.md` files
- **Syntax Highlighting**: Full syntax highlighting for 20+ programming languages
- **Emoji Reactions**: React to comments with emojis
- **Threaded Replies**: Reply to comments for focused discussions
- **Resolve/Reopen**: Mark comments as resolved and reopen them as needed
- **Pending Comments Dashboard**: View all your pending comments across multiple gists
- **Light/Dark Theme**: Toggle between themes with smooth transitions
- **Keyboard Shortcuts**: Navigate comments with `j`/`k`, `?` shows all shortcuts
- **Recent Gists**: Quick access to recently viewed gists
- **Share Links**: Copy shareable URLs that auto-load the gist
- **GitHub Enterprise Support**: Works with GitHub.com and GitHub Enterprise

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- A GitHub personal access token with `gist` scope

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/ChintanTurakhia/gist-commenter.git
   cd gist-commenter
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

### Production Build

```bash
npm run build
npm run preview
```

## Usage

### Authentication

1. Click the "Authenticate" button in the header
2. Enter your GitHub personal access token
3. Optionally enter a GitHub Enterprise domain (leave blank for github.com)

### Adding Comments

1. Paste a gist URL in the search bar and press Enter
2. Select text in the code view (must be in "Raw" mode for markdown files)
3. Click the "Add Comment" tooltip that appears
4. Write your comment and click "Add Comment"

### Navigating Comments

- Use `j` and `k` to navigate between comments
- Click on a comment's line reference to scroll to that line in the gist
- Use filters (All/Open/Resolved) to find specific comments

### Pending Comments Dashboard

Click the "Pending" button in the header to view all unresolved comments across your gists.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` | Next comment |
| `k` | Previous comment |
| `r` | Reply to focused comment |
| `o` | Toggle resolve/open on focused comment |
| `?` | Show keyboard shortcuts help |
| `Escape` | Close modals |

## Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Marked** - Markdown parsing
- **DOMPurify** - XSS protection for rendered markdown
- **Highlight.js** - Syntax highlighting

## License

MIT
