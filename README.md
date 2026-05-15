# 汉语教学语音纠错辅助工具

高校留学生对外汉语课堂辅助工具，基于 AI 语音识别技术提供精准发音反馈。

## 项目架构

```
.
├── docs/                      # 项目文档
├── supabase/                  # 数据库迁移脚本
│   └── migrations/
│       ├── 20240321_schema.sql    # DDL 建表语句
│       └── 20240321_rls.sql       # RLS 安全策略
├── web-platform/              # 教师端 (Next.js 14)
│   ├── src/
│   │   ├── app/               # 路由层
│   │   ├── components/        # UI 组件
│   │   ├── lib/               # 工具库
│   │   └── types/             # TypeScript 类型
│   └── package.json
├── miniprogram/               # 学生端 (微信小程序)
│   ├── pages/                 # 页面
│   ├── components/            # 自定义组件
│   └── utils/                 # 工具库
└── 核心上下文文档/             # 设计文档
    ├── schema.sql.txt
    ├── rls.sql.txt
    ├── api.md
    └── UI设计与组件规范.md
```

## 技术栈

### 教师端 (PC Web)
- **框架**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS + Glassmorphism 设计
- **动画**: Framer Motion
- **数据库**: Supabase (PostgreSQL)
- **部署**: Vercel

### 学生端 (微信小程序)
- **框架**: 微信原生小程序
- **录音**: RecorderManager
- **图表**: ECharts for Weixin
- **设计风格**: 与教师端一致的柔和通透风

### 后端服务
- **BFF**: Next.js API Routes
- **AI 评测**: 科大讯飞 CPA + TTS
- **数据库**: Supabase (RLS 安全策略)

## 核心功能

### MVP 功能 (已完成基础结构)
- [x] 项目目录结构初始化
- [x] 数据库 Schema 设计
- [x] RLS 安全策略配置
- [x] 教师端基础页面 (登录、看板)
- [x] 学生端基础页面 (登录、任务列表、练习、成绩)

### 待开发功能
- [ ] 科大讯飞 API 集成
- [ ] WebSocket 流式录音
- [ ] 声调双曲线图表
- [ ] 舌位视频播放器
- [ ] 教师端班级管理
- [ ] 教师端任务管理
- [ ] 教师端成绩看板

## 快速开始

### 1. 安装依赖

```bash
# 教师端
cd web-platform
npm install

# 运行开发服务器
npm run dev
```

### 2. 配置环境变量

复制 `web-platform/.env.local.example` 为 `.env.local`，填写以下配置：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
IFLYTEK_APP_ID=your_app_id
IFLYTEK_API_KEY=your_api_key
IFLYTEK_API_SECRET=your_api_secret
```

### 3. 初始化数据库

在 Supabase SQL Editor 中依次执行：
1. `supabase/migrations/20240321_schema.sql`
2. `supabase/migrations/20240321_rls.sql`

### 4. 微信小程序开发

使用微信开发者工具打开 `miniprogram` 目录。

## 设计规范

### 色彩系统
- **主色**: 柔和晴空蓝 `#3b82f6`
- **成功**: 薄荷绿 `#10b981`
- **错误**: 珊瑚红 `#f43f5e`
- **背景**: 冷灰白 `#f8fafc`

### 视觉风格
- Glassmorphism (毛玻璃效果)
- 柔和阴影
- 流畅动画

## 安全设计

- **RLS 策略**: 严格的数据行级安全
- **反范式设计**: student_records 冗余 class_id 字段
- **零信任写入**: 成绩由后端 Service Role 写入
- **软删除**: 所有删除操作使用 is_deleted 标记

## 文档

- [API 设计文档](./核心上下文文档/api.md)
- [UI 设计规范](./核心上下文文档/UI设计与组件规范.md)
- [数据库 Schema](./核心上下文文档/schema.sql.txt)
- [RLS 安全策略](./核心上下文文档/rls.sql.txt)

## 许可证

MIT License
