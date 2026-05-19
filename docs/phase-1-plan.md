# Phase 1 Implementation Plan

> **目标**：在 `apps/web` 建好 Next.js 15 + Supabase 四件套脚手架，能跑 `localhost:3000` 看到一个最小测试页确认 Supabase Auth client 在 server / browser 两侧都通。
> **依据**：`docs/migration-prd.md` §4.1（v2.3 草案）。
> **预算**：0.5 工作日（4 小时净时间）。
> **状态**：completed（2026-05-19，commit `e382d10`）。
> **前置 Phase**：Phase 0 已完成（`api-inventory.md` / `schema-truth.md` / `user-journeys.md` 三份基线已落盘）。

---

## 1. 交付物

| # | 路径 | 类型 | 用途 |
|---|---|---|---|
| F1 | `pnpm-workspace.yaml` | 新建 | 启用 pnpm workspace；列出 `apps/*` 和 `packages/*` |
| F2 | `apps/web/package.json` | 新建 | Next.js 15 + Supabase + TS 依赖 |
| F3 | `apps/web/tsconfig.json` | 新建 | 独立 TS 配置，含 `@/*` 路径别名 |
| F4 | `apps/web/next.config.ts` | 新建 | 最小配置 |
| F5 | `apps/web/tailwind.config.ts` + `apps/web/postcss.config.mjs` | 新建 | Tailwind v3（保守对齐旧前端） |
| F6 | `apps/web/.env.example` | 新建 | 仅占位，**不含真值**；列出 3 个变量名 |
| F7 | `apps/web/.env.local` | 本地 | 真实 Supabase URL / anon / service_role；**不入 git** |
| F8 | `apps/web/lib/supabase/server.ts` | 新建 | `createServerClient()`：读 cookies，带用户 JWT，RLS 生效 |
| F9 | `apps/web/lib/supabase/browser.ts` | 新建 | `createBrowserClient()`：客户端组件用 |
| F10 | `apps/web/lib/supabase/middleware.ts` | 新建 | 在 Next.js middleware 内刷新 session cookie |
| F11 | `apps/web/lib/supabase/admin.ts` | 新建 | `createAdminClient()` 用 `service_role`；**顶部必有警示注释**，§2.1 白名单内才能 import |
| F12 | `apps/web/middleware.ts` | 新建 | Next.js 根 middleware，调用 F10 |
| F13 | `apps/web/app/layout.tsx` | 新建 | 根 layout + Tailwind |
| F14 | `apps/web/app/page.tsx` | 新建 | 最小测试页：Server Component 调 `supabase.auth.getUser()`，渲染 `user: null` |
| F15 | `apps/web/app/globals.css` | 新建 | Tailwind 入口 |
| F16 | 根 `package.json` 增 `dev:web` script | 修改 | `pnpm --filter splity-web dev` |
| F17 | 根 `.gitignore` 增加 `apps/web/.env.local` / `apps/web/.next` | 修改 | 防止 secret / build artifact 提交 |

**不交付**：
- ❌ Postgres schema / migration（Phase 2）。
- ❌ Auth 页面（Phase 3）。
- ❌ 业务路由（Phase 4+）。
- ❌ 删除根 `package-lock.json` 或迁移旧 `apps/frontend` 到 pnpm（参见 §6 R3）。

---

