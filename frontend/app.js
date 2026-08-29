// ─────────────────────────────────────────────
// 后端地址配置（部署时必改）
// 部署到 Render 后，把下面改成你的真实后端地址，例如：
//   const API_URL = "https://my-api.onrender.com";
// 留空 "" 表示同域（本地演示 / Netlify 转发场景）
const API_URL = "";
// ─────────────────────────────────────────────

const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const nicknameEl = document.getElementById("nickname");
const contentEl = document.getElementById("content");
const submitBtn = document.getElementById("submitBtn");
const charCount = document.getElementById("charCount");
const statusCard = document.getElementById("statusCard");

const AVATARS = ["🐱", "🐶", "🦊", "🐼", "🐸", "🐵", "🦁", "🐯", "🐰", "🐨", "🐷", "🦄", "🐙", "🐳", "🦋", "🌻"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function avatarFor(name) {
  return AVATARS[hash(name || "匿名") % AVATARS.length];
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function showStatus(msg, isError = false) {
  statusCard.textContent = msg;
  statusCard.classList.toggle("hidden", !msg);
  statusCard.classList.toggle("error", isError);
}

function renderMessages(messages) {
  listEl.querySelectorAll(".msg-card").forEach(el => el.remove());
  emptyEl.classList.toggle("hidden", messages.length > 0);
  messages.forEach(msg => {
    const card = document.createElement("article");
    card.className = "msg-card";
    card.innerHTML = `
      <div class="msg-avatar">${avatarFor(msg.nickname)}</div>
      <div class="msg-body">
        <div class="msg-head">
          <span class="msg-name">${escapeHtml(msg.nickname)}</span>
          <span class="msg-time">${timeAgo(msg.created_at)}</span>
        </div>
        <p class="msg-content">${escapeHtml(msg.content)}</p>
      </div>
    `;
    listEl.prepend(card);
  });
}

async function loadMessages() {
  showStatus("正在连接后端…");
  try {
    const res = await fetch(`${API_URL}/api/messages`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    renderMessages(data.messages || []);
    showStatus("");
  } catch (err) {
    showStatus("⚠️ 无法连接后端服务器。请确认后端已部署，并在 app.js 中配置 API_URL。", true);
  }
}

async function submitMessage() {
  const nickname = nicknameEl.value.trim() || "匿名";
  const content = contentEl.value.trim();
  if (!content) {
    showStatus("请先写下你的愿望或留言 ✍️", true);
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = "许愿中…";
  try {
    const res = await fetch(`${API_URL}/api/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, content })
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error || "HTTP " + res.status);
    }
    contentEl.value = "";
    charCount.textContent = "0 / 200";
    await loadMessages();
    showStatus("🎉 愿望已记录，祝你实现！");
  } catch (err) {
    showStatus("⚠️ 提交失败：" + err.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🌟 许愿";
  }
}

contentEl.addEventListener("input", () => {
  charCount.textContent = `${contentEl.value.length} / 200`;
});

submitBtn.addEventListener("click", submitMessage);

loadMessages();