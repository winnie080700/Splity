# Phase 9 Implementation Plan

> **目标**：把 `apps/web` 推到 Vercel 生产环境；Supabase 切换为 production-grade 配置；自定义域名 + 错误监控接入；跑通生产环境完整用户旅程；确认月度成本落在免费档内。
> **依据**：`docs/migration-prd.md` v2.3 §4.9 + §7（验收总标准）；`docs/user-journeys.md` 全部 J1-J11。
> **预算**：**1 工作日（8 小时）**。Phase 8 完成时本应"全 ready"，Phase 9 是部署 + 仪式感收尾。
> **状态**：待执行。
> **前置 Phase**：Phase 8 completed（旧 apps 已删；apps/web 自包含；J1-J11 全部在本地跑通）。

---

## 1. 交付物

| 类 | # | 内容 | 备注 |
|---|---|---|---|
| **Vercel 项目** | F1 | 创建 Vercel project + 连接 GitHub repo + 配置环境变量（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SITE_URL`） | Vercel 免费档 |
| | F2 | Build settings：Root Directory = `apps/web`；Framework Preset = Next.js | 让 Vercel 知道这是 monorepo 中的子项目 |
| | F3 | Production branch 设为 `main`；启用 PR Preview Deployments | preview 用于上线前最后审查 |
| **Supabase Prod** | F4 | 确认所有 migrations 已 `supabase db push` 到生产 schema（10 个 migration 文件） | Phase 7 已 push；本期只确认 |
| | F5 | Supabase Dashboard → Auth：开启 "Confirm email" + 配置 SMTP（用免费档默认 or SendGrid）；Site URL 改为生产域名 + Redirect URLs 加生产 callback | 生产关 confirmation 是反向操作；本期开启 |
| | F6 | 旧测试数据清理：删 Phase 2-7 测试 fixture 留下的 `phase\d+-*@example.test` 用户 + 关联 group/bills/transfers | 之前测试可能在云端 dev project 留下污染数据；本期清 |
| **可选** | F7 | 自定义域名（如 `splity.app`）→ DNS A/CNAME 指向 Vercel | 跳过则用 `*.vercel.app` 域名 |
| | F8 | Sentry 项目接入 `@sentry/nextjs`；错误 + 性能监控 | 跳过则只看 Vercel logs |
| **回归测试** | F9 | 生产环境跑 J1-J11 全部 11 条旅程（用真实邮箱） | §3 验收必跑 ≥ 3 条 |
| | F10 | 跨账号 RLS smoke：A 建 group / 加 bill / settlement → B 访问完全看不到 | 安全验证 |
| | F11 | 公开 share 链接通过自定义域名访问可见 | 验证 anon 路径 |
| **成本基线** | F12 | 记录"上线第 1 天"基线数据：Supabase DB 大小 / Vercel build min / 邮件发送数 / egress GB | 用于 30 天对照 PRD §7 第 8 条验收 |
| **文档** | F13 | `docs/deploy-runbook.md` | ~80 行：生产部署步骤 + 回滚步骤 + 紧急联系点 |
| | F14 | `README.md` 末尾加 "Production: https://splity-web-two.vercel.app"（或自定义域名）+ "Status: live" badge | 标记完成 |
| | F15 | 更新 todo list：Phase 9 → completed；迁移完成 | 项目终态 |

**不交付**：
- ❌ CI/CD GitHub Actions—Vercel 自带 PR preview 已够用；正式 CI 留作后续迭代
- ❌ 性能基准测试（Lighthouse / WebVitals 详测）—本期只跑 < 3 min build + TTFB < 1s
- ❌ 数据库备份策略—Supabase 免费档默认 daily backup
- ❌ 自动化 E2E Playwright—PRD §9 后续工作

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 8 闭环；本地跑通 J1-J11 全部 | F9 |
| PRE-2 | 至少 1 个用于生产测试的真实邮箱账号（不能用 `*@example.test`） | F9 |
| PRE-3 | 决策：用自定义域名 yes/no（影响 F7 + F5 Redirect URLs 配置） | F5 / F7 |
| PRE-4 | Supabase 项目是否需要"重新建一个 prod project"还是"复用 dev project"（见 §3 D1） | F4 / F5 |
| PRE-5 | Vercel 账号已注册并连接 GitHub | F1 |

---

## 3. 关键决策

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | Supabase 项目复用 vs 新建 | **复用 dev project**（如果之前一直在同一个上跑） | 单人项目；免费档每账号 2 个 project 上限；分开 dev/prod 在小项目阶段成本 > 收益。如需分开，Phase 9 增加 2 小时 |
| D2 | 自定义域名 | **可选**——有则配；无则用 `*.vercel.app` | PRD §7 不要求；个人项目 vercel.app 域名完全够用 |
| D3 | Sentry 接入 | **可选**——本期暂不接 | Vercel logs + Supabase logs 已能定位 80% 问题；Sentry 留作后续迭代 |
| D4 | Confirm Email 开关 | **生产开启**（与 Phase 3 dev 期临时关相反） | 防机器人注册；email 限速由 Supabase SMTP 默认控制 |
| D5 | 旧 fixture 数据清理脚本 | 单条 SQL：`DELETE FROM auth.users WHERE email LIKE 'phase%-%@example.test';` 在 Studio SQL Editor 跑 | 简单粗暴；CASCADE 删 app_users + group / participant / bill / settlement 历史 |
| D6 | Production 环境变量管理 | 在 Vercel Dashboard 配置（不在 git）；本地 `.env.local` 与 Vercel **独立** | 安全；防 service_role key 进 git |
| D7 | Push 后第一件事 | **手动**跑一遍 J1（注册新真实账号 → 验邮件 → 建 group → 记账）| 不靠 fixture 覆盖；产品上线第一感受用户路径 |

---

## 4. 部署 Runbook

### 4.1 Pre-flight checklist（部署前 30 分钟）

- [ ] 本地 `pnpm --filter splity-web typecheck` 通过
- [ ] 本地 `pnpm --filter splity-web build` 通过（**关键**：本地 production build 必须先成功）
- [ ] 本地 `pnpm vitest run` 全绿
- [ ] 跑 phase-{2,4,5,6,7}-*.sql 全部 fixture（如有 phase-7-invite-share.sql + phase-8-settings.sql）→ 全部 PASS
- [ ] git status 干净（无未提交 / 无 stash）
- [ ] `apps/web/.env.local` 与 Vercel 待配置 env 一一核对：3 个 NEXT_PUBLIC_* + 1 个 SUPABASE_SERVICE_ROLE_KEY + 1 个 NEXT_PUBLIC_SITE_URL
- [ ] Supabase Dashboard → SQL Editor → 跑：
      ```sql
      DELETE FROM auth.users WHERE email LIKE 'phase%-%@example.test';
      ```
      → 清掉测试 fixture 残留账号

### 4.2 Deploy steps（部署中 60 分钟）

**Step 1：Vercel 项目创建（10 分钟）**

1. Vercel Dashboard → "New Project" → import GitHub repo `Splity`
2. Configure：
   - **Root Directory**: `apps/web` ←【关键】
   - **Framework Preset**: Next.js（自动检测）
   - **Build Command**: `pnpm build`（默认）
   - **Install Command**: `pnpm install --filter splity-web...`（含 workspace deps）
3. 不要点 Deploy（先配 env）

**Step 2：环境变量配置（5 分钟）**

在 Vercel Project Settings → Environment Variables 加：

| Name | Value | Environments |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://YOUR.supabase.co` | Production + Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...`（Supabase Dashboard 拿） | Production + Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Production only** ←【不要开 Preview】 |
| `NEXT_PUBLIC_SITE_URL` | `https://splity-web-two.vercel.app`（或自定义域名） | Production + Preview |

