# Phase 4 Implementation Plan

> **文档版本**：v1.1
> **目标**：把 Phase 2 的 RLS / `is_group_member` 接到完整的 Groups + Participants CRUD UI；让两个真实账号能跑通 J1（新用户记账前置：建组+加参与者）和 J3 的前半段（邀请已注册用户）；用跨账号 RLS 烟雾测试证明越权被拦。
> **依据**：`docs/migration-prd.md` v2.3 §4.4 + §4.2；`docs/api-inventory.md` B1-B6 / D1-D4 / A5；`docs/user-journeys.md` J1.4-1.5 / J2 / J3 / J4 / J11。
> **预算**：1 工作日（8 小时）。
> **状态**：待执行。
> **前置 Phase**：Phase 3 completed（真账号可注册登录；`(app)/*` 路由保护到位）。
> **v1.2 修订（codex review #2）**：①F12 fixture 内 `DO $$ ... $$` 块改为**硬编码 UUID 字面量**（psql `:'VAR'` 不会在 dollar-quoted body 内展开，原 v1.1 写法实际会送 `:'GROUP_ID'` 原文到 Postgres 引发语法错误）；②F12 不再假设 B 的 `app_users.username = 'bob'`——前置 SETUP 显式 UPDATE 测试用户的 username 到已知值；③§7.4 中 `pnpm typecheck` 改为 `pnpm --filter splity-web typecheck`（根 `package.json` 没有 typecheck 脚本）。
> **v1.1 修订（codex review #1）**：①F12 测试 fixture 改用**固定 UUID**承接 Bob 的 participant id，避免 Pending invitee 受 RLS 拦截 SELECT 拿不到 id；②§7.4 grep 断言**排除 admin.ts 定义本身**，只断"调用点 0 次"。

---

## 1. 交付物

| # | 路径 | 类型 | 用途 |
|---|---|---|---|
| F1 | `supabase/migrations/0006_search_user_rpc.sql` | 新建 | `search_user_by_username(p_username TEXT)` DEFINER RPC：对应 A5；只返回 `id/name/username` 三个字段，不含 email/payment profile |
| F2 | `apps/web/lib/services/users.ts` | 新建 | wrapper 调 F1 RPC；返回 `UserLookupDto \| null` |
| F3 | `apps/web/lib/services/groups.ts` | 新建 | groups CRUD：`listAccessibleGroups` / `getGroup` / `createGroup` / `updateGroup` / `updateGroupStatus` / `deleteGroup` |
| F4 | `apps/web/lib/services/participants.ts` | 新建 | `listParticipants` / `createParticipant` / `updateParticipant` / `deleteParticipant`；接 F2 username 解析 |
| F5 | `apps/web/app/(app)/dashboard/page.tsx` | **替换** Phase 3 占位 | Group 列表卡片 + "New group" CTA |
| F6 | `apps/web/app/(app)/dashboard/actions.ts` | 新建 | `createGroupAction`（接 F3） |
| F7 | `apps/web/app/(app)/groups/[groupId]/page.tsx` | 新建 | Group 详情：name + status badge + 参与者列表 + 操作区 |
| F8 | `apps/web/app/(app)/groups/[groupId]/actions.ts` | 新建 | `renameGroupAction` / `changeStatusAction` / `deleteGroupAction` |
| F9 | `apps/web/app/(app)/groups/[groupId]/participants-form.tsx` | 新建 client | 加参与者表单：name + optional username（带 username 搜索 lookup） |
| F10 | `apps/web/app/(app)/groups/[groupId]/participants/actions.ts` | 新建 | `addParticipantAction` / `renameParticipantAction` / `removeParticipantAction` |
| F11 | `apps/web/components/ui/{select,badge,dialog,empty-state}.tsx` | 新建 | 最小新增 4 个 UI primitives（其余复用 Phase 3 button/input/alert） |
| F12 | `supabase/tests/phase-4-rls.sql` | 新建 | 跨账号烟雾测试：A 建组 + 加 B 为 invited participant；B JWT 试图 SELECT/UPDATE/DELETE A 的 group → 全部失败 |
| F13 | `docs/phase-4-review-checklist.md` | 新建 | 13 条 PR review checklist |

