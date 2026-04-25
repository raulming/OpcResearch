const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3100);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "opc2026";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "responses.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function ensureDataFile() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]\n", "utf8");
  }
}

function readResponses() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function writeResponses(responses) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(responses, null, 2) + "\n", "utf8");
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
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = req.headers["x-admin-token"] || url.searchParams.get("token");
  return token === ADMIN_TOKEN;
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

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

  if (req.method === "GET" && url.pathname === "/api/admin/responses") {
    if (!isAdmin(req)) return sendJson(res, 401, { ok: false, error: "Unauthorized" });
    const responses = readResponses();
    sendJson(res, 200, { ok: true, stats: summarize(responses), responses });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Not found" });
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
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
    if (req.url.startsWith("/api/")) {
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
  console.log(`Admin page: http://localhost:${PORT}/admin.html?token=${ADMIN_TOKEN}`);
});
