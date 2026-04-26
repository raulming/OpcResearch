# SDD - Sprint 1

## 1. Sprint 范围

Sprint 1 聚焦补齐「创业行为风格」这一第三类自测维度，形成用户端提交、后端保存、后台统计和导出闭环。

本轮覆盖：

- 用户端新增创业行为风格测试。
- 提交接口保存行为风格分数、答案和类型。
- 后台顶部核心指标增加行为风格均分。
- 图表区增加行为风格分布。
- 提交明细表增加行为风格列。
- CSV 导出增加 `behaviorScore`、`behaviorType`。
- 新增 Sprint 1 文档，记录范围、需求编号、验收标准和测试清单。

## 2. 需求编号

| 编号 | 需求 | 涉及文件 |
|---|---|---|
| S1-REQ-001 | 用户端新增创业行为风格测试 | `webapp/public/index.html`, `webapp/public/app.js` |
| S1-REQ-002 | 提交接口保存行为风格分数、答案和类型 | `webapp/server.js` |
| S1-REQ-003 | 后台顶部指标展示行为风格均分 | `webapp/public/admin.html`, `webapp/public/admin.js` |
| S1-REQ-004 | 后台图表区展示行为风格分布 | `webapp/public/admin.html`, `webapp/public/admin.js` |
| S1-REQ-005 | 提交明细表展示行为风格分数和类型 | `webapp/public/admin.html`, `webapp/public/admin.js` |
| S1-REQ-006 | CSV 导出包含 `behaviorScore`、`behaviorType` | `webapp/public/admin.js` |
| S1-REQ-007 | 建立 Sprint 1 SDD 文档 | `docs/SDD-Sprint-1.md` |

## 3. 数据口径

行为风格数据来自用户端 10 道 1-5 分题目，总分 10-50。提交接口 `POST /api/submit` 增加：

- `behaviorAnswers`
- `behaviorScore`

后端分层：

| 分数 | 类型 |
|---|---|
| 10-22 | 灵感探索型 |
| 23-34 | 任务推进型 |
| 35-43 | 客户验证型 |
| 44-50 | 系统操盘型 |

后台接口 `GET /api/admin/responses` 返回：

- `stats.avgBehavior`：行为风格均分。
- `stats.behaviorType`：行为风格类型分布。
- `responses[].behaviorScore`：单条提交的行为风格分数。
- `responses[].behaviorType`：单条提交的行为风格类型。

前端不重新计算行为风格分类，避免与后端口径不一致。

## 4. 验收标准

| 编号 | 验收标准 |
|---|---|
| S1-AC-001 | 用户端在 AI 能力测试后展示「创业行为风格测试」。 |
| S1-AC-002 | 用户提交后 payload 包含 `behaviorAnswers` 与 `behaviorScore`。 |
| S1-AC-003 | 后端返回 `behaviorType`，结果页展示行为风格卡片。 |
| S1-AC-004 | 后台登录并加载数据后，顶部指标区展示「行为风格均分」。 |
| S1-AC-005 | 当接口返回 `stats.avgBehavior` 时，行为风格均分显示对应数值；无数据时显示 `0`。 |
| S1-AC-006 | 图表区展示「行为风格分布」，并按 `stats.behaviorType` 渲染柱状条。 |
| S1-AC-007 | 提交明细表包含「行为风格」列，格式为 `behaviorScore / behaviorType`。 |
| S1-AC-008 | 单条记录缺少行为风格字段时，明细表展示「未填写」，页面不报错。 |
| S1-AC-009 | 点击「导出 CSV」后，导出文件包含 `behaviorScore` 与 `behaviorType` 两列。 |
| S1-AC-010 | CSV 字段顺序中，行为风格字段位于 AI 状态之后、方向之前。 |

## 5. 测试清单

- 启动本地服务：`node webapp/server.js`。
- 访问用户端：`http://localhost:3100/`。
- 确认出现三类自测：启动准备度、AI 能力状态、创业行为风格。
- 提交样例数据，确认结果页展示行为风格。
- 访问后台：`http://localhost:3100/admin.html?token=opc2026`。
- 确认顶部指标出现「行为风格均分」。
- 确认图表区出现「行为风格分布」。
- 确认提交明细表出现「行为风格」列。
- 使用包含 `behaviorScore`、`behaviorType` 的样例数据检查数值和类型展示。
- 使用缺少行为风格字段的旧数据检查降级展示为「未填写」。
- 点击「导出 CSV」，检查表头包含 `behaviorScore`、`behaviorType`。
- 检查 CSV 每行包含对应的 `behaviorScore`、`behaviorType` 值。
- 使用错误后台口令访问，确认页面仍显示接口错误信息，不暴露数据。

## 6. 变更记录

| 日期 | Sprint | 内容 |
|---|---|---|
| 2026-04-26 | Sprint 1 | 用户端行为风格自测、后端行为风格保存与统计、后台行为风格指标、分布、明细列、CSV 导出和 SDD 文档补齐。 |
