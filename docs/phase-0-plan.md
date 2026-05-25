# Phase 0 Implementation Plan

> **目标**：在动笔写任何新代码之前，把"迁移要对齐的事实"锁死在三份基线文档里，作为 Phase 1-9 的输入与验收依据。
> **依据**：`docs/migration-prd.md` §4.0、§7。
> **预算**：0.5 工作日（4 小时净时间）。
> **状态**：待执行。

---

## 1. 交付物

| # | 文件 | 用途 | 引用方 |
|---|---|---|---|
| D1 | `docs/api-inventory.md` | 35 条接口的完整契约清单 | Phase 4-7 的 Route Handler 实现；§7 验收标准 #2 |
| D2 | `docs/user-journeys.md` | 至少 10 条端到端用户旅程 | Phase 8 的 UI 实现验收；§7 验收标准 #3 |
| D3 | `docs/schema-truth.md` | 11 张表的"最终列定义"真值 | Phase 2 的 `0001_schema.sql` 写作输入 |

**不交付**：任何新代码、任何 Supabase 配置、任何 Next.js 脚手架。Phase 0 是**纯文档阶段**。

---

## 2. 成功标准（从 PRD §4.0 复制并细化）

- [ ] D1 至少 35 条，分布满足：Auth 11 / Groups 6 / Bills 5 / Participants 4 / Settlements 3 / SettlementShares 3 / Invitations 3。
- [ ] D1 每条含：HTTP 方法、路径、鉴权要求、入参 Schema、出参 Schema、副作用（写哪些表 / 触发哪些状态变更）、对应 v2.3 PRD 的 RPC 或 Route Handler。
- [ ] D2 至少 10 条主路径；每条标注涉及的 D1 接口编号 + 涉及的 D3 表名。
- [ ] D3 列出 11 张表全部字段（含 `DatabaseInitializer` 运行期 `ALTER TABLE` 补出的），每字段含：列名、类型（C#`HasPrecision`/`MaxLength`/`HasColumnType`）、是否必填、默认值、索引、外键、`DbContext.cs` 源码行号。
- [ ] 三份文档作为 Phase 1+ 的 PR review checklist，每个新接口/页面/迁移文件必须能映射到 D1 / D2 / D3 中某条编号。

---

## 3. 输入清单（必读源文件）

### 3.1 接口清单 D1 的输入

| 文件 | 行 | 用途 |
|---|---|---|
| `apps/backend/src/Splity.Api/Endpoints/AuthEndpoints.cs` | 1-149 | 11 条 Auth 接口 |
| `apps/backend/src/Splity.Api/Endpoints/GroupEndpoints.cs` | 1-100 | 6 条 Groups |
| `apps/backend/src/Splity.Api/Endpoints/BillEndpoints.cs` | 1-147 | 5 条 Bills |
| `apps/backend/src/Splity.Api/Endpoints/ParticipantEndpoints.cs` | 1-84 | 4 条 Participants |
| `apps/backend/src/Splity.Api/Endpoints/SettlementEndpoints.cs` | 1-95 | 3 条 Settlements |
| `apps/backend/src/Splity.Api/Endpoints/SettlementShareEndpoints.cs` | 1-98 | 3 条 SettlementShares |
| `apps/backend/src/Splity.Api/Endpoints/InvitationEndpoints.cs` | 1-55 | 3 条 Invitations |
| `apps/backend/src/Splity.Api/Contracts/*.cs` | 全部 | 入参/出参 DTO 形状 |
| `apps/backend/src/Splity.Application/Services/*.cs` | 关键方法 | 副作用：写哪些 entity、触发哪些状态变更 |

**操作**：对每个 `Endpoints/*.cs` 文件，用 `grep -nE "MapGet\|MapPost\|MapPut\|MapDelete"` 取得端点列表，对每条点击进 service 方法读副作用。

### 3.2 用户旅程 D2 的输入

