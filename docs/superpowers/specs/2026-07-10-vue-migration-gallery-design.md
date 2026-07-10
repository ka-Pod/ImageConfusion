# Vue.js 迁移 + 漫画画廊设计文档

## 1. 目标

- 将当前 `src/ui.ts` 中 931 行的单体 HTML/CSS/JS 重构为 Vue 3 项目
- 新增漫画画廊功能：持久化混淆漫画 + 按需解密阅读

## 2. 技术选型

| 项目 | 选型 |
|------|------|
| 前端框架 | Vue 3 + Composition API |
| 构建工具 | Vite |
| 路由 | Vue Router |
| 状态管理 | 无（ref/reactive） |
| 样式方案 | CSS Variables + Scoped CSS（保留 Neo-Brutalist 风格） |

## 3. 路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 重定向到 `/confuse` | — |
| `/confuse` | ConfusePage | 现有混淆工具功能迁移 |
| `/gallery` | GalleryPage | 漫画画廊首页 |
| `/gallery/:id/detail` | ComicDetailPage | 漫画详情 + 解密入口 |
| `/gallery/:id/reader` | ReaderPage | 翻页阅读器 |

## 4. 项目结构

```
src/
├── server/                        # 后端（所有现有文件不变）
│   ├── index.ts
│   ├── app.ts
│   ├── routes.ts                  # 单图/批量 API（不变）
│   ├── confuse.ts
│   ├── gilbert.ts
│   ├── batch.ts
│   ├── logger.ts
│   └── gallery-routes.ts          # 新增：漫画画廊 API
│
├── client/                        # Vue 前端（新增）
│   ├── main.ts                    # Vue app 入口
│   ├── router.ts                  # Vue Router 配置
│   ├── App.vue                    # 根组件（含顶部导航）
│   ├── assets/
│   │   └── styles/
│   │       ├── main.css           # 全局 CSS 变量 + Neo-Brutalist 样式
│   │       └── animations.css     # 动画定义
│   ├── pages/
│   │   ├── ConfusePage.vue        # /confuse 混淆工具页
│   │   ├── GalleryPage.vue        # /gallery 漫画画廊
│   │   ├── ComicDetailPage.vue    # /gallery/:id/detail 漫画详情
│   │   └── ReaderPage.vue         # /gallery/:id/reader 阅读器
│   ├── components/
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── ToastContainer.vue
│   │   │   ├── ProgressBar.vue
│   │   │   └── DropZone.vue
│   │   ├── confuse/
│   │   │   ├── ControlBar.vue
│   │   │   ├── ImagePreview.vue
│   │   │   ├── ThumbnailSidebar.vue
│   │   │   └── SaveAsComicModal.vue  # 保存为漫画弹窗
│   │   ├── gallery/
│   │   │   ├── ComicCard.vue         # 漫画封面卡片
│   │   │   └── NewComicModal.vue     # 新建漫画弹窗（上传已有漫画 ZIP）
│   │   └── reader/
│   │       ├── ComicPage.vue         # 单页渲染
│   │       └── PageNav.vue           # 翻页导航
│   ├── composables/
│   │   ├── useConfuse.ts          # 混淆工具状态逻辑
│   │   ├── useToast.ts            # Toast 通知
│   │   └── useKeyboard.ts         # 键盘导航
│   └── types/
│       └── index.ts               # 类型定义
│
├── storage/                       # 持久化：混淆漫画 ZIP
│   └── <comic-id>/
│       └── encrypted.zip          # 内含 metadata.json + 混淆图片
│
├── public/                        # Vite 构建产物（生产）
├── vite.config.ts
└── tsconfig.json                  # 更新为包含 client/
```

## 5. 漫画 ZIP 格式

```
encrypted.zip
├── metadata.json
│   {
│     "name": "海贼王 第1话",
│     "author": "尾田荣一郎",
│     "source": "腾讯动漫",
│     "createdAt": "2026-07-10T12:00:00Z",
│     "coverIndex": 0
│   }
├── page_001.jpg     # 混淆后的图片（JPEG q95）
├── page_002.jpg
└── ...
```

- `totalPages` 由 ZIP 内图片数量自动推导
- `coverIndex` 默认 0（第一张图片作为封面），也可手动指定
- 图片文件按 `page_NNN.jpg` 命名，四位数序号

## 6. API 设计

### 现有 API（保持不变）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/encrypt | 单图加密 |
| POST | /api/decrypt | 单图解密 |
| POST | /api/batch/encrypt | 批量加密 |
| POST | /api/batch/decrypt | 批量解密 |
| POST | /api/batch/decrypt-zip | ZIP 批量解密 |
| GET | /api/batch/image/:id | 获取处理后的单张图片 |
| POST | /api/batch/download | 打包下载 |
| POST | /api/batch/cleanup | 清理会话 |

### 新增画廊 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/gallery/create | 上传原始图片 + 元信息 → 混淆 → 打包漫画 ZIP → 存入 storage/ |
| GET | /api/gallery/list | 扫描 storage/ → 返回漫画列表（含已解密封面 base64） |
| GET | /api/gallery/:id | 返回单部漫画详情（封面大图 + 元信息） |
| POST | /api/gallery/:id/decrypt | 解密全部混淆图片 → 存入 tmp/ → 返回 sessionId |
| GET | /api/gallery/decrypt/:sessionId/page/:n | 获取第 N 页解密图片 |
| POST | /api/gallery/cleanup | 清理解密临时文件 |
| POST | /api/confuse/save-to-gallery | 将批量加密结果保存为漫画（从 /confuse 触发） |

