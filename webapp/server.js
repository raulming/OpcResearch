const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3100);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "opc2026";
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH || "");
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "responses.json");
const TOOLBOX_FILE = path.join(DATA_DIR, "toolbox_runs.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function normalizeBasePath(value) {
  const clean = String(value || "").trim().replace(/\/+$/, "");
  if (!clean || clean === "/") return "";
  return clean.startsWith("/") ? clean : `/${clean}`;
}

function stripBasePath(url) {
  if (!BASE_PATH || url === BASE_PATH) return url;
  return url.startsWith(`${BASE_PATH}/`) ? url.slice(BASE_PATH.length) : url;
}

function ensureDataFile(file = DATA_FILE) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]\n", "utf8");
  }
}

function readJsonList(file) {
  ensureDataFile(file);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeJsonList(file, items) {
  ensureDataFile(file);
  fs.writeFileSync(file, JSON.stringify(items, null, 2) + "\n", "utf8");
}

function readResponses() {
  return readJsonList(DATA_FILE);
}

function writeResponses(responses) {
  writeJsonList(DATA_FILE, responses);
}

function readToolboxRuns() {
  return readJsonList(TOOLBOX_FILE);
}

function writeToolboxRuns(runs) {
  writeJsonList(TOOLBOX_FILE, runs);
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function cleanText(value, max = 200) {
  return String(value || "").trim().slice(0, max);
}

function cleanNumber(value, min = 0, max = 100) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, num));
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

function recommendDirection(readinessScore, aiScore) {
  if (readinessScore <= 16 || aiScore <= 20) {
    return {
      direction: "职业提效 / 个人学习",
      firstDeliverable: "个人工作流清单 + 10 个潜在客户访谈问题",
      serviceLead: "入门训练营",
    };
  }
  if (readinessScore <= 24 && aiScore <= 35) {
    return {
      direction: "副业验证 / 内容获客",
      firstDeliverable: "30 天最小验证计划 + 1 个试单方案",
      serviceLead: "场景工作坊",
    };
  }
  if (readinessScore >= 25 && aiScore <= 35) {
    return {
      direction: "服务型 OPC",
      firstDeliverable: "服务包 + 报价单 + 交付 SOP",
      serviceLead: "咨询陪跑",
    };
  }
  if (readinessScore <= 30 && aiScore >= 36) {
    return {
      direction: "工具化 / 产品化",
      firstDeliverable: "模板产品 / 小工具 / 课程原型 + 付费测试页",
      serviceLead: "产品共创",
    };
  }
  return {
    direction: "一人公司系统",
    firstDeliverable: "获客-交付-复盘自动化流程",
    serviceLead: "系统搭建",
  };
}

function listFromText(value, fallback) {
  const items = String(value || "")
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items.slice(0, 6) : fallback;
}

function buildToolboxPlan(input) {
  const targetUser = cleanText(input.targetUser, 120) || "一类有明确痛点的目标客户";
  const painPoint = cleanText(input.painPoint, 180) || "一个高频、具体、愿意投入成本解决的问题";
  const offer = cleanText(input.offer, 160) || "一套低成本、可手工交付的解决方案";
  const channel = cleanText(input.channel, 120) || "朋友圈、社群、老客户或线下熟人网络";
  const strengths = listFromText(input.strengths, ["你的专业经验", "你的行业理解", "你能持续交付的时间"]);
  const price = cleanText(input.price, 80) || "99-499 元试单价";
  const weeklyTime = cleanText(input.weeklyTime, 60) || "每周 3-8 小时";

  return {
    title: "OPC 最小验证计划",
    hypothesis: `我相信「${targetUser}」正在被「${painPoint}」困扰，并愿意为「${offer}」付费。`,
    targetCustomer: {
      who: targetUser,
      painfulMoment: painPoint,
      currentAlternative: "他们现在可能靠自己摸索、找朋友问、购买零散课程或暂时忍受问题。",
      firstChannel: channel,
    },
    keyAssumptions: [
      `目标客户确实频繁遇到「${painPoint}」。`,
      `这个问题已经造成时间、收入、机会或情绪成本。`,
      `他们愿意先用 ${price} 购买一个轻量试单。`,
      `你可以用 ${weeklyTime} 完成第一版手工交付。`,
    ],
    interviewQuestions: [
      `你最近一次遇到「${painPoint}」是什么时候？当时发生了什么？`,
      "这个问题现在通常怎么解决？效果怎么样？",
      "如果不解决，它会带来什么损失或麻烦？",
      "你之前为类似问题花过钱、时间或请过人吗？",
      "什么样的结果会让你觉得这件事值得付费？",
      `如果有一个「${offer}」，你最希望它先解决哪一部分？`,
      `你能接受 ${price} 的试单价格吗？为什么？`,
      "你做购买决定时最担心什么？",
      "还有谁也可能遇到这个问题？",
      "如果我下周做一个小范围试单，你愿意看看吗？",
    ],
    servicePackage: {
      name: `${targetUser}的${painPoint}最小解决方案`,
      promise: `用一次轻量服务，帮客户把「${painPoint}」推进到可执行状态。`,
      deliverables: [
        "一次 30-60 分钟诊断或需求访谈",
        "一份问题拆解与行动建议",
        "一份可直接使用的模板、清单、方案或话术",
        "一次交付后的反馈收集",
      ],
      boundary: "只承诺解决一个具体问题，不承诺长期增长、复杂系统或结果包票。",
      trialPrice: price,
      strengths,
    },
    sevenDayPlan: [
      { day: "第 1 天", task: "写清一句话创业假设，列出 20 个潜在客户。", output: "客户名单 + 一句话假设" },
      { day: "第 2 天", task: "联系 5 个熟人或半熟人，约 3 次访谈。", output: "私聊邀约文案 + 预约记录" },
      { day: "第 3 天", task: "完成 3 次客户访谈，只问问题，不急着推销。", output: "访谈记录 + 高频原话" },
      { day: "第 4 天", task: "整理痛点、付费理由和反对意见，调整服务包。", output: "验证复盘表" },
      { day: "第 5 天", task: `发布 1 条试单邀请，明确对象、问题、交付物和 ${price}。`, output: "朋友圈/社群试单文案" },
      { day: "第 6 天", task: "对有反馈的人私聊跟进，争取 1 个试单或深度访谈。", output: "试单名单 + 跟进记录" },
      { day: "第 7 天", task: "判断继续、调整或暂停，并写下下一轮验证计划。", output: "继续/调整/暂停判断" },
    ],
    decisionRule: {
      continue: "7 天内有 1 个付费试单，或 3 个明确表达愿意继续了解的潜在客户。",
      adjust: "有人认可问题，但不接受当前交付形式或价格。",
      stop: "访谈中多数人认为问题不重要、不高频，或完全不愿投入成本。",
    },
  };
}

