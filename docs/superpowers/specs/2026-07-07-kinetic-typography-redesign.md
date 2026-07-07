# Kinetic Typography UI Redesign

基于 Gilbert 空间填充曲线的图片混淆工具 — 前端界面重构设计。

## 1. 色彩系统

低饱和雾蓝单色调色板，直角（border-radius: 0），neo-brutalist 硬阴影。

```css
--bg:         #FAFAFA     暖白背景
--fg:         #1B1B2F     蓝调近黑
--muted:      #E8EDF2     蓝灰柔和层
--muted-fg:   #7B8BA0     辅助文字
--border:     #1B1B2F     用主色做边框
--accent:     #4A6FA5     雾蓝主色
--accent-hover: #3D5E8C
--accent-muted: #E4EAF2   雾蓝极淡色
--success:    #2E8B57     保留绿色调
--error:      #C1292E     保留红色调
--radius:     0           全局直角
--shadow:     4px 4px 0 0 var(--border)  硬偏移阴影
```

## 2. 排版

### 字族

纯系统字体栈，零外部加载：

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", ui-sans-serif, system-ui, sans-serif
```

### 字号与字重

| 元素 | 字号 | 字重 | letter-spacing |
|---|---|---|---|
| h1 标题 | 2rem | 800 (ExtraBold) | -0.03em |
| .desc 副标题 | 0.85rem | 400 | 0 |
| 按钮文字 | 0.8rem | 700 (Bold) | 0.05em |
| 状态文字 | 0.8rem | 500 | 0.02em |
| Marquee | 0.6rem | 400 | 0.08em |

所有按钮 `text-transform: uppercase`。

### 标题区视觉布局

标题左对齐，左侧有 4px 粗竖线装饰贯穿整个头部（标题 + 副标题行）：

```
│
│ 图片混淆
│ 基于空间填充曲线的图片混淆。混淆图被压缩仍能保持色彩。
│ 仅供技术交流使用。输出 JPEG 质量 0.95。
│
```

竖线实现：头部容器 `border-left: 4px solid var(--accent)` + `padding-left: 1rem`

### 预览时标题自动隐藏

当图片加载后（无论是单图模式还是批量模式），h1 和 .desc 淡出（opacity: 0, pointer-events: none），按钮行、预览区、状态区保持可见。取消图片（还原或清空）时标题淡入恢复。

## 3. 按钮系统

### 布局

标题行和按钮行在同一行，flex space-between：

```
│ 图片混淆            [选择图片] [选择文件夹] [上传ZIP] │ [混淆] [解混淆] │ [还原] [下载] [打包下载]
│ 基于空间填充曲线的图片混淆...
```

### 按钮样式

所有按钮：`display: inline-flex`, `align-items: center`, `justify-content: center`, `text-transform: uppercase`, `font-weight: 700`, `letter-spacing: 0.05em`, `font-size: 0.8rem`, `padding: 0.7rem 1.2rem`, `height: auto`, `border: 2px solid var(--border)`, `border-radius: 0`, `cursor: pointer`。

三种级别：

| 级别 | 按钮 | 背景 | 阴影 | Hover | Active |
|---|---|---|---|---|---|
| 文件选择 | 选择图片, 选择文件夹, 上传ZIP | `accent-muted` | `--shadow` | 滤色加深 | shadow 2px |
| 核心操作 | 混淆, 解混淆 | `accent` | `--shadow` | `accent-hover` | shadow 2px |
| 输出管理 | 还原, 下载, 打包下载 | `bg` | `--shadow` | 背景变 accent, 文字反白 | shadow 2px |

Disabled：`opacity: 0.3`, `box-shadow: none`, `pointer-events: none`。

### 分隔符

三组按钮之间用 `│`（Unicode U+2502），颜色 `var(--muted-fg)`，`user-select: none`。

### 文件输入按钮

选择图片/文件夹/上传ZIP 是 `<span>` 包裹 `<input type="file">`，样式与其他按钮一致。`<input>` 使用 `position: absolute; inset: 0; opacity: 0; cursor: pointer`。

## 4. Kinetic Typography 动效

### 标题 Scramble（8s 周期）

每 8 秒自动触发：标题文字字符随机切换（显示随机字母/数字），持续约 600ms 后落定回"图片混淆"。中途 hover 打断并立即显示完整标题。

### 副标题字距脉冲（4s 周期）

`.desc` 的 `letter-spacing` 在 `-0.02em` 到 `0.03em` 之间 4s 正弦呼吸动画。

### 状态文字 Scramble（状态更新时触发）

当状态变化时（如"混淆完成"→"已加载 5 张图片"），旧状态文字经过随机字符过渡，约 400ms 后落定到新文字。如果状态更新频繁，前一个动画应取消。

### 背景 hue 漂移（30s 周期）

`--bg` 在 `#FAFAFA` 和 `#F0F4FA`（极淡蓝）之间 30s 往返渐变。使用 CSS `@property` 或 `animation` 驱动。不影响性能。