## 7. 核心流程

### 7.1 混淆工具页 (/confuse)

保持现有功能：
- 单图模式：选择图片 → 加密/解密 → 预览 → 下载
- 批量模式：选择多图 → 批量加密 → 打包下载
- 新增：批量加密结果中增加"保存为漫画"按钮

**保存为漫画流程：**
1. 用户批量加密图片 → 服务端返回加密结果
2. 用户点击"保存为漫画"
3. 弹出 `SaveAsComicModal`：输入漫画名、作者、图源
4. 确认 → 服务端将加密结果重新打包为漫画格式 ZIP（含 metadata.json）
5. 存入 `storage/<new-id>/encrypted.zip`

### 7.2 新建漫画 (/gallery)

**路径 A — 从 /confuse 保存（见 7.1）**

**路径 B — 直接在 /gallery 导入：**
1. 用户点击"新建漫画" → 弹出 `NewComicModal`
2. 上传已有漫画格式 ZIP（必须含 metadata.json）
3. 校验 ZIP 内部结构 → 存入 `storage/<new-id>/`

### 7.3 漫画画廊 (/gallery)

- 每次进入页面时扫描 `storage/` 目录
- 读取每个漫画文件夹的 `encrypted.zip` 内的 `metadata.json`
- 解密第一张图片作为封面缩略图（base64 内嵌）
- 按 `createdAt` 降序排列
- 展示为漫画卡片网格：封面 + 漫画名 + 作者 + 日期
- 点击卡片 → 跳转 `/gallery/:id/detail`

### 7.4 漫画详情 (/gallery/:id/detail)

展示：
- 已解密的封面大图
- 漫画元信息：名称、作者、图源、创建时间、页数
- 操作按钮："开始解密并阅读"

解密流程：
1. 用户点击"开始解密并阅读"
2. 服务端读取 `storage/<id>/encrypted.zip`
3. 解压 ZIP → 逐张解密图片 → 存入系统临时目录 `tmp/imageconfusion-gallery-<sessionId>/`
4. 返回 `sessionId` 和总页数
5. 前端跳转到 `/gallery/:id/reader?session=<sessionId>`

### 7.5 漫画阅读器 (/gallery/:id/reader)

翻页阅读体验：
- 顶部栏：返回按钮 + 漫画名 + 页码指示器
- 中央大图展示，左右翻页按钮
- 底部缩略图导航条
- 键盘快捷键：← → 翻页，Home/End 首尾页
- 触摸滑动支持（移动端）

退出时：
- 返回 `/gallery` → 自动调用清理接口，删除临时解密文件

## 8. 数据流

### 8.1 漫画创建数据流

```
用户上传原始图片
  → Hono 接收 multipart/form-data
  → sharp 解码 → gilbert 混淆 → JPEG 编码
  → 创建临时 ZIP（含 metadata.json + 所有混淆图片）
  → 生成 UUID → storage/<uuid>/encrypted.zip
  → 返回漫画 ID 和元信息
```

### 8.2 漫画阅读数据流

```
用户点击"开始解密"
  → POST /api/gallery/:id/decrypt
  → 服务端读取 storage/<id>/encrypted.zip
  → 解压 ZIP，读取 metadata.json
  → 逐张解密图片，存入 tmp/ 目录
  → 返回 sessionId + 总页数

翻页请求：
  → GET /api/gallery/decrypt/<sessionId>/page/<n>
  → 返回已解密的 JPEG 图片

退出阅读：
  → POST /api/gallery/cleanup { sessionId }
  → 删除 tmp/ 目录中的临时文件
```

## 9. 错误处理

| 场景 | 处理方式 |
|------|----------|
| storage/ 目录不存在 | 启动时自动创建，画廊显示"暂无漫画" |
| ZIP 内缺少 metadata.json | 上传时校验，不符合则拒绝并提示 |
| 解密失败（图片损坏等） | 阅读器中该页显示"解密失败"提示，跳过 |
| 临时目录清理失败 | 静默处理，不影响用户 |
| 扫描时遇到损坏的 ZIP | 跳过该条目，记录日志 |
| 会话过期/临时文件被删除 | 返回详情页，提示重新解密 |
| 上传非图片文件 | 过滤并忽略，提示用户 |

## 10. 测试策略

| 范围 | 测试内容 |
|------|----------|
| 单元测试 | gallery-routes.ts — create/list/detail/decrypt/cleanup |
| 单元测试 | ZIP 打包/解包 — metadata.json 读写 |
| 单元测试 | ConfusePage 原有功能无回归 |
| E2E 测试 | 新建漫画 → 画廊显示 → 解密 → 阅读完整流程 |
| E2E 测试 | /confuse 批量加密后保存为漫画 |
| E2E 测试 | 损坏 ZIP 的拒绝处理 |

## 11. 不在此范围

- 不修改核心混淆算法（gilbert.ts, confuse.ts）
- 不修改单图/批量 API 的行为
- 不引入状态管理库（Pinia/Vuex）
- 不修改现有的 Neo-Brutalist 设计风格
