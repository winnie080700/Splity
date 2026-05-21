# Phase 7 Implementation Plan

> **文档版本**：v1.4
> **目标**：让两个独立的功能模块上线——①**邀请状态机**（被邀请用户接受/拒绝 → `participants.invitation_status` Pending → Accepted/Declined）；②**公开分享链接**（creator 在 Settling 状态创建带白名单字段的 `settlement_share_links`，anon 访客通过 `/share/[token]` 看到结算结果）。两块共享一个特征：**已注册用户和匿名用户都是 actor**，因此 RPC `SECURITY DEFINER` 是默认形态。
> **依据**：`docs/migration-prd.md` v2.3 §4.7 + ADR-008；`docs/api-inventory.md` G1-G3 + F1-F3；`docs/user-journeys.md` J3 / J4 / J8。
> **预算**：**1.5 工作日（12 小时）**。比 Phase 6 短——RPC 三件套已在 Phase 2 落地（`accept_invitation` / `decline_invitation` / `resolve_share_token`），本期主要做 UI + 1 个新 RPC（列邀请）+ 1 块 DB 防御补强。
> **状态**：completed。
> **前置 Phase**：Phase 6 completed（settlement 状态机端到端走通；group status 可在 unresolved/settling/settled 三态切换）。
> **v1.4 修订（codex review #4，纯文档一致性）**：①Day 1 §6 时段表 "trigger + helper" + §8.4 "+ helper 都在 Studio 可见" 与 §1 F10 / P7-R8 / §8.5 ⑫ 的"4 必有 + 1 可选 helper"口径冲突——helper 不抽出时实现就只有 4 个对象，文档不能要求"必可见"。改为"trigger（可选抽 helper）"和"+ optional helper if implemented"；②Migration timestamp `20260521000000` 是未来时间戳（当前项目上下文 2026-05-20）。改为同日且大于 Phase 6 `20260520085143` 的时间戳 `20260520090000`，避免后续当天生成的迁移排序错位。
> **v1.3 修订（codex review #3，纯文档一致性）**：①F10 migration 文件名 `0010_invitation_share_hardening.sql` 会在 `20260520085143_settlement_status_lock.sql`（Phase 6）**之前**排序——Supabase CLI 按文件名字典序应用，`0010` < `2026...`。改为时间戳格式 `20260521xxxxxx_invitation_share_hardening.sql`（取 Phase 6 后一日）；②§8.5 写 "11 段" 但列了 ⑫ → 改为 12 段；③F10 + P7-R8 写 "5 个新函数" 但 helper 标 "如有"——helper 是实现选择不是必需。统一为"**4 个必有函数 + 1 个可选 helper**"。
> **v1.2 修订（codex review #2，纯文档一致性）**：v1.1 修了主决策但旧文本残留 4 处：①D5/D7 仍写旧方案（"RLS write policy 加 status=1" + "middleware allow-list `/share/*`"）→ 替换为 v1.1 的 INSERT/UPDATE policy 拆分 + middleware 不动 `/share`；②§6 执行步骤 Day 1 / Day 2 仍写旧操作 → 同步为 policy 拆分、独立 `deactivate_settlement_share` RPC、F13 anon client、middleware 不改 `/share`；③F11 "新加 2 个函数" / P7-R8 审计漏 `deactivate_settlement_share` → 列全审计清单（5 个新函数）；④"其余 13 个字段不变"模糊（实际表 15 列）→ 在 F10 ③ 把 deactivate-only UPDATE 唯一允许的变化精确为 `is_active TRUE → FALSE`，其余 14 列全部 `IS NOT DISTINCT FROM OLD.*`。
> **v1.1 修订（codex review #1）**：①**P1 RLS USING vs trigger 执行顺序冲突**：Postgres 顺序是 `RLS USING → BEFORE trigger → WITH CHECK`。如果 `settlement_share_links_write_creator` USING 加 `g.status = 1`，settled 状态下 deactivate UPDATE 在 RLS USING 阶段就被拒，trigger 永远没机会放行。改为：INSERT policy 含 `status = 1`；UPDATE policy 仅 creator-only（无 status 条件）；trigger 内对 UPDATE 路径做精细判断（非 Settling 只允许 `is_active TRUE → FALSE` 的 deactivate，且禁改其他字段）。②**P1 deactivate 接口语义不符**：F6 `deactivateShareAction` 当前用 `regenerate_settlement_share` 反向调用，但 RPC 返回 TEXT（新 token），语义冲突。**新增独立 RPC `deactivate_settlement_share(p_group_id UUID) RETURNS VOID`**；regenerate 路径不复用。③**P1 middleware `/share` 处理**：直接把 `/share` 加进 `PUBLIC_PATHS` 会触发"已登录用户访问 → redirect to /dashboard"路径，与"不引导回业务路由"冲突。**`/share` 本来就不匹配 `APP_PATHS_REGEX`，不需要加进 PUBLIC_PATHS**——只需要确认 share page 自己不依赖 auth。④**anon client 指引模糊**：share page 需要"无 cookies / 无 session"client，但 `lib/supabase/server.ts` 的 `createClient` 会读 cookies。**新增交付物 F13 `lib/supabase/anon.ts`**：`createAnonServerClient()` 用 anon key + 无 cookie adapter，专供 `/share/[token]` 调 `resolve_share_token` RPC。

