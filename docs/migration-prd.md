# Splity 迁移 PRD：.NET + MySQL → Supabase + Next.js

> **文档版本**：v2.3
> **更新日期**：2026-05-19
> **状态**：草案 v2.3，待评审
> **v2.3 变更说明**：codex review 命中 6 处一致性/事实错误，本版全部修正：①Settlement 写入路径收敛为单一方案——**Node 端算 snapshot + 用户 JWT 调单一 `record_settlement_action` DEFINER RPC**，不再分叉为 mark_paid/mark_received 双 RPC，也**不使用 service_role**；②§2.1 service_role 白名单保持不变（不含 settlement）；③Phase 2 RPC 描述与 Phase 6 实现拓扑统一为 ADR-010 一种方案；④`is_group_member` helper 的 `GRANT EXECUTE TO authenticated` 与 policy `TO authenticated` 显式绑定，anon 不进入 `groups`/`participants` SELECT 路径；⑤补齐 `get_group_members(p_group_id)` RPC 定义与字段白名单；⑥事实修正："13 处舍入" → 15 处；"372 行 SettlementCalculator" → 72 行（calculator）+ 317 行（service） = 389 行总量。
> **v2.2 变更说明**：codex review 命中 8 处一致性/事实错误，全部修正：①Settlement mark-paid/received 改回 creator-only + ActorParticipantId 语义；②`mark_settlement_*` RPC 入参补齐；③RLS/DEFINER 二选一；④`groups`/`participants` 互引递归改为 `is_group_member` helper；⑤BillCalculator 舍入策略改为"逐点复刻"；⑥`DECIMAL(18,2)` scale 验收改回 Postgres 实际行为；⑦字段数量 7→6、17→15；⑧所有 DEFINER 统一 `search_path`。
> **v2.1 变更说明**：codex review 命中 7 处一致性/事实错误，全部修正：①统一公开分享路径（表本身不开 anon，仅 RPC）；②RPC 鉴权模型区分 INVOKER/DEFINER 两类；③舍入策略改为显式引用 C# `MidpointRounding.AwayFromZero` 源码行；④端点总数从 32 修正为 35；⑤Phase 1 验收去掉 `auth.users` 直查；⑥公开分享 view 强制 `security_invoker = true`；⑦交叉引用 R8 → R7。
> **v2.0 变更说明**：v1 review 命中 10 处事实/一致性错误，重写架构鉴权语义、schema 真值来源、验收依据。

---

## 1. 背景与目标

### 1.1 现状（已与源代码核对）

| 层 | 技术栈 | 入口文件 |
|---|---|---|
| 前端 | Vite + React 18 + React Router 7 + Tailwind + Clerk | `apps/frontend/src/main.tsx` |
| 后端 | .NET 8 Clean Architecture（Api / Application / Domain / Infrastructure） | `apps/backend/src/Splity.Api/Program.cs` |
| 数据库 schema 真值 | **`SplityDbContext.cs` + `DatabaseInitializer.cs` + Entity 类**（**不是** `database/init.mysql.sql`，后者只是历史基线） | `apps/backend/src/Splity.Infrastructure/Persistence/*` |
| 实体 | 11 个：AppUser / Group / Participant / Bill / BillItem / BillItemResponsibility / BillFee / BillShare / PaymentContribution / SettlementTransferConfirmation / SettlementShareLink | `apps/backend/src/Splity.Domain/Entities/*` |
| 认证 | Clerk + 自建邮箱密码鉴权（双套） | `AuthService.cs` 456 行 |

### 1.2 痛点

- 免费云平台不原生跑 .NET + MySQL。
- 两套认证并存增加维护成本。
- schema 真值散落在 EF Core 配置 + 运行期 `ALTER TABLE` 兜底里，不利于声明式版本管理。

### 1.3 目标（已修订）

- ✅ Vercel + Supabase 双免费档可部署，**目标月度运行成本 ≤ Supabase 免费档容量**（具体阈值见 §6 R7；Phase 9 验收见 §4.9）。
- ✅ 单一认证体系。
- ✅ 全栈 TypeScript，类型共享。
- ✅ **业务行为对齐**：以 §4.0 列出的"接口清单"+ "端到端用户旅程清单" 为准，**不再使用 `docs/api-spec.md`**（已过期）。
- ✅ 保留 Git 历史。

### 1.4 非目标

- ❌ 重新设计 UI / 改产品形态。
- ❌ 性能优化（迁移阶段对齐即可）。
- ❌ 旧库历史业务数据迁移（见 §1.5 切换方案）。

### 1.5 数据切换方案（v1 缺失，v2 补齐）

| 资产 | 处理 | 用户感知 |
|---|---|---|
| 旧 `app_users` 账号（含密码哈希） | **丢弃**。新版用 Supabase Auth 重新注册。 | 需重新注册。 |
| 旧用户名 / payment profile | **重建**。首次登录后引导补全。 | 一次性表单。 |
| 旧 Group / Bill / Settlement | **丢弃**（当前数据均为测试数据，与 §1.4 一致）。 | 重新建组。 |
| 旧公开分享 token | **失效**。新版重新生成。 | 旧链接 404。 |
| 旧邀请记录 | **清空**。新版重发邀请。 | 重新邀请。 |
| 旧账单参考图 / 转账凭证截图（`*_data_url` LONGTEXT） | **不迁移**。旧库下线前自行备份。 | 旧附件丢失。 |

> **若未来需要保留历史**：另立 ADR-006，写一次性 MySQL→Postgres 导出导入脚本，处理 UUID 字符串、DATETIME → TIMESTAMPTZ、`BIT` → `BOOLEAN`、`LONGTEXT` → `TEXT`、密码哈希算法差异、Clerk id 弃用等差异。**不在本 PRD 范围内**。

---

## 2. 关键决策（重大修订）

### 2.1 鉴权架构（v1 §3 / §3.3 自相矛盾，v2 重写）

**结论：采用 "Server-side Supabase 用户客户端 + RLS 强制 + 公开读路径独立处理" 的三层模型。** `service_role` 仅在受控的少数后台任务里使用（如 Auth trigger 写入 `app_users` 镜像表），**所有业务路径都走带用户 JWT 的客户端，RLS 真正生效**。

| 路径 | 客户端 | 鉴权 | RLS / 函数模式 |
|---|---|---|---|
| Server Component / Route Handler 处理已登录用户 | `createServerClient()` 携带用户 cookie/JWT | Supabase Auth | ✅ RLS **强制启用**，每张表都有策略 |
| 匿名查看公开分享 | `createServerClient()` 不带 JWT（anon role）调 RPC `resolve_share_token` | 无 | ✅ **表层完全不对 anon 开放**；公开数据**只能通过 `SECURITY DEFINER` 的 `resolve_share_token` RPC 获得**，函数内部白名单 + token 等值 + `is_active = true` 三重过滤 |
| Auth trigger / 后台维护脚本 | `createAdminClient()` 用 `service_role` | 由代码自行控制 | ❌ 绕过；**仅用于"无法用 RLS 表达的系统级写入"**（清单见 §3.2） |
| 单 group-creator 的复杂写入（创建/更新账单） | **`SECURITY INVOKER` RPC** + 外层用户客户端 | 由 RLS UPDATE/INSERT policy 拦截 | ✅ RLS 完全生效 |
| 接受/拒绝邀请（被邀请用户调用） | **`SECURITY DEFINER` RPC** `accept_invitation` / `decline_invitation` | 函数内 `auth.uid() = participants.invited_user_id` | ⚠️ RLS 被绕过，**由函数自身负责鉴权**；详见 §4.2 |
| 标记付款/收款（**仅 group creator 调用**，代表 actor 操作；对齐旧端点 `EnsureCanEditAsync`） | **`SECURITY DEFINER` RPC** `record_settlement_action`（用户 JWT 调，**不是 service_role**） | 函数内：①`auth.uid() = group.created_by_user_id`；②`p_action ∈ ('mark_paid','mark_received')`；③mark_paid 要求 `actor = from`，mark_received 要求 `actor = to`。**snapshot 校验在 Node 端完成**（详见 §4.2 "Settlement 调用模型"） | ⚠️ RLS 被绕过；snapshot 重算在外（Node 端读取走 RLS） |

