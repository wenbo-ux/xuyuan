// Netlify Functions 后端入口（部署到 Netlify 的云函数，免费、无需绑卡）
// 数据存储使用 Supabase 云数据库（免费）。
// 环境变量在 Netlify → Site settings → Environment variables 里配置：
//   SUPABASE_URL 和 SUPABASE_ANON_KEY
import express from "express";
import cors from "cors";
import serverless from "serverless-http";

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || "";

// Supabase PostgREST 封装（原生 fetch，无额外依赖）
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

function checkConfig() {
  return SUPABASE_URL && SUPABASE_KEY;
}

app.get("/api/messages", async (req, res) => {
  if (!checkConfig()) {
    return res.status(500).json({ error: "服务端未配置 SUPABASE_URL / SUPABASE_ANON_KEY" });
  }
  try {
    const rows = await supabaseFetch(
      "/messages?select=id,nickname,content,created_at&order=created_at.desc"
    );
    res.json({
      messages: rows.map(r => ({
        id: String(r.id),
        nickname: r.nickname,
        content: r.content,
        created_at: new Date(r.created_at).getTime()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: "读取留言失败: " + err.message });
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
  if (!checkConfig()) {
    return res.status(500).json({ error: "服务端未配置 SUPABASE_URL / SUPABASE_ANON_KEY" });
  }

  try {
    const rows = await supabaseFetch("/messages", {
      method: "POST",
      body: JSON.stringify({ nickname: nickname || "匿名", content }),
      headers: { Prefer: "return=representation" }
    });
    const r = rows[0];
    res.status(201).json({
      message: {
        id: String(r.id),
        nickname: r.nickname,
        content: r.content,
        created_at: new Date(r.created_at).getTime()
      }
    });
  } catch (err) {
    res.status(500).json({ error: "保存留言失败: " + err.message });
  }
});

export const handler = serverless(app);