---

## 1. 交付物

| 层 | # | 路径 | 行数估 | 用途 |
|---|---|---|---|---|
| **服务层** | F1 | `apps/web/lib/services/invitations.ts` | ~80 | `listMyInvitations()` 调新 RPC；`acceptInvitation(pid)` / `declineInvitation(pid)` 调 Phase 2 RPC |
| | F2 | `apps/web/lib/services/settlement-shares.ts` | ~150 | `getActiveShare(groupId)` / `createShare(groupId, payload)` / `regenerateShare(...)` / `resolvePublicShare(token)`（用 anon client 调 `resolve_share_token`） |
| **UI 路由（认证）** | F3 | `apps/web/app/(app)/invitations/page.tsx` | ~100 | 列出当前用户的 pending 邀请；每行带 Accept / Decline 按钮 |
| | F4 | `apps/web/app/(app)/invitations/actions.ts` | ~70 | Server Actions：`acceptInvitationAction` / `declineInvitationAction` |
| | F5 | `apps/web/app/(app)/groups/[groupId]/share/page.tsx` | ~140 | creator 在 Settling 状态可创建/regenerate share；显示当前 active token + 公开 URL |
| | F6 | `apps/web/app/(app)/groups/[groupId]/share/actions.ts` | ~120 | Server Actions：`createShareAction` / `regenerateShareAction` / `deactivateShareAction` |
| | F7 | `apps/web/app/(app)/groups/[groupId]/page.tsx` | 修订 | 在 group 详情页 status=settling 时加 "Share publicly" 入口（与 settlements 入口并列） |
| **UI 路由（匿名）** | F8 | `apps/web/app/share/[token]/page.tsx` | ~120 | **anon 可访问**：调 `resolvePublicShare` → 显示 creator name / payment profile / transfer list；**不要求登录** |
| | F9 | `apps/web/app/share/[token]/share-display.tsx` | ~150 | Client component：transfer 列表 + 收款方式卡片 + QR 码（如有） |
| **DB 防御层** | F10 | `supabase/migrations/20260520101217_invitation_share_hardening.sql` | **必交付** | ①新增 RPC `list_my_invitations()` `SECURITY DEFINER` → 返回 `(participant_id, group_id, group_name, invited_by_name, created_at_utc)`，因为 `participants_select_member` policy 要求 `is_group_member(group_id)`，但 Pending invitee **还不是** member；②**RLS policy 拆分**（v1.1 关键修复）：DROP 现有 `settlement_share_links_write_creator` `FOR ALL`，改建两条：(a) `settlement_share_links_insert_creator` `FOR INSERT WITH CHECK (creator + groups.status = 1)`；(b) `settlement_share_links_update_creator` `FOR UPDATE USING (creator) WITH CHECK (creator)` —— **USING 不带 status 条件**让 settled-state deactivate 能进 trigger；③新增 trigger `trg_settlement_share_integrity` `BEFORE INSERT OR UPDATE` `SECURITY DEFINER`：INSERT 路径强制 `status = 1`；UPDATE 路径分两种 (i) **"deactivate-only" 路径**——`OLD.is_active = TRUE AND NEW.is_active = FALSE` **且** 其余 **14** 列（`id` / `group_id` / `share_token` / `from_date_utc` / `to_date_utc` / `creator_name` / `payee_name` / `payment_method` / `account_name` / `account_number` / `notes` / `payment_qr_data_url` / `receiver_payment_infos_json` / `created_at_utc`）每一列都 `IS NOT DISTINCT FROM OLD.<col>` → 允许 deactivate in any status；(ii) 其他 UPDATE（含改 payee_name 等敏感字段，或 is_active false→true 反激活）→ 强制 `status = 1`；④新增 RPC `regenerate_settlement_share(p_group_id UUID, p_payload JSONB) RETURNS TEXT` `SECURITY DEFINER`：原子化 deactivate old + insert new（一次 BEGIN/EXCEPTION 块）；⑤**新增 RPC `deactivate_settlement_share(p_group_id UUID) RETURNS VOID` `SECURITY DEFINER`**（v1.1 修复）：单一 deactivate 入口，不分配新 token；接口签名清晰，不复用 regenerate；⑥`resolve_share_token` 不动（Phase 2 已校验白名单 13 字段）|
| **测试** | F11 | `supabase/tests/phase-7-invite-share.sql` | ~340 | ①邀请：accept/decline 各 1 类 happy + accept 非 Pending 反例 + 非被邀请人调 accept 反例；②share create：creator 在 non-Settling（Unresolved + Settled）创建被 trigger 拒；③share regenerate happy → 旧 token `is_active=false` + 新 token 出现；④**share deactivate happy（跨 status，v1.1 关键）**：先在 Settling 状态建 share → 改 group 到 Settled → 调 `deactivate_settlement_share(group_id)` 应**成功**（trigger deactivate-only 分支放行）；⑤**Settled 状态下尝试改 payee_name 等其他字段被 trigger 拒**；⑥非 creator 调 `deactivate_settlement_share` 应被 RPC 拒；⑦anon 调 resolve 返回字段白名单严格匹配 13 列；⑧anon 直查 `settlement_share_links` 表 0 行；⑨`list_my_invitations` 跨账号正确返回各自的 pending；⑩**DEFINER 审计**：**4 个必有函数**（`list_my_invitations` / `regenerate_settlement_share` / `deactivate_settlement_share` / `trg_settlement_share_integrity`）+ **1 个可选 helper**（`assert_settlement_share_writable`，仅当实现把 trigger body 抽出时存在）全部 `prosecdef = true` + `search_path = public, pg_temp`；⑪RLS policy 审计：`pg_policies` 中 `settlement_share_links_insert_creator` 含 status=1、`settlement_share_links_update_creator` **不含** status |
| **文档** | F12 | `docs/phase-7-review-checklist.md` | ~30 | PR review checklist |
| **基础设施** | F13 | `apps/web/lib/supabase/anon.ts` | ~30 | **新增**（v1.1）：`createAnonServerClient()` 用 anon key + **无 cookie adapter** + `auth: { autoRefreshToken: false, persistSession: false }`；server-side 可用但**永远以 anon role** 调 Supabase——专供 `/share/[token]` 调 `resolve_share_token` RPC，避免登录用户访问 share 时不慎以 authenticated 上下文调用 RPC |

