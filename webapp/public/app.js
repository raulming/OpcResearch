const readinessQuestions = [
  "我不是因为焦虑才想创业，而是看见了一个长期值得解决的问题。",
  "我能清楚说出我的目标客户是谁。",
  "我知道这个客户正在被什么具体问题困扰。",
  "我已经和真实潜在客户聊过，或拿到过明确反馈。",
  "我知道客户为什么愿意为这个问题付费，以及大概能付多少钱。",
  "我有办法在 30 天内触达至少 50-100 个潜在客户。",
  "我能把自己的能力做成一个清晰的服务包、产品包或交付方案。",
  "我能承受 3-6 个月验证期的不确定性，并设定止损线。",
];

const aiQuestions = [
  "我能清楚描述一个客户问题，而不是只描述一个工具需求。",
  "我能给 AI 提供背景、目标、对象、限制和输出标准。",
  "我能让 AI 帮我拆解一个复杂任务，并形成行动步骤。",
  "我能判断 AI 输出是否靠谱，并进行查证和修正。",
  "我能用 AI 生成可直接使用的文案、方案、表格、PPT 或报告。",
  "我能用 AI 辅助设计服务包、报价、交付流程或客户沟通话术。",
  "我能把重复工作沉淀成模板、SOP 或提示词。",
  "我能用 AI 分析用户反馈、竞品信息或市场机会。",
  "我能用 AI 辅助获客内容生产，比如朋友圈、小红书、公众号、短视频脚本。",
  "我知道接下来 7 天要用 AI 改造哪个具体业务环节。",
];

const behaviorQuestions = [
  "我能把创业想法拆成每天可完成的小任务，并持续推进。",
  "即使没有明显进展，我也能连续 2-4 周保持固定行动节奏。",
  "面对结果不确定的尝试，我能先设定验证标准，而不是马上放弃。",
  "当一次测试失败时，我能把它当作信息来源，而不是否定自己。",
  "我愿意主动联系陌生或半熟客户，了解他们的真实问题。",
  "我能接受客户提出尖锐反馈，并继续追问背后的原因。",
  "每次行动后，我会记录结果、问题和下一步调整。",
  "我能根据客户反馈快速修改话术、方案或交付方式。",
  "没有人催促时，我也会主动安排验证任务并跟进结果。",
  "遇到卡点时，我会主动寻找资料、工具或人来帮助自己推进。",
];

const APP_BASE = (() => {
  const scriptPath = new URL(document.currentScript?.src || "app.js", location.href).pathname;
  return scriptPath.endsWith("/app.js") ? scriptPath.slice(0, -"/app.js".length) : "";
})();

function apiUrl(path) {
  return `${APP_BASE}${path}`;
}

function renderQuestions(containerId, questions, name) {
  const container = document.getElementById(containerId);
  container.innerHTML = questions
    .map((question, index) => {
      const options = [1, 2, 3, 4, 5]
        .map(
          (score) => `
            <label class="scale-option">
              <input type="radio" name="${name}_${index}" value="${score}" ${score === 3 ? "checked" : ""} />
              <span>${score}</span>
            </label>
          `,
        )
        .join("");
      return `
        <div class="question">
          <p>${index + 1}. ${question}</p>
          <div class="scale">${options}</div>
        </div>
      `;
    })
    .join("");
}

function collectScores(name, count) {
  return Array.from({ length: count }, (_, index) => {
    const input = document.querySelector(`input[name="${name}_${index}"]:checked`);
    return Number(input ? input.value : 0);
  });
}

function sum(numbers) {
  return numbers.reduce((total, value) => total + value, 0);
}

function classifyReadiness(score) {
  if (score <= 16) return "冲动探索型";
  if (score <= 24) return "副业验证型";
  if (score <= 30) return "服务启动型";
  return "系统放大型";
}

function classifyAi(score) {
  if (score <= 20) return "入门型";
  if (score <= 35) return "应用型";
  if (score <= 45) return "生产型";
  return "操盘型";
}

function classifyBehavior(score) {
  if (score <= 22) return "灵感探索型";
  if (score <= 34) return "任务推进型";
  if (score <= 43) return "客户验证型";
  return "系统操盘型";
}

function recommendDirection(readinessScore, aiScore) {
  if (readinessScore <= 16 || aiScore <= 20) {
    return {
      direction: "职业提效 / 个人学习",
      firstDeliverable: "个人工作流清单 + 10 个潜在客户访谈问题",
    };
  }
  if (readinessScore <= 24 && aiScore <= 35) {
    return {
      direction: "副业验证 / 内容获客",
      firstDeliverable: "30 天最小验证计划 + 1 个试单方案",
    };
  }
  if (readinessScore >= 25 && aiScore <= 35) {
    return {
      direction: "服务型 OPC",
      firstDeliverable: "服务包 + 报价单 + 交付 SOP",
    };
  }
  if (readinessScore <= 30 && aiScore >= 36) {
    return {
      direction: "工具化 / 产品化",
      firstDeliverable: "模板产品 / 小工具 / 课程原型 + 付费测试页",
    };
  }
  return {
    direction: "一人公司系统",
    firstDeliverable: "获客-交付-复盘自动化流程",
  };
}

