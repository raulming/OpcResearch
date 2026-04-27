function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function text(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

const user = readJson("opcUser");
const survey = readJson("opcSurveyResult") || readJson("opcSurveyPayload");
const toolboxUsed = localStorage.getItem("opcToolboxUsed") === "true";

if (user) {
  text("memberName", user.name || "OPC 用户");
  text("memberContact", user.contact || "未填写联系方式");
  text("memberPlanBadge", user.plan || "Free");
  text("memberCreditsValue", `${Number(user.credits || 0)} 积分`);
  text("memberInviteValue", user.inviteCode || "待生成");
  text("memberTrialValue", user.freeToolboxUsed || toolboxUsed ? "已使用" : "未使用");
}

if (survey?.readinessScore) {
  text(
    "surveySummary",
    `启动准备度 ${survey.readinessScore}/40，AI 能力 ${survey.aiScore}/50，行为风格 ${survey.behaviorScore || "未记录"}/50。推荐方向：${survey.direction || "完成提交后生成"}`,
  );
  text("nextAction", "进入验证工具箱，把测评方向转换成客户访谈、试单方案和 7 天行动计划。");
}

if (toolboxUsed) {
  text("toolboxSummary", "已使用免费完整工具箱体验，可回到工具箱查看历史生成的验证计划。");
}
