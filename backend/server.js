import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "messages.json");

// ─────────────────────────────────────────────
// 存储层：优先用 Supabase（云数据库，数据持久）
// 未配置 SUPABASE_URL / SUPABASE_ANON_KEY 时，
// 自动回退到本地 JSON 文件（适合本地开发调试）。
// 环境变量在 Render → Environment 里配置。
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || "";
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Supabase PostgREST 封装（用原生 fetch，无需额外依赖）
async function supabaseFetch(pathname, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${pathname}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// 读取留言（统一把 created_at 转成毫秒时间戳，兼容前端）
async function readMessages() {
  if (useSupabase) {
    const rows = await supabaseFetch(
      "/messages?select=id,nickname,content,created_at&order=created_at.desc"
    );
    return rows.map(r => ({
      id: String(r.id),
      nickname: r.nickname,
      content: r.content,
      created_at: new Date(r.created_at).getTime()
    }));
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

// 新增留言
async function createMessage(nickname, content) {
  if (useSupabase) {
    const rows = await supabaseFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ nickname, content }),
      headers: { Prefer: "return=representation" }
    });
    const r = rows[0];
    return {
      id: String(r.id),
      nickname: r.nickname,
      content: r.content,
      created_at: new Date(r.created_at).getTime()
    };
  }
  const message = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nickname,
    content,
    created_at: Date.now()
  };
  const messages = await readMessages();
  messages.push(message);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
  return message;
}

const app = express();
app.use(express.json());

// CORS：生产环境建议改成你前端的具体域名，例如：
//   app.use(cors({ origin: "https://你的项目名.netlify.app" }));
app.use(cors());

// 本地演示：如果同仓库存在 frontend 目录，则顺带托管前端页面。
// 部署到 Render 后不影响（前端正式部署在 Netlify）。
const frontendDir = path.join(__dirname, "..", "frontend");
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  console.log("已托管前端: " + frontendDir);
}

app.get("/api/messages", async (req, res) => {
  try {
    const messages = (await readMessages()).sort((a, b) => b.created_at - a.created_at);
    res.json({ messages });
  } catch (err) {
    console.error("读取留言失败:", err.message);
    res.status(500).json({ error: "读取留言失败" });
  }
});

app.post("/api/messages", async (req, res) => {
  const nickname = String(req.body.nickname || "").trim().slice(0, 20);
  const content = String(req.body.content || "").trim();

  if (!content) {
    return res.status(400).json({ error: "留言内容不能为空" });
  }
  if (content.length > 200) {
    return res.status(400).json({ error: "留言不能超过 200 字" });
  }

  try {
    const message = await createMessage(nickname || "匿名", content);
    res.status(201).json({ message });
  } catch (err) {
    console.error("保存留言失败:", err.message);
    res.status(500).json({ error: "保存留言失败" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`许愿墙后端已启动: http://localhost:${port}`);
  console.log(useSupabase
    ? "存储: Supabase 云数据库 ✅"
    : "存储: 本地 JSON 文件（未配置 Supabase，重启会清空）");
});