function buildLocalResult(payload) {
  return {
    ...payload,
    readinessLevel: classifyReadiness(payload.readinessScore),
    aiLevel: classifyAi(payload.aiScore),
    behaviorType: classifyBehavior(payload.behaviorScore),
    ...recommendDirection(payload.readinessScore, payload.aiScore),
  };
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("结果已生成，但未保存到后台。");
  }
  return response.json();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderResult(result) {
  const resultEl = document.getElementById("result");
  resultEl.classList.remove("hidden");
  const toolboxHref = `${APP_BASE}/toolbox.html`;
  const behaviorType = result.behaviorType || classifyBehavior(result.behaviorScore);
  resultEl.innerHTML = `
    <h2>你的 OPC 启动报告</h2>
    <div class="result-grid">
      <div class="result-card"><span>启动准备度</span><strong>${result.readinessScore} / 40</strong><small>${result.readinessLevel}</small></div>
      <div class="result-card"><span>AI 能力状态</span><strong>${result.aiScore} / 50</strong><small>${result.aiLevel}</small></div>
      <div class="result-card"><span>行为风格</span><strong>${result.behaviorScore} / 50</strong><small>${escapeHtml(behaviorType)}</small></div>
      <div class="result-card"><span>适合方向</span><strong>${escapeHtml(result.direction)}</strong></div>
    </div>
    <div class="toolbox-grid">
      <div class="result-card">
        <span>第一份交付物</span>
        <strong>${escapeHtml(result.firstDeliverable)}</strong>
        <p>先拿到真实反馈，再决定要不要投入更多时间和预算。</p>
      </div>
      <div class="result-card">
        <span>下一步</span>
        <strong>生成《OPC 最小验证计划》</strong>
        <p>包含创业假设、客户访谈、服务包/MVP 和 7 天行动安排。</p>
        <a class="primary inline-action" href="${toolboxHref}">进入验证工具箱</a>
      </div>
    </div>
  `;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveUserState(user) {
  if (!user) return;
  localStorage.setItem("opcUser", JSON.stringify(user));
  if (user.inviteCode) localStorage.setItem("opcInviteCode", user.inviteCode);
  renderMemberSnapshot(user);
}

function renderMemberSnapshot(user = null) {
  let storedUser = user;
  if (!storedUser) {
    try {
      storedUser = JSON.parse(localStorage.getItem("opcUser") || "null");
    } catch {
      storedUser = null;
    }
  }
  if (!storedUser) return;
  const plan = document.getElementById("memberPlan");
  const credits = document.getElementById("memberCredits");
  const inviteCode = document.getElementById("memberInviteCode");
  if (plan) plan.textContent = storedUser.plan || "Free";
  if (credits) credits.textContent = `${Number(storedUser.credits || 0)} 积分`;
  if (inviteCode) inviteCode.textContent = storedUser.inviteCode || "待生成";
}

function fillInviteCode() {
  const input = document.querySelector('input[name="inviteCode"]');
  const inviteCode = localStorage.getItem("opcInviteCode");
  if (input && inviteCode) input.value = inviteCode;
}

renderQuestions("readinessQuestions", readinessQuestions, "readiness");
renderQuestions("aiQuestions", aiQuestions, "ai");
renderQuestions("behaviorQuestions", behaviorQuestions, "behavior");
fillInviteCode();
renderMemberSnapshot();

document.getElementById("surveyForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const readinessAnswers = collectScores("readiness", readinessQuestions.length);
  const aiAnswers = collectScores("ai", aiQuestions.length);
  const behaviorAnswers = collectScores("behavior", behaviorQuestions.length);
  const payload = {
    readinessAnswers,
    aiAnswers,
    behaviorAnswers,
    readinessScore: sum(readinessAnswers),
    aiScore: sum(aiAnswers),
    behaviorScore: sum(behaviorAnswers),
  };
  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }
  localStorage.setItem("opcSurveyPayload", JSON.stringify(payload));
  if (payload.inviteCode) {
    localStorage.setItem("opcInviteCode", String(payload.inviteCode).trim());
  }

  const button = form.querySelector("button[type='submit']");
  button.disabled = true;
  button.textContent = "提交中...";
  try {
    const response = await fetch(apiUrl("/api/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await readJsonResponse(response);
    if (!data.ok) throw new Error(data.error || "提交失败");
    localStorage.setItem("opcSurveyResult", JSON.stringify(data.result));
    saveUserState(data.user);
    renderResult(data.result);
    button.textContent = "报告已生成";
  } catch (error) {
    const localResult = buildLocalResult(payload);
    localStorage.setItem("opcSurveyResult", JSON.stringify(localResult));
    renderResult(localResult);
    button.textContent = "报告已生成，本地保存";
  } finally {
    button.disabled = false;
  }
});
