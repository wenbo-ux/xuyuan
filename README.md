# ✨ 许愿墙（前后端分离示例）

一个最简单的「前端 + 后端」动态网页，全部免费部署在 Netlify：

- **前端**：`frontend/`（HTML + CSS + JS），由 Netlify 托管
- **后端**：`netlify/functions/api.js`（Netlify 云函数，免费、无需绑卡）
- **数据**：Supabase 云数据库（免费 PostgreSQL，数据永久保存）
- `backend/` 目录是本地开发版（Express + 文件存储），供 `npm start` 本地调试用

## 本地运行（不依赖任何云服务）

```bash
cd backend
npm install --no-bin-links   # iSH 环境需要；普通电脑直接 npm install
npm start
```

打开 http://localhost:3000 即可看到完整页面（本地版顺带托管了前端）。

## 部署步骤（只需 Netlify + Supabase，全程免费不绑卡）

### 1. 准备 Supabase（云数据库）

1. 注册登录 [supabase.com](https://supabase.com)（支持 GitHub 登录）
2. **New project** → 选地区和密码 → 创建
3. 左侧 **SQL Editor** → New query，粘贴并 Run：

```sql
create table messages (
  id bigint generated always as identity primary key,
  nickname text not null default '匿名',
  content text not null,
  created_at timestamptz not null default now()
);
```

4. 左侧 **Settings → API**，复制 `Project URL`（`https://xxxx.supabase.co`）和 `anon public` key（`eyJhbGciOi...`）

### 2. 部署到 Netlify

1. 把整个仓库推到 GitHub（`frontend/`、`netlify/`、`netlify.toml` 都要在）
2. Netlify → **Add new site** → **Import an existing project** → GitHub → 选仓库
3. **Build settings 里 Base directory 留空**（不要填 frontend！因为云函数在仓库根目录的 netlify/functions 里），
   Publish directory 会自动读取 `netlify.toml` 里的 `frontend`
4. 点 Deploy 等构建完成

### 3. 配置环境变量（关键）

Netlify 后台 → **Site configuration** → **Environment variables** → Add variable：

```text
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOi...
```

保存后 Netlify 会自动重新部署。

### 4. 完成

打开你的 `https://xxx.netlify.app`，发一条留言试试。之后：

- 前端页面：`frontend/` 里的文件
- 后端接口：`/api/messages`（Netlify 自动转发到云函数，见 `netlify.toml`）
- 数据：Supabase → Table Editor → `messages` 表

每次 `git push`，Netlify 自动重新部署，前后端一起更新。

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/messages` | 获取全部留言（新的在前） |
| POST | `/api/messages` | 提交留言 `{ "nickname": "昵称", "content": "内容" }` |

## 目录结构

```text
├── frontend/            # 前端页面（HTML/CSS/JS）
├── netlify/
│   └── functions/
│       └── api.js       # 后端云函数（部署版）
├── backend/             # 本地开发版后端（Express + JSON 文件存储）
├── netlify.toml         # Netlify 构建与转发配置
└── package.json         # 云函数依赖
```