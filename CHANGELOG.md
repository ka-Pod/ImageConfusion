# Changelog

All notable changes to ImageConfusion will be documented in this file.

## [v2.0.0] - 2026-07-11

### Added

- **漫画画廊**：完整的漫画管理功能，支持导入、列表、详情、解密阅读
- **画廊删除**：在漫画详情页可删除漫画（物理删除 storage 目录）
- **Storage 隔离**：支持 `IMAGE_CONFUSION_STORAGE_DIR` 环境变量自定义存储目录
- **PNG 无损加密**：`processImageBuffer` 支持 `png` 格式，画廊加密页使用 PNG 避免有损压缩破坏像素

### Fixed

- **文件上传失效**：修复 ControlBar.vue 上传按钮不传递 File 对象的问题，重新连接 ConfusePage 事件
- **漫画画廊解密异常**：`/api/gallery/create` 不再对 ZIP 内图片二次加密，含 `metadata.json` 直接导入，否则补写 metadata
- **Storage 测试污染**：测试使用独立 `storage-test-<uuid>` 目录，避免 `bun test` 删除用户漫画
- **内存泄漏**：修复 batch 模式下的 blob URL 未释放问题
- **存储原子写入**：`saveComic` 使用 `.tmp` + `rename` 避免写入中断导致损坏

### Changed

- **Gallery 仅接收 ZIP**：NewComicModal 只接受 `.zip` 文件，并自动检测 `metadata.json`
- **API 变更**：`/api/gallery/create` 只接收 `zip` 字段，不再接收 `image[]`

## [v1.4.7] - 2026-07-08

### Fixed

- **Image not centered**: Add margin: 0 auto to horizontally center image in preview area
- **Layout jump during encryption/decryption**: Remove scroll-snap-type to prevent DOM change jumps

## [v1.4.6] - 2026-07-08

### Fixed

- **Layout shift during encryption/decryption**: Spinner now uses absolute positioning, processImage uses shimmer placeholder to maintain container height
- **Restore button not working**: Store original File object instead of blob URL to prevent URL revocation issues
- **Code quality**: Remove `any` types from tests, use async/await instead of .then(), fix potential memory leak in processImage

## [v1.4.5] - 2026-07-08

### Fixed

- **ZIP file path handling**: Clean directory prefixes from extracted ZIP file paths to prevent filename issues
- **Batch encrypt response**: Add missing `id` field to `/api/batch/encrypt` response for consistency
- **ZIP upload cleanup**: Properly cleanup session when `/api/batch/decrypt-zip` fails
- **Memory leak**: Revoke blob URLs after batch download to prevent memory accumulation

### Added

- **Classified error messages**: Error toasts now show category-specific messages (network, format, expired, size, server) with appropriate colors and longer display time for errors

## [v1.4.2] - 2026-07-07

### Fixed

- **Button state after mode switch**: When switching from batch to single image mode, buttons (enc, dec, re, download) are now properly enabled

## [v1.4.1] - 2026-07-07

### Fixed

- **State cleanup on mode switch**: Properly reset batchItems, sessionId, zipId, selectedIndex when switching from batch to single image mode; call cleanup API to release server resources
- **HTTP header injection**: Sanitize filenames in Content-Disposition header to prevent injection attacks
- **Memory leak**: Revoke blob URLs in setSrc and renderReaderView to prevent memory leaks
- **Scramble race condition**: Use separate timer variables for title and status scramble animations to prevent interference

## [v1.4] - 2026-07-06

### Added

- Batch processing: multi-image encrypt/decrypt with ZIP packaging
- ZIP upload for batch decrypt (upload encrypt_results.zip)
- Reader layout with thumbnail sidebar and scroll-snap
- Kinetic Typography: title scramble, status scramble, background hue drift, letter pulse
- Neo-brutalist UI with low-saturation misty blue palette
- Touch swipe navigation for mobile
- Keyboard navigation (arrows, Home, End)
- Shimmer placeholder for loading states

## [v1.3.2] - 2026-07-06

### Fixed

- Vercel deployment compatibility

## [v1.3.1] - 2026-07-06

### Fixed

- Bun.serve() port conflict when imported as module

## [v1.3] - 2026-07-06

### Added

- Vercel deployment support

## [v1.2] - 2026-07-06

### Added

- Logger module with fallback paths

## [v1.1] - 2026-07-06

### Added

- UI redesign with kinetic typography

## [v1.0] - 2026-07-06

### Added

- Initial release
- Single image encrypt/decrypt
- Gilbert 2D space-filling curve
- Hono HTTP server
- sharp image processing
