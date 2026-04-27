let latestRows = [];
let latestToolboxRuns = [];
let latestUsers = [];

const APP_BASE = (() => {
  const scriptPath = new URL(document.currentScript?.src || "admin.js", location.href).pathname;
  return scriptPath.endsWith("/admin.js") ? scriptPath.slice(0, -"/admin.js".length) : "";
})();

function apiUrl(path) {
  return `${APP_BASE}${path}`;
}

function getToken() {
  const params = new URLSearchParams(location.search);
  return document.getElementById("tokenInput").value || params.get("token") || "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderBars(id, data, total) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  document.getElementById(id).innerHTML = entries.length
    ? entries
        .map(([label, count]) => {
          const width = total ? Math.round((count / total) * 100) : 0;
          return `
            <div class="bar-row">
              <div class="bar-label">${escapeHtml(label)}</div>
              <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
              <div class="bar-count">${count}</div>
            </div>
          `;
        })
        .join("")
    : "<p>暂无数据</p>";
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("接口暂时不可用，请确认服务已更新并重启。");
  }
  return response.json();
}

function showAdminMessage(message) {
  const loginBox = document.getElementById("loginBox");
  let messageEl = document.getElementById("adminMessage");
  if (!messageEl) {
    messageEl = document.createElement("p");
    messageEl.id = "adminMessage";
    messageEl.className = "admin-message";
    loginBox.appendChild(messageEl);
  }
  messageEl.textContent = message;
}

function renderTable(rows) {
  latestRows = rows;
  document.getElementById("responsesBody").innerHTML = rows
    .slice()
    .reverse()
    .map(
      (row) => `
        <tr>
          <td>${new Date(row.createdAt).toLocaleString("zh-CN")}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.contact)}</td>
          <td>${escapeHtml(row.role)}</td>
          <td>${row.readinessScore} / ${escapeHtml(row.readinessLevel)}</td>
          <td>${row.aiScore} / ${escapeHtml(row.aiLevel)}</td>
          <td>${row.behaviorScore ?? "未填写"} / ${escapeHtml(row.behaviorType || "未填写")}</td>
          <td>${escapeHtml(row.direction)}</td>
          <td>${escapeHtml(row.supportIntent || "未填写")}</td>
          <td>${escapeHtml(row.inviteCode || "未填写")}</td>
          <td>${escapeHtml(row.serviceLead)}</td>
          <td>${escapeHtml(row.painPoint)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderToolboxTable(rows) {
  latestToolboxRuns = rows || [];
  document.getElementById("toolboxBody").innerHTML = latestToolboxRuns
    .slice()
    .reverse()
    .map(
      (row) => `
        <tr>
          <td>${new Date(row.createdAt).toLocaleString("zh-CN")}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.contact)}</td>
          <td>${escapeHtml(row.role)}</td>
          <td>${escapeHtml(row.targetUser)}</td>
          <td>${escapeHtml(row.painPoint)}</td>
          <td>${escapeHtml(row.inviteCode || "未填写")}</td>
          <td>${escapeHtml(row.price)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderUsersTable(rows) {
  latestUsers = rows || [];
  document.getElementById("usersBody").innerHTML = latestUsers
    .slice()
    .sort((a, b) => String(a.contact || "").localeCompare(String(b.contact || ""), "zh-CN"))
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.contact || "未填写")}</td>
          <td>${escapeHtml(row.plan || "free")}</td>
          <td>${Number(row.credits || 0)}</td>
          <td>${row.freeToolboxUsed ? "已使用" : "未使用"}</td>
          <td>${escapeHtml(row.inviteCode || "未生成")}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadData() {
  const token = getToken();
  try {
    const response = await fetch(apiUrl("/api/admin/responses"), {
      headers: { "x-admin-token": token },
    });
    const data = await readJsonResponse(response);
    if (!data.ok) throw new Error(data.error || "无法读取数据");
    showAdminMessage("");
    document.getElementById("dashboard").classList.remove("hidden");
    document.getElementById("totalCount").textContent = data.stats.total;
    document.getElementById("avgReadiness").textContent = data.stats.avgReadiness;
    document.getElementById("avgAi").textContent = data.stats.avgAi;
    document.getElementById("avgBehavior").textContent = data.stats.avgBehavior;
    document.getElementById("toolboxCount").textContent = (data.toolboxRuns || []).length;
    document.getElementById("userCount").textContent = data.stats.userCount ?? data.userSummary?.total ?? 0;
    document.getElementById("creditRecordCount").textContent = data.stats.creditRecordCount ?? data.creditLedger?.length ?? 0;
    document.getElementById("inviteCount").textContent = data.stats.inviteCount ?? data.invitations?.length ?? 0;
    renderBars("readinessChart", data.stats.readiness, data.stats.total);
    renderBars("aiChart", data.stats.aiLevel, data.stats.total);
    renderBars("behaviorChart", data.stats.behaviorType, data.stats.total);
    renderBars("directionChart", data.stats.direction, data.stats.total);
    renderBars("supportChart", data.stats.supportIntent, data.stats.total);
    renderBars("serviceChart", data.stats.serviceLead, data.stats.total);
    renderTable(data.responses);
    renderToolboxTable(data.toolboxRuns);
    renderUsersTable(data.users);
  } catch (error) {
    showAdminMessage(error.message);
  }
}

function toCsv(rows) {
  const headers = ["时间", "姓名", "联系方式", "职业", "启动准备分", "启动状态", "AI分", "AI状态", "behaviorScore", "behaviorType", "方向", "帮助意向", "邀请码", "服务线索", "目标人群", "痛点", "AI场景", "备注"];
  const fields = ["createdAt", "name", "contact", "role", "readinessScore", "readinessLevel", "aiScore", "aiLevel", "behaviorScore", "behaviorType", "direction", "supportIntent", "inviteCode", "serviceLead", "targetUser", "painPoint", "preferredScene", "notes"];
  const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.map(escapeCsv).join(","), ...rows.map((row) => fields.map((field) => escapeCsv(row[field])).join(","))].join("\n");
}

document.getElementById("loadBtn").addEventListener("click", loadData);
document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([toCsv(latestRows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "opc-ai-survey.csv";
  link.click();
  URL.revokeObjectURL(url);
});

const urlToken = new URLSearchParams(location.search).get("token");
if (urlToken) {
  document.getElementById("tokenInput").value = urlToken;
  loadData();
}