**不交付**：
- ❌ 邀请接受/拒绝（G1-G3 → Phase 7）。
- ❌ Bills / Settlements（Phase 5-6）。
- ❌ Settings / payment profile（Phase 8）。
- ❌ 删除 group 的级联清理 UI 提示（DB 级 CASCADE 已就位，UI 只需 confirm 弹窗）。

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 3 闭环；至少 2 个测试账号已通过邮件验证（A: creator, B: invitee） | F12 测试 + J3 邀请 UX 走通 |
| PRE-2 | `database.types.ts` 含 0005/0006 后所有变化（每次 push 后重新 `supabase gen types`） | F2-F4 typed query |
| PRE-3 | 本地 `pnpm dev` 能登录至 `/dashboard` 看到 Phase 3 占位页 | Phase 4 第一步迭代基础 |

---

## 3. 关键决策

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | UI 渲染范式 | **Server Components + Server Actions**（不引 React Query / 不写 Route Handlers） | 与 Phase 3 一致；RSC 直接查 Supabase RLS-backed 数据，省一层 fetch；Server Actions 处理变更 + 触发 `revalidatePath`。**有意偏离** PRD §3.3 的 `api/` 目录——Phase 8 旧前端退场后那目录可能不需要 |
| D2 | A5 用户名搜索实现 | **新 DEFINER RPC `search_user_by_username`**（精确匹配，**不带模糊查询**） | RLS 限 `app_users.SELECT` 只能 `id = auth.uid()`；不能为搜索放开列级权限；DEFINER RPC 是最干净的"白名单导出"路径，字段限 `id/name/username`，**绝不返回 email/payment profile** |
| D3 | 用户名搜索 UX | 输入完整 username 提交 → 显示匹配卡片（含 name），用户点击确认 invite | 不做实时 autocomplete（避免 enumeration + 减少 RPC 调用） |
| D4 | participant 创建时 invitation_status 推导 | 与 C# `ParticipantsService.CreateAsync` 对齐：username = self → Accepted(2)；username = 他人 → Pending(1)；无 username → None(0) | 旧行为等价（J1 acceptance 要求） |
| D5 | Group status 变更 | 允许任何方向（`unresolved ↔ settling ↔ settled`）；UI 三选一 select | 旧后端未限制，按 PRD "业务行为对齐" |
| D6 | Delete group 的级联反馈 | UI confirm dialog 列出 "this will delete N bills, M participants, all settlement data"；不阻止 | 旧后端无阻止；DB 级 CASCADE 已配 |
| D7 | Delete participant 被 bill 引用时 | DB FK 是 `ON DELETE NO ACTION`，会抛 `23503 foreign_key_violation`；Server Action catch 转友好提示 "Cannot remove a participant who already appears on a bill or settlement." | 旧 `ParticipantsService.DeleteAsync` 行为等价 |
| D8 | Server Action 后的 cache 失效 | 每个 mutation 后调 `revalidatePath('/dashboard')` 或 `revalidatePath('/groups/${id}')` | Next.js 15 标准用法；不需要 React Query |
| D9 | RLS-driven 404 vs 403 | Group 不存在或非成员 → **404 not-found**（`getGroup` 返回 null → `notFound()`） | 不暴露"这个 id 存在但你看不见"的信息；防 enumeration |
| D10 | RPC error → form error 翻译位置 | Server Action 层（service 抛 raw Supabase Error，action 翻译） | service 保持纯净，action 负责 UX 友好度 |
| D11 | Participant 编辑锁 | `create/update/delete participant` 只允许 group `status = unresolved(0)`；`settling/settled` 时 UI 禁用并由 service 再次拒绝 | 对齐旧 `ParticipantsService.EnsureGroupEditableAsync`：结算开始后参与者集合锁定 |

---

## 4. 接口与函数映射（对齐 api-inventory.md）