**Step 3：触发首次部署（15 分钟）**

1. Vercel Project → Deployments → "Redeploy"
2. 监控 build log：
   - Install ≈ 2 分钟
   - Build ≈ 1-2 分钟
   - 总计应 < 5 分钟
3. Build 成功 → 拿到 `*.vercel.app` 临时域名

**Step 4：Supabase Auth Redirect URL 配置（5 分钟）**

Supabase Dashboard → Auth → URL Configuration：
- **Site URL**: `https://splity-web-two.vercel.app`（或自定义域名）
- **Redirect URLs**（每行一个）：
  - `https://splity-web-two.vercel.app/auth/callback?type=signup`
  - `https://splity-web-two.vercel.app/auth/callback?type=recovery`
  - `https://*-<team-or-account-slug>.vercel.app/**` ←【按 Vercel team/account slug 替换；支持 Preview deployments】
  - `http://localhost:3000/auth/callback?type=signup` ←【保留本地开发】
  - `http://localhost:3000/auth/callback?type=recovery` ←【保留本地开发】

应用发送的 Supabase Auth callback 带有 `type` query string。生产 Redirect URLs 必须包含完整 URL，否则 Supabase 会忽略应用传入的 `redirectTo` 并回退到 Site URL，邮件链接点击后只会进入 landing page。修改配置后要重新发送验证或重设密码邮件；旧邮件里的链接不会更新。