| 文件 | 用途 |
|---|---|
| `apps/frontend/src/features/auth/AuthPage.tsx` | 登录 / 注册 / 忘记密码 |
| `apps/frontend/src/features/home/HomePage.tsx` + `groups/dashboard/*` | Dashboard 首屏 |
| `apps/frontend/src/features/groups/GroupsListPage.tsx`, `GroupDetailPage.tsx`, `GroupOverviewPage.tsx` | 建/看/删组 |
| `apps/frontend/src/features/participants/ParticipantsPage.tsx` | 加参与者、发邀请 |
| `apps/frontend/src/features/bills/BillsPage.tsx` | 记账 |
| `apps/frontend/src/features/settlements/SettlementsPage.tsx`, `SettlementSharePage.tsx`, `SettlementShareDialog.tsx` | 结算 / 标记付款 / 生成分享 |
| `apps/frontend/src/features/invitations/InvitationsPage.tsx` | 接受/拒绝邀请 |
| `apps/frontend/src/features/settings/SettingsPage.tsx` | 改资料 / 改密码 / 改收款信息 / 邮箱验证 |
| `apps/frontend/src/app/router.tsx` | 路由总览 |

**操作**：每个页面读一次，定位"用户在这里能做什么"——一句话写一条旅程。

### 3.3 Schema 真值 D3 的输入

| 文件 | 用途 |
|---|---|
| `apps/backend/src/Splity.Infrastructure/Persistence/SplityDbContext.cs` 28-281 行 | EF Core 模型映射（11 个 `modelBuilder.Entity<T>` 块） |
| `apps/backend/src/Splity.Infrastructure/Persistence/DatabaseInitializer.cs` | 运行期 `ALTER TABLE` 补出的列（5 张表受影响） |
| `apps/backend/src/Splity.Domain/Entities/*.cs` | C# 类型 / 可空性 / 默认值 |
| `apps/backend/src/Splity.Domain/Enums/*.cs` | 枚举值 → SMALLINT 值映射 |

**操作**：对每个 `Entity<T>` 块，把每行 `entity.Property(...)` 翻译成一行表格。然后用 `DatabaseInitializer.Ensure*Async` 里的 `ALTER TABLE` 校对一次（防止 DbContext 行号被分散到 Initializer 里的字段漏掉）。

---

## 4. 输出文档模板

### 4.1 `docs/api-inventory.md` 模板