**不交付**：
- ❌ 邀请邮件通知（PRD 未要求；用户主动检查 `/invitations` 即可）。
- ❌ Share token QR code 自动生成（本期 share 页只显示 creator 上传的 payment_qr_data_url，不自动生成 share URL 的 QR）。
- ❌ Share token expiry（PRD `settlement_share_links` 有 `is_active` 没有 `expires_at`，本期不引入新字段）。
- ❌ 公开 share 评论 / 互动（本期 share 仅只读 view）。

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 6 闭环；至少 1 个 group 进入 settling 状态 + 有 ≥ 1 个 transfer 已 MarkedPaid 或 Received | F8/F9 share 页有数据可看 |
| PRE-2 | Phase 2 `resolve_share_token` / `accept_invitation` / `decline_invitation` RPC 已 push（这三个 v1.5 plan 期间应已存在） | F1/F2/F8 service 调用 |
| PRE-3 | 2 个真账号：A 是 creator，B 接受邀请测 J3，C 拒绝测 J4 | §9 端到端 |

---

## 3. 关键决策（继承 Phase 5/6 防御教训）

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | `list_my_invitations` 实现 | **新 DEFINER RPC**，返回字段白名单 `(participant_id, group_id, group_name, invited_by_name, created_at_utc)` | `participants.SELECT` policy 要求 `is_group_member(group_id)`，Pending invitee **不是** member（v1.5 §4.2 helper 只算 Accepted 为 member）。DEFINER RPC 绕 RLS 但返回字段严格白名单，**不暴露** invitation_status 历史 / username / payment 信息 |
| D2 | `accept_invitation` 调用方 | 直接调 Phase 2 已有 RPC（DEFINER + auth.uid() = invited_user_id 校验） | Phase 2 已完整实现 |
| D3 | Share token 生成 | `crypto.randomUUID()` 去掉 dashes（32 chars）；存 `share_token VARCHAR(80)` | 与 Phase 2 schema 列宽兼容；不需要短码 / 自定义字母表 |
| D4 | Share 创建路径 | **新 RPC `regenerate_settlement_share`**（DEFINER），原子化"deactivate old + insert new"两个写入 | 防 race：如果 INSERT 失败，UPDATE 已 commit 旧 token 已失效。RPC 内单 PL/pgSQL block + RAISE 回滚保持一致性。**也**可走 Server Action 多步，但 v1.5/v1.6 教训：复合写入用 RPC 更安全 |
| D5 | `settlement_share_links` 写入限制 | **三层组合**（v1.1 修订）：①RLS INSERT policy 含 `creator + groups.status = 1`；②RLS UPDATE policy **仅 creator-only，不带 status 条件**（让 settled-state deactivate 能进 trigger，避免 USING 阶段先死）；③trigger `trg_settlement_share_integrity` `BEFORE INSERT OR UPDATE` 精细判断：INSERT 强制 status=1；UPDATE 分两支——"deactivate-only"（`OLD.is_active=TRUE AND NEW.is_active=FALSE` 且其余 14 列全部 `IS NOT DISTINCT FROM OLD.*`）任意 status 放行；其他 UPDATE 强制 status=1 | Phase 2 schema 漏的；当前 creator 可在任意状态写 share。**v1.1 修复 Postgres 执行顺序陷阱**（RLS USING 先于 trigger），把 status 校验下沉到 trigger |
| D6 | `settlement_share_links` GRANT 是否收紧（Phase 6 风格） | **不收紧**——保留 authenticated INSERT/UPDATE 权限，靠 RLS + trigger 防御 | 与 Phase 6 不同：share 创建不是状态机（不像 mark-paid/received），且 regenerate 需要 UPDATE is_active = false。复合写入 RPC（D4）+ trigger（D5）已足够；REVOKE 不增加安全收益 |
| D7 | `/share/[token]` 页面 auth 模式 | **不要求登录**——**但 middleware 不动 `PUBLIC_PATHS`**（v1.1 修订）。`/share` 不匹配 `APP_PATHS_REGEX`，未登录访问已不被强制 redirect；若加进 `PUBLIC_PATHS` 反而触发"已登录用户访问 → /dashboard"反向跳转。page 自身用 F13 `createAnonServerClient` 调 `resolve_share_token` RPC（anon role）拉数据 | 旧 C# 端点 F3 `GET /api/settlement-shares/{shareToken}` 是 anon；新版 anon role 唯一路径；登录用户访问 share 链接也应正常渲染（不跳走） |
| D8 | Share 页 SEO / 索引 | **noindex meta**（默认）；不让搜索引擎抓取 | Token 是私密链接（虽然函数内只返回白名单字段，但暴露给搜索引擎仍有概率被聚合泄露） |
| D9 | 邀请 UX：是否在 dashboard 显示提示徽章 | **是**——dashboard layout 加 "您有 N 条 pending 邀请" 链接 | 提升用户感知；不影响安全 |
| D10 | 公开 share 页错误提示 | invalid token / inactive token → 都返回 404 "Share link not found"；**不区分原因** | 防 token enumeration（与 v1.5 §4.7 ADR-008 一致） |