Auth → Providers → Email → ✅ **Enable Confirm Email**（D4）

**Step 5：自定义域名（可选，20 分钟）**

如果有域名：
1. Vercel Project → Settings → Domains → Add Domain
2. 按 Vercel 提示在 DNS 注册商（Cloudflare / Namecheap / etc）加 A 或 CNAME 记录
3. 等 DNS propagation（5-30 分钟）
4. 回到 Step 4 把 Site URL 改为自定义域名；保留 vercel.app 在 Redirect URLs

**Step 6：生产端到端测试（15 分钟）**

按 §5 验收逐项跑。

### 4.3 回滚 procedure（如 Step 6 发现严重问题）

1. Vercel Project → Deployments → 找到上一个 production 部署（如有）
2. 点 "Promote to Production"
3. **如果是首次部署**且失败：Vercel 不会有自动 fallback；保留旧 `apps/frontend` 已删的现状不可逆，但**生产没人在用**——所以"回滚"实际是"修 bug 重 deploy"

> Phase 8 的 D8 顺序（先 api-client refactor → 删 apps/backend → 删 apps/frontend）已经把不可逆操作做完了。Phase 9 的部署失败不会让 Phase 8 倒车。

---

## 5. 验收清单（对齐 PRD §7 完成总标准）

### 5.1 部署验收

- [ ] **Vercel build < 3 分钟**（PRD §7 第 5 条放宽到 3 min）
- [ ] **Production URL 返回 200**：`curl -I https://splity-web-two.vercel.app` 应 200 而非 404/500
- [ ] **Production typecheck**：Vercel build log 无 TS 错误
- [ ] **Supabase migrations 已 push**：Studio SQL Editor 跑 `SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;` 看到最新的 `20260520...` migrations

### 5.2 端到端验收（PRD §7 第 4 条 + 第 3 条）

- [ ] **至少 2 个真实账号在生产环境完成 J1 完整旅程**（注册 → 邮件验证 → 建 group → 加参与者 → 记账 → 看分账）
- [ ] **至少 1 个测试账号跑 J7 settlement 流程**：unresolved → settling → mark paid → mark received
- [ ] **至少 1 个公开分享链接** anon 访问可见数据（J8）
- [ ] **跨账号 RLS**：A 建 group / 加 bill；B 访问 dashboard 看不到 / 直接访问 group URL 404 / B 直接调 Supabase API 拿 A 的数据被 RLS 拦

### 5.3 安全审计（PRD §7 第 6 条）

- [ ] **公开 share 字段白名单**：anon 访问 `/share/{token}` 用 DevTools 看响应不含 `invited_user_id` / `username` / `bill_*` 内部字段
- [ ] **Supabase Production schema 与本地一致**：`pg_proc` 中 DEFINER 函数数 ≥ 9（v1.5 5 个 + Phase 6 4 个 + Phase 7 4 个 = 13 个；helper 可选）
- [ ] **RLS policy 数量审计**：`SELECT count(*) FROM pg_policies WHERE schemaname='public';` ≥ 20 条
- [ ] **F12 基线**：记录上线时 Supabase DB size / Vercel function call hours

### 5.4 成本预期（PRD §7 第 8 条）

- [ ] **当日成本 = $0**（Vercel 免费档 + Supabase 免费档）
- [ ] **设定 30 天后回审日期**：日历提醒；30 天后 SQL 跑 `SELECT pg_database_size('postgres');` < 500MB；Auth Users < 100 个（个人项目）

### 5.5 文档完整性

- [ ] `README.md` 顶部含 "Production: <URL>" + "Status: live" 信息
- [ ] `docs/deploy-runbook.md` 完整含部署步骤 + 回滚步骤 + 紧急联系点
- [ ] `docs/migration-prd.md` 末尾加 "迁移完成日期: 2026-MM-DD"
- [ ] **Migration PR (D8 from Phase 8) 链接** + Phase 9 deploy PR 链接都在 README 列出

### 5.6 PRD 总验收（§7 完整 checklist）

