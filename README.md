# ✨ 许愿墙（前后端分离示例）

一个最简单的「前端 + 后端」动态网页：

- **前端**：`frontend/`（HTML + CSS + JS），部署到 Netlify
- **后端**：`backend/`（Node.js + Express），部署到 Render
- **数据**：后端用 JSON 文件存储留言

## 本地运行

```bash
cd backend
npm install
npm start
```

打开 http://localhost:3000 即可看到完整页面（后端顺带托管了前端，方便本地联调）。

## 部署步骤

### 1. 推送到 GitHub

```bash
git init
git add .
git commit -m "init"
# 在 GitHub 新建仓库后：
git remote add origin https://github.com/你的用户名/你的仓库.git
git push -u origin main
```

### 2. 后端 → Render

1. 注册登录 Render（支持 GitHub 登录）
2. **New +** → **Web Service** → 选择你的 GitHub 仓库
3. 配置：
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`（默认，不用改）
   - Start Command: `npm start`（默认，不用改）
   - Instance Type: `Free`
4. Create Web Service，等待构建完成
5. 记下后端地址，例如 `https://xxx.onrender.com`

### 3. 前端 → Netlify

1. 打开 `frontend/app.js`，把顶部 `API_URL` 改成你的 Render 地址：
   ```js
   const API_URL = "https://xxx.onrender.com";
   ```
2. 提交并推送：`git push`
3. Netlify → **Add new site** → **Import an existing project** → GitHub → 选择仓库
4. Build settings 里设置 **Base directory: `frontend`**
5. Deploy，完成！

之后每次 `git push`，Netlify 和 Render 都会自动重新部署。

## 数据持久化：接入 Supabase（推荐）

后端默认用本地 JSON 文件存留言，但 Render 免费实例的磁盘重启后会被清空。
接入 Supabase（免费 PostgreSQL 云数据库）后，数据存在云端，永久保留。

### 1. 创建 Supabase 项目

1. 注册登录 [supabase.com](https://supabase.com)（支持 GitHub 登录）
2. **New project** → 选地区和密码（记住密码）→ 创建
3. 左侧 **SQL Editor** → New query，粘贴下面 SQL 并 Run：

```sql
create table messages (
  id bigint generated always as identity primary key,
  nickname text not null default '匿名',
  content text not null,
  created_at timestamptz not null default now()
);
```

4. 左侧 **Settings → API**，复制两个值：
   - `Project URL`（形如 `https://xxxx.supabase.co`）
   - `anon public` key（形如 `eyJhbGciOi...`）

### 2. 配置到 Render

Render 后台 → 你的 Web Service → **Environment** → Add Environment Variable：

```text
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOi...
```

保存后 Render 会自动重新部署。重启后看日志出现：

```text
存储: Supabase 云数据库 ✅
```

就说明接好了。**代码不用改**——`server.js` 检测到这两个环境变量就自动切换云数据库，没配置时自动回退本地文件（方便本地开发）。

### 3. 验证

往页面里发一条留言 → 打开 Supabase 的 **Table Editor** → `messages` 表，能看到刚发的数据。之后 Render 随便重启，数据都在。

## 注意事项

- Render 免费实例会休眠，冷启动约 30~60 秒，第一次打开请耐心等待。
- 没配置 Supabase 时，留言存在本地 JSON 文件，Render 重启后会清空；接入 Supabase 后不受影响。
- 想限制只允许你的 Netlify 域名访问，把 `server.js` 里的 `app.use(cors())` 改成：
  ```js
  app.use(cors({ origin: "https://你的项目名.netlify.app" }));
  ```

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/messages` | 获取全部留言（新的在前） |
| POST | `/api/messages` | 提交留言 `{ "nickname": "昵称", "content": "内容" }` |