**为什么不选"全部走 `service_role` + 服务层手写鉴权"**：v1 错在以为 RLS 还能兜底，实际上 `service_role` 会完全绕过 RLS。这意味着任何一个忘记加 `userId === resource.ownerId` 校验的端点就是越权漏洞。本项目业务规则多（group 成员、bill 归属、转账双方权限），手写极易遗漏。

**为什么不选"前端 anon key 直连"**：复杂多表事务（创建账单）和敏感字段过滤（收款信息）放前端不安全也写不动。

**`service_role` 的允许使用清单**（出此清单即视为违规）：
1. `handle_new_user()` Auth trigger 函数：注册时镜像写入 `app_users`。
2. 一次性数据维护脚本（如生产 fix）。
3. Webhook / 后台任务（本期暂无）。

### 2.2 其他决策汇总

| 决策项 | 选择 | 备选 |
|---|---|---|
| 前端框架 | Next.js 15 App Router | 保留 Vite / Pages Router |
| 数据访问 | Route Handler / Server Component + Supabase 用户客户端；写入分两类 RPC（INVOKER for creator-only / DEFINER for 状态机） | 前端 anon 直连 |
| 认证 | Supabase Auth（邮箱密码） | Clerk |
| 仓库策略 | 现有仓库新增 `apps/web` | 新开仓库 |
| 数据迁移 | 全新开始（详见 §1.5） | 写 ETL 脚本 |
| 枚举落库 | `SMALLINT + CHECK` | Postgres `ENUM` |
| 金额精度 | **`DECIMAL(18,2)` for money，`DECIMAL(18,4)` for weight**（与 EF Core `HasPrecision(18,2)` / `HasPrecision(18,4)` 一一对应） | 全部 `NUMERIC(18,4)` |
| 金额数值类型（应用层） | `decimal.js`，DTO 字符串传输 | JS `number`（禁止） |

---

## 3. 目标架构

### 3.1 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15 (App Router) |
| 运行时 | Node.js 20 |
| UI | React 19 + Tailwind 3 |
| 数据/状态 | React Query 5 + Server Components |
| 数据库 | Supabase Postgres 15 |
| 认证 | Supabase Auth |
| 权限 | **RLS 强制 + 用户 JWT 客户端**（见 §2.1） |
| 复杂写入 | Postgres RPC `SECURITY INVOKER` |
| 部署 | Vercel + Supabase |

### 3.2 Supabase 客户端三件套

```
apps/web/lib/supabase/
├── server.ts        ← createServerClient: 读 cookies, 带用户 JWT，RLS 生效。99% 业务用这个。
├── browser.ts       ← createBrowserClient: 客户端组件用，anon key + 用户 session。
├── middleware.ts    ← Next.js middleware 内用，刷新 session cookie。
└── admin.ts         ← createAdminClient: service_role。受限清单见 §2.1，调用处必须有 // SERVICE-ROLE: 注释说明原因
```

### 3.3 仓库结构

```
Splity/
├── apps/
│   ├── backend/      ← 旧 .NET，保留至 Phase 8 完成
│   ├── frontend/     ← 旧 Vite，保留至 Phase 8 完成
│   └── web/          ← 新建
│       ├── app/
│       │   ├── (auth)/sign-in, verify-email
│       │   ├── (app)/
│       │   │   ├── dashboard
│       │   │   ├── invitations
│       │   │   ├── settings
│       │   │   └── groups/[groupId]/
│       │   │       ├── page.tsx              ← 组详情
│       │   │       ├── bills/[billId]/...
│       │   │       ├── settlements/...       ← group-scoped（修正 v1 §6）
│       │   │       └── settlement-shares/...
│       │   ├── share/[token]/page.tsx        ← 公开分享，anon
│       │   └── api/                          ← Route Handlers（端点清单见 §4.0）
│       ├── lib/
│       │   ├── supabase/ (见 §3.2)
│       │   ├── calculations/                 ← C# 移植
│       │   ├── services/                     ← 对应 Application/Services
│       │   ├── auth/                         ← Auth helpers
│       │   └── money/                        ← decimal.js 包装，scale 统一
│       └── middleware.ts
├── packages/
│   └── api-client/   ← 改造为纯 types
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_rpc_functions.sql
│   │   └── 0004_auth_triggers.sql
│   └── seed.sql
└── pnpm-workspace.yaml
```

### 3.4 `app_users` 与 `auth.users` 的映射（v1 缺失，v2 补齐）

新版 `app_users` 是 `auth.users` 的**业务侧镜像**，由 Auth trigger 创建：

| 字段 | 来源 | 备注 |
|---|---|---|
| `id` (UUID, PK) | = `auth.users.id` | FK 到 `auth.users(id) ON DELETE CASCADE` |
| `email` | = `auth.users.email` | 由 trigger 同步 |
| `name` | 注册表单 `raw_user_meta_data->>'name'` | 必填 |
| `username` | 用户后续设置 | 唯一索引 |
| `default_payment_*`（**6 个字段**：`payee_name` / `method` / `account_name` / `account_number` / `notes` / `qr_data_url`，对齐 [SplityDbContext.cs:61-66](../apps/backend/src/Splity.Infrastructure/Persistence/SplityDbContext.cs#L61)） | 用户在设置页录入 | 全部可空 |
| `created_at_utc` | `now()` | |
| **`password_hash`** | **删除** | 由 Supabase Auth 管理 |
| **`password_salt`** | **删除** | 同上 |
| **`clerk_user_id`** | **删除** | 不再用 Clerk |
| **`email_verified_at_utc`** | **删除** | 由 `auth.users.email_confirmed_at` 替代 |
| **`pending_email_verification_*`** | **删除** | Supabase Auth 自带 |

**Trigger**：
```sql
-- 在 0004_auth_triggers.sql 中
CREATE FUNCTION public.handle_new_user() RETURNS trigger
SECURITY DEFINER  -- 必须，因为 anon 注册时还没用户上下文
SET search_path = public, pg_temp  -- 与 §4.2 DEFINER 函数审计要求一致
AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, created_at_utc)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3.5 金额精度策略（v1 §6 R1 升级为正式规范）

| 字段 | C# `HasPrecision` | Postgres | TS 输入边界 | 计算 | 输出边界 |
|---|---|---|---|---|---|
| `bill_items.amount` | (18, 2) | `DECIMAL(18,2)` | 字符串 "12.34" | `Decimal("12.34")` | 字符串 |
| `bill_fees.value`（金额型 fee） | (18, 2) | `DECIMAL(18,2)` | 字符串 | `Decimal` | 字符串 |
| `bill_fees.value`（百分比型 fee） | (18, 2) | `DECIMAL(18,2)` | 字符串 "10.00" 表示 10% | `Decimal` | 字符串 |
| `bill_shares.weight` | **(18, 4)** | `DECIMAL(18,4)` | 字符串 | `Decimal` | 字符串 |
| `bill_shares.pre_fee_amount` / `fee_amount` / `total_share_amount` | (18, 2) | `DECIMAL(18,2)` | — | `Decimal`，**half-away-from-zero 舍入** | 字符串 |
| `payment_contributions.amount` | (18, 2) | `DECIMAL(18,2)` | 字符串 | `Decimal` | 字符串 |
| `settlement_transfer_confirmations.amount` | (18, 2) | `DECIMAL(18,2)` | — | `Decimal` | 字符串 |

**规则**：
1. **应用层**：用 `lib/money/Money.ts` 包装 `decimal.js`，所有金额运算只接受 `Money`。**Money 构造器对入参字符串校验 scale ≤ 2（weight 子类 ≤ 4）**，越界抛 `MoneyScaleError`——这是 Postgres `NUMERIC(18,2)` 默认会"静默四舍五入"的补救（详见 §4.2 数值精度验收）。
2. **DTO 边界**：JSON 字符串（避免 JS number 精度损失）。前端入口/出口做 `Money ↔ string` 转换。
3. **舍入策略**：**half-away-from-zero**（即正数和负数都向远离 0 的方向舍入；半值如 `2.345` 舍入到 2 位为 `2.35`，`-2.345` 舍入到 `-2.35`）。对齐 C# 源码显式使用的 `Math.Round(..., MidpointRounding.AwayFromZero)`，**不是** `decimal` 的"默认行为"（C# `decimal` 默认实际上是 banker's rounding / `ToEven`）。`decimal.js` 对应 `Decimal.ROUND_HALF_UP`（mode `4`，文档原文 "Rounds half away from zero"）。
4. **舍入位置必须逐点复刻 C#**（**不是**"只在 total_share_amount 舍入"）。源码中的舍入点清单（必须 1:1 移植，缺一处都会导致 fixture 不一致）：

   | C# 行 | 调用 | 含义 |
   |---|---|---|
   | [BillCalculator.cs:80](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L80) | `RoundToCurrency(items.Sum(amount))` | subtotal |
   | [BillCalculator.cs:82](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L82) | `RoundToCurrency(appliedFees.Sum)` | totalFee |
   | [BillCalculator.cs:83](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L83) | `RoundToCurrency(subtotal + totalFee)` | grandTotal |
   | [BillCalculator.cs:96](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L96) | `RoundToCurrency(preFeeAllocations[k] + v)` | per-participant pre-fee 累加 |
   | [BillCalculator.cs:127](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L127) | `RoundToCurrency(preFeeAmount + feeAmount)` | total share amount |
   | [BillCalculator.cs:154](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L154) | `RoundToCurrency(subtotal * (fee.Value / 100m))` | percentage fee applied amount |
   | [BillCalculator.cs:155](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L155) | `RoundToCurrency(fee.Value)` | fixed fee applied amount |
   | [BillCalculator.cs:180](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L180) | `contributionMap[id] += RoundToCurrency(contribution.Amount)` | extra contribution 入账 |
   | [BillCalculator.cs:183](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L183) | `RoundToCurrency(contributionMap.Sum)` | extraTotal |
   | [BillCalculator.cs:189](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L189) | `RoundToCurrency(grandTotal - extraTotal)` | remaining |
   | [BillCalculator.cs:191](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L191) | `RoundToCurrency(contributionMap[primaryPayer])` | primary payer 累加 |
   | [BillCalculator.cs:193](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L193) | `RoundToCurrency(contributionMap.Sum)` | contributionTotal 二次校对 |
   | [BillCalculator.cs:204](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L204) | `RoundToCurrency(totalAmount)` | AllocateByWeight 入口 |
   | [BillCalculator.cs:240](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L240) | `Math.Round(amount * 100m, 0)` | `ToCents`（取分） |
   | [SettlementCalculator.cs:68](../apps/backend/src/Splity.Application/Calculations/SettlementCalculator.cs#L68) | `Math.Round(amount * 100m, 0)` | `ToCents` |

   **TS 实现必须有一个 `roundCurrency(d: Decimal): Decimal` 和 `toCents(d: Decimal): number`，并在以上每一处调用**，不允许"延迟到最后一次性舍入"——会出 fixture 不一致。
4. **测试**：Phase 5 必须验证"输入相同时新版输出 == C# 输出"。

---

## 4. 阶段路线图

### Phase 0：基线产出（迁移前置，0.5 天，v1 缺失）

> **目的**：把 "迁移目标" 锁死在事实层面，避免后期主观判断"是否对齐"。

**任务**
1. **接口清单**：扫 `apps/backend/src/Splity.Api/Endpoints/` 全部 `Map*` 调用，整理为 `docs/api-inventory.md`。**实测 35 条**（按 `grep -cE "Map(Get\|Post\|Put\|Delete)"` 核验）：
   - **Auth（11）**：`POST /api/auth/register`、`/login`、`/forgot-password`；`GET /api/auth/me`、`/users/search`；`POST /api/auth/sync`、`/change-password`、`/email-verification/send`、`/email-verification/verify`；`PUT /api/auth/profile`、`/payment-profile`
   - **Groups（6）**：`GET/POST /api/groups`；`GET/PUT/DELETE /api/groups/{id}`；`PUT /api/groups/{id}/status`
   - **Bills（5）**：`POST/GET /api/groups/{groupId}/bills`；`GET/PUT/DELETE /api/groups/{groupId}/bills/{billId}`
   - **Participants（4）**：`POST/GET /api/groups/{groupId}/participants`；`PUT/DELETE /api/groups/{groupId}/participants/{id}`
   - **Settlements（3）**：`GET /api/groups/{groupId}/settlements`；`POST .../mark-paid`；`POST .../mark-received`
   - **SettlementShares（3）**：`GET/POST /api/groups/{groupId}/settlement-shares`；`GET /api/settlement-shares/{shareToken}`（**匿名**）
   - **Invitations（3）**：`GET /api/invitations`；`POST /api/invitations/{participantId}/accept`、`/decline`
2. **端到端用户旅程清单**：写 `docs/user-journeys.md`，至少 10 条主路径（注册 → 建组 → 邀请 → 记账 → 标记付款 → 生成分享 → 匿名查看 → 接受邀请 → 改资料 → 删除组）。每条标注涉及的接口与 DB 变更。
3. **schema 真值导出**：从 `SplityDbContext.OnModelCreating` + `DatabaseInitializer.*` 提取最终列定义，输出 `docs/schema-truth.md`，作为 Phase 2 的输入。

**验收**
- [ ] `api-inventory.md` 至少 **35 条**（与上述分布完全一致），每条含：方法 / 路径 / 鉴权要求 / 入参 / 出参 / 副作用。
- [ ] `user-journeys.md` ≥ 10 条。
- [ ] `schema-truth.md` 列出 11 张表所有字段（含运行期 ALTER 补出的）。
- [ ] 三份文档作为后续阶段 PR 的 review checklist。

---

### Phase 1：脚手架与基础设施（0.5 天）

**交付物**
- `apps/web` Next.js 15 + TS + Tailwind。
- `pnpm-workspace.yaml` 加入。
- Supabase 项目创建，`.env.local` 配置 URL / anon / service_role。
- `lib/supabase/{server,browser,middleware,admin}.ts` 四件套。
- `middleware.ts` 启用 session 刷新。
- 端口避开 5173（旧前端）和 5000（旧后端）；用 3000。

**验收**
- [ ] `localhost:3000` 启动成功。
- [ ] 在一个 Server Component 内调 `supabase.auth.getUser()`，**未登录**时返回 `{ data: { user: null } }`，不抛错。
- [ ] Phase 2 后置验收（提前埋点）：用 `createServerClient()` 查 `public.app_users` 未登录返回空数组，确认 RLS 在用户客户端上默认拒绝。
- [ ] `admin.ts` 文件顶部带 `// SERVICE-ROLE BYPASS` 警示注释，且 grep `createAdminClient(` 全仓库仅出现在 §2.1 白名单清单中。

---

### Phase 2：Schema + RLS + RPC（2 天，v1 估 1 天偏少）

**交付物**

**0001_schema.sql** — 11 张表，源自 §3.4 + Phase 0 `schema-truth.md`：

| 表 | 来源 | 关键差异点 |
|---|---|---|
| `app_users` | §3.4 重新设计 | 删除密码 / Clerk / 邮箱验证字段；PK FK 到 `auth.users` |
| `groups` | DbContext 30-48 行 | `status SMALLINT NOT NULL DEFAULT 0 CHECK (status IN (0,1,2))` |
| `participants` | DbContext 78-104 行 | 含 `username` / `invited_user_id` / `invitation_status` |
| `bills` | DbContext 106-127 行 | 含 `reference_image_data_url TEXT`；`split_mode SMALLINT` |
| `bill_items` | DbContext 129-143 行 | `amount DECIMAL(18,2)` |
| `bill_item_responsibilities` | DbContext 145-163 行 | UNIQUE (bill_item_id, participant_id) |
| `bill_fees` | DbContext 165-179 行 | `fee_type SMALLINT CHECK (fee_type IN (1,2))`，`value DECIMAL(18,2)` |
| `bill_shares` | DbContext 181-203 行 | `weight DECIMAL(18,4)`，三个金额字段 `DECIMAL(18,2)` |
| `payment_contributions` | DbContext 205-225 行 | `amount DECIMAL(18,2)` |
| `settlement_transfer_confirmations` | DbContext 227-252 行 | `transfer_key VARCHAR(250)`；`status SMALLINT DEFAULT 0 CHECK (status IN (0,1,2))`（`Pending=0` / `MarkedPaid=1` / `Received=2`，对齐 `SettlementTransferStatus` 枚举）；含 `proof_screenshot_data_url TEXT` / `marked_paid_at_utc` / `marked_received_at_utc` |
| `settlement_share_links` | DbContext 254-280 行 | **15 个字段全部保留**（实测 `entity.Property` 调用数）：`id` / `group_id` / `share_token` / `from_date_utc` / `to_date_utc` / `creator_name` / `payee_name` / `payment_method` / `account_name` / `account_number` / `notes` / `payment_qr_data_url` / `receiver_payment_infos_json` / `is_active` / `created_at_utc` |

**0002_rls_policies.sql** — 每张表分三步：
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
2. 默认拒绝（不写 policy 即拒绝）。
3. 增量放行，**严格遵守"RLS / DEFINER 二选一"原则**：表上只放 SELECT policy 与 creator-only 的 INSERT/UPDATE/DELETE policy；**所有"非 creator 的状态变更" 一律走 §4.2 列出的 `SECURITY DEFINER` RPC，不在表上开窄 UPDATE policy**。

**Helper 函数（解决 groups ↔ participants 互引递归）**：

```sql
-- 0002_rls_policies.sql 开头先建 helper
CREATE OR REPLACE FUNCTION public.is_group_member(p_group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = p_group_id AND g.created_by_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.group_id = p_group_id
      AND p.invited_user_id = auth.uid()
      AND p.invitation_status = 1 /* Accepted */
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_group_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_member(UUID) TO authenticated;
```

> 这个 helper 用 `SECURITY DEFINER` 绕过自身查表时的 RLS，避免 `groups.SELECT` policy 依赖 `participants` 而 `participants.SELECT` policy 又依赖 `groups` 的死循环。`STABLE` 让 planner 在同一 query 里复用结果。
>
> **Role / Grant 对齐**：因 `is_group_member` 仅 `GRANT EXECUTE TO authenticated`，所有调用它的 policy 必须用 `FOR SELECT TO authenticated`（**不是** `TO public` / `TO PUBLIC` / 省略不写——省略相当于对所有 role 含 anon 都尝试匹配，进入函数体时因 anon 无 EXECUTE 权限会**报错**而不是返回空）。anon 路径只能通过 §4.7 的 `resolve_share_token` RPC 访问公开数据，**不应触达 `groups` / `participants` 等表的 SELECT policy**。

**Policy 表**（**Settlement 状态变更全部在 RPC 内做，表上只允许 group creator 写**，对齐旧端点 [SettlementEndpoints.cs:44/61](../apps/backend/src/Splity.Api/Endpoints/SettlementEndpoints.cs#L44) 的 `EnsureCanEditAsync` 约束）。**所有 SELECT/INSERT/UPDATE/DELETE policy 一律 `TO authenticated`**（anon 不进入这些表，详见上文 helper 说明）：

| 表 | SELECT | INSERT/UPDATE/DELETE |
|---|---|---|
| `app_users` | 自己 (`id = auth.uid()`) | 仅自己 UPDATE 自身行；不允许任意用户 SELECT 其他用户的 payment profile。组内成员查看姓名走 RPC `get_group_members(p_group_id)`（见下方 RPC 表） |
| `groups` | `created_by_user_id = auth.uid()` **OR** `is_group_member(id)` | 仅 creator |
| `participants` | `is_group_member(group_id)` | 仅 creator。`invitation_status` 变更**不在此**，走 DEFINER RPC `accept_invitation` / `decline_invitation` |
| `bills` / `bill_items` / `bill_item_responsibilities` / `bill_fees` / `bill_shares` / `payment_contributions` | `is_group_member(group_id)`（bill_* 表通过 `EXISTS (SELECT 1 FROM bills WHERE bills.id = bill_id AND is_group_member(bills.group_id))`） | 仅 group creator |
| `settlement_transfer_confirmations` | `is_group_member(group_id)` | 仅 group creator（mark-paid / mark-received 的 UPSERT 由 `record_settlement_action` DEFINER RPC 在 creator 身份下执行——见 §4.2 RPC 表中"Settlement 调用模型"） |
| `settlement_share_links` | **不对 anon 开放任何表级访问**；登录用户仅 group creator 可读 | 仅 group creator |

**0003_rpc_functions.sql** — 按鉴权语义分两类：

| RPC | 安全模式 | 调用者要求 | 内部鉴权 |
|---|---|---|---|
| `create_bill_with_items(p_group_id UUID, p_input JSONB) RETURNS UUID` | `SECURITY INVOKER` | 登录 + 是 group creator | 完全依赖 `bills` / `bill_*` 表的 INSERT RLS |
| `update_bill_with_items(p_bill_id UUID, p_input JSONB) RETURNS VOID` | `SECURITY INVOKER` | 同上 | 依赖 RLS |
| `record_settlement_action(p_action TEXT /* 'mark_paid' \| 'mark_received' */, p_group_id UUID, p_from_participant_id UUID, p_to_participant_id UUID, p_amount NUMERIC, p_from_date_utc TIMESTAMPTZ, p_to_date_utc TIMESTAMPTZ, p_actor_participant_id UUID, p_transfer_key TEXT, p_proof_screenshot_data_url TEXT) RETURNS JSONB` | **`SECURITY DEFINER`** | 登录 + 是 group creator（**对齐旧端点 `EnsureCanEditAsync`**），**用户 JWT 调用**（不是 service_role） | 见下文"Settlement 调用模型" |
| `get_group_members(p_group_id UUID) RETURNS TABLE(user_id UUID, name TEXT, username TEXT, is_creator BOOLEAN)` | **`SECURITY DEFINER`** | 登录 + `is_group_member(p_group_id) = true` | 函数体首句校验 `is_group_member(p_group_id)`，失败 `RAISE EXCEPTION 'forbidden'`；返回字段白名单：`user_id` / `name` / `username` / `is_creator`。**不返回 email / payment profile / created_at_utc 等敏感字段** |
| `accept_invitation(p_participant_id UUID) RETURNS VOID` | **`SECURITY DEFINER`** | 登录 + 是该 participant 的 `invited_user_id` | 函数体显式校验 `auth.uid() = participants.invited_user_id AND invitation_status IN (Pending)`；原子更新 `invitation_status = Accepted` |
| `decline_invitation(p_participant_id UUID) RETURNS VOID` | **`SECURITY DEFINER`** | 同上 | 同上，置 `Declined` |
| `resolve_share_token(p_token TEXT) RETURNS JSONB` | **`SECURITY DEFINER`** | **anon 即可调用**（`GRANT EXECUTE TO anon, authenticated`） | 函数体：①按 token 查 `settlement_share_links` 且 `is_active = true`，无则返回 `NULL`；②仅 SELECT §4.7 白名单字段；③衍生 transfers 只返回参与者 `name`，不带 `invited_user_id`/`username`/`id`；④**不返回任何 bill 明细** |

#### Settlement 调用模型（对齐旧后端语义，**不是"actor 本人调用"**）

旧后端 [SettlementEndpoints.cs:34-66](../apps/backend/src/Splity.Api/Endpoints/SettlementEndpoints.cs#L34) + [SettlementsService.cs:53-119](../apps/backend/src/Splity.Application/Services/SettlementsService.cs#L53) 的实际语义是：

1. **端点鉴权**：仅 group creator 能调用 mark-paid / mark-received（`EnsureCanEditAsync`）。
2. **请求参数**：creator 在 body 里传 `ActorParticipantId` 表示"代谁标记"（mark-paid 必须 `Actor == FromParticipant`，mark-received 必须 `Actor == ToParticipant`）。
3. **transfer 校验**：transfer 不是持久化对象，而是**实时从当前 group 的 bill snapshot + 已有 confirmations 重算**（`BuildSnapshotAsync` → `SettlementCalculator.CalculateTransfers`）。必须先用 `from / to / amount / from_date / to_date` 在 snapshot 中匹配到对应 transfer，再据此生成或更新 `settlement_transfer_confirmations` 行。
4. **transfer_key**：由 `BuildTransferKey(groupId, fromDate, toDate, transfer)` 派生（**由调用方算出后作为 RPC 入参 `p_transfer_key` 传入**，让 RPC 不需要重算 snapshot）。
5. **状态机**：`Pending(0) → MarkedPaid(1) → Received(2)`。

**实现拓扑（ADR-010 已定，**唯一方案**，与 §2.1 一致——service_role 不进业务路径）**：

```
Route Handler (apps/web)           record_settlement_action RPC (Postgres)
─────────────────────────          ────────────────────────────────────────
1. requireUser() + creator 校验    SECURITY DEFINER, search_path=public,pg_temp
2. createServerClient()            ↓ 收到 9 个参数
3. 查 group + participants + bills + GRANT EXECUTE TO authenticated
   confirmations（**用户 JWT，RLS 生效**）↓
4. TS SettlementCalculator         A. 函数体首句校验
   .computeSnapshot(...) →            auth.uid() = (SELECT created_by_user_id
   返回 transfer 列表                                FROM groups WHERE id = p_group_id)
5. 在列表中按                          失败 → RAISE EXCEPTION 'forbidden'
   (from, to, amount) 找匹配          B. 校验 p_action ∈ ('mark_paid','mark_received')
   transfer；不存在 → 422             C. 校验 actor:
6. 派生 p_transfer_key                    mark_paid: p_actor = p_from
                                          mark_received: p_actor = p_to
7. 用户 JWT 调用 RPC                  D. UPSERT settlement_transfer_confirmations
   record_settlement_action(...)        ON CONFLICT (group_id, transfer_key)
   ↓                                    ：根据 p_action 推进 status，
8. 返回 JSON                            mark_received 要求既有 status ≥ MarkedPaid
                                       E. 返回 JSON
```

**为什么 Snapshot 在 Node 端算**（ADR-010 决策）：
- ✅ 复用 TS `SettlementCalculator`，不需要把 389 行业务逻辑（72 行 calculator + 317 行 service 中的 snapshot 装配 / `GetTransferFromSnapshotAsync` / `BuildTransferKey` / 已有 confirmations 合并）翻译成 PL/pgSQL。
- ✅ **不需要 service_role**——Node 端读取走用户 JWT + RLS；写入走 `SECURITY DEFINER` RPC，函数内自检 creator。
- ✅ §2.1 service_role 白名单**保持不变**（只剩 `handle_new_user` trigger 和一次性维护脚本）。
- ⚠️ 代价：snapshot 校验和持久化是两次 round trip。可接受（settlement 写操作低频）。

#### 所有 `SECURITY DEFINER` 函数的统一约束（**对齐 §4.2 验收**）

- `SET search_path = public, pg_temp`（**所有** DEFINER 函数，包括 `is_group_member` 与 `handle_new_user`，统一这一行）。
- 函数体首段做 `auth.uid()` 校验，失败 `RAISE EXCEPTION 'forbidden'`；**例外**：`resolve_share_token`（anon 入口）与 `handle_new_user`（auth trigger，无 `auth.uid()`）。
- `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;` 后 `GRANT EXECUTE TO authenticated`（`resolve_share_token` 额外 `GRANT TO anon`；`handle_new_user` 不 grant，由 trigger 调）。

#### 禁止事项

- ❌ 把 `create_bill_with_items` 等 INVOKER 函数误设为 DEFINER（绕过 RLS）。
- ❌ 在 `participants` / `settlement_transfer_confirmations` 表上同时开放"被邀请人 / actor 本人 UPDATE policy"——本 PRD 选 DEFINER 路线，**表上只有 creator-only 的 INSERT/UPDATE/DELETE policy**，所有 cross-role 写入集中在 DEFINER RPC 内审计。

**0004_auth_triggers.sql** — 见 §3.4 的 `handle_new_user`。

**验收**
- [ ] 在 Supabase Studio 看到 11 张表 + 1 个 trigger function + 至少 5 个 RPC。
- [ ] **越权测试**：用账号 A 创建 Group G；用账号 B 的 JWT 调 `SELECT * FROM groups WHERE id = G.id` 返回空。
- [ ] **匿名测试**：未登录调 `SELECT * FROM groups` 返回空；未登录调 `SELECT * FROM settlement_share_links` 返回空（即使 token 已知）；调 `resolve_share_token('valid_token')` 返回脱敏 JSON；调 `resolve_share_token('invalid')` 返回 null。
- [ ] **DEFINER 函数审计**：所有 `SECURITY DEFINER` 函数（`is_group_member`、`get_group_members`、`accept_invitation`、`decline_invitation`、`record_settlement_action`、`resolve_share_token`、`handle_new_user`）均含 `SET search_path = public, pg_temp` 且函数体首段有 `auth.uid()` / `is_group_member` / creator 三类校验之一（`resolve_share_token` 允许 anon、`handle_new_user` 是 auth trigger 无 `auth.uid()`，两者例外）。
- [ ] **数值精度测试**：写入 `bill_items.amount = '12345678901234.56'` 成功；写入 `'1.234'` Postgres 会**默认四舍五入存为 `1.23`**（这是 `NUMERIC(scale)` 的标准行为，**不会报错**）。如果要拒绝越界 scale，必须在应用层（`lib/money/Money.ts` 入口）或 Postgres `CHECK` 约束中显式判断：`CHECK (scale(amount) <= 2)`。本期采用**应用层校验**：Money 构造器在 scale > 2 时抛错。Phase 5 验收单元测试覆盖此规则。

**风险**
- RLS policy 写错是最高风险（§6 R3）。强制写 SQL 级别 fixture 测试，每张表正/反例至少各 1。

---

### Phase 3：Supabase Auth 接入（1 天）

**交付物**
- `app/(auth)/sign-in/page.tsx`：邮箱 + 密码 + 姓名 → `supabase.auth.signUp({ options: { data: { name } } })`。
- `app/(auth)/verify-email/page.tsx`：处理 `?code=...` 回调，调 `supabase.auth.exchangeCodeForSession`。
- `app/(auth)/forgot-password/page.tsx`：调 `supabase.auth.resetPasswordForEmail`。
- `lib/auth/server.ts`：`getUser()` / `requireUser()` 辅助，从 Server Component cookies 拿。
- `middleware.ts`：刷新 session + 保护 `(app)/*`。
- 删除 `apps/web` 中所有 Clerk 引用（旧 `apps/frontend` 不动）。

**验收**
- [ ] 注册 → 邮箱验证 → 自动登录 → `app_users` 表有对应行（trigger 起效）。
- [ ] 邮件发送限速触达时（>3/h）给出友好提示。
- [ ] 未登录访问 `/dashboard` 重定向到 `/sign-in`。

---

### Phase 4：Groups + Participants（1 天）

**对应旧接口**（来自 Phase 0 inventory）：
- `GET /api/groups`, `POST /api/groups`
- `GET/PUT/DELETE /api/groups/{id}`, `PUT /api/groups/{id}/status`
- `GET/POST /api/groups/{groupId}/participants`
- `PUT/DELETE /api/groups/{groupId}/participants/{participantId}`
- `GET /api/auth/users/search`（用户名搜索，邀请用）

**交付物**
- `lib/services/groups.ts`, `lib/services/participants.ts`。
- 对应 Route Handlers 或直接 Server Action。
- `app/(app)/dashboard/page.tsx` + `groups/[groupId]/page.tsx`。

**验收**
- [ ] 跑通建组 → 加参与者 → 改名 → 改 status → 删除。
- [ ] 用账号 B 直接访问 `/groups/{A 的组 ID}` 返回 404（RLS 生效）。

---

### Phase 5：Bills + BillCalculator 移植（3.5 天，v1 估 3 天）

**对应旧接口**：
- `POST/GET /api/groups/{groupId}/bills`
- `GET/PUT/DELETE /api/groups/{groupId}/bills/{billId}`

**交付物**
- `lib/money/Money.ts`：`decimal.js` 包装，统一 scale 与舍入。
- `lib/calculations/bill-calculator.ts`：从 `BillCalculator.cs` 1:1 移植，247 行。
- `lib/calculations/bill-calculator.test.ts`：**先于实现**写测试，从 `apps/backend/tests/` 抄过来（若存在），并补 §3.5 列的舍入边界。
- `lib/services/bills.ts`：对应 `BillsService.cs` 677 行。
- RPC `create_bill_with_items` / `update_bill_with_items`。
- `app/(app)/groups/[groupId]/bills/[billId]/...` 页面。

**验收**
- [ ] 单元测试覆盖率 ≥ 80%。
- [ ] **C# 对照测试**：准备 ≥ 10 个 fixture（JSON 输入 + 期望输出），同时用旧 .NET 后端和新 TS 实现跑，输出完全一致到小数后 4 位（weight）/ 2 位（money）。
- [ ] 含百分比 fee + 责任人子集 + 总额无法整除 三种边界全部通过。

**风险**：R1 + R2，见 §6。

---

### Phase 6：Settlements 移植（2 天）

**对应旧接口**：
- `GET /api/groups/{groupId}/settlements`
- `POST /api/groups/{groupId}/settlements/mark-paid`
- `POST /api/groups/{groupId}/settlements/mark-received`

**注意**：settlements 是 **group-scoped** 资源，不存在 `/settlements/{id}` 这种独立路径。前端路由设计为 `app/(app)/groups/[groupId]/settlements/page.tsx`（v1 §6 错误已修正）。

**ADR-010 已定（详见 §4.2 Settlement 调用模型）**：Node + 用户 JWT 路径——TS `SettlementCalculator` 在 Node 端算 snapshot，**用户 JWT** 调单一 `record_settlement_action()` `SECURITY DEFINER` RPC 做写入；**不使用 service_role**，不增加 §2.1 白名单条目。已评估的备选方案（PL/pgSQL 重写整个 SettlementCalculator + SettlementsService snapshot 装配逻辑，合计 72 + 317 = 389 行）成本过高，本期不采用。

**交付物**
- `lib/calculations/settlement-calculator.ts` 移植 [SettlementCalculator.cs](../apps/backend/src/Splity.Application/Calculations/SettlementCalculator.cs)（**72 行**核心 + 相关 helper）。
- `lib/services/settlements.ts` 对应 [SettlementsService.cs](../apps/backend/src/Splity.Application/Services/SettlementsService.cs)（317 行），含 `BuildSnapshotAsync` / `GetTransferFromSnapshotAsync` / `BuildTransferKey` / `NormalizeProofScreenshot` 等。
- 单一 RPC `record_settlement_action(...)` 签名见 §4.2 RPC 表。
- 状态机：**`Pending(0) → MarkedPaid(1) → Received(2)`**（对齐 [SettlementTransferStatus](../apps/backend/src/Splity.Domain/Enums) 枚举，**修正 v2.1 错误的 "Submitted/Confirmed" 命名**）。
- 端点鉴权：Route Handler 入口确认 `auth.uid() = group.created_by_user_id`（对齐旧 `EnsureCanEditAsync`），再调 RPC（RPC 内会二次校验同一约束，作为防御层）。

**验收**
- [ ] 同 group 多笔账单 → 最少转账方案与旧 C# 输出对齐（fixture 对照）。
- [ ] mark-paid：creator 调，body 中 `actorParticipantId = fromParticipantId` 才接受；不一致 → 422。
- [ ] mark-received：creator 调，且既存行 `status >= MarkedPaid` 才接受；否则 → 422。
- [ ] 非 creator 用户（即使是 from/to participant 对应的登录用户）直接调端点 → 403。
- [ ] transfer 元组不在当前 snapshot 中（如金额对不上）→ 422 `transfer not found in current snapshot`。
- [ ] 凭证截图 `proof_screenshot_data_url` 可上传可保存。

---

### Phase 7：邀请 + 公开分享（1.5 天，v1 估 1 天）

**对应旧接口**：
- `GET /api/invitations`, `POST /api/invitations/{participantId}/accept|decline`
- `GET/POST /api/groups/{groupId}/settlement-shares`
- `GET /api/settlement-shares/{shareToken}`（**公开**）

**公开分享字段策略（v1 §7 缺失，v2 必填）**

`settlement_share_links` 共 15 个字段（对齐 [SplityDbContext.cs:254-280](../apps/backend/src/Splity.Infrastructure/Persistence/SplityDbContext.cs#L254)），根据敏感度分三类：

| 字段 | anon 可读 | 备注 |
|---|---|---|
| `id` | ❌ | 仅服务端 |
| `group_id` | ❌ | 不暴露内部 ID |
| `share_token` | ✅ | 即查询入口 |
| `from_date_utc` / `to_date_utc` | ✅ | 结算时间窗 |
| `creator_name` | ✅ | 谁生成的 |
| `payee_name` / `payment_method` / `account_name` / `account_number` / `notes` / `payment_qr_data_url` | ✅ **但必须前端显式打码选项**（手机号 / 卡号 mask） | 这是分享的核心目的 |
| `receiver_payment_infos_json` | ✅ | 同上 |
| `is_active` | 隐式（false 时直接 404，不返回 false） | |
| `created_at_utc` | ✅ | |

**实现方式（唯一路径）**：
- **必须**：通过 `SECURITY DEFINER` RPC `resolve_share_token(p_token TEXT) RETURNS JSONB` 暴露白名单字段，函数体里 SELECT 写死的列清单，返回 JSON。`GRANT EXECUTE ON FUNCTION resolve_share_token(TEXT) TO anon, authenticated;`。
- **禁止**：对 `settlement_share_links` 表给 anon role 任何 SELECT policy。如要查 RLS 策略覆盖度，运行 `SELECT * FROM pg_policies WHERE tablename = 'settlement_share_links'` 应**不出现 anon 相关行**。
- **关于 view**：若坚持用 view 而非 RPC，**必须**用 Postgres 15 的 `CREATE VIEW ... WITH (security_invoker = true)`，否则普通 view 默认以 view owner 权限执行，会绕过底层 RLS，与"表不开 anon"自相矛盾。本 PRD 选 RPC 路线（更简单、审计点更集中），不引入 view。

**衍生数据**：分享页通常还要展示 group 下的 settlement transfers 列表。`resolve_share_token` 返回的 JSON **必须**：
- 只返回该 token `from_date_utc`/`to_date_utc` 时间窗内的 transfer。
- transfer 的 `from`/`to` 参与者**只暴露 `name`**，不返回 `invited_user_id` / `username` / `id`（用 hash 或 ordinal 代替）。
- **不返回 bill 明细**（不 join `bills` / `bill_items`）。

**撤销**：creator 调 `POST /api/groups/{groupId}/settlement-shares` 重新生成时，事务中把旧 token `is_active = false`（旧链接立即 404，因为 RPC 内有 `is_active = true` 条件）。

**验收**
- [ ] 退出登录后访问 `/share/{valid_token}` 能看到金额 + 收款方式。
- [ ] 错误 token 返回 404。
- [ ] `is_active = false` 的 token 返回 404。
- [ ] **anon key 直接 query `settlement_share_links` 表返回空**（表层不暴露），且 `SELECT * FROM pg_policies WHERE tablename = 'settlement_share_links' AND 'anon' = ANY(roles)` 必须为 0 行。
- [ ] **anon key 调 `resolve_share_token('valid')` 返回脱敏 JSON；调 `resolve_share_token('invalid')` 返回 `null`**。
- [ ] 分享页响应不出现非白名单字段（如 `invited_user_id` / `username` / `bill_id`）—— 写一个抓 fetch 响应的断言。
- [ ] 如果实现中引入了 view，CI 检查所有 view 定义必须含 `security_invoker = true`（或本期严格不用 view）。

---

### Phase 8：前端页面全面迁移（5 天，v1 估 3-5 天，定为 5）

**交付物**
- 把 `apps/frontend/src/features/` 8 个模块 port 到 `apps/web/app/`：
  - `auth` → `app/(auth)/*`
  - `home` / `bills` / `groups` / `participants` / `settlements` → `app/(app)/groups/[groupId]/*` 与 `app/(app)/dashboard`
  - `invitations` → `app/(app)/invitations`
  - `settings` → `app/(app)/settings`
- 共享组件迁移到 `apps/web/components/`。
- i18n：评估 `next-intl` vs 复用现有 `shared/i18n`。**默认复用现有**，除非有阻塞（决策延后到 Phase 8 第 1 天）。
- 移除 Clerk hooks → Supabase 等价（`useUser` → `useSupabaseUser`）。
- `packages/api-client` 改造为纯 types 包：删 `http.ts` / `errors.ts` 中的 fetch 逻辑，保留所有 DTO 类型。

**验收**（依据 Phase 0 `user-journeys.md`）
- [ ] 10 条用户旅程全部跑通。
- [ ] UI 视觉 vs 旧版的差异以 issue 形式记录（**不强制像素一致**，但功能与信息密度等价）。
- [ ] 旧 `apps/frontend` 停掉，新 `apps/web` 独立运行。

---

### Phase 9：生产部署（1 天，v1 估 0.5 天）

**交付物**
- Vercel 项目 + GitHub 集成。
- 环境变量：`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`（仅 server runtime）。
- Supabase 生产 schema：`supabase db push`。
- 自定义域名（可选）。
- Sentry 免费档接入（可选）。
- 删除旧 `apps/backend` / `apps/frontend` / `database/`，更新 `README.md` / `docs/architecture.md`。

**验收**
- [ ] 生产环境跑通 10 条用户旅程中至少 3 条。
- [ ] Vercel 构建 < 3 分钟（v1 写 < 2 偏紧，放宽）。
- [ ] **成本验证**：连续 7 天，Supabase DB 大小 < 500MB / 月活 < 50,000 MAU / Vercel 函数调用 < 100GB-hour / 月（详见 §6 R7）。

---

## 5. 时间预算（修订）

| Phase | v1 工作日 | v2 工作日 | 累计 |
|---|---|---|---|
| Phase 0（新增） | — | 0.5 | 0.5 |
| Phase 1 | 0.5 | 0.5 | 1.0 |
| Phase 2 | 1.0 | 2.0 | 3.0 |
| Phase 3 | 1.0 | 1.0 | 4.0 |
| Phase 4 | 1.0 | 1.0 | 5.0 |
| Phase 5 | 3.0 | 3.5 | 8.5 |
| Phase 6 | 2.0 | 2.0 | 10.5 |
| Phase 7 | 1.0 | 1.5 | 12.0 |
| Phase 8 | 4.0 | 5.0 | 17.0 |
| Phase 9 | 0.5 | 1.0 | 18.0 |
| **Buffer（必备）** | 0 | **3.0** | **21.0** |
| **合计** | 14 | **21 工作日 ≈ 4 周** | |

> 单人全职口径。兼职 × 2.5 系数 ≈ 10-12 周。v1 的 14 天估算偏乐观，v2 把高风险阶段加码并加 3 天 buffer。

---

## 6. 风险清单（修订）

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| R1 | 金额舍入与 C# decimal 不一致 | 🔴 高 | §3.5 已定规范；Phase 5 强制 fixture 对照测试 |
| R2 | 多表事务在 Supabase 实现复杂 | 🟡 中 | 复杂写入一律走 RPC `SECURITY INVOKER`；§3.2 admin 客户端使用清单 |
| R3 | RLS 策略遗漏导致越权 | 🔴 高 | 每张表正反例 SQL 测试；Phase 2 验收强制跨账号脚本 |
| R4 | Supabase **service_role 误用** | 🔴 高 | §2.1 显式白名单；调用处必须 `// SERVICE-ROLE:` 注释；code review checklist |
| R5 | **公开分享字段泄漏** | 🔴 高 | §4.7 白名单 + view/RPC 实现 + 响应断言测试 |
| R6 | Supabase Auth 邮件限速 | 🟢 低 | 开发期关闭邮箱验证；生产用 magic link 或自配 SMTP |
| R7 | Supabase 免费档容量上限（DB 500MB / 50,000 MAU / 5GB egress / 7d log retention） | 🟡 中 | §4.9 监控；超额前 SAFE_MARGIN=80% 发提醒；上限后降级（关闭注册 / 升 $25 Pro） |
| R8 | **Vercel 函数冷启动 + edge runtime 限制** | 🟡 中 | 关键页面用 Server Component，避免 dynamic route 全 ssr |
| R9 | i18n 库切换工作量超预期 | 🟡 中 | Phase 8 第 1 天预研，默认复用现有 |
| R10 | C# 算法移植遗漏边界（特别是 `SettlementCalculator` 的"最少转账"实现） | 🔴 高 | TDD：先把 C# 测试翻 TS；Phase 5/6 验收强制 fixture 对照 |
| R11 | LONGTEXT/data-url 字段（账单图、收款 QR、转账凭证）单条可能很大，影响 Supabase 行大小与 egress 配额 | 🟡 中 | 长期方案：迁到 Supabase Storage，DB 存 path。**本期保留 TEXT**，但与 R7 容量阈值合并监控 |

---

## 7. 验收总标准（修订）

> **不再以 `docs/api-spec.md` 为依据**。

迁移视为完成的硬性条件：

1. ✅ 旧 `apps/backend` + `apps/frontend` 删除后 `apps/web` 独立运行。
2. ✅ **Phase 0 `docs/api-inventory.md`** 中 35 条接口的功能在新版可复现（每条 PR 关联条目编号）。
3. ✅ **Phase 0 `docs/user-journeys.md`** 中 10 条端到端旅程在生产可跑通。
4. ✅ `BillCalculator` / `SettlementCalculator` 单元测试通过率 100%，且至少 10 组 C# vs TS fixture 对照通过。
5. ✅ RLS 越权测试：跨账号、匿名、过期 token 三类至少各 1 个测试用例通过。
6. ✅ 公开分享字段白名单测试：响应中**不出现** `invited_user_id` / `username` / `bill_*` 等非白名单字段。
7. ✅ Vercel 构建 < 3 分钟。
8. ✅ **成本目标**：连续 30 天落在 Supabase / Vercel 免费档容量内（具体阈值见 §6 R7）。

---

## 8. ADR

- **ADR-001**：放弃 Clerk，全面采用 Supabase Auth（§2.1）。
- **ADR-002**：写入分两类 RPC：creator-only 写入走 `SECURITY INVOKER`（依赖表 RLS：`create_bill_with_items` / `update_bill_with_items`）；非 INVOKER 路径（`accept_invitation` / `decline_invitation` / `record_settlement_action` / `resolve_share_token` / `get_group_members` / `is_group_member` / `handle_new_user`）走 `SECURITY DEFINER` + 函数内显式校验 + `SET search_path = public, pg_temp` + `GRANT EXECUTE` 精确放行（§2.1, §4.2）。
- **ADR-003**：`packages/api-client` 裁剪为纯 types。
- **ADR-004**：枚举用 `SMALLINT + CHECK`，不用 Postgres `ENUM`。
- **ADR-005**：金额 `DECIMAL(18,2)` + weight `DECIMAL(18,4)` + `decimal.js`；舍入对齐 C# `MidpointRounding.AwayFromZero`（half-away-from-zero）→ `decimal.js` `ROUND_HALF_UP`（§3.5）。
- **ADR-006**：**`service_role` 仅在 §2.1 白名单内使用，每处需带 `// SERVICE-ROLE:` 注释；RLS 是主权限机制，不是兜底。**
- **ADR-007**：`app_users` 重新设计为 `auth.users` 镜像（§3.4），删除 7 个旧字段。
- **ADR-008**：公开分享**唯一路径**为 `SECURITY DEFINER` RPC `resolve_share_token`，禁止对 `settlement_share_links` 表给 anon SELECT policy；如必须用 view，必须 Postgres 15 `WITH (security_invoker = true)`（§4.7）。
- **ADR-009**：schema 真值来源 = `SplityDbContext.OnModelCreating` + `DatabaseInitializer.*`，**不是** `database/init.mysql.sql`。
- **ADR-010**：Settlement snapshot 算法在 **Node 端** 用 TS `SettlementCalculator` 跑（72 行 calculator + 317 行 service 装配代码）；写入通过**用户 JWT** 调单一 `record_settlement_action(...)` `SECURITY DEFINER` RPC，函数内自检 `auth.uid() = group.created_by_user_id`。**不使用 service_role**，§2.1 白名单不增加条目（§4.2 / §4.6）。
- **ADR-011**：RLS / DEFINER 二选一——表上**只有** SELECT policy + creator-only INSERT/UPDATE/DELETE policy；所有 cross-role 状态变更（接受邀请、标记付/收款）集中在 `SECURITY DEFINER` RPC 内审计（§4.2）。
- **ADR-012**：`groups` / `participants` RLS 互相引用通过 `is_group_member(uuid) SECURITY DEFINER STABLE` helper 解递归（§4.2）。

---

## 9. 后续工作（迁移完成后）

- Playwright E2E 测试。
- Sentry 错误追踪。
- `*_data_url` 字段迁到 Supabase Storage（R11）。
- 历史 MySQL 数据迁移脚本（如有需求）。
- 移动端 PWA。

---

**文档结束（v2）**
