const APP_BASE = (() => {
  const scriptSrc = document.currentScript?.getAttribute("src") || "";
  const scriptPath = scriptSrc.startsWith("http") ? new URL(scriptSrc).pathname : scriptSrc;
  return scriptPath.endsWith("/toolbox.js") ? scriptPath.slice(0, -"/toolbox.js".length) : "";
})();

function apiUrl(path) {
  return `${APP_BASE}${path}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fillFromSurvey() {
  const raw = localStorage.getItem("opcSurveyPayload");
  const form = document.getElementById("toolboxForm");
  const savedInviteCode = localStorage.getItem("opcInviteCode");
  try {
    const data = raw ? JSON.parse(raw) : {};
    ["name", "contact", "role", "targetUser", "painPoint", "channel", "weeklyTime", "inviteCode"].forEach((key) => {
      if (data[key] && form.elements[key]) form.elements[key].value = data[key];
    });
  } catch {
    // Ignore broken local data.
  }
  if (savedInviteCode && form.elements.inviteCode && !form.elements.inviteCode.value) {
    form.elements.inviteCode.value = savedInviteCode;
  }
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("暂时无法保存，请稍后重试。");
  }
  return response.json();
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderPlan(plan, used) {
  const resultEl = document.getElementById("toolboxResult");
  resultEl.classList.remove("hidden");
  resultEl.innerHTML = `
    <h2>${escapeHtml(plan.title)}</h2>
    ${used ? '<p class="notice">你已经使用过免费完整体验，本页展示上次生成的计划。</p>' : '<p class="notice">已生成并保存。本次免费完整体验已使用。</p>'}
    <div class="result-card">
      <span>一句话创业假设</span>
      <strong>${escapeHtml(plan.hypothesis)}</strong>
    </div>
    <div class="toolbox-grid">
      <article class="result-card">
        <span>目标客户</span>
        <strong>${escapeHtml(plan.targetCustomer.who)}</strong>
        <p>${escapeHtml(plan.targetCustomer.painfulMoment)}</p>
        <p>首选渠道：${escapeHtml(plan.targetCustomer.firstChannel)}</p>
      </article>
      <article class="result-card">
        <span>关键假设</span>
        ${renderList(plan.keyAssumptions)}
      </article>
    </div>
    <div class="result-card">
      <span>10 个客户访谈问题</span>
      ${renderList(plan.interviewQuestions)}
    </div>
    <div class="toolbox-grid">
      <article class="result-card">
        <span>最小服务包 / MVP</span>
        <strong>${escapeHtml(plan.servicePackage.name)}</strong>
        <p>${escapeHtml(plan.servicePackage.promise)}</p>
        ${renderList(plan.servicePackage.deliverables)}
        <p>试单价格：${escapeHtml(plan.servicePackage.trialPrice)}</p>
      </article>
      <article class="result-card">
        <span>判断标准</span>
        <p><strong>继续：</strong>${escapeHtml(plan.decisionRule.continue)}</p>
        <p><strong>调整：</strong>${escapeHtml(plan.decisionRule.adjust)}</p>
        <p><strong>暂停：</strong>${escapeHtml(plan.decisionRule.stop)}</p>
      </article>
    </div>
    <div class="result-card">
      <span>7 天行动计划</span>
      <div class="timeline">
        ${plan.sevenDayPlan
          .map(
            (item) => `
              <div class="timeline-row">
                <strong>${escapeHtml(item.day)}</strong>
                <p>${escapeHtml(item.task)}</p>
                <small>输出：${escapeHtml(item.output)}</small>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("toolboxForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  if (payload.inviteCode) {
    localStorage.setItem("opcInviteCode", String(payload.inviteCode).trim());
  }
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "生成中...";
  try {
    const response = await fetch(apiUrl("/api/toolbox/run"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonResponse(response);
    if (!data.ok) throw new Error(data.error || "生成失败");
    localStorage.setItem("opcToolboxUsed", "true");
    renderPlan(data.result, data.used);
    button.textContent = data.used ? "已展示历史计划" : "已生成验证计划";
  } catch (error) {
    const resultEl = document.getElementById("toolboxResult");
    resultEl.classList.remove("hidden");
    resultEl.innerHTML = `<h2>暂时无法生成</h2><p class="notice">${escapeHtml(error.message)}</p>`;
    button.textContent = "重新生成";
  } finally {
    button.disabled = false;
  }
});

fillFromSurvey();
