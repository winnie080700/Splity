# Phase 8 Implementation Plan

> **文档版本**：v1.3
> **目标**：完成迁移的"长尾"——①补齐 Settings 模块 4 个未实现接口（A7/A8/A9/A10）；②决策并落地 i18n；③对 Phase 3-7 已实施的 UI 做视觉/可用性 polish 对齐旧前端；④把 `packages/api-client` 从 fetch 实现降级为**纯类型包**；⑤删除 `apps/frontend` + `apps/backend` + `database/` 三大遗留。
> **依据**：`docs/migration-prd.md` v2.3 §4.8 + §1.5；`docs/api-inventory.md` A5 + A7-A10 + A6（弃用）；`docs/user-journeys.md` J9（settings）+ J12（A6 兼容性弃用）。
> **预算**：**5 工作日（40 小时）** —— 迁移中**最长**的 phase（视觉/UX 工作占大头）。
> **状态**：待执行。
> **前置 Phase**：Phase 7 completed（10/11 用户旅程跑通；仅 J9 settings 部分未实现）。
> **v1.3 修订（codex review #3）**：**P2 api-client workspace 依赖未声明**——v1.2 让 apps/web 用 `import type { ... } from "@splity/api-client"` 但没说怎么让 TS resolver 找到包。当前 `apps/web/package.json` 无 `@splity/api-client` 依赖，`apps/web/tsconfig.json` 无对应 path 映射；`moduleResolution: "bundler"` 不会凭空解析未链接的 workspace 包。F9 + §8.4 验收**显式添加**：`apps/web/package.json` 加 `"@splity/api-client": "workspace:*"`；pnpm install 后自动 symlink；包内 `exports.types` 字段让 TS 解析到 src/index.ts。
> **v1.2 修订（codex review #2）**：①**P1 bodySizeLimit 数学错**——5MB 原图 base64 ≈ 6.7MB + JSON envelope，`6mb` 会拒掉合法 5MB 上传。改为 **`8mb`**（覆盖 base64 + envelope + 余量）；client 端 5MB 阈值不变。参考 [Next.js docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)；②**P2 i18n 残留 [locale] 文案**——D2 已删但 F6 仍写 `app/[locale]/...` + next-intl、Day 2 验收要 2 语种覆盖、P8-R2 仍讨论 next-intl 选择。三处全部重写为 client-context i18n 范围；③**P2 Day 4 残留 dist 引用**——F9 已改成 src 直读，但 Day 4 时段表 25:30-25:00 仍写"`"types": "./dist/index.d.ts"`"。改为 src 路径；④**P3 `"main"` 入口对 types-only 包是 footgun**——`main` 指 `.ts` 文件在 Node runtime 会失败。改用 `exports` map 只暴露 types entry；消费者用 `import type`。
> **v1.1 修订（codex review #1）**：①**P1 A10 resend 缺 email + emailRedirectTo**——必须从 `getUser()` 取当前邮箱传入，对齐 Phase 3 [verify-email/actions.ts:27](../apps/web/app/(auth)/verify-email/actions.ts#L27)；②**P1 [locale] route 与 middleware regex 不兼容**——`/zh/dashboard` 不匹配 `APP_PATHS_REGEX`，未登录可直接访问受保护页。本期**明确不引入 `[locale]` 路由**（D2 重写为"保留单一 path，i18n 用 client-side context"）；如未来要做 [locale] route，必须把 middleware regex / PUBLIC_PATHS / redirect 全部 locale-aware；③**P1 QR 5MB Server Action body limit**——next.config.ts 默认 1MB；新增 F18 配置 `experimental.serverActions.bodySizeLimit: '8mb'`；④**P2 根 scripts 清理范围不够**——F14 扩展为删除 `dev` / `build` / `build:frontend` / `install:frontend` + 重写或删除 `scripts/dev.js` + `scripts/backend.js`；新增 F19；⑤**P2 i18n 决策 vs 验收冲突**——D2 收敛为"迁移旧 string map，保持单语 default + 客户端可切换；不引入 server-side locale routing"；§8.3 验收同步降级为"已抽象 i18n keys，未来可加语种"；⑥**P2 api-client types 包路径**——F9 改为 `"types": "./src/index.ts"`（不引入 dist build；workspace consumer 直读 src），避免空 dist 引用。