---

## 4. C# 行为对照（SettlementSharesService.cs / InvitationsService.cs 关键节）

### 4.1 邀请

| C# 行为 | 新版对应 |
|---|---|
| `InvitationsService.ListPendingAsync(userId)` → 查 `participants WHERE invited_user_id = userId AND invitation_status = Pending` | F10 RPC `list_my_invitations()`（DEFINER 内）：同条件 + 白名单字段 |
| `InvitationsService.AcceptAsync(participantId, userId)` 校验 `participant.invited_user_id = userId AND status = Pending` | Phase 2 RPC `accept_invitation(p_participant_id)` 已实现 |
| `InvitationsService.DeclineAsync(...)` | Phase 2 RPC `decline_invitation` 已实现 |

### 4.2 Share

| C# 行 | 行为 | 新版对应 |
|---|---|---|
| `SettlementSharesService.cs:39` | `EnsureGroupStatus(Settling)` | F10 trigger（DB 强制）+ Service 层 `requireSettlingGroup` |
| `CreateAsync(...)` | 写入 `settlement_share_links` 一行 + 把现有 active 置 is_active=false（事务） | F10 RPC `regenerate_settlement_share`（原子） |
| `GetActiveAsync(groupId)` | 查 `WHERE group_id = ? AND is_active = TRUE` | F2 service 直接 SELECT（走 RLS creator-only） |
| `GetByTokenAsync(token)` | 查 `WHERE share_token = ? AND is_active = TRUE` + 反序列化 receiver_payment_infos | F2 调 `resolve_share_token(p_token)` 现有 anon-accessible RPC |

