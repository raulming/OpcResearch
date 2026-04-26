# SDD - Sprint 2

## 1. Sprint 范围

Sprint 2 聚焦补齐轻量用户身份与免费体验运营闭环，让系统可以识别同一用户、记录免费体验状态、初始化积分，并支持邀请奖励与后台运营展示。

当前实现是公益课可部署 MVP：优先使用 `contact` 作为轻量身份字段，避免引入登录、短信、微信授权等依赖。手机号、微信 openId、独立账号体系保留为后续正式化演进。

本轮覆盖：

- 轻量用户身份：以联系方式 `contact` 建立用户档案，避免匿名提交难以追踪。
- 免费体验状态：记录用户是否已使用一次免费完整工具箱体验。
- 积分初始与邀请奖励：新用户初始化积分，邀请人与被邀请人按规则获得奖励积分。
- 后台运营展示：在后台展示用户身份、体验状态、积分余额、邀请关系与关键运营指标。
- API 层补齐用户身份、体验状态、积分和邀请相关字段。
- 权限规则明确用户端、后台端和运营动作边界。
- 建立 Sprint 2 SDD 文档，记录范围、需求编号、数据模型、API 变化、验收标准和测试清单。

## 2. 需求编号

| 编号 | 需求 | 涉及模块 |
|---|---|---|
| S2-REQ-001 | 建立轻量用户身份模型 | 用户端、服务端、数据存储 |
| S2-REQ-002 | 支持用户首次访问或提交时创建用户档案 | 用户端、`POST /api/submit`、数据存储 |
| S2-REQ-003 | 记录免费体验领取、使用和过期状态 | 用户端、服务端、后台 |
| S2-REQ-004 | 新用户初始化积分余额 | 服务端、数据存储 |
| S2-REQ-005 | 支持邀请关系绑定与邀请奖励积分 | 用户端、服务端、数据存储 |
| S2-REQ-006 | 后台展示用户身份、体验状态、积分和邀请信息 | 后台页面、后台接口 |
| S2-REQ-007 | 后台运营指标增加免费体验与邀请转化相关统计 | 后台页面、后台接口 |
| S2-REQ-008 | 明确用户端与后台端权限规则 | 服务端、后台 |
| S2-REQ-009 | 建立 Sprint 2 SDD 文档 | `docs/SDD-Sprint-2.md` |

## 3. 数据模型

### 3.1 User

用户档案用于承载轻量身份、体验状态、积分和邀请关系。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 系统生成的用户唯一 ID。 |
| `name` | string | 用户姓名或昵称，来自自测/工具箱表单。 |
| `contact` | string | 当前 MVP 的轻量身份字段，用于聚合同一用户。 |
| `role` | string | 用户职业或身份。 |
| `plan` | string | 订阅计划，当前默认为 `free`。 |
| `credits` | number | 当前积分余额。 |
| `inviteCode` | string | 用户自己的邀请码。 |
| `inviterCode` | string | 可选，用户绑定的邀请人邀请码。 |
| `freeToolboxUsed` | boolean | 是否已经使用免费完整工具箱体验。 |
| `createdAt` | string | 创建时间。 |
| `updatedAt` | string | 更新时间。 |

轻量身份规则：

- `contact` 为空时，不创建用户档案，但评估提交仍保持兼容。
- 同一 `contact` 不重复创建用户档案。
- 后续正式化可将 `contact` 拆分为手机号、微信 openId、邮箱等可验证身份。

### 3.2 FreeTrial / MVP 字段

当前 MVP 不单独创建 `FreeTrial` 表，先用 `User.freeToolboxUsed` 记录是否已使用免费完整工具箱体验。

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | string | 关联用户。 |
| `status` | string | `not_claimed`、`claimed`、`used`、`expired`。 |
| `claimedAt` | string | 领取时间。 |
| `usedAt` | string | 使用时间。 |
| `expiresAt` | string | 过期时间。 |
| `trialSource` | string | 体验来源，如 `new_user`、`invite_reward`。 |

后续正式化可独立为 `FreeTrial` 模型，状态口径如下：

| 状态 | 含义 |
|---|---|
| `not_claimed` | 尚未领取免费体验。 |
| `claimed` | 已领取，尚未使用且未过期。 |
| `used` | 已完成一次免费体验使用。 |
| `expired` | 已领取但超过有效期。 |

### 3.3 Credits

当前 MVP 直接在 `User.credits` 保存余额，并用 `credits_ledger.json` 保存积分流水。

| 字段 | 类型 | 说明 |
|---|---|---|
| `userId` | string | 关联用户。 |
| `balance` | number | 当前积分余额。 |
| `initialPoints` | number | 新用户初始化积分。 |
| `earnedTotal` | number | 累计获得积分。 |
| `spentTotal` | number | 累计消耗积分。 |
| `updatedAt` | string | 更新时间。 |

### 3.4 CreditsLedger