| api-inventory | Phase 4 落地 | 文件 |
|---|---|---|
| **B1** `GET /api/groups` | `listAccessibleGroups()` → RLS-filtered query | F3 + F5 dashboard page |
| **B2** `POST /api/groups` | `createGroup({ name })` + Server Action | F3 + F6 |
| **B3** `GET /api/groups/{id}` | `getGroup(id)` → null = 404 | F3 + F7 |
| **B4** `PUT /api/groups/{id}` | `updateGroup(id, { name })` | F3 + F8 |
| **B5** `PUT /api/groups/{id}/status` | `updateGroupStatus(id, status)` | F3 + F8 |
| **B6** `DELETE /api/groups/{id}` | `deleteGroup(id)` + 触发 confirmations CASCADE | F3 + F8 |
| **D1** `POST /api/groups/{id}/participants` | `createParticipant({ groupId, name, username? })` 内部调 F2 解析 username → 推导 status | F4 + F10 |
| **D2** `GET /api/groups/{id}/participants` | `listParticipants(groupId)` → RLS-filtered | F4 + F7 |
| **D3** `PUT /api/groups/{id}/participants/{pid}` | `updateParticipant(pid, { name, username? })` | F4 + F10 |
| **D4** `DELETE /api/groups/{id}/participants/{pid}` | `deleteParticipant(pid)` → catch FK violation | F4 + F10 |
| **A5** `GET /api/auth/users/search?username=` | `searchUserByUsername(username)` → DEFINER RPC | F1 + F2 |

---

## 5. 输出模板（关键骨架）

### F1. `supabase/migrations/0006_search_user_rpc.sql`

```sql
-- Searches app_users by EXACT username; returns whitelisted fields only.
-- DEFINER because app_users SELECT policy restricts to self (auth.uid() = id).
-- GRANT to authenticated only; not exposed to anon.

CREATE OR REPLACE FUNCTION public.search_user_by_username(p_username TEXT)
RETURNS TABLE(id UUID, name TEXT, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Require authenticated caller; reject anon explicitly.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Trim and case-insensitive exact match; no LIKE / no wildcards.
  IF p_username IS NULL OR btrim(p_username) = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, u.name::TEXT, u.username::TEXT
  FROM public.app_users u
  WHERE u.username IS NOT NULL
    AND lower(u.username) = lower(btrim(p_username))
  LIMIT 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.search_user_by_username(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.search_user_by_username(TEXT) TO authenticated;
```

> 字段白名单：**只返回 `id/name/username`**，**绝不返回** email / payment profile / created_at / invitation 状态等。Phase 4 RLS fixture 会审计这条新 RPC 的返回列数，并通过函数定义检查 `search_path` + `auth.uid()` guard。

### F3. `apps/web/lib/services/groups.ts`（节选）

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupStatus = 0 | 1 | 2;
export const GROUP_STATUS_LABELS: Record<GroupStatus, "unresolved" | "settling" | "settled"> = {
  0: "unresolved", 1: "settling", 2: "settled",
};

