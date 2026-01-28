# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Disable text selection in markdown preview mode
  - Preview mode now blocks text selection since comments can only be added in raw mode where line numbers are available

## [0.9.0] - 2025-01-27

### Added
- Raw/Preview toggle for markdown files
  - Animated toggle button to switch between raw code and rendered markdown
  - Preview mode renders GitHub Flavored Markdown with syntax highlighting
  - Selection disabled in preview mode (comments require line numbers)

### Changed
- Share button redesigned as icon-only circular button
- Improved tooltip positioning for multi-line selections
- Tooltip now centers horizontally in container for multi-line selections
- Tooltip disappears when selection is cleared

### Fixed
- Gist header height now aligns with comments header

## [0.8.0] - 2025-01-27

### Fixed
- Unicode/emoji characters now work correctly in comment metadata
  - Added UTF-8 encoding helpers to handle emojis before base64 encoding

## [0.7.0] - 2025-01-27

### Fixed
- Comments now stay visible when clicking highlight to scroll to line
  - Fixed CSS layout to constrain heights properly
  - `.gist-files` is now the scrollable container instead of the whole page
  - CommentCard uses `onScrollToLine` prop for targeted scrolling

### Added
- Syntax highlighting for 20+ programming languages
- Emoji reactions on comments
- Keyboard shortcuts for comment navigation
- Gist header height aligned with comments header

## [0.6.0] - 2025-01-27

### Changed
- Dashboard button redesigned with SVG icons
- Refresh button has spinning animation when loading
- "Pending Comments" label shortened to "Pending"
- Added hover effects with glow and lift animations
- Close button styled with red hover state

## [0.5.0] - 2025-01-27

### Added
- Pending comments dashboard
  - Auto-fetches on load
  - Dashboard button in header with pending count badge
  - Filters: "All", "On My Gists", "My Comments"
  - Gist dropdown for filtering by specific gist
- Click-to-scroll on comment highlight preview
- GitHub domain display in user menu

### Fixed
- Light mode styling for comments, code, and replies
- Comment header layout with stacked author info

## [0.4.0] - 2025-01-27

### Added
- User menu with avatar dropdown showing auth status
- Light/dark theme toggle with polished light mode design
- Recent gists dropdown when focusing search input
- Share button copies full site URL with gist parameter
- URL parameter support to auto-load gist on page visit (`?gist=...`)

### Fixed
- Layout shift when scrollbar appears
- Smooth button loading state with spinner
- Avatar fallback for broken images

## [0.3.0] - 2025-01-27

### Changed
- Moved share button from GistPanel to Header for better visibility
- Share button appears next to auth button when gist is loaded
- Copies gist URL to clipboard with toast notification

## [0.2.0] - 2025-01-27

### Added
- Initial React conversion from vanilla JavaScript
- Liquid glass UI design with modern glassmorphism effects
- Two-panel layout: gist viewer and comments panel
- Line-specific commenting with text selection
- Comment threading with replies
- Resolve/reopen comment workflow
- Toast notifications
- GitHub authentication with token
- GitHub Enterprise support