## 2. 前置条件（用户须先完成）

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | 在 [supabase.com](https://supabase.com) 创建项目，记下 `Project URL` / `anon key` / `service_role key` | F7（无值则测试页跑不通） |
| PRE-2 | 本机装好 pnpm（≥ 9.0）；`pnpm --version` 通过 | Step 1 |
| PRE-3 | 本机 Node.js ≥ 20.x；`node --version` 通过 | 全程 |

> Supabase 项目地区建议选离用户近的（如 `ap-southeast-1`）。免费档约束（§6 R7）：DB 500MB / 50,000 MAU / 5GB egress / 7d log retention。

---

## 3. 关键决策（Phase 1 内必须定）

| 决策 | 选择 | 理由 |
|---|---|---|
| Workspace 工具 | **pnpm**（统一到 pnpm，与 PRD §3.3 一致） | 根目录已有 `pnpm-lock.yaml`；pnpm workspace 原生支持；`package-lock.json` 127 字节几乎空，删除无损 |
| 旧 npm 资产处置 | 本阶段**保留** `apps/frontend/package-lock.json` 不动；新 `apps/web` 走 pnpm；根 `package-lock.json` 删除 | 避免 Phase 1 引入旧前端构建回归；旧 frontend 整体在 Phase 8 退场 |
| Next.js 版本 | **15.x**（最新稳定） | App Router + React 19 标配，与 PRD 一致 |
| React 版本 | **19.x**（Next.js 15 默认） | 旧 `apps/frontend` 用 18，互不影响（独立 package.json） |
| Tailwind 版本 | **v3.4.x**（保守对齐旧前端） | v4 API 仍在演进；Phase 8 移植时同版本省心 |
| Supabase JS 版本 | **@supabase/supabase-js ≥ 2.45** + **@supabase/ssr ≥ 0.5** | 后者提供 `createServerClient` / `createBrowserClient` |
| 端口 | `3000`（Next.js 默认） | 与 5173/5204/7025 全不冲突 |
| Service Role 入口数 | 仅 1 处（`admin.ts`） | 配合 §6 R4 审计 |

**ADR-013**：根仓库统一到 pnpm workspace；删除根 `package-lock.json`；`apps/frontend` 保留 npm 锁文件直到 Phase 8 退场（局部不一致可接受）。

---

## 4. 输出模板（关键文件骨架）

### F1. `pnpm-workspace.yaml`
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### F2. `apps/web/package.json`（关键依赖）
```json
{
  "name": "splity-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

### F6. `apps/web/.env.example`
```bash
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key

# Server-only — NEVER expose to client; never commit .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key
```

### F8. `apps/web/lib/supabase/server.ts`
```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client with the current user's JWT from cookies.
 * RLS policies are enforced; this is the default client for Server Components
 * and Route Handlers handling logged-in users.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Server Component context cannot set cookies; middleware handles it.
          }
        },
      },
    }
  );
}
```

### F9. `apps/web/lib/supabase/browser.ts`
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### F10. `apps/web/lib/supabase/middleware.ts`
```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as CookieOptions)
          );
        },
      },
    }
  );

  // Refresh session if needed; do NOT remove this call.
  await supabase.auth.getUser();

  return response;
}
```

### F11. `apps/web/lib/supabase/admin.ts`
```ts
// =============================================================
// SERVICE-ROLE BYPASS — DO NOT IMPORT WITHOUT JUSTIFICATION.
//
// This client uses the Supabase service_role key, which BYPASSES
// Row-Level Security on every table.
//
// Allowed usage (per migration-prd.md §2.1):
//   1. Auth trigger / system-level mirror writes (e.g. handle_new_user).
//   2. One-off maintenance scripts (clearly marked & reviewed).
//   3. Webhooks invoked by trusted external services (none yet).
//
// Every call site MUST be tagged with `// SERVICE-ROLE: <reason>`
// and reviewed against the §2.1 allow-list.
// =============================================================

import { createClient as createSupabase } from "@supabase/supabase-js";

export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("admin client must never run in the browser");
  }
  return createSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