- [ ] ① 旧 `apps/backend` + `apps/frontend` 删除后 `apps/web` 独立运行 ✅
- [ ] ② `docs/api-inventory.md` 中 35 条接口的功能在新版可复现（除 A6 弃用） ✅
- [ ] ③ `docs/user-journeys.md` 中 11 条端到端旅程在生产可跑通 ✅
- [ ] ④ `BillCalculator` / `SettlementCalculator` 单元测试通过率 100% + ≥ 10 组 C# vs TS fixture 对照通过 ✅（Phase 5 + 6）
- [ ] ⑤ RLS 越权测试：跨账号、匿名、过期 token 三类至少各 1 个测试用例通过 ✅（phase-*-*.sql fixtures）
- [ ] ⑥ 公开分享字段白名单测试：响应中不出现 `invited_user_id` / `username` / `bill_*` 非白名单字段 ✅（Phase 7 phase-7-invite-share.sql）
- [ ] ⑦ Vercel 构建 < 3 分钟 ✅
- [ ] ⑧ 成本目标：连续 30 天落在 Supabase / Vercel 免费档容量内（**30 天后核**）

---

## 6. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P9-R1 | Vercel build 因 monorepo 配置错误失败 | 🟡 中 | F1 Root Directory **必填** `apps/web`；Install Command 加 `--filter splity-web...` 拉 workspace 依赖；本地先跑 `pnpm --filter splity-web build` 确认通过 |
| P9-R2 | Supabase Production schema 与本地不同（之前忘 push 某个 migration） | 🔴 高 | F4 必跑 `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC;` 对照本地 `ls supabase/migrations/` 文件名；不一致立刻 `supabase db push` |
| P9-R3 | Email confirmation 开启后真实账号收不到邮件 | 🟡 中 | F5 走 Supabase 默认 SMTP（限速 3/h）；若产品月活 > 100，提前接 SendGrid Free（100/day） |
| P9-R4 | Redirect URLs 配错 → 邮件链接点回 localhost 或 landing page，而不是 callback | 🔴 高 | F5 + Step 4 严格按生产 URL 配置；本地用 NEXT_PUBLIC_SITE_URL 区分；Vercel preview 用带 team/account slug 的 glob |
| P9-R5 | service_role key 泄漏到 Preview 环境（不该有） | 🔴 高 | F2 Step 2：service role 只勾 **Production**，**不**勾 Preview/Development |
| P9-R6 | 自定义域名 DNS 没生效但 Site URL 已切 → 邮件验证全挂 | 🟡 中 | F7 先确认 DNS propagation 完成（`dig` / `nslookup`）→ 再改 Site URL；过渡期保留 Vercel preview glob |
| P9-R7 | 旧测试 fixture 数据没清干净 → 真实用户邮箱碰撞 | 🟢 低 | F6 / D5 单条 SQL 清；如果忘了，真实用户注册时会得到 "email already taken"，至少不是 silent 错 |
| P9-R8 | Phase 8 末删了 `apps/frontend` 但 git history 还在 → 仓库 size 不变 | 🟢 低 | 不处理；`git gc` 不会破坏 history；想缩小仓库的话 Phase 9 后单独跑 BFG Repo-Cleaner |
| P9-R9 | 上线后用户量爆增超免费档 | 🟢 低（个人项目） | 30 天后看 F12 基线；超 50% 提前升 Supabase Pro（$25/月） |
| P9-R10 | 生产环境跑 J1 时碰到 dev 期未发现的 bug | 🟡 中 | 部署是 PR Preview 优先（F3）；正式 promote 之前先在 Preview URL 跑一遍 J1 + J7 + J8 |

---

## 7. 完成后

1. 标 Phase 9 → completed。**迁移工作正式完成**。
2. commit: `chore(deploy): production deploy + final cleanup (phase 9)`。
3. Tag git release: `v1.0.0-supabase-migration`。
4. 在 `docs/migration-prd.md` 顶部加 "✅ MIGRATION COMPLETE — see docs/deploy-runbook.md"。
5. **30 天后**重新跑 PRD §7 第 8 条成本验收（不需要再开 Phase 10）。

---

## 8. 迁移完成后的后续工作（不属于 Phase 9 范围，作为参考）

PRD §9 列出的后续方向：
- Playwright E2E 测试
- Sentry 错误追踪
- `*_data_url` 字段迁到 Supabase Storage（R11）
- 历史 MySQL 数据迁移脚本（如有需求）
- 移动端 PWA

按需启动；都不阻塞 Phase 9 关闭。

---

**文档结束**