### 4.3 `resolve_share_token` 白名单（Phase 2 已实现，**不动**）

[Phase 2 0003_rpc_functions.sql](../supabase/migrations/0003_rpc_functions.sql) 返回 13 字段：`share_token / from_date_utc / to_date_utc / creator_name / payee_name / payment_method / account_name / account_number / notes / payment_qr_data_url / receiver_payment_infos_json / created_at_utc / transfers[]`。

**transfers** 内每行只含 `from_name / to_name / amount / status / marked_paid_at_utc / marked_received_at_utc`——**不含** participant id / invited_user_id / bill 明细。

Phase 7 不修改这个 RPC；F11 测试只断言白名单字段无变化。

---

## 5. UI 设计要点

### 5.1 `/invitations` 页面（F3）

```
┌─ Pending invitations ─────────────────────────────────┐
│                                                       │
│  ┌─ Alice's vacation trip ──────────────────────────┐ │
│  │ Invited as: Bob                                  │ │
│  │ Group created: 2026-05-10                        │ │
│  │ [Decline]                          [Accept]      │ │
│  └──────────────────────────────────────────────────┘ │
│                                                       │
│  (more invitations...)                                │
│                                                       │
│  Empty state: "No pending invitations."               │
└───────────────────────────────────────────────────────┘
```

### 5.2 `/groups/[groupId]/share` 页面（F5）

```
┌─ Public share link ───────────────────────────────────┐
│                                                       │
│  Status: 🟢 Active                                    │
│  Public URL:                                          │
│    https://splity.app/share/8f3c2e1a...               │
│  [📋 Copy]  [🔄 Regenerate]  [🚫 Deactivate]          │
│                                                       │
│  ─── What you're sharing ──────────────────────────   │
│  Creator name:    [Alice                    ]         │
│  Payment method:  [Maybank ▾]                         │
│  Account name:    [Alice Tan                ]         │
│  Account number:  [1234567890               ]         │
│  Notes:           [Cash ok too              ]         │
│  Payment QR:      [📷 Upload (data:URL)]              │
│                                                       │
│  [Cancel]          [Save & generate]                  │
└───────────────────────────────────────────────────────┘
```

### 5.3 `/share/[token]` 公开页（F8）

```
┌─ Settlement from Alice (Phase 5 trip) ────────────────┐
│  Generated: 2026-05-15                                │
│  Period: 2026-05-01 → 2026-05-15                      │
│                                                       │
│  ─── Pay to ──────────────────────────────────────    │
│  Alice Tan                                            │
│  Maybank · 1234567890                                 │
│  📷 QR code [click to expand]                         │
│                                                       │
│  ─── Transfers ───────────────────────────────────    │
│  Bob → Alice           35.34   ✅ Received           │
│  Carl → Alice          35.33   ⏳ MarkedPaid          │
│  David → Alice         35.33   ❌ Pending             │
└───────────────────────────────────────────────────────┘
```

- **无 login button / no signup CTA**：纯展示页
- **无业务跳转**：哪怕 anon 用户碰巧也是 Splity 注册用户，share 页不引导回业务路由

---

## 6. 执行步骤（12 小时）

### Day 1（8h）：DB 防御 + Invitations 端到端

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | 读 SettlementSharesService.cs + InvitationsService.cs；列对应 Phase 2 RPC 状况 | 头脑模型 |
| 0:30-2:00 | **F10 必做**：写 `20260520101217_invitation_share_hardening.sql`（由 `supabase migration new` 生成，且时间戳 > Phase 6 `08:51:43` 确保顺序）：① `list_my_invitations()` DEFINER ② DROP 旧 `settlement_share_links_write_creator FOR ALL` 改建 `_insert_creator` (WITH CHECK status=1) + `_update_creator` (USING/WITH CHECK creator-only **无 status**) ③ `trg_settlement_share_integrity` trigger（含 deactivate-only 分支 + 14 列 IS NOT DISTINCT FROM 校验；可选抽 helper `assert_settlement_share_writable`） ④ `regenerate_settlement_share` RPC ⑤ `deactivate_settlement_share` RPC（独立入口，RETURNS VOID） → push + **F13 必做**：写 `lib/supabase/anon.ts` `createAnonServerClient()` | DB 防御层 + anon client 上线 |
| 2:00-3:00 | F1 `invitations.ts` service（3 个函数） | service 层 |
| 3:00-4:30 | F3 `/invitations/page.tsx` + F4 actions；本地用 B 账号实测 accept / decline | invitation 端到端 |
| 4:30-5:00 | F7 group page 加 settlements + share 入口 status-gated | UI 路由统一 |
| 5:00-7:00 | F5 `/groups/[id]/share/page.tsx` + F6 actions（create / regenerate / deactivate） | share 创建 UX |
| 7:00-8:00 | 实测 A 在 settling group 创建 share → 拿到 token → 后续 Day 2 测公开访问 | share creator side 通 |