积分流水用于审计初始化、邀请奖励和后续消费。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 流水唯一 ID。 |
| `userId` | string | 关联用户。 |
| `reason` | string | `signup_bonus`、`invite_reward`、`invitee_bonus`、`free_toolbox_use` 等。 |
| `amount` | number | 积分变动值，正数为增加，负数为扣减。 |
| `invitationId` | string | 可选，邀请奖励关联 ID。 |
| `toolboxRunId` | string | 可选，工具箱体验关联 ID。 |
| `createdAt` | string | 创建时间。 |

### 3.5 InviteRelation

邀请关系用于防重复奖励和后台转化分析。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 邀请关系唯一 ID。 |
| `inviterId` | string | 邀请人用户 ID。 |
| `inviteeId` | string | 被邀请人用户 ID。 |
| `inviteeContact` | string | 被邀请人联系方式。 |
| `inviteCode` | string | 使用的邀请码。 |
| `rewardCredits` | number | 邀请双方奖励积分。 |
| `createdAt` | string | 创建时间。 |

## 4. API 变化

### 4.1 用户提交接口

`POST /api/submit` 增加用户身份和邀请字段。

请求新增字段：

- `userIdentity.phone`
- `userIdentity.wechatOpenId`
- `userIdentity.nickname`
- `inviteCode`

响应新增字段：

- `user.userId`
- `user.inviteCode`
- `freeTrial.status`
- `points.balance`
- `points.initialPoints`
- `invite.rewardGranted`

接口行为：

- 若身份已存在，则复用原用户档案。
- 若身份不存在，则创建用户档案、初始化积分并生成邀请码。
- 若携带有效 `inviteCode`，且不存在自邀或重复绑定，则建立邀请关系并发放奖励。
- 提交评估数据仍按 Sprint 1 口径保存，不因身份字段缺失破坏旧数据兼容。

### 4.2 免费体验接口

建议新增：

| 方法 | 路径 | 用途 |
|---|---|---|
| `POST` | `/api/trial/claim` | 领取免费体验。 |
| `POST` | `/api/trial/use` | 标记免费体验已使用。 |
| `GET` | `/api/trial/status` | 查询当前用户免费体验状态。 |

核心返回字段：

- `status`
- `claimedAt`
- `usedAt`
- `expiresAt`

### 4.3 用户与积分接口