export async function listAccessibleGroups() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id")
    .order("created_at_utc", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getGroup(groupId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("groups")
    .select("id, name, status, created_at_utc, created_by_user_id")
    .eq("id", groupId)
    .maybeSingle();
  return data; // null = not found OR RLS denied (404 from UI)
}

export async function createGroup(input: { name: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: input.name, created_by_user_id: user.id, status: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// updateGroup / updateGroupStatus / deleteGroup 类似
```

### F4. `apps/web/lib/services/participants.ts`（关键创建逻辑）

```ts
import { createClient } from "@/lib/supabase/server";
import { searchUserByUsername } from "./users";

type InvitationStatus = 0 | 1 | 2 | 3; // None / Pending / Accepted / Declined

export async function createParticipant(input: {
  groupId: string;
  name: string;
  username?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  let invitedUserId: string | null = null;
  let invitationStatus: InvitationStatus = 0; // None

  if (input.username && input.username.trim()) {
    const found = await searchUserByUsername(input.username);
    if (found) {
      invitedUserId = found.id;
      invitationStatus = found.id === user.id ? 2 /* Accepted */ : 1 /* Pending */;
    } else {
      // username 写了但查不到用户 → 视为 placeholder name, status = None
      // (与旧 ParticipantsService 行为一致：username 字段保留但不绑定)
    }
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({
      group_id: input.groupId,
      name: input.name,
      username: input.username || null,
      invited_user_id: invitedUserId,
      invitation_status: invitationStatus,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### F8. `apps/web/app/(app)/groups/[groupId]/actions.ts`（节选）

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteGroup, updateGroup, updateGroupStatus } from "@/lib/services/groups";

export type GroupActionState = { error: string | null };

export async function renameGroupAction(
  groupId: string,
  _prev: GroupActionState,
  formData: FormData
): Promise<GroupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 200) {
    return { error: "Group name must be 1-200 characters." };
  }
  try {
    await updateGroup(groupId, { name });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/dashboard");
    return { error: null };
  } catch (e: any) {
    return { error: e.message ?? "Failed to rename group." };
  }
}

// changeStatusAction / deleteGroupAction 类似；delete 后 redirect('/dashboard')
```

### F10. participants Server Actions —— **D4 FK 处理重点**

```ts
export async function removeParticipantAction(
  groupId: string,
  participantId: string
): Promise<{ error: string | null }> {
  try {
    await deleteParticipant(participantId);
    revalidatePath(`/groups/${groupId}`);
    return { error: null };
  } catch (e: any) {
    // Postgres FK violation code 23503; or PostgREST {code: '23503'}
    if (e?.code === "23503" || /foreign key/i.test(e?.message ?? "")) {
      return {
        error: "Cannot remove this participant—they appear on a bill or settlement transfer.",
      };
    }
    return { error: e?.message ?? "Failed to remove participant." };
  }
}
```

### F12. `supabase/tests/phase-4-rls.sql`（关键测试，**Phase 2 fixture 的延续**）

```sql
-- Phase 4 cross-account RLS smoke test.
-- Prereqs: 2 real Auth users from Phase 3 sign-up (replace UUIDs below).
-- Run via:  psql ... -v ON_ERROR_STOP=1 -f supabase/tests/phase-4-rls.sql
-- Idempotent (whole body wrapped in BEGIN; ... ROLLBACK;).

\set USER_A '00000000-0000-4000-8000-aaaaaaaaaaaa'  -- creator
\set USER_B '00000000-0000-4000-8000-bbbbbbbbbbbb'  -- invited / outsider
\set USER_A_USERNAME 'phase4_alice'
\set USER_B_USERNAME 'phase4_bob'                   -- B's app_users.username (will be enforced below)

-- IMPORTANT psql quirk:
-- `:'VAR'` is expanded by the psql client OUTSIDE dollar-quoted strings only.
-- Inside `DO $$ ... $$;` the body is sent verbatim to Postgres and `:'VAR'`
-- would arrive as literal text -> syntax error.
-- So we use two patterns:
--   (a) for plain SQL statements OUTSIDE DO blocks: `:'VAR'` is fine.
--   (b) for SQL INSIDE DO blocks: hard-code UUID literals.

BEGIN;

-- =============================================================
-- SETUP (privileged role; runs before any RLS-bound assertion).
-- These statements MUST run as the postgres / db_owner role so we
-- can normalize the test users' app_users.username without RLS.
-- (`supabase db execute` and `psql` connect as postgres by default.)
-- =============================================================
RESET ROLE;

-- Ensure B's app_users.username matches the value our RPC test will search.
-- (Phase 3 sign-up lets users pick any username; the test shouldn't
-- depend on what they picked.)
UPDATE public.app_users SET username = :'USER_B_USERNAME' WHERE id = :'USER_B';
-- Give A a deterministic username too, just so it doesn't accidentally collide
UPDATE public.app_users SET username = :'USER_A_USERNAME' WHERE id = :'USER_A';

-- Fixed UUIDs throughout so we never need to SELECT under B's session
-- (where participants RLS would block reading the row id while Pending).
-- group_id     = 40000000-0000-4000-8000-000000000001
-- alice's pid  = 50000000-0000-4000-8000-aaaaaaaaaaaa
-- bob's   pid  = 50000000-0000-4000-8000-bbbbbbbbbbbb

-- =============================================================
-- ACT 1: A creates a group + 2 participants (Alice self, Bob pending).
-- =============================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'USER_A', true);

INSERT INTO public.groups (id, name, created_by_user_id, status)
VALUES ('40000000-0000-4000-8000-000000000001', 'Phase 4 Group', :'USER_A', 0);

INSERT INTO public.participants (id, group_id, name, username, invited_user_id, invitation_status)
VALUES
  ('50000000-0000-4000-8000-aaaaaaaaaaaa', '40000000-0000-4000-8000-000000000001',
   'Alice', :'USER_A_USERNAME', :'USER_A', 2),  -- self accepted
  ('50000000-0000-4000-8000-bbbbbbbbbbbb', '40000000-0000-4000-8000-000000000001',
   'Bob',   :'USER_B_USERNAME', :'USER_B', 1);  -- pending invite

-- =============================================================
-- ACT 2: B (still Pending) — RLS must block reads and writes.
-- =============================================================
SELECT set_config('request.jwt.claim.sub', :'USER_B', true);

DO $$
DECLARE n INT;
BEGIN
  -- B can NOT see A's group while pending
  SELECT count(*) INTO n FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: pending invitee sees group'; END IF;

  -- B can NOT see participants (RLS: is_group_member(group_id) is false while Pending)
  SELECT count(*) INTO n FROM public.participants
    WHERE group_id = '40000000-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'RLS FAIL: pending invitee sees participants'; END IF;

  -- B cannot rename A's group
  UPDATE public.groups SET name = 'hacked'
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: non-creator updated group'; END IF;

  -- B cannot delete A's group
  DELETE FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: non-creator deleted group'; END IF;
END $$;

-- =============================================================
-- ACT 3: B accepts the invite via SECURITY DEFINER RPC.
-- accept_invitation body checks `invited_user_id = auth.uid()
-- AND invitation_status = Pending`, so only B's call for their own
-- row succeeds. We pass the known BOB_PID literal.
-- =============================================================
SELECT public.accept_invitation('50000000-0000-4000-8000-bbbbbbbbbbbb'::UUID);

-- =============================================================
-- ACT 4: B now SHOULD SELECT but still cannot UPDATE/DELETE.
-- =============================================================
DO $$
DECLARE n INT;
BEGIN
  SELECT count(*) INTO n FROM public.groups
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF n <> 1 THEN RAISE EXCEPTION 'RLS FAIL: accepted invitee cannot SELECT group'; END IF;

  UPDATE public.groups SET name = 'hacked-after-accept'
    WHERE id = '40000000-0000-4000-8000-000000000001';
  IF FOUND THEN RAISE EXCEPTION 'RLS FAIL: accepted invitee updated group'; END IF;
END $$;

-- =============================================================
-- ACT 5: search_user_by_username — A finds B by the username
-- we explicitly set in SETUP. Use a temp setting to thread the
-- value into the DO block (psql `:'VAR'` does NOT expand inside $$).
-- =============================================================
SELECT set_config('request.jwt.claim.sub', :'USER_A', true);
SELECT set_config('test.expected_user_b', :'USER_B',          true);
SELECT set_config('test.expected_username', :'USER_B_USERNAME', true);

DO $$
DECLARE
  r RECORD;
  cnt INT := 0;
  expected_user_b UUID := current_setting('test.expected_user_b')::UUID;
  expected_username TEXT := current_setting('test.expected_username');
BEGIN
  FOR r IN SELECT * FROM public.search_user_by_username(expected_username) LOOP
    cnt := cnt + 1;
    IF r.id <> expected_user_b THEN
      RAISE EXCEPTION 'RPC FAIL: wrong user id (got %)', r.id;
    END IF;
  END LOOP;
  IF cnt <> 1 THEN
    RAISE EXCEPTION 'RPC FAIL: expected exactly 1 match, got %', cnt;
  END IF;
END $$;

-- search_user_by_username MUST NOT return email/payment_*
-- (verified by RPC RETURNS TABLE shape; column count check)
DO $$
DECLARE col_count INT;
BEGIN
  SELECT count(*) INTO col_count
  FROM information_schema.parameters
  WHERE specific_schema = 'public'
    AND specific_name LIKE 'search_user_by_username%'
    AND parameter_mode = 'OUT';
  IF col_count <> 3 THEN
    RAISE EXCEPTION 'AUDIT FAIL: search_user_by_username must return exactly 3 OUT columns, got %', col_count;
  END IF;
END $$;

ROLLBACK;
SELECT 'phase-4 rls smoke passed' AS result;
```

---

## 6. 执行步骤（8 小时时间盒）

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | 写 F1 0006 migration → push → `supabase gen types typescript --linked > database.types.ts` 更新 | 新 RPC + types 含 `search_user_by_username` |
| 0:30-1:00 | F2 `lib/services/users.ts` + F4 `participants.ts` 创建逻辑（含 invitation_status 推导） | services 层骨架 |
| 1:00-2:00 | F3 `lib/services/groups.ts` 全部 6 个方法 + F11 新增 UI primitives（badge / select / dialog 框架） | groups service + UI primitives |
| 2:00-3:30 | F5 `/dashboard` 列表 + F6 createGroup Server Action + form | dashboard 可建组 |
| 3:30-5:00 | F7 `/groups/[groupId]/page.tsx` 详情页 + F8 rename/status/delete Server Actions | group 详情可改名、改状态、删除 |
| 5:00-6:30 | F9 participants 表单 + F10 add/rename/remove Server Actions + username search dialog | 参与者管理完整 |
| 6:30-7:30 | F12 跨账号 RLS 测试 fixture；用真账号 A/B 跑通；F13 review checklist | RLS 烟雾测试通过 |
| 7:30-8:00 | `pnpm --filter splity-web typecheck`；浏览器跑通 J1.4-1.5 / J11 / 跨账号 404 | 验收 + commit |

---

## 7. 验收清单

### 7.1 端到端（必跑）
- [ ] 账号 A 登录 → `/dashboard` 看到空列表（首次）。
- [ ] 点 "New group" → 输名字 "Test Group" → 提交 → 列表出现卡片 + 跳详情页 `/groups/{id}`。
- [ ] 详情页：改名 → 列表与详情同步刷新；改 status → badge 显示 settling/settled。
- [ ] 加 participant（仅 name，不填 username）→ 列表出现，`invitation_status = None`。
- [ ] 加 participant（填自己的 username）→ `invitation_status = Accepted`，`invited_user_id` 为自己。
- [ ] 加 participant（填账号 B 的 username）→ `invitation_status = Pending`，`invited_user_id` 为 B。
- [ ] username 搜索：输入不存在的 username → "No user found" 提示；输入存在的 → 显示 name + username 卡片确认按钮。
- [ ] 改 participant 名字成功。
- [ ] 删 participant（没被任何 bill 引用）成功；列表刷新。
- [ ] 改 group status 为 `settling` 后，add / rename / remove participant 都被禁用；直接提交 Server Action 也返回 "This group is locked because settlement has already started."。
- [ ] 删 group 弹 confirm dialog → 确认 → 跳 `/dashboard`，列表少一条。

### 7.2 跨账号 RLS
- [ ] 账号 B 登录后 `/dashboard` **看不到** A 创建的 group。
- [ ] 账号 B 直接访问 `/groups/{A 的 group id}` → 404 not-found（不是 403，避免泄露存在）。
- [ ] `supabase/tests/phase-4-rls.sql` 执行通过，最后行打印 `phase-4 rls smoke passed`。
- [ ] 账号 B 是 Pending invitee 时仍**看不到** group；执行 `accept_invitation` 后**能 SELECT 但不能 UPDATE**。

### 7.3 安全 / 数据完整性
- [ ] `grep -rn "from(['\\"]app_users['\\"])\\.select" apps/web/` 没有未授权读 `email` / `default_payment_*` 字段（用户搜索只走 RPC）。
- [ ] `search_user_by_username` 返回 JSON 仅 3 字段 `id/name/username`（在 Studio SQL Editor 用 anon key 调失败 / 用 authenticated key 调 OK）。
- [ ] 删除参与者后 DB 仍可查到对应 group / 其他 participants（无意外 CASCADE）。
- [ ] D7 FK violation 友好提示：先在 group 里建 bill（暂时手动 INSERT），再删 participant → UI 出现 "Cannot remove..." 提示。**Phase 5 后可自动化**，本期手动验证。

### 7.4 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过（**根 `package.json` 没有 typecheck 脚本，必须带 `--filter`**；与 Phase 1/3 验收一致）。
- [ ] `grep -rn "auth.getSession()" apps/web/ --include='*.ts' --include='*.tsx'` 仍 0 命中（源码层；`.next/cache` 编译产物里有不算）。
- [ ] **`createAdminClient` 调用点为 0**：定义本身在 `apps/web/lib/supabase/admin.ts` 是允许的；用以下命令断言**调用点**为 0，**不要**直接 grep 函数名：
      ```bash
      grep -rn "createAdminClient(" apps/web/ --include='*.ts' --include='*.tsx' \
        | grep -v 'apps/web/lib/supabase/admin.ts'
      # 期望输出为空
      ```
- [ ] 所有 Server Action 文件含 `"use server"`。
- [ ] `notFound()` 用于 RLS-driven 404（不是 `throw new Error("not found")`）。

### 7.5 PRD 对齐
- [ ] api-inventory.md 中 B1-B6 / D1-D4 / A5 共 **11 条**接口的功能在新版可复现。
- [ ] DEFINER 函数审计仍通过：Phase 2 既有 DEFINER 清单不回退；Phase 4 fixture 覆盖 `search_user_by_username` 的 auth guard、返回列白名单和 `search_path`。

---

## 8. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P4-R1 | `search_user_by_username` 模糊查询 / 列泄漏导致用户信息 enumeration | 🔴 高 | RPC 强制**精确**匹配（lower(username)）+ LIMIT 1 + RETURNS TABLE 列白名单；F12 fixture 验证 |
| P4-R2 | RLS-driven 404 vs 403 信息泄漏 | 🟡 中 | D9：getGroup 返回 null → `notFound()`；不区分"不存在"与"无权限" |
| P4-R3 | Server Action 错误信息泄露原始 Postgres / Supabase message | 🟡 中 | D10：Action 层翻译；catch raw error 后映射；尤其 23503 / 23505 |
| P4-R4 | revalidatePath 路径写错导致 stale 列表 | 🟢 低 | 每个 mutation Action 同时 revalidate 详情页 + dashboard |
| P4-R5 | participant invitation_status 推导错（self vs other） | 🟡 中 | F4 单元逻辑：与 `auth.uid()` 比对；F12 fixture 含 self-accept 用例 |
| P4-R6 | Phase 8 旧前端 `packages/api-client` 类型与新 Service 类型不一致 | 🟢 低 | 本期不动旧 client；Phase 8 才统一类型 |
| P4-R7 | username 大小写敏感不一致（DB UNIQUE 区分大小写，搜索不区分） | 🟡 中 | 0006 RPC 用 `lower()` 比对；考虑 schema 层加 `CITEXT` 或 functional index（**Phase 5 前再决策**） |
| P4-R8 | Server Component 列表查询 N+1（每个 group 还要查 participant 数等） | 🟢 低 | Phase 4 列表只显示 name + status；不联表查 count；Phase 8 视觉迭代再优化 |
| P4-R9 | Form CSRF：Next.js Server Actions 默认有签名 token，但 dev 偶尔 stale | 🟢 低 | 重启 dev server |
| P4-R10 | 0006 push 后忘了重新 `gen types`，typecheck 红 | 🟢 低 | Step 0:00-0:30 强制连跑两步 |

---

## 9. 完成后立即触发

1. 标 Phase 4 → completed，Phase 5 → in_progress。
2. commit: `feat(groups): groups + participants CRUD with cross-account RLS (phase 4)`。
3. 进入 **Phase 5 plan 生成**：BillCalculator 移植（含 Money 库 + C# fixture 对照测试）+ Bills CRUD + `create_bill_with_items` RPC 接 UI。

---

**文档结束**
