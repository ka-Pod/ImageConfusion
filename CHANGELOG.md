# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-07-07

### Added

#### Core
- Gilbert 2D space-filling curve pixel rearrangement (`src/gilbert.ts`)
- Pixel encrypt/decrypt with configurable offset (`src/confuse.ts`)
- Server-side image processing via sharp + Hono (`src/index.ts`)
- Batch processing engine with session management (`src/batch.ts`)
- Structured logging with daily rotation (`src/logger.ts`)

#### API endpoints
- `GET /` — Single-page application entry
- `POST /api/encrypt` — Single image encrypt (returns JPEG q95)
- `POST /api/decrypt` — Single image decrypt
- `POST /api/batch/encrypt` — Batch encrypt, returns ZIP
- `POST /api/batch/decrypt` — Batch decrypt with per-image streaming
- `POST /api/batch/decrypt-zip` — Upload encrypted ZIP for batch decrypt
- `GET /api/batch/image/:id` — Stream individual decrypted image
- `POST /api/batch/download` — Package decrypted results as ZIP
- `POST /api/batch/cleanup` — Clean up expired session data

#### UI — Minimal Web + Kinetic Typography design system
- Low-saturation monochrome palette via CSS custom properties
- Outlined button style with hover inversion
- Title hover sweep gradient animation (`titleSweep`)
- Status marquee cycling technical messages every 5s
- Loading dots CSS animation (`status-dots`)
- Shimmer skeleton placeholder for batch decrypt loading
- Positioned counter badge (`3/10`) on preview items
- Mobile-only prev/next navigation arrows (breakpoint 768px)
- Touch swipe gesture support (50px threshold)
- Keyboard navigation (Arrow keys, Home, End) in batch mode
- IntersectionObserver-based scroll tracking (threshold 0.5)
- Toast notifications with color-coded left border
- Progress bar with percentage label for batch operations
- Drag-and-drop file upload onto preview area
- `prefers-reduced-motion` support for accessibility

#### Button layout
- Three visual groups separated by `│`:
  - **Input**: [选择图片] [选择文件夹] [上传ZIP]
  - **Core**: [混淆] [解混淆] (accent border)
  - **Output**: [还原] [下载] [打包下载]
- `ipt` supports `multiple` — single file enters single mode, multiple files enter batch mode

#### Documentation
- `docs/frontend.md` — Complete frontend design system, DOM spec, interaction flows
- `docs/api.md` — API endpoint reference
- `docs/architecture.md` — System architecture overview
- `docs/setup.md` — Development and production setup guide
- AGENTS.md — Development conventions, testing standards, and review checklist

#### Testing
- 57 unit + integration tests across 5 test files
- Core algorithm tests (gilbert2d, encrypt/decrypt roundtrip)
- Batch processing tests (session management, ZIP creation/extraction)
- API endpoint E2E tests (upload → encrypt → download → decrypt → verify)
- UI rendering tests (HTML structure, CSS classes, JS behavior)
- Edge cases: 1x1 images, non-square aspect ratios, invalid ZIPs, missing files

#### Infrastructure
- TypeScript strict mode with `tsc --noEmit` linting
- Bun runtime + Hono HTTP framework
- pnpm workspace with sharp for image processing
- Session-based temporary file storage with cleanup
- ZIP packaging via `archiver` / extraction via `extract-zip`