```markdown
# API Inventory (Source-of-Truth for Migration)

> 35 条 .NET Minimal API endpoints，对应 Phase 4-7 的 Next.js Route Handler 移植目标。
> 真值：`apps/backend/src/Splity.Api/Endpoints/*.cs`。

## A. Auth (11)

### A1. `POST /api/auth/register`
- **鉴权**：anon
- **入参**：`RegisterRequest { name, email, password }`
- **出参**：`AuthResultDto { accessToken, user }`
- **副作用**：插入 `app_users`；签发 JWT
- **C# 源**：[AuthEndpoints.cs:16](../apps/backend/src/Splity.Api/Endpoints/AuthEndpoints.cs#L16) → `AuthService.RegisterAsync`
- **新版映射**：Supabase Auth `signUp` + `handle_new_user` trigger（PRD §3.4）。**注意**：原"返回 accessToken"语义由 Supabase session cookie 替代。

### A2. `POST /api/auth/login`
... （按上述格式 35 条全部列出）

## B. Groups (6)
...

## C. Bills (5)
...

## D. Participants (4)
...

## E. Settlements (3)
...

## F. SettlementShares (3)
...

## G. Invitations (3)
...

## 索引

- 按方法：GET × N / POST × M / PUT × K / DELETE × J
- 按鉴权：anon × N / authenticated × M / creator-only × K
- 按副作用表：写 `app_users` 的接口编号清单 / 写 `bills` 的清单 / ...
```

**每条接口必填字段**（如果某项查不到，标 `?` 留待 Phase 0 末尾补全）：
1. ID（如 `A1` / `B3`）
2. HTTP 方法 + 完整路径
3. 鉴权层（`anon` / `authenticated` / `creator-only` / 自定义）
4. 入参类型名（指向 `Contracts/*.cs`）+ 必填字段清单
5. 出参类型名 + 关键字段
6. 副作用清单：写哪些表 / 哪些状态变更 / 是否触发邮件
7. C# 源位置：endpoint 文件行号 + service 方法名
8. 新版映射：v2.3 PRD 里对应的 RPC 或 Route Handler 计划

### 4.2 `docs/user-journeys.md` 模板

```markdown
# User Journeys (Acceptance Source for Phase 8)

> 10+ 条端到端旅程；Phase 9 生产验收需至少跑通其中 3 条。

## J1. 新用户首次记账（Happy Path）
- **角色**：新注册用户 U1
- **步骤**：
  1. 访问 `/sign-in` → 填邮箱+密码+姓名 → 提交（接口 **A1**）
  2. 收验证邮件 → 点链接（接口 **A11**）
  3. 跳转 `/dashboard`（接口 **B1**：列出 groups，空）
  4. 点"新建 Group" → 输入名 → 保存（接口 **B2**）
  5. 进 Group 详情 → 加 2 个参与者（接口 **D1** × 2）
  6. 点"记账" → 填店名/金额/责任人/付款人 → 保存（接口 **C1**）
  7. 看到账单出现在列表（接口 **C2**）
- **涉及表**：`app_users`, `groups`, `participants`, `bills`, `bill_items`, `bill_item_responsibilities`, `bill_shares`, `bill_fees`, `payment_contributions`
- **关键校验**：账单金额 = items 总和 + fees；分账金额对齐到分

## J2. 邀请已注册用户加入 Group
- **角色**：creator U1，被邀请者 U2（已注册）
- **步骤**：U1 加参与者时输入 U2 username → 系统标记 `invited_user_id` → U2 登录看到邀请 → 接受 → U2 从此可见该 group
- **涉及接口**：D1（搜索 username 用 A5）, G1 列邀请, G2 接受
- **涉及表**：`participants`（`invitation_status`, `invited_user_id`）, `groups`（被邀请者看到）

## J3. 标记付款（creator 代付款方操作）
（按 PRD §4.2 Settlement 调用模型展开 7-9 步）

## J4. 生成公开分享链接 → 匿名查看 → 撤销
## J5. 多笔账单后跑结算 → 最少转账方案
## J6. 改默认收款信息（含 QR 图）
## J7. 改密码 / 改邮箱
## J8. 删除 Group（级联）
## J9. 转账双方均确认 → 状态推进到 Received
## J10. 拒绝邀请

## 索引

- 涉及 `record_settlement_action` RPC 的旅程：J3, J9
- 涉及 anon 路径的旅程：J1（注册前）, J4（匿名查看）
- 涉及邮件发送的旅程：J1, J7
```

### 4.3 `docs/schema-truth.md` 模板

```markdown
# Schema Truth (Source-of-Truth for 0001_schema.sql)

> 11 张表全部字段，从 EF Core `SplityDbContext.OnModelCreating` + `DatabaseInitializer.Ensure*Async` 的并集导出。
> Phase 2 写 `supabase/migrations/0001_schema.sql` 时，每张表逐字段对照本表生成 Postgres DDL。

## 通用约定（MySQL → Postgres 映射）

| C# / EF Core | MySQL（旧） | Postgres（新） | 备注 |
|---|---|---|---|
| `Guid` | `CHAR(36)` | `UUID` | 默认 `gen_random_uuid()` |
| `DateTime` (UTC) | `DATETIME(6)` | `TIMESTAMPTZ` | |
| `HasPrecision(18, 2)` | `DECIMAL(18, 2)` | `NUMERIC(18, 2)` | |
| `HasPrecision(18, 4)` | `DECIMAL(18, 4)` | `NUMERIC(18, 4)` | 仅 `bill_shares.weight` |
| `HasColumnType("longtext")` | `LONGTEXT` | `TEXT` | data-url 字段；后期可迁 Storage |
| 枚举 `HasConversion<int>()` | `INT` | `SMALLINT + CHECK` | 见每张表 |
| `bool` + `HasDefaultValue(true)` | `BIT DEFAULT b'1'` | `BOOLEAN DEFAULT TRUE` | |

## T1. `app_users`

**源**：`SplityDbContext.cs:50-76` + `DatabaseInitializer.cs:204-319`
**新版变化**：`password_hash` / `password_salt` / `clerk_user_id` / `email_verified_at_utc` / `pending_email_verification_*` 五类字段**删除**（PRD §3.4）。

| 列名 | 类型 | NULL | 默认 | 索引 | 备注 |
|---|---|---|---|---|---|
| `id` | `UUID` | NO | — | PK | FK to `auth.users(id)` ON DELETE CASCADE（新版） |
| `name` | `VARCHAR(150)` | NO | — | — | |
| `username` | `VARCHAR(50)` | YES | — | UNIQUE | |
| `email` | `VARCHAR(200)` | NO | — | UNIQUE | trigger 同步自 `auth.users.email` |
| `default_payment_payee_name` | `VARCHAR(150)` | YES | — | — | |
| `default_payment_method` | `VARCHAR(120)` | YES | — | — | |
| `default_payment_account_name` | `VARCHAR(150)` | YES | — | — | |
| `default_payment_account_number` | `VARCHAR(120)` | YES | — | — | |
| `default_payment_notes` | `VARCHAR(2000)` | YES | — | — | |
| `default_payment_qr_data_url` | `TEXT` | YES | — | — | data-url |
| `created_at_utc` | `TIMESTAMPTZ` | NO | `now()` | — | |
| ~~`password_hash`~~ | — | — | — | — | **删除**（Supabase Auth 管理） |
| ~~`password_salt`~~ | — | — | — | — | **删除** |
| ~~`clerk_user_id`~~ | — | — | — | — | **删除** |
| ~~`email_verified_at_utc`~~ | — | — | — | — | **删除**（用 `auth.users.email_confirmed_at`） |
| ~~`pending_email_verification_code_hash`~~ | — | — | — | — | **删除** |
| ~~`pending_email_verification_expires_at_utc`~~ | — | — | — | — | **删除** |

## T2. `groups`
（同上格式，10 张表全部列出）

## T3-T11. ...

## 枚举值映射

### GroupStatus
| 名 | 值 | 含义 |
|---|---|---|
| Unresolved | 0 | 默认 |
| Settling | 1 | 结算中 |
| Settled | 2 | 已结清 |

### SplitMode
| 名 | 值 |
|---|---|
| ByItem | 1 |
| Equal | 2 |

### FeeType
| 名 | 值 |
|---|---|
| Percentage | 1 |
| Fixed | 2 |

### ParticipantInvitationStatus
| 名 | 值 |
|---|---|
| None | 0 |
| Pending | 1 |
| Accepted | 2 |
| Declined | 3 |
（**实际值需用 grep 校验 Enum 源文件**）

### SettlementTransferStatus
| 名 | 值 |
|---|---|
| Pending | 0 |
| MarkedPaid | 1 |
| Received | 2 |
```

---

## 5. 执行步骤（按顺序）

### Step 1：D3 schema-truth.md（最先做，1.5 小时）

> 先做 schema 是因为 D1 / D2 都会引用表名，schema 错了上面两份都要返工。

1. **0:00-0:15** — 用 `grep -n "modelBuilder.Entity<" apps/backend/src/Splity.Infrastructure/Persistence/SplityDbContext.cs` 取得 11 个起始行号，加上每块结束行 `^        });`。
2. **0:15-1:00** — 顺序读每个 entity 块，把 `entity.Property(...)` 翻译成 D3 模板里的表格行。一个块对应一张表（T1-T11）。
3. **1:00-1:20** — 读 `DatabaseInitializer.cs` 的 6 个 `Ensure*Async` 方法，对照 D3 每张表查"有没有列被遗漏"（已知有 5 张表受影响：`groups.status` / `app_users` 11 个补出列 / `participants` 3 个 / `bills.reference_image_data_url` / `settlement_share_links` 2 个 + 整表 CREATE）。
4. **1:20-1:30** — 读 `apps/backend/src/Splity.Domain/Enums/*.cs`，把 5 个枚举的值确认（特别是 `SettlementTransferStatus`、`ParticipantInvitationStatus`，PRD 中曾出错过）。
5. **写入** `docs/schema-truth.md`。

**自检**：每张表与 `SplityDbContext.cs` 行号对得上；每个枚举与 `Enums/*.cs` 对得上。

### Step 2：D1 api-inventory.md（1.5 小时）

1. **0:00-0:10** — 用 `grep -nE "Map(Get\|Post\|Put\|Delete)\(" apps/backend/src/Splity.Api/Endpoints/*.cs` 取得 35 行（已确认数：11+6+5+4+3+3+3）。
2. **0:10-0:50** — 对每条 endpoint：
   - 读上下文 ±10 行取得路径 + 方法 + 鉴权（`RequireAuthorization()` / 无）。
   - 看 endpoint 的 service 调用：`service.XxxAsync(...)`。
   - 跳到 `apps/backend/src/Splity.Application/Services/Xxx.cs` 找对应方法，1-2 句话总结副作用（写哪些表 / 状态变更）。
3. **0:50-1:10** — 读 `Contracts/*.cs` 与 `Models/*.cs`，把入参/出参字段填进每条。
4. **1:10-1:30** — 给每条标"新版映射"：对照 v2.3 PRD §4.2 RPC 表 + §4.4-§4.7 各阶段。

**自检**：35 条总数对；7 类分布对；每条都有 C# 行号链接。

### Step 3：D2 user-journeys.md（1 小时）

1. **0:00-0:20** — 顺序看 8 个 feature 文件夹各自的主 page。每个 feature 写 1-2 条候选旅程。
2. **0:20-0:40** — 合并/筛选到 10 条主路径（PRD §4.0 要求"至少 10"，目标 10-12）。
3. **0:40-1:00** — 对每条旅程：
   - 写步骤（5-9 步）。
   - 标注每步对应的 D1 接口编号。
   - 标注涉及的 D3 表名。

**自检**：10 条覆盖所有 8 个 feature；每条至少引用 1 个 D1 接口和 2 张 D3 表。

### Step 4：联动校验（0.5 小时）

1. D1 中所有"副作用表名"必须出现在 D3 表清单（11 张）里。
2. D2 中所有引用的接口编号必须存在于 D1。
3. D2 中所有引用的表名必须存在于 D3。
4. 列出"出现在 D1 副作用里但 D2 没有任何旅程覆盖的接口"作为"覆盖差距"小节，写进 D2 末尾——如果差距 > 5 条接口，需要补 1-2 条旅程。

---

## 6. 风险与边界

| ID | 风险 | 应对 |
|---|---|---|
| P0-R1 | 35 条端点的"鉴权层"在 endpoint 文件里可能是 `RequireAuthorization()` 而真正的 group-creator 校验在 service 里（`EnsureCanEditAsync`）。漏掉 service 层鉴权就会让 D1 严重失真。 | Step 2 中每条 endpoint **必须**跳进 service 方法读首段，确认是否有 `EnsureCanEdit/View`。 |
| P0-R2 | `BillCalculator` 与 `SettlementCalculator` 的副作用（舍入、snapshot）不在 D1 范围内，但 D2 J1 / J3 / J5 会引用。 | D2 旅程的"关键校验"段引用 v2.3 PRD §3.5 / §4.2 即可，不重复展开。 |
| P0-R3 | `DatabaseInitializer` 里某些列只在 MySQL 模式下加（`IsInMemory` 跳过）。直接读 EF Core 模型可能比 Initializer 更全 / 更少。 | D3 取**两者并集**作为新版 schema 输入。 |
| P0-R4 | 旧 `clerk_user_id` 字段在 DbContext 里仍存在，但 PRD §3.4 已决定删除。 | D3 用 ~~删除线~~ 标记被删除字段，并在备注栏写"删除原因"，方便 Phase 2 PR review。 |
| P0-R5 | 文档体量过大（D1 35 条 × 8 字段、D3 11 张表 × N 字段）容易超时。 | 严格按 Step 1→2→3→4 时间盒；若 Step 2 超时，先把 35 条编号+方法+路径+鉴权列全，副作用/映射留 `?` 在 Step 4 补。 |

---

## 7. 验收 checklist（Phase 0 结束前自检）

- [ ] `docs/schema-truth.md` 11 张表全部列完；每个字段有 C# 源行号引用。
- [ ] `docs/schema-truth.md` 5 个枚举全部列出值映射。
- [ ] `docs/api-inventory.md` 35 条全部列完；分布 11/6/5/4/3/3/3 严格相符。
- [ ] `docs/api-inventory.md` 每条标注新版映射（不允许 `?`）。
- [ ] `docs/user-journeys.md` ≥ 10 条；每条引用 ≥ 1 个 D1 编号 + ≥ 2 个 D3 表名。
- [ ] 联动校验全部 4 项通过。
- [ ] `git diff docs/` 给一次自审 commit，commit message：`docs(phase-0): seed api/journeys/schema baselines`。

---

## 8. 完成后立即触发

1. 把 todo `Phase 0` 标 completed，`Phase 1` 标 in_progress。
2. 创建 `apps/web` 脚手架（Phase 1 任务，0.5 天）。
3. 在 Phase 1 第一个 PR 描述里强制引用 `docs/api-inventory.md#A1` 等编号——把基线文档转化为协作锚点。

---

**文档结束**