---

## 1. 交付物

| 层 | # | 路径 | 行数估 | 用途 |
|---|---|---|---|---|
| **Settings 模块** | F1 | `apps/web/app/(app)/settings/page.tsx` | ~120 | 标签页式：Profile / Payment Profile / Password / Email Verification 四个 section |
| | F2 | `apps/web/app/(app)/settings/profile-form.tsx` + `actions.ts` | ~160 | A7：update display name + username（**username 改动需走 username 唯一性校验**） |
| | F3 | `apps/web/app/(app)/settings/payment-profile-form.tsx` + `actions.ts` | ~200 | A8：6 个 `default_payment_*` 字段（payee_name / method / account_name / account_number / notes / qr_data_url）+ QR 图片上传 |
| | F4 | `apps/web/app/(app)/settings/change-password-form.tsx` + `actions.ts` | ~120 | A9：currentPassword / newPassword / confirmNewPassword 三字段；走 Supabase Auth `updateUser({ password })` 但需先 reauthenticate（验旧密码） |
| | F5 | `apps/web/app/(app)/settings/email-section.tsx` + `actions.ts` | ~120 | A10：显示当前邮箱 + 验证状态；未验证时 Resend 按钮调 `supabase.auth.resend({ type: 'signup', email: user.email, options: { emailRedirectTo: '${NEXT_PUBLIC_SITE_URL}/auth/callback/signup' } })` —— **必须带 email + emailRedirectTo**（v1.1 修复；对齐 Phase 3 [verify-email/actions.ts](../apps/web/app/(auth)/verify-email/actions.ts) 既有实现）；email 来自 `getUser()` |
| **i18n** | F6 | `apps/web/lib/i18n/`（client context only，**不**引入 `app/[locale]/...`） | ~150 | 迁移旧 `apps/frontend/src/shared/i18n/I18nProvider.tsx` 模式：①`lib/i18n/messages/{en,zh}.ts` string map；②`lib/i18n/I18nProvider.tsx` client component context + localStorage `splity.locale`；③`useTranslation()` hook。Server Components 直接渲染 fallback 英文，不强制 SSR locale。**不**改 routing 结构；middleware 不变 |
| **视觉 Polish** | F7 | `apps/web/components/ui/*` 扩展 | ~200 | 补齐：toast / skeleton / spinner / page-header / card / table-row primitives；对齐旧 frontend 视觉密度 |
| | F8 | Phase 3-7 已有 page 的 polish PR（13 个 page 文件） | 散布 | 统一 spacing / typography / color tokens；加 loading state + empty state |
| **api-client 改造** | F9 | `packages/api-client/src/` + `apps/web/package.json` | 重写（v1.3 扩范围） | **三步必做**：①删 `packages/api-client/src/{http,errors,config}.ts`，保留 `index.ts` DTO types。②`packages/api-client/package.json` 用 `exports` map 暴露 types-only entry：`{ "name": "@splity/api-client", "version": "0.1.0", "private": true, "type": "module", "exports": { ".": { "types": "./src/index.ts" } } }`——**不加 `main` / `module` 字段**（指 `.ts` 在 Node runtime 会失败）。③**`apps/web/package.json` `dependencies` 加 `"@splity/api-client": "workspace:*"`**（v1.3 关键补漏）。pnpm install 后自动 symlink 到 `apps/web/node_modules/@splity/api-client`；TS `moduleResolution: "bundler"`（apps/web/tsconfig.json:11 已就位）+ `exports.types` 解析到 `src/index.ts`。consumer 必须用 `import type { GroupDto, ... } from "@splity/api-client"`（不是 `import { ... }`）。**不**需要加 tsconfig `paths` 映射 |
| **旧资产清理** | F10 | 删除 `apps/frontend/` 整个目录 | 删 | `git rm -r apps/frontend` |
| | F11 | 删除 `apps/backend/` 整个目录 | 删 | `git rm -r apps/backend` |
| | F12 | 删除 `database/` 目录（旧 MySQL init.sql） | 删 | `git rm -r database` |
| | F13 | 更新 `README.md` / `docs/architecture.md` | 修订 | 反映 Next.js + Supabase 新架构；删除 .NET / MySQL 引用 |
| | F14 | 更新根 `package.json` scripts | 修订（**v1.1 升级**，与 F19 合并） | 见 F19 |
| | F15 | 更新 `pnpm-workspace.yaml` | 修订 | 只列 `apps/web` 和 `packages/api-client` |
| **测试** | F16 | `supabase/tests/phase-8-settings.sql` | ~150 | settings 写入路径越权测试：①非自己改 username 拒（A5 重复时） ②非自己 payment_profile 写入拒 ③username 唯一性约束 |
| **文档** | F17 | `docs/phase-8-review-checklist.md` | ~30 | PR review checklist |
| **配置** | F18 | `apps/web/next.config.ts` | 修订（v1.1 / v1.2） | 加 `experimental.serverActions.bodySizeLimit: '8mb'`——A8 QR data:URL 上传需 ≤ 5MB 原图：base64 编码后 ≈ 6.7MB + JSON envelope 开销 ≈ 7MB+，**`6mb` 会拒掉合法 5MB 上传**（v1.2 修复）。设 `8mb` 留出余量。client 端 F3 先校验原图 ≤ 5MB（user-facing 错误更友好；超过 5MB 但 ≤ 6.7MB base64 仍能过 server limit 不算 bug） |
| **scripts** | F19 | 根 `package.json` + 删除 `scripts/dev.js` / `scripts/backend.js` | 修订（v1.1） | F14 升级版：①根 `scripts.dev` 改为 `pnpm --filter splity-web dev`；②`scripts.build` 改为 `pnpm --filter splity-web build`；③删 `dev:frontend` / `dev:backend` / `build:frontend` / `build:backend` / `install:frontend`；④删 `scripts/dev.js` 和 `scripts/backend.js` 整两个文件（硬编码旧路径已不存在） |

