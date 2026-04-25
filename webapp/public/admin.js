let latestRows = [];

const APP_BASE = (() => {
  const scriptSrc = document.currentScript?.getAttribute("src") || "";
  const scriptPath = scriptSrc.startsWith("http") ? new URL(scriptSrc).pathname : scriptSrc;
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
          <td>${escapeHtml(row.direction)}</td>
          <td>${escapeHtml(row.supportIntent || "未填写")}</td>
          <td>${escapeHtml(row.serviceLead)}</td>
          <td>${escapeHtml(row.painPoint)}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadData() {
  const token = getToken();
  const response = await fetch(apiUrl("/api/admin/responses"), {
    headers: { "x-admin-token": token },
  });
  const data = await response.json();
  if (!data.ok) {
    alert(data.error || "无法读取数据");
    return;
  }
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("totalCount").textContent = data.stats.total;
  document.getElementById("avgReadiness").textContent = data.stats.avgReadiness;
  document.getElementById("avgAi").textContent = data.stats.avgAi;
  renderBars("readinessChart", data.stats.readiness, data.stats.total);
  renderBars("aiChart", data.stats.aiLevel, data.stats.total);
  renderBars("directionChart", data.stats.direction, data.stats.total);
  renderBars("supportChart", data.stats.supportIntent, data.stats.total);
  renderBars("serviceChart", data.stats.serviceLead, data.stats.total);
  renderTable(data.responses);
}

function toCsv(rows) {
  const headers = ["时间", "姓名", "联系方式", "职业", "启动准备分", "启动状态", "AI分", "AI状态", "方向", "帮助意向", "服务线索", "目标人群", "痛点", "AI场景", "备注"];
  const fields = ["createdAt", "name", "contact", "role", "readinessScore", "readinessLevel", "aiScore", "aiLevel", "direction", "supportIntent", "serviceLead", "targetUser", "painPoint", "preferredScene", "notes"];
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