### F12. `apps/web/middleware.ts`
```ts
import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on everything except static assets, image optimizer, favicon.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

### F14. `apps/web/app/page.tsx`（最小测试页）
```tsx
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user ?? null;

  return (
    <main className="p-8 font-mono text-sm">
      <h1 className="text-xl font-semibold mb-4">Splity Web — Phase 1 smoke test</h1>
      <pre className="bg-zinc-100 p-4 rounded">
        {JSON.stringify({ user, error: error?.message ?? null }, null, 2)}
      </pre>
      <p className="mt-4 text-zinc-600">
        Expected before sign-up flow exists: {`user: null`}, no error.
      </p>
    </main>
  );
}
```

---

## 5. 执行步骤（4 小时时间盒）

### Step 1：Workspace 切换 + 旧 lock 文件清理（30 分钟）
1. **0:00-0:05** — 确认 PRE-1/2/3 全部就绪；`pnpm --version` ≥ 9.0。
2. **0:05-0:10** — 删除根 `package-lock.json`（127 字节，等价空文件，无内容损失）。
3. **0:10-0:15** — 写 `pnpm-workspace.yaml`（F1）。
4. **0:15-0:25** — 根 `package.json` 加 `dev:web` script（F16）；不修改其他 script，旧 frontend/backend 启动方式保持。
5. **0:25-0:30** — 跑 `pnpm install` 在根目录确认 workspace 识别 `apps/frontend` / `packages/api-client` 不报错。

### Step 2：脚手架创建（45 分钟）
1. **0:30-0:35** — `mkdir -p apps/web/{app,lib/supabase,public}`。
2. **0:35-0:50** — 落 F2 `package.json` / F3 `tsconfig.json` / F4 `next.config.ts` / F5 Tailwind 配置。
3. **0:50-1:00** — `cd apps/web && pnpm install` 装依赖。
4. **1:00-1:10** — 落 F13 layout / F15 globals.css。
5. **1:10-1:15** — `pnpm --filter splity-web dev` 启动；浏览器开 `localhost:3000` 看 Next.js 默认页（此时还没接 Supabase）。

### Step 3：Supabase 四件套 + middleware（90 分钟）
1. **1:15-1:30** — 落 F6 `.env.example` 和 F7 `.env.local`（用户提供的真实 key）；F17 `.gitignore`。
2. **1:30-1:50** — 落 F8 server.ts + F9 browser.ts。
3. **1:50-2:10** — 落 F10 middleware helper + F12 根 middleware；重启 dev server 确认无报错。
4. **2:10-2:30** — 落 F11 admin.ts（含完整警示注释块）。
5. **2:30-2:45** — 落 F14 测试页；浏览器开 `localhost:3000` 应看到 `user: null` JSON 渲染。

### Step 4：验收 + 收尾（45 分钟）
1. **2:45-3:00** — 按 §7 验收清单逐条检查。
2. **3:00-3:15** — 给 `apps/web/README.md` 写 3 行：怎么 `pnpm install` + `pnpm dev` + 环境变量说明。
3. **3:15-3:30** — `git status` 确认 `.env.local` 未被追踪；`git diff` review 改动；commit `feat(web): scaffold next.js + supabase clients (phase 1)`。
4. **3:30-3:45** — Buffer / 调试。

---

## 6. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P1-R1 | `service_role` key 误入 git | 🔴 高 | F17 `.gitignore` 必须包含 `.env.local`；commit 前 `git status` 自查；admin.ts 顶部警示注释 |
| P1-R2 | `@supabase/ssr` API 版本兼容性问题（getAll/setAll 是 0.4+ 写法） | 🟡 中 | 锁版本 ≥ 0.5；如遇问题对照官方 quickstart 文档 |
| P1-R3 | pnpm 切换破坏旧 frontend 启动（`scripts/dev.js` 内 `npm install --prefix`） | 🟡 中 | 本期**不动** scripts/dev.js；`apps/frontend/package-lock.json` 保留；新 `dev:web` 独立 |
| P1-R4 | Tailwind v3 与 Next.js 15 默认 PostCSS 集成不顺 | 🟢 低 | 用 `postcss.config.mjs` ESM 写法；`globals.css` 走 `@tailwind base/components/utilities`，与旧前端一致 |
| P1-R5 | `middleware.ts` matcher 拦截范围过宽导致 RSC 数据请求被 cookie 写入打断 | 🟡 中 | 用本文 §4.F12 给的 matcher，排除静态资源；如遇 RSC 404 检查 cookie 操作是否抛错被吞 |
| P1-R6 | 测试页用 Server Component 调 `getUser()` 在某些 Next.js 15 版本要求 `await cookies()` | 🟢 低 | F8 已写 `await cookies()`；如 cookies API 报警告，按错误提示调整 |
| P1-R7 | Phase 1 没有 schema，`auth.users` 上 trigger 还没装，注册流程跑不通——不要在 Phase 1 测试注册 | 🟢 低 | Phase 1 验收只测 `getUser()` 返回 null；注册流程留到 Phase 3 |

---

## 7. 验收清单（Phase 1 结束前自检）

- [ ] `pnpm-workspace.yaml` 存在并列出 `apps/*` `packages/*`。
- [ ] 根 `package-lock.json` 已删除（如它原本只是 127 字节占位）。
- [ ] `apps/web` 目录结构完整：`app/` `lib/supabase/` `public/` 全存在。
- [ ] `pnpm --filter splity-web dev` 启动成功，无 TypeScript 报错。
- [ ] 浏览器 `http://localhost:3000` 返回 200，页面渲染 JSON `{ "user": null, "error": null }`。
- [ ] **不**直接查 `auth.users` 表（对齐 PRD v2.3 §4.1 验收修正）。
- [ ] `lib/supabase/admin.ts` 文件顶部含 `// SERVICE-ROLE BYPASS` 完整注释块。
- [ ] `grep -rn "createAdminClient(" apps/web/` 命中 **0 次**（admin.ts 已定义但未被任何文件调用——Phase 3 的 trigger 路径才会启用）。
- [ ] `git status` 不显示 `apps/web/.env.local`。
- [ ] `.env.example` 三个变量名齐全且**不含**真值。
- [ ] 旧 `apps/frontend` `npm run dev:frontend` 仍能启动（不被 Phase 1 引入回归）。

---

## 8. 完成后立即触发

1. ✅ 把 todo `Phase 1` 标 completed，`Phase 2` 标 in_progress。
2. 进入 **Phase 2 plan 生成**：以 `docs/schema-truth.md` 11 张表 + `docs/migration-prd.md` §4.2 RLS/RPC 设计为输入，产出 `supabase/migrations/0001_schema.sql` / `0002_rls_policies.sql` / `0003_rpc_functions.sql` / `0004_auth_triggers.sql`。
3. Phase 2 第一天必须能在 Supabase Studio 看到 11 张表 + 跨账号 RLS 越权测试通过。

## 9. 完成记录

- Commit: `e382d10 feat(web): scaffold next.js + supabase clients (phase 1)`.
- 验证：`pnpm install`、`pnpm --filter splity-web typecheck`、`pnpm --filter splity-web build`、浏览器 smoke test、`npm run build:frontend`。
- 备注：`.env.local` 已由 `.gitignore` 覆盖；本地真实 Supabase key 未提交。

---

**文档结束**