**不交付**：
- ❌ A5 用户名搜索 UI 重写——Phase 4 加 participant 时已用过这个 RPC，本期沿用
- ❌ A6 Clerk sync 端点——PRD §1.5 明确弃用
- ❌ shadcn/ui 全量接入——本期只做 polish，组件库统一留作上线后迭代
- ❌ Mobile-specific responsive 重设计（仅做基础响应式，不做 mobile-first 重排版）
- ❌ E2E 测试套件（Playwright 等）——PRD §9 后续工作

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 7 闭环；浏览器能跑通 J1-J11 共 11 条旅程 | F8 polish 工作的对照基线 |
| PRE-2 | 旧 `apps/frontend` 仍能跑（用于视觉对照）；旧 backend 可以**已下线**（不需要） | F8 polish |
| PRE-3 | 决策 i18n 库（见 D2） | F6 |
| PRE-4 | 至少 1 个测试账号已注册并完整跑过 J1-J11 | F8 实测 |

---

## 3. 关键决策

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | A6 Clerk sync 端点 | **永久弃用**（PRD §1.5） | 旧 frontend 已无 Clerk 调用（Phase 1 移除）；A6 是 Clerk-era 兼容路径，新 Supabase Auth 不需要 |
| D2 | i18n 库 | **本期不引入 `[locale]` 路由**——保持单一 path，i18n 用客户端 context（迁移旧 `I18nProvider.tsx` 模式）；string keys 集中到 `apps/web/lib/i18n/`，对外暴露 `useTranslation()` hook + Server Component 可用的 default messages。若未来要做服务端 locale routing，必须配套改 `middleware.ts`（regex / PUBLIC_PATHS / redirect 全部 locale-aware），那是独立 phase 工作（v1.1 修复 [locale] middleware 漏防御问题）| 旧 I18nProvider 是 client context + localStorage 模式；迁到 Server Components 不是 zero-cost；本期收敛为"client-only i18n"避免与现有 middleware 冲突 |
| D3 | 视觉 polish 范围 | **对齐旧 frontend 视觉密度**——不做 redesign；只统一 spacing / color tokens / 加 loading/empty state | 时间盒已紧；Phase 8 是"迁移收尾"不是"产品重设计" |
| D4 | Settings 4 个 sub-section 编排 | 单页内 4 个 section（垂直堆叠或顶部 tab）；**不**拆 4 个独立 route | 减少导航复杂度；旧 frontend `SettingsPage.tsx` 也是单页 |
| D5 | A9 change password reauthentication | Supabase `updateUser({ password })` 本身不验旧密码；本期**手动**用 `signInWithPassword(email, currentPassword)` 验旧密码 → 通过后再 `updateUser` | 安全要求：不能让登录态被盗的人改密码长期持留 |
| D6 | A8 QR 图片上传 | 沿用 Phase 7 `payment_qr_data_url` LONGTEXT data:URL 模式；client 端 5MB 限制 + base64 校验 | 与 bills.reference_image_data_url 一致；Storage 迁移留 PRD §9 后续 |
| D7 | api-client refactor 时机 | **删 fetch 实现 + 改 types-only 包**作为 Phase 8 中段单独 PR；不在最后混入"删旧 apps"PR | 类型包变动影响新 apps/web 编译，提前 cleanup 便于发现引用泄漏 |
| D8 | 旧 apps 删除顺序 | **F9 api-client refactor → F11 删 apps/backend → F10 删 apps/frontend → F12 删 database/**；理由：先解耦类型依赖，再删源 | api-client 之前可能被 apps/frontend 引用过；先改成 types-only 再删 frontend |
| D9 | i18n key 命名 | 沿用旧 frontend convention（namespace.section.key） | 若选保留旧 i18n 实现，无迁移工作 |
| D10 | Polish 优先级排序 | settings > dashboard > group detail > settlements > share > invitations > bills > auth | 用户首次进入和最常用的页面优先 |

---

## 4. 旧 frontend → 新 apps/web 迁移矩阵

| 旧模块 (`apps/frontend/src/features/`) | 旧 page 文件 | Phase X 已迁移 | Phase 8 polish 工作 |
|---|---|---|---|
| `auth` | `AuthPage.tsx` | Phase 3 | 视觉对齐 + i18n key 同步 |
| `home` + `groups/dashboard` | `HomePage.tsx` + `dashboard/*` | Phase 3 + 4 | invitations badge + loading skeleton |
| `groups` | `GroupsListPage.tsx`, `GroupDetailPage.tsx`, `GroupOverviewPage.tsx` | Phase 4 | status badge 视觉 + group card 密度 |
| `participants` | `ParticipantsPage.tsx` | Phase 4 | invite lookup dialog 视觉 |
| `bills` | `BillsPage.tsx` | Phase 5 | items table row + fee chips |
| `settlements` | `SettlementsPage.tsx` + `SettlementSharePage.tsx` + `ShareDialog.tsx` + receipt/share/status/summaryImage utils | Phase 6 + 7 | transfer row + share dialog + receipt breakdown |
| `invitations` | `InvitationsPage.tsx` | Phase 7 | empty state + accept/decline 视觉 |
| **`settings`** | **`SettingsPage.tsx`** | ❌ **Phase 8 本期** | F1-F5 完整实现 |

---

## 5. Settings 模块详细设计

### 5.1 页面布局（F1）

```
┌─ Settings ────────────────────────────────────────────┐
│                                                       │
│  ┌─ Profile ──────────────────────────────────────┐  │
│  │ Display name [Alice              ]              │  │
│  │ Username     [alice               ]             │  │
│  │ [Save]                                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Payment Profile ──────────────────────────────┐  │
│  │ Payee name      [Alice Tan       ]              │  │
│  │ Payment method  [Maybank ▾]                     │  │
│  │ Account name    [Alice Tan       ]              │  │
│  │ Account number  [1234567890      ]              │  │
│  │ Notes           [Cash ok too     ]              │  │
│  │ QR code         [📷 Upload]                     │  │
│  │ [Save]                                          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Change Password ──────────────────────────────┐  │
│  │ Current password [********        ]             │  │
│  │ New password     [********        ]             │  │
│  │ Confirm new      [********        ]             │  │
│  │ [Change password]                               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ Email Verification ───────────────────────────┐  │
│  │ Email: alice@example.com  ✅ Verified           │  │
│  │ (or)   alice@example.com  ⏳ Pending           │  │
│  │        [Resend verification email]              │  │
│  └─────────────────────────────────────────────────┘  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### 5.2 A7 Profile（F2）

- Server Action `updateProfileAction(formData)`:
  - 校验 name 1-150 char；username 3-30 alphanumeric/_/-/. 与 Phase 3 sign-up 一致
  - 先 `UPDATE app_users SET name = ?, username = ? WHERE id = auth.uid()` —— 走 RLS `app_users_update_self`
  - 如 username 唯一性违反 → `23505` catch → 友好提示

### 5.3 A8 Payment Profile（F3）

- Server Action `updatePaymentProfileAction(formData)`:
  - 6 个字段全可选；空字符串 → NULL
  - `UPDATE app_users SET default_payment_* = ?` —— 走 RLS
  - QR 图片：client 5MB 限制 + `^data:image/(png|jpeg|webp);base64,`

### 5.4 A9 Change Password（F4）—— 关键：reauthentication

```ts
"use server";
export async function changePasswordAction(prev, formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // 1. 验旧密码
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: formData.get("currentPassword"),
  });
  if (signInError) return { error: "Current password is incorrect" };

  // 2. 验新密码 + confirm 一致 + 长度 ≥ 6
  const newPw = formData.get("newPassword") as string;
  const confirm = formData.get("confirmNewPassword") as string;
  if (newPw !== confirm) return { error: "Passwords do not match" };
  if (newPw.length < 6) return { error: "Password must be at least 6 characters" };

  // 3. 更新
  const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
  if (updateError) return { error: updateError.message };

  return { success: "Password updated. Please sign in again." };
  // 可选: await supabase.auth.signOut() → redirect /sign-in
}
```

### 5.5 A10 Email Verification（F5）

- 已 verified（`email_confirmed_at IS NOT NULL`）→ 显示 ✅ + 不显示按钮
- 未 verified → 显示 ⏳ + Resend 按钮
- Resend 按钮 disabled 1 分钟（防 abuse）

---

## 6. 执行步骤（40 小时）

### Day 1（8h）：Settings 实现

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-2:00 | F1 settings page 框架 + F2 profile form + action | A7 端到端 |
| 2:00-4:30 | F3 payment-profile form + action + QR upload | A8 端到端 |
| 4:30-6:30 | F4 change-password + reauthentication 流程 + 单测 | A9 端到端 |
| 6:30-8:00 | F5 email-verification + resend 按钮 + disabled 状态 | A10 端到端 |

### Day 2（8h）：i18n + 视觉对齐起步

| 时段 | 任务 | 输出 |
|---|---|---|
| 8:00-9:30 | 读旧 `apps/frontend/src/shared/i18n/`；评估迁移成本；锁定 D2 | i18n 决策 |
| 9:30-12:00 | F6 i18n 文件：①迁旧 `apps/frontend/src/shared/i18n/` 的 en+zh string maps 到 `apps/web/lib/i18n/messages/`；②client `I18nProvider` + `useTranslation` hook + localStorage `splity.locale`；③apps/web 主要 page 抽 i18n keys（settings + dashboard + group detail 等 6 页）。**不**改 routing（无 `[locale]`） | i18n client context |
| 12:00-14:00 | F7 UI primitives：toast / skeleton / spinner / page-header / card | 组件库扩展 |
| 14:00-16:00 | F8 polish 优先级 #1：settings page 视觉精修 | settings UI 完整 |

### Day 3（8h）：视觉 polish 主体

| 时段 | 任务 | 输出 |
|---|---|---|
| 16:00-18:30 | F8 polish #2：dashboard + group list + invitations badge | dashboard 完整 |
| 18:30-21:30 | F8 polish #3：group detail + bills + settlements | 业务页 polish |
| 21:30-24:00 | F8 polish #4：share creator + public share page + invitation list | share + invitations 完整 |

### Day 4（8h）：api-client refactor + 旧资产清理

| 时段 | 任务 | 输出 |
|---|---|---|
| 24:00-25:30 | F9 三步（v1.3 完整）：①删 `packages/api-client/src/{http,errors,config}.ts`；保留 `index.ts` DTO types；②`packages/api-client/package.json` 用 `exports` map（**不**加 `main` / `module`）：`{ ..., "exports": { ".": { "types": "./src/index.ts" } } }`；③**`apps/web/package.json` 加 `"@splity/api-client": "workspace:*"` 到 dependencies**；④跑 `pnpm install`（root）→ symlink 建立；apps/web 用 `import type { ... } from "@splity/api-client"`；`pnpm --filter splity-web typecheck` 必须通过 | types-only package + 已 link |
| 25:30-26:00 | F14 根 `package.json` 删 frontend/backend scripts；F15 更新 `pnpm-workspace.yaml` | scripts 清理 |
| 26:00-26:30 | F11 `git rm -r apps/backend`；F12 `git rm -r database` | 删后端 + 旧 DB |
| 26:30-27:00 | F10 `git rm -r apps/frontend` —— **最后**删（确认 polish 已对照完毕） | 删旧前端 |
| 27:00-29:30 | F13 重写 `README.md` + 更新 `docs/architecture.md`（去掉 .NET / MySQL 引用） | 文档对齐 |
| 29:30-32:00 | 全量 `pnpm install` + 全量 typecheck + 浏览器再跑 J1-J11 一遍 | 回归测试 |

### Day 5（8h）：测试 + 边界 + 验收

| 时段 | 任务 | 输出 |
|---|---|---|
| 32:00-34:00 | F16 `phase-8-settings.sql`：username 唯一性 / payment_profile 写入越权 / change-password 反例 | DB 层测试 |
| 34:00-36:00 | 浏览器测试 J9 完整旅程（5 个 settings 子动作）+ J1-J8 视觉对照 | UX 验收 |
| 36:00-37:00 | grep 审计：`@/lib/supabase/admin` / `auth.getSession` / Clerk 残留 / api-client fetch 残留 | 安全审计 |
| 37:00-39:00 | F17 review checklist + commit 准备 | 文档 |
| 39:00-40:00 | Buffer / final pnpm install + dev server smoke | 整体确认 |

---

## 7. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P8-R1 | 视觉 polish 占时间无底洞 | 🔴 高 | D3 严格"不 redesign 只对齐"；超时立刻砍 polish 范围（保 settings/dashboard，砍 bills/settlements polish） |
| P8-R2 | i18n 工作量超预期 | 🟢 低（v1.2 降级） | D2 已锁"client context + 迁旧 string map"——不引入 `next-intl` / `[locale]` routing；如旧 I18nProvider 实现复杂，可临时退化为最简 `useState + JSON map` 不阻塞主线。**绝不**临时引入 `[locale]` route——会暴露 middleware 漏防御漏洞 |
| P8-R3 | A9 reauthentication 误把当前 session 失效 | 🟡 中 | `signInWithPassword` 验证后**不显式 signOut**；Supabase 自动延续当前 session（验旧密码只是一次性 token 检查） |
| P8-R4 | 删 apps/frontend 后发现某 import 漏改 | 🟡 中 | D7/D8 顺序：先 api-client refactor + typecheck → 再删 frontend；中间 pnpm typecheck 强制全 PASS |
| P8-R5 | api-client 改成 types-only 后类型推导失败 | 🟢 低 | Phase 1 已规划；apps/web 只 import types，不调用 fetch；保留 `index.ts` 全部 type export |
| P8-R6 | 上线前 README 写错（仍写 .NET 后端）误导未来贡献者 | 🟢 低 | F13 review checklist 强制对照 docs/migration-prd.md 现状改写 |
| P8-R7 | Polish 引入新 bug 把已通过的旅程打挂 | 🟡 中 | Day 4 末尾全量 J1-J11 回归；Day 5 末再过一次 |
| P8-R8 | 旧 apps/backend 仍在跑（dev server） → 端口冲突误判 | 🟢 低 | Day 4 删 apps/backend 前先停旧 Splity.Api 进程 |
| P8-R9 | A8 QR 图 5MB+ 上传卡 Server Action | 🟡 中 | client 端先校验大小拒大文件；Next.js Server Action body 默认 1MB 需手动调大 |
| P8-R10 | username 改动触发 trigger / view 重建（如有） | 🟢 低 | Phase 2 trigger `handle_new_user` 只在 INSERT 触发；UPDATE username 不触发；安全 |

---

## 8. 验收清单

### 8.1 Settings 完整性（J9）
- [ ] **A7 Profile**：改 display name + username → 保存 → dashboard / group detail 同步显示新值。
- [ ] **A7 username 重复**：尝试改成已被占用的 username → 友好提示 "username already taken"。
- [ ] **A8 Payment Profile**：填 6 个字段 → 保存 → 下次创建 settlement share 时 prefill 这些值。
- [ ] **A8 QR 上传**：①上传 png/jpeg/webp 各 1 张（≤ 5MB 原图）→ 保存成功（base64 ≈ 6.7MB 在 `8mb` 内）；②上传 > 5MB 大图 client 端先拒，不触达 Server Action；③上传超大 raw（即使绕过 client 端也大到 base64 > 8mb，如 6MB 原图 → ≈ 8MB+）被 Next.js `bodySizeLimit` (`8mb`) 拒（验证 F18 配置生效）。
- [ ] **A9 Change Password**：旧密码错 → 拒；新密码 vs 确认不一致 → 拒；新密码 < 6 → 拒；成功后用新密码登录可用。
- [ ] **A10 Email Verification**：已验证账号看到 ✅；未验证账号点 Resend → 邮件到达（开发期可在 Dashboard Auth → Email 关 confirmation 模拟）；按钮 1 分钟 disabled。

### 8.2 视觉 polish
- [ ] Settings / Dashboard / Group detail / Bills / Settlements / Share 6 页**视觉密度对齐旧 frontend**（spacing / color / typography）。
- [ ] Loading state（skeleton / spinner）覆盖至少 5 个 Server Component 数据加载点。
- [ ] Empty state（"No groups yet" / "No pending invitations" / etc）覆盖至少 4 处。
- [ ] 所有 form 的提交按钮在 pending 状态显示 loading + disabled。

### 8.3 i18n（v1.1 降级）
- [ ] **核心 string 走 i18n keys**（不硬编码）：settings + dashboard + group detail + bills + settlements + share 6 页主要文案抽出 keys；按钮 / 错误提示等 < 20 字短文本可保留硬编码。
- [ ] 旧 `apps/frontend/src/shared/i18n/` 中的 `en` + `zh` 双语 map **已迁移到 `apps/web/lib/i18n/`**；keys 命名与旧版一致以便 diff。
- [ ] **客户端 locale 切换**（cookie / localStorage）可用；切换后客户端组件文案立即更新；Server Component 默认使用 fallback locale（不强制 SSR locale）。
- [ ] **不引入 `app/[locale]/...` 路由结构**（v1.1：避免 middleware 漏防御）。
- [ ] 至少 1 种语言完整可用；第 2 语言（zh）keys ≥ 80% 覆盖即可（缺失自动 fallback 英文）。

### 8.4 旧资产清理（v1.1 扩展）
- [ ] `apps/frontend/` 不存在。
- [ ] `apps/backend/` 不存在。
- [ ] `database/` 不存在。
- [ ] **`scripts/dev.js` 和 `scripts/backend.js` 已删**（旧 helper 引用已删目录）。
- [ ] 根 `package.json` scripts 状态：
  - 含 `dev` → `pnpm --filter splity-web dev`
  - 含 `build` → `pnpm --filter splity-web build`
  - 含 `typecheck` → `pnpm --filter splity-web typecheck`（可选新增）
  - **不含**：`dev:frontend` / `dev:backend` / `build:frontend` / `build:backend` / `install:frontend` / `dev:web`（dev:web 与新 dev 重复，删一个）
- [ ] `pnpm-workspace.yaml` 只列 `apps/web` 和 `packages/api-client`。
- [ ] `packages/api-client/src/` 只剩 `index.ts`（types 集合）；`http.ts` / `errors.ts` / `config.ts` 已删；`package.json` 含 `"exports": { ".": { "types": "./src/index.ts" } }`，**不含 `"main"` 字段**（避免 Node runtime 加载 `.ts` 失败）。
- [ ] **`apps/web/package.json` `dependencies` 含 `"@splity/api-client": "workspace:*"`**（v1.3 关键补漏；否则 TS resolver 找不到包，`pnpm --filter splity-web typecheck` 会报 `Cannot find module '@splity/api-client'`）。
- [ ] `pnpm install`（root）后 `ls apps/web/node_modules/@splity/api-client` 应是 symlink 指向 `packages/api-client`。
- [ ] apps/web 中所有 import 都用 `import type` 语法（**禁止** runtime `import { ... } from "@splity/api-client"`）；grep 断言：`grep -rn "^import {.*} from \"@splity/api-client\"" apps/web` 0 命中（只允许 `import type`）。
- [ ] **`apps/web/next.config.ts` 含 `experimental.serverActions.bodySizeLimit: '8mb'`**（v1.2：5MB 原图 base64 ≈ 6.7MB + envelope，`8mb` 留余量）。
- [ ] 根 `pnpm install` 通过；`pnpm --filter splity-web typecheck` 通过；`pnpm --filter splity-web build` 通过（生产 build smoke）。

### 8.5 PRD 对齐
- [ ] api-inventory.md A7-A10 共 4 条接口在新版可复现。
- [ ] api-inventory.md A6 在新版**不**复现（PRD §1.5 弃用）；grep `/api/auth/sync` 全仓库 0 命中。
- [ ] J9 完整旅程跑通。
- [ ] J1-J11 共 11 条旅程回归测试通过。

### 8.6 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过。
- [ ] `grep -rn "auth.getSession()" apps/web --include='*.ts'` 仍 0 命中。
- [ ] `grep -rn "createAdminClient(" apps/web --include='*.ts' | grep -v 'lib/supabase/admin.ts'` 仍 0 命中。
- [ ] `grep -rn "Clerk" apps/web` 0 命中（PRD §3 已退；不再有任何 Clerk 引用）。
- [ ] `grep -rn "@clerk" apps/web` 0 命中。
- [ ] `grep -rn "fetch.*api/" apps/web` 0 命中（apps/web 不应通过 HTTP 调旧 .NET API；所有路径走 Server Action + Supabase）。

---

## 9. 完成后立即触发

1. 标 Phase 8 → completed，Phase 9 → in_progress。
2. commit: `feat(settings,polish,cleanup): settings + i18n + ui polish + delete legacy (phase 8)`。
3. 进入 **Phase 9** —— Vercel 部署、域名、监控、最终回归。

---

**文档结束**