### 按钮交互

- Hover：shadow 位置不变，背景色变化，`transition: background .12s`
- Active/Click：`box-shadow` 从 `4px 4px` 变为 `2px 2px`，`transform: translate(2px, 2px)`，按下感
- 禁止 `:active` 样式在 mouseleave 后残留

### Marquee 切换

保留现有 marquee 机制（5s 间隔循环 3 条消息），过渡方式改为垂直滑动（`transform: translateY` ±100%）。

### prefers-reduced-motion

所有动效在用户启用了系统减少动效时降级：时长归零、循环归 1。scramble 改为直接 `textContent` 切换。

## 5. 布局结构

```
┌──────────────────────────────────────────────────┐
│  │ 图片混淆          [按钮行（flex space-between）] │
│  │ 描述文字...                                      │
├──────────────────────────────────────────────────┤
│               progress-wrap + spinner              │
├──────────────────────────────────────────────────┤
│  ┌──────┬─────────────────────────────────────┐   │
│  │侧边栏 │           预览区                    │   │
│  │140px  │  flex:1, scroll-snap               │   │
│  └──────┴─────────────────────────────────────┘   │
├──────────────────────────────────────────────────┤
│  status + status-marquee                          │
│  #toast-container (fixed top-right)               │
└──────────────────────────────────────────────────┘
```

### 响应式

| 断点 | 变化 |
|---|---|
| < 768px | 标题缩小至 1.3rem；按钮 padding 缩小；预览区 min-h 40vh；按钮行可能换行 |
| 预览模式 | h1 + desc 隐藏（opacity 0），按钮保持可见 |

## 6. 交互变更

### 预览时标题隐藏

在 `setSrc()` 和 `renderReaderView()` 中，当图片加载后给头部容器添加 `.previewing` class：
- `.previewing h1` → `opacity: 0; pointer-events: none`
- `.previewing .desc` → `opacity: 0; pointer-events: none`
- `transition: opacity 0.4s ease`

取消预览时（清空 batchItems、点击还原）移除 `.previewing`。

## 7. 实现范围

仅涉及 `src/ui.ts` 中三个函数：`css()`, `html()`, `clientJS()`。

| 文件 | 变更 |
|---|---|
| `src/ui.ts:css()` | 全部 CSS 重写：新调色板、按钮样式、标题区、kinetic 关键帧 |
| `src/ui.ts:html()` | 结构调整：标题+按钮同行，布局容器微调 |
| `src/ui.ts:clientJS()` | 新增 scramble 函数、预览时隐藏标题、active 态管理 |
| `src/ui.test.ts` | 更新断言：新 class 名、布局结构变化 |

### 不涉及

- 后端 API 不变
- 图片处理逻辑不变
- 数据流不变
- 无新依赖加载
- 性能关键路径（图片解码、ZIP 打包）不变

## 8. 测试要求

- 标题 scramble 间隔、触发与打断
- 预览时标题 opacity 切换
- 按钮 active 态 shadow 变化
- 全部现有 57 测试保持通过
- 新增测试 ≥ 80% 覆盖率