function summarize(responses) {
  const stats = {
    total: responses.length,
    readiness: {},
    aiLevel: {},
    direction: {},
    serviceLead: {},
    supportIntent: {},
    avgReadiness: 0,
    avgAi: 0,
  };
  if (!responses.length) return stats;

  let readinessSum = 0;
  let aiSum = 0;
  for (const item of responses) {
    readinessSum += item.readinessScore;
    aiSum += item.aiScore;
    stats.readiness[item.readinessLevel] = (stats.readiness[item.readinessLevel] || 0) + 1;
    stats.aiLevel[item.aiLevel] = (stats.aiLevel[item.aiLevel] || 0) + 1;
    stats.direction[item.direction] = (stats.direction[item.direction] || 0) + 1;
    stats.serviceLead[item.serviceLead] = (stats.serviceLead[item.serviceLead] || 0) + 1;
    const supportIntent = item.supportIntent || "未填写";
    stats.supportIntent[supportIntent] = (stats.supportIntent[supportIntent] || 0) + 1;
  }
  stats.avgReadiness = Math.round((readinessSum / responses.length) * 10) / 10;
  stats.avgAi = Math.round((aiSum / responses.length) * 10) / 10;
  return stats;
}

function isAdmin(req) {
  const url = new URL(stripBasePath(req.url), `http://${req.headers.host}`);
  const token = req.headers["x-admin-token"] || url.searchParams.get("token");
  return token === ADMIN_TOKEN;
}

async function handleApi(req, res) {
  const url = new URL(stripBasePath(req.url), `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/api/submit") {
    const body = await parseBody(req);
    const readinessScore = cleanNumber(body.readinessScore, 8, 40);
    const aiScore = cleanNumber(body.aiScore, 10, 50);
    const recommendation = recommendDirection(readinessScore, aiScore);
    const response = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: cleanText(body.name, 60),
      contact: cleanText(body.contact, 100),
      role: cleanText(body.role, 80),
      targetUser: cleanText(body.targetUser, 160),
      painPoint: cleanText(body.painPoint, 240),
      weeklyTime: cleanText(body.weeklyTime, 60),
      budget: cleanText(body.budget, 60),
      channel: cleanText(body.channel, 120),
      preferredScene: cleanText(body.preferredScene, 160),
      supportIntent: cleanText(body.supportIntent, 100),
      notes: cleanText(body.notes, 300),
      readinessScore,
      aiScore,
      readinessAnswers: Array.isArray(body.readinessAnswers) ? body.readinessAnswers.map((n) => cleanNumber(n, 1, 5)) : [],
      aiAnswers: Array.isArray(body.aiAnswers) ? body.aiAnswers.map((n) => cleanNumber(n, 1, 5)) : [],
      readinessLevel: classifyReadiness(readinessScore),
      aiLevel: classifyAi(aiScore),
      ...recommendation,
    };
    const responses = readResponses();
    responses.push(response);
    writeResponses(responses);
    sendJson(res, 200, { ok: true, result: response });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/toolbox/run") {
    const body = await parseBody(req);
    const contact = cleanText(body.contact, 100);
    if (!contact) {
      sendJson(res, 400, { ok: false, error: "请先填写联系方式，才能领取免费完整体验。" });
      return;
    }
    const runs = readToolboxRuns();
    const existing = runs.find((item) => item.contact === contact);
    if (existing) {
      sendJson(res, 200, { ok: true, used: true, result: existing.result, run: existing });
      return;
    }
    const result = buildToolboxPlan(body);
    const run = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: cleanText(body.name, 60),
      contact,
      role: cleanText(body.role, 80),
      targetUser: cleanText(body.targetUser, 160),
      painPoint: cleanText(body.painPoint, 240),
      offer: cleanText(body.offer, 200),
      channel: cleanText(body.channel, 120),
      weeklyTime: cleanText(body.weeklyTime, 60),
      price: cleanText(body.price, 80),
      strengths: cleanText(body.strengths, 240),
      result,
    };
    runs.push(run);
    writeToolboxRuns(runs);
    sendJson(res, 200, { ok: true, used: false, result, run });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/admin/responses") {
    if (!isAdmin(req)) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    const responses = readResponses();
    const toolboxRuns = readToolboxRuns();
    sendJson(res, 200, { ok: true, stats: summarize(responses), responses, toolboxRuns });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
}

function serveStatic(req, res) {
  const url = new URL(stripBasePath(req.url), `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(stripBasePath(req.url), `http://${req.headers.host}`).pathname;
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message });
  }
});

ensureDataFile();
server.listen(PORT, () => {
  console.log(`OPC survey app: http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}${BASE_PATH}/admin.html?token=${ADMIN_TOKEN}`);
});