### Day 2（4h）：公开 share + 测试

| 时段 | 任务 | 输出 |
|---|---|---|
| 8:00-9:30 | F8 `/share/[token]/page.tsx` + F9 share-display；**middleware 不动**（`/share` 已不匹配 `APP_PATHS_REGEX`，未登录访问已自动放行）；page **必须** import `@/lib/supabase/anon` 而**不是** `@/lib/supabase/server` | public share 端到端 |
| 9:30-10:00 | dashboard layout 加 "您有 N 条 pending 邀请" 徽章（D9） | UX 增强 |
| 10:00-11:30 | F11 `phase-7-invite-share.sql` **12 段**（v1.3，对齐 §8.5）：①邀请 accept happy + non-Pending/非主体反例 ②邀请 decline happy ③share create 在 Unresolved 被拒 ④share create 在 Settled 被拒 ⑤regenerate 旧 token 失效 ⑥deactivate 跨 status 成功 ⑦Settled 改 payee_name 被拒 ⑧非 creator 调 deactivate 被拒 ⑨anon resolve 13 字段白名单 ⑩anon 直查 settlement_share_links 0 行 ⑪list_my_invitations 跨账号 ⑫DEFINER 审计 4 个必有 + 1 可选 helper + RLS policy 审计 | 测试 fixture |
| 11:30-12:00 | F12 review checklist + commit | Phase 7 关闭 |

---