建议新增：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/me` | 查询当前用户轻量档案、体验状态和积分余额。 |
| `GET` | `/api/points/transactions` | 查询当前用户积分流水。 |
| `GET` | `/api/invite/summary` | 查询当前用户邀请码、邀请人数和奖励统计。 |

### 4.4 后台接口

`GET /api/admin/responses` 建议扩展运营字段：

- `responses[].userId`
- `responses[].phoneMasked`
- `responses[].wechatOpenIdMasked`
- `responses[].freeTrialStatus`
- `responses[].pointsBalance`
- `responses[].invitedBy`
- `responses[].inviteCount`

`stats` 建议新增：

- `stats.totalUsers`
- `stats.freeTrialClaimed`
- `stats.freeTrialUsed`
- `stats.freeTrialExpired`
- `stats.avgPointsBalance`
- `stats.inviteBoundCount`
- `stats.inviteRewardedCount`

可选新增后台接口：

| 方法 | 路径 | 用途 |
|---|---|---|
| `GET` | `/api/admin/users` | 用户运营列表。 |
| `GET` | `/api/admin/invites` | 邀请关系与奖励明细。 |
| `GET` | `/api/admin/points` | 积分账户与流水查询。 |

## 5. 权限规则

| 场景 | 权限规则 |
|---|---|
| 用户查询自身信息 | 只能读取当前身份对应的 `User`、`FreeTrial`、`PointsAccount` 和邀请摘要。 |
| 用户领取免费体验 | 同一用户只能领取一次新用户免费体验。 |
| 用户使用免费体验 | 仅 `claimed` 且未过期的体验可以被使用。 |
| 邀请绑定 | 不能自邀，不能重复绑定邀请人，邀请码无效时不发奖励。 |
| 邀请奖励 | 同一邀请关系只能发放一次邀请人奖励和一次被邀请人奖励。 |
| 积分初始化 | 同一用户只能执行一次 `initial` 类型积分初始化。 |
| 积分流水 | 所有积分变动必须写入 `PointsTransaction`，余额不得只改账户不留流水。 |
| 后台访问 | 继续使用后台 token 校验，未通过校验不得返回用户身份、积分和邀请数据。 |
| 后台脱敏 | 手机号和 openId 在后台列表默认脱敏展示，导出时按运营权限决定是否展示明文。 |
| 旧数据兼容 | 缺少用户身份、体验或积分字段的旧提交记录应展示为「未绑定」或「未记录」，页面不报错。 |

## 6. 验收标准

| 编号 | 验收标准 |
|---|---|
| S2-AC-001 | 新用户首次提交时，系统创建 `User`、`FreeTrial`、`PointsAccount` 并生成 `inviteCode`。 |
| S2-AC-002 | 同一手机号或同一微信 openId 再次提交时，复用同一个 `userId`。 |
| S2-AC-003 | 新用户积分账户包含初始化积分，且存在一条 `initial` 积分流水。 |
| S2-AC-004 | 用户领取免费体验后，状态从 `not_claimed` 变为 `claimed`。 |
| S2-AC-005 | 用户使用免费体验后，状态从 `claimed` 变为 `used`，重复使用被拒绝。 |
| S2-AC-006 | 已过期免费体验展示为 `expired`，不能继续使用。 |
| S2-AC-007 | 使用有效邀请码注册或提交时，系统建立邀请关系。 |
| S2-AC-008 | 邀请关系满足奖励条件后，邀请人和被邀请人的积分余额增加，并分别生成积分流水。 |
| S2-AC-009 | 自邀、重复邀请或无效邀请码不会发放奖励。 |
| S2-AC-010 | 后台顶部指标展示总用户数、免费体验领取数、使用数、过期数和邀请奖励数。 |
| S2-AC-011 | 后台明细列表展示用户身份、免费体验状态、积分余额、邀请人和邀请人数。 |
| S2-AC-012 | 后台对手机号和 openId 默认脱敏展示。 |
| S2-AC-013 | 缺少 Sprint 2 字段的旧提交记录在后台展示为「未绑定」「未记录」等降级文案，页面不报错。 |
| S2-AC-014 | 未携带有效后台 token 访问后台接口时，不返回用户身份、积分、邀请和提交明细数据。 |
| S2-AC-015 | CSV 或运营导出如纳入 Sprint 2 字段，应包含体验状态、积分余额、邀请人和邀请人数，并保持旧字段兼容。 |

## 7. 测试清单

- 启动本地服务：`node webapp/server.js`。
- 访问用户端：`http://localhost:3100/`。
- 使用新手机号或微信 openId 提交评估，确认创建用户档案。
- 使用同一身份再次提交，确认复用同一 `userId`。
- 检查新用户积分余额等于初始化积分。
- 检查积分流水中存在 `initial` 类型记录。
- 领取免费体验，确认状态为 `claimed`。
- 使用免费体验，确认状态为 `used`。
- 对已使用体验重复调用使用动作，确认被拒绝。
- 构造过期体验，确认状态为 `expired` 且不可使用。
- 使用有效邀请码创建新用户，确认邀请关系为 `bound` 或 `rewarded`。
- 检查邀请人和被邀请人的奖励积分及流水。
- 使用自己的邀请码，确认不会绑定邀请关系或发放奖励。
- 使用同一被邀请人重复绑定不同邀请码，确认不会重复奖励。
- 访问后台：`http://localhost:3100/admin.html?token=opc2026`。
- 确认后台指标展示总用户数、免费体验状态统计和邀请奖励统计。
- 确认后台明细展示用户身份、体验状态、积分余额和邀请信息。
- 使用缺少 Sprint 2 字段的旧数据，确认后台降级展示且不报错。
- 使用错误后台口令访问，确认接口拒绝并不暴露运营数据。
- 如支持导出 CSV，检查 Sprint 2 字段存在且脱敏规则符合预期。

## 8. 后续正式化注意事项

- 身份体系正式化：后续需要明确手机号验证码、微信授权登录、会话 token 和账号合并策略。
- 数据存储正式化：当前可先延续轻量文件或内存结构，正式版本应迁移到数据库并补充唯一索引。
- 积分规则配置化：初始化积分、邀请人奖励、被邀请人奖励、有效期和奖励触发条件应进入配置层。
- 积分幂等：邀请奖励、初始化积分和运营调整都需要幂等键，避免接口重试导致重复发放。
- 免费体验权益正式化：需明确体验次数、有效期、可使用的服务范围和过期处理方式。
- 隐私与合规：手机号、openId、邀请关系和评估结果属于敏感运营数据，正式版本需补充脱敏、访问审计和数据删除机制。
- 后台权限分层：当前后台 token 适合 MVP，正式版本应区分管理员、运营、只读查看等角色。
- 运营导出策略：导出明文字段前需确认授权范围，并记录导出人、时间和导出字段。
- 反作弊策略：邀请奖励需要防刷机制，如设备、手机号、openId、IP、提交质量和时间窗口校验。
- 旧数据迁移：上线前需要为 Sprint 1 的匿名提交制定用户绑定或未绑定展示策略。

## 9. 变更记录

| 日期 | Sprint | 内容 |
|---|---|---|
| 2026-04-27 | Sprint 2 | 轻量用户身份、免费体验状态、积分初始化、邀请奖励、后台运营展示、API 变化、权限规则、验收标准、测试清单和正式化注意事项。 |