## 7. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P7-R1 | `list_my_invitations` 返回字段意外包含 `invited_user_id` / `invitation_status` 历史 → 暴露给非 group member 的 invitee | 🟡 中 | F10 RPC 显式 `RETURNS TABLE(...)` 仅 5 列；F11 测试列数 = 5 |
| P7-R2 | `regenerate_settlement_share` 中 UPDATE old + INSERT new 不在同 RPC 内事务，race window | 🟡 中 | D4 决策：单 RPC 单 PL/pgSQL BEGIN/EXCEPTION block；如 INSERT 失败 RAISE → 整 RPC 回滚 |
| P7-R3 | `/share/[token]` middleware 行为 | 🟢 低 | **v1.1 重审**：`/share` **不匹配** `APP_PATHS_REGEX` (`^/(dashboard\|groups\|bills\|settlements\|invitations\|settings)`)——未登录访问**已经不会**被 redirect 到 `/sign-in`。**不要**把 `/share` 加进 `PUBLIC_PATHS`，否则会触发 middleware 中"已登录用户访问 public path → redirect /dashboard"路径（[middleware.ts:45](../apps/web/middleware.ts#L45)），与 D7"不引导回业务路由"冲突。已登录用户访问 share 链接应正常渲染（不强制登出，但页面用 anon client 拉数据，不带其 JWT）|
| P7-R4 | 登录用户访问 `/share/[token]` 时若复用 `lib/supabase/server.ts` `createClient`，会带 user cookies + JWT → `resolve_share_token` 以 authenticated 上下文调用 → 仍可工作但**违反"anon role 唯一路径"语义** | 🔴 高 | **F13 必交付**：新增 `lib/supabase/anon.ts` `createAnonServerClient()`——无 cookie adapter / `persistSession: false` / 无 JWT。F8 share page **必须** import F13 而不是 `lib/supabase/server`。F11 加 grep 断言：`apps/web/app/share/**` 不能 import `@/lib/supabase/server` |
| P7-R5 | trigger `trg_settlement_share_integrity` 与 RPC `deactivate_settlement_share` / `regenerate_settlement_share` 同时存在 → 如果 group 被 owner 改成 Settled，deactivate UPDATE 会被 trigger 拒 → 用户卡死 | 🟡 中 | trigger 对 UPDATE 分两支（v1.2 精确化）：**(a) deactivate-only**——`OLD.is_active = TRUE AND NEW.is_active = FALSE` **AND 其余 14 列每一列都 `IS NOT DISTINCT FROM OLD.<col>`** → 允许任意 status（deactivate 永远可行）；**(b) 其他 UPDATE**（含改 payee_name 等敏感字段，或 is_active false→true 反激活）→ 强制 status=1。`IS NOT DISTINCT FROM` 防止 attacker 借 deactivate 的名义偷改其他字段 |
| P7-R6 | Share 链接被 Google 索引泄露 | 🟡 中 | F8 加 `export const metadata = { robots: { index: false, follow: false } }`（Next.js 15 标准） |
| P7-R7 | 用户在 share 表单粘贴大 payment_qr_data_url（5 MB+）超 row 大小 | 🟢 低 | client 端 5MB 拒；与 Phase 5 R6 同模式 |
| P7-R8 | DEFINER 审计 SQL 没把 Phase 7 新加的函数加入清单 | 🟢 低 | F11 末尾审计段必须含（v1.3 修订）：**4 个必有函数** `list_my_invitations` / `regenerate_settlement_share` / **`deactivate_settlement_share`** / `trg_settlement_share_integrity`，**+ 1 个可选 helper** `assert_settlement_share_writable`（仅当实现把 trigger body 抽出为独立 helper 时存在；不抽则审计跳过该项）。全部 `prosecdef = true` + `proconfig` 含 `search_path=public, pg_temp` |
| P7-R9 | `list_my_invitations` 没暴露 `group_name` → UI 只能显示 group_id 难看 | 🟢 低 | F10 RPC 明确 JOIN groups 表取 name |
| P7-R10 | `/invitations` 页对**非邀请人**（即没有 pending 的用户）显示 "No pending"，但如果 RPC 抛错（permission） → 应优雅降级而不是 500 | 🟢 低 | F1 service 包 try/catch；F3 渲染空 list |

---

## 8. 验收清单

### 8.1 Invitations 端到端（J3 / J4）
- [ ] B 账号被 A 邀请到 GroupX → B 登录 `/invitations` 看到该邀请。
- [ ] B 点 Accept → 邀请消失；B `/dashboard` 看到 GroupX。
- [ ] C 账号被 A 邀请到 GroupY → C 点 Decline → 邀请消失；GroupY 不出现在 C 的 dashboard。
- [ ] **拒绝重入**：A 重新加 C 同 username 为参与者 → C 再次看到邀请。
- [ ] **错主体调用**：B 拿到 C 的 participant_id → 调 accept → RPC 拒（auth.uid() ≠ invited_user_id）。
- [ ] **非 Pending 状态**：accepted 后再次 accept → RPC 拒（invitation_status ≠ 1）。

### 8.2 Share 创建
- [ ] A 在 Settling 状态打开 `/groups/[id]/share` → 看到 "no active share"。
- [ ] 填表 + 提交 → 出现 active token + 公开 URL。
- [ ] regenerate → 旧 token 失效（`is_active=false`），新 token 显示。
- [ ] 把 group 改 Settled → 不能再创建 share（trigger 拒）；可看现有 share（read-only）。
- [ ] 把 group 改 Unresolved → 不能创建 share。
- [ ] **GRANT 不变**：F11 SQL 断言 `settlement_share_links` 写权限仍归 authenticated。

### 8.3 公开 share 页
- [ ] **未登录**直接访问 `/share/{valid_token}` → 渲染数据；**不 redirect**。
- [ ] 数据含 13 白名单字段 + transfers（only name / amount / status / timestamps）。
- [ ] **不含**：participant_id / invited_user_id / bill_id / bill_item / fee 细节。
- [ ] 访问 `/share/{invalid_token}` → 404 "Share link not found"。
- [ ] 访问 `/share/{inactive_token}` → 404 同上（不区分原因）。
- [ ] HTML head 含 `<meta name="robots" content="noindex,nofollow">`（D8 / R6）。

### 8.4 DB 防御层
- [ ] **F10 已 push**：4 个必有函数（`list_my_invitations` / `regenerate_settlement_share` / `deactivate_settlement_share` / `trg_settlement_share_integrity`）在 Studio 可见；若实现选择抽 helper，**`assert_settlement_share_writable` 也在；不抽则 skip**。
- [ ] **`settlement_share_links` RLS policy 拆分到位**（v1.1）：`pg_policies` 查询应见 **2 条 write policy**——`settlement_share_links_insert_creator` (`cmd='INSERT'`, with_check 含 `status = 1`) + `settlement_share_links_update_creator` (`cmd='UPDATE'`, **USING 不含 status**)；**不**应见 `_write_creator` `FOR ALL` 或带 `status` 条件的 UPDATE policy。
- [ ] **DEFINER 审计**：所有 v1.5 + Phase 6 + Phase 7 新加函数 `prosecdef = true` + `search_path = public, pg_temp`。
- [ ] **R5 反向断言 ①**：anon access settled-group share via existing valid token → 仍能 resolve（read 不被 status lock 阻断）。
- [ ] **R5 反向断言 ②** **deactivate-only 跨 status**（v1.1 / v1.2）：把 group 改 Settled 后 creator 调 `deactivate_settlement_share(group_id)`（**专用 RPC**，不复用 regenerate）→ 应成功；trigger 内 `OLD.is_active=TRUE AND NEW.is_active=FALSE AND 其余 14 列每列 IS NOT DISTINCT FROM OLD.<col>` 分支放行。
- [ ] **R5 反向断言 ③**：在 Settled 状态尝试 UPDATE 其他字段（如 `payee_name`）→ 应被 trigger 拒（非 deactivate-only UPDATE 仍需 status=1）。

### 8.5 `phase-7-invite-share.sql`
- [ ] **F11 12 段全通过**（与 §1 F11 / Day 2 时段口径一致）：
  - ① 邀请 accept happy + non-Pending 拒 + 非被邀请人调 accept 拒（3 条子断言合并）
  - ② 邀请 decline happy
  - ③ share create 在 Unresolved 被 trigger 拒
  - ④ share create 在 Settled 被 trigger 拒
  - ⑤ share regenerate happy → 旧 token `is_active=false` + 新 token 出现
  - ⑥ **deactivate 跨 status 成功**（settled-state 调 `deactivate_settlement_share` 应成功）
  - ⑦ **Settled 状态下尝试改 `payee_name` 等其他字段被 trigger 拒**（IS NOT DISTINCT FROM 校验）
  - ⑧ 非 creator 调 `deactivate_settlement_share` 被 RPC 拒
  - ⑨ anon 调 `resolve_share_token` 返回 13 字段白名单精确匹配
  - ⑩ anon 直查 `settlement_share_links` 0 行
  - ⑪ `list_my_invitations` 跨账号返回正确 pending 集
  - ⑫ DEFINER 审计 **4 个必有函数**（`list_my_invitations` / `regenerate_settlement_share` / `deactivate_settlement_share` / `trg_settlement_share_integrity`）**+ 1 个可选 helper**（`assert_settlement_share_writable`，**仅当**实现选择把 trigger body 抽出 helper 时存在）+ RLS policy 审计（insert 含 status=1、update 不含 status）

### 8.6 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过。
- [ ] `grep -rn "auth.getSession()" apps/web --include='*.ts'` 仍 0 命中。
- [ ] `grep -rn "createAdminClient(" apps/web --include='*.ts' | grep -v 'lib/supabase/admin.ts'` 仍 0 命中。
- [ ] **`apps/web/app/share/` 下不 import `@/lib/supabase/server`**（v1.1 R4 防御）：
      ```bash
      grep -rn "@/lib/supabase/server" apps/web/app/share/ --include='*.ts' --include='*.tsx'
      # 期望 0 命中。share 页只能 import @/lib/supabase/anon。
      ```
- [ ] `lib/supabase/anon.ts` 配置含 `persistSession: false` + `autoRefreshToken: false`，且**不**接收 cookies adapter。

### 8.7 PRD 对齐
- [ ] api-inventory.md G1-G3 + F1-F3 共 6 条接口的功能在新版可复现。
- [ ] J3 / J4 / J8 用户旅程端到端跑通。

---

## 9. 完成后立即触发

1. 标 Phase 7 → completed，Phase 8 → in_progress。
2. commit: `feat(invitations,share): invitations + public share + db hardening (phase 7)`。
3. 进入 **Phase 8 plan 生成**——8 个前端模块旧 → 新迁移 + 删 Clerk + api-client 改纯 types。Phase 8 是**视觉/体验层重头戏**，需独立 plan 评估每个 feature 模块复杂度。
4. **关键里程碑**：Phase 7 完成 ≈ J1-J11 共 10+ 条用户旅程全部跑通。Phase 8-9 都是"删旧 + 上线"性质。

---

**文档结束**
