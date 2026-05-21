# Phase 5 Implementation Plan

> **文档版本**：v1.5
> **目标**：把 `BillCalculator.cs`（247 行，15 处舍入点）**1:1** 移植到 TypeScript；用 ≥ 10 个 fixture 证明新版输出与 C# 实现**完全相等**（金额到分、weight 到小数 4 位）；建完整的 Bills CRUD UI（C1-C5 五个接口）。
> **依据**：`docs/migration-prd.md` v2.3 §3.5 + §4.5 + ADR-005；`docs/api-inventory.md` C1-C5；`docs/user-journeys.md` J1 / J5 / J6。
> **预算**：**3.5 工作日（28 小时）**——本期最长的 phase，舍入对齐是高风险点。
> **状态**：待执行。
> **前置 Phase**：Phase 4 completed（Groups + Participants CRUD 闭环；`Money` 库已在 Phase 2 落地）。
> **v1.5 修订（codex review #5）**：**P1 F15 trigger function 权限链断裂**——v1.4 把 helper `assert_bill_writable` 设为 `SECURITY DEFINER` + `REVOKE EXECUTE FROM PUBLIC`（仅内部调用），但 4 个 trigger function 是默认 `LANGUAGE plpgsql`（即 SECURITY INVOKER）。authenticated 用户写入触发 trigger 时，trigger 以**调用者权限**执行，调 helper 时因为 authenticated 没 EXECUTE 权限 → permission denied → **合法写入全部被拒**。修复：4 个 trigger function 全部升级为 `SECURITY DEFINER SET search_path = public, pg_temp`；helper REVOKE 不变（保留"仅 trigger 调用"语义）。同步 §10.2.5 加 trigger function 权限链审计。
> **v1.4 修订（codex review #4）**：①**P1 `bills.primary_payer_participant_id` 直写仍能跨组**：v1.3 F15 trigger 只覆盖 3 张子表，但 `authenticated` creator 直接 `.from("bills").insert/update({ group_id: GY, primary_payer_participant_id: PX_in_GX, ... })` 不被拦——FK 只保证 participant 存在不保证同组。F15 增加第 4 个 trigger：`bills` BEFORE INSERT/UPDATE 校验 primary_payer 同组；②**P2 direct-write cross-bill-item 测试无法物理表达**：trigger 看到的是 `(bill_item_id, participant_id)` 单行，没有"本次 payload"概念；cross-bill-item 是 payload-level 约束，**只能由 F6 RPC 校验**。F13 ④ direct-write 段去除 cross-bill-item 子项，只保留"cross-group participant via Data API"和"settling-group via Data API"两类；cross-bill-item 测试归并到 §10.2.5 RPC 段；③**P3 测试角色分层**：v1.3 含糊地写"用 service client 模拟"，实际 `service_role` 绕 RLS——测不了 RLS policy，只能测 trigger。F13 测试明确分两路：用 **authenticated JWT**（`SET LOCAL ROLE authenticated` + `request.jwt.claim.sub`）测 RLS 拦截；用 **postgres / service_role**（绕 RLS）测 trigger 兜底。
> **v1.3 修订（codex review #3，重大架构补强）**：①**RPC 入口校验非完整安全边界**：`authenticated` 仍直接持有子表 INSERT/UPDATE/DELETE GRANT，可 `.from("bill_item_responsibilities").insert(...)` 绕过 F6 的所有 cross-group/cross-bill-item 校验。**新增 F15 migration `0008_bill_integrity_db_defense.sql`**：用 DB 层 BEFORE INSERT/UPDATE trigger 兜底，强制 `bill_item_responsibilities` / `bill_shares` / `payment_contributions` 三张表的 participant 与 bill 同组；②**group status 锁同样可绕过**：现有 RLS write policy 不带 `status = 0` 条件，creator 可直接 INSERT bill 到 settling/settled group。**0008 同时修订 6 张 bill 子表 RLS policy**：在 USING + WITH CHECK 中加 `groups.status = 0` 条件；同步在 trigger 内 fail-fast；③**F13 测试扩展**：增加 3 类 direct-write 攻击反例（cross-group via Data API / cross-bill-item via Data API / settling-group write via Data API）+ 1 类 RPC-level status lock 反例；④**Day 2 时间表同步**：把 F13 测试清单和 F15 trigger migration 落到具体时段。
> **v1.2 修订（codex review #2）**：①**F6 补 cross-bill-item 校验**：`responsibilities[].bill_item_id` 必须属于本次 payload 的 `items[].id` 集合，防止把 GroupY 的 participant 挂到 GroupX 的旧 item；F13 增加跨 bill_item 污染反例；②**D5 残留**：v1.1 已删 §10.1 coverage 硬门槛，但 D5 残留 "≥ 80% line coverage" 字样，本版彻底替换为"关键路径 fixture 覆盖 + 100% C# parity"；③**fixture 数量口径对齐**：§5.1 补 1 条 happy fixture（凑到 10）+ 1 条"item.responsibleParticipantIds 为空集合"反例（凑到 4，匹配 §10.1）；④**update 路径 SQL 变量名**：F6 骨架 `p_group_id` 在 update RPC 中不存在，统一改用 `v_target_group_id`，create 路径赋 `p_group_id`、update 路径从 `bills` 行 SELECT。
> **v1.1 修订（codex review #1）**：①**P1 同组一致性**：Phase 2 RPC 不校验所有 participant_id 属于 `p_group_id`——补强制 F6 cross-group integrity migration + F13 跨组污染测试；②**P2 读模型 totals**：bills 表不存 `subtotal/total_fee/grand_total`，C# 读 path 是聚合 `bill_items.amount` + `bill_shares.total_share_amount` 派生，新增 §7.0 "Read-side aggregation" 写明规则；③**P2 coverage**：删 "line coverage ≥ 80%" 硬验收（`@vitest/coverage-v8` 未安装且非核心目标），改为"全部 fixture 通过 + 反例覆盖"软目标；④**P3 fixture #6**：fee.Value < 0 被 C# 显式拒绝（[BillCalculator.cs:74](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L74)），改为纯反例 fixture；⑤PRE-4 加 C# fixture dump 前停 backend dev server 的注意事项。

---

## 1. 交付物

| 层 | # | 路径 | 行数估 | 用途 |
|---|---|---|---|---|
| **核心算法** | F1 | `apps/web/lib/calculations/types.ts` | ~70 | 移植 `CalculationModels.cs` 全部 record 类型；金额字段统一字符串接口 |
| | F2 | `apps/web/lib/calculations/bill-calculator.ts` | ~280 | **1:1** 移植 `BillCalculator.cs`；逐函数对应；15 处舍入点逐一标注 C# 行号注释 |
| | F3 | `apps/web/lib/calculations/__tests__/bill-calculator.test.ts` | ~250 | 10+ fixture 单元测试；每条标注预期输出来源（C# 测试 / 手算 / runtime 对照） |
| | F4 | `apps/web/lib/calculations/__tests__/fixtures.ts` | ~200 | fixture 数据集中管理；input + expected output |
| **服务层** | F5 | `apps/web/lib/services/bills.ts` | ~250 | 移植 `BillsService.cs` 关键路径：validation + RPC payload 装配（**写入**不重算）；**读取**走聚合（见 §7.0） |
| | F6 | `supabase/migrations/0007_bill_cross_group_integrity.sql` | **必交付** | 在 `create_bill_with_items` / `update_bill_with_items` RPC 内强制校验：①`primary_payer_participant_id` 属于 target group；②每个 `share.participant_id` / `contribution.participant_id` / `responsibilities[].participant_id` 都属于 target group；③**每个 `responsibilities[].bill_item_id` 都属于本次 payload `items[].id` 集合**（防跨 bill 污染：用 GroupX 的旧 item id 关联 GroupY 的 participant）。校验失败 `RAISE EXCEPTION` |
| **UI 路由** | F7 | `apps/web/app/(app)/groups/[groupId]/page.tsx` | 修订 | 在 group 详情页加 "Bills" 区块（列表 + "New bill" CTA） |
| | F8 | `apps/web/app/(app)/groups/[groupId]/bills/new/page.tsx` | ~120 | 创建账单页（Server Component 加载 participants → 传给 client form） |
| | F9 | `apps/web/app/(app)/groups/[groupId]/bills/new/bill-form.tsx` | ~250 | client：items + fees + participants + extra contributions 复合表单 |
| | F10 | `apps/web/app/(app)/groups/[groupId]/bills/[billId]/page.tsx` | ~80 | 账单详情（只读） |
| | F11 | `apps/web/app/(app)/groups/[groupId]/bills/[billId]/edit/page.tsx` | ~30 | 编辑入口（复用 F9 form 组件） |
| | F12 | `apps/web/app/(app)/groups/[groupId]/bills/actions.ts` | ~180 | Server Actions：`createBillAction` / `updateBillAction` / `deleteBillAction` |
| **测试** | F13 | `supabase/tests/phase-5-fk.sql` | ~350 | ①FK 测试：建组 + 建 bill 引用 participant → 删 participant 报 23503；②**RPC 层 cross-group participant 污染**（4 类）：调 `create_bill_with_items(GroupY, ...)` payload 中 `primary_payer_participant_id` / `share.participant_id` / `contribution.participant_id` / `responsibilities[].participant_id` 任一指向 GroupX 的 participant，都被 F6 拒绝；③**RPC 层 cross-bill-item 污染**（payload-only 概念，无法在 direct-write 表达）：调 `create_bill_with_items(GroupY, { items: [itemY], responsibilities: [{ bill_item_id: GroupX_的_BIX, ... }] })` 被 F6 校验 3 拒绝；④**Direct-write via authenticated JWT**（测 RLS policy）：`SET LOCAL ROLE authenticated` + `request.jwt.claim.sub = creator_uid` 直接 `INSERT/UPDATE bills 子表`，用两类 payload：(a) 任一 participant 跨组、(b) target group `status = 1 (settling)`——都应被 RLS policy 或 trigger 拒；⑤**Direct-write via postgres role（service_role 等价）**（测 trigger 兜底）：`RESET ROLE` + `INSERT INTO bill_item_responsibilities/bill_shares/payment_contributions/bills` 直接绕 RLS，用 cross-group participant 或 settling group 反例，都应被 F15 trigger 拒（验证"绕 RLS 也防得住"）；⑥**RPC 层 status lock**：把 GroupX 改 `settling` 后调 `create_bill_with_items` / `update_bill_with_items` 都被拒；以 authenticated JWT delete bill 在 settling 时被 RLS 拒（0 rows affected） |
| **DB 防御层** | F15 | `supabase/migrations/0008_bill_integrity_db_defense.sql` | **必交付**（v1.3 / v1.4） | ①**四个** BEFORE INSERT/UPDATE trigger（v1.4 补 `bills` 第 4 个）：`bills` 校验 `primary_payer_participant_id` 同组 `NEW.group_id`；`bill_shares` / `payment_contributions` / `bill_item_responsibilities` 校验 participant 与 bill 同组；②同 trigger 内 fail-fast `groups.status = 0`；③修订 6 张 bill 子表 RLS write policy（`bills` / `bill_items` / `bill_item_responsibilities` / `bill_fees` / `bill_shares` / `payment_contributions`）：USING + WITH CHECK 加 `groups.status = 0` 条件 |
| **文档** | F14 | `docs/phase-5-review-checklist.md` | ~30 | PR review checklist |

**不交付**：
- ❌ Settlements 计算 / mark-paid / mark-received（Phase 6）。
- ❌ 公开分享（Phase 7）。
- ❌ Bill list 高级筛选 / 搜索（旧 C# `BillsService.ListAsync` 有 fromDate/toDate/search 参数，Phase 5 只接最简列表；过滤留 Phase 8）。
- ❌ 复杂 Bill UI 动效（必要的可用性即可）。

---

## 2. 前置条件

| ID | 任务 | 阻塞哪一步 |
|---|---|---|
| PRE-1 | Phase 4 completed；浏览器能新建 group + 加 participants | F7-F11 UI |
| PRE-2 | `Money.ts` + `Money.test.ts` 已在 Phase 2 落地并测试通过 | F2-F4 |
| PRE-3 | `vitest` 已装好（Phase 2 plan §14 列过 `pnpm add -D vitest`） | F3 测试运行 |
| PRE-4 | C# 旧后端**仍可运行**（用于 fixture 对照验证）。**注意**：跑 `dotnet test` dump fixture 前**先停 `Splity.Api` dev server**（否则 DLL 被锁），或用 `dotnet test --no-build` / 独立 output 目录 | F3 fixture 校对 |
| PRE-5 | Phase 2 `create_bill_with_items` / `update_bill_with_items` RPC 已 push 到云端 | F5 调用 |

---

## 3. 关键决策

| ID | 决策 | 选择 | 理由 |
|---|---|---|---|
| D1 | TS 内部数值类型 | **`Decimal.js`** 直接用；Money 包装仅在 DTO 边界 | BillCalculator 内部连续运算 15 次舍入，反复 `new Money(d.toFixed(2))` 会失真。`Decimal.js` 支持 `toDecimalPlaces(2, ROUND_HALF_UP)` 一行复刻 C# `Math.Round(x, 2, AwayFromZero)` |
| D2 | DTO 金额传输 | **字符串**（C# 端 → JSON `"35.34"`；TS 端 → JSON `"35.34"`） | 避免 JS number 浮点丢精度（ADR-005） |
| D3 | Fixture 数据来源 | **混合**：①C# 测试翻译（2 条已知）②手动构造 + 用 C# runtime 实测验证（≥ 8 条覆盖 15 处舍入边界） | C# 测试覆盖不够；手算容易错；以**正在跑的 C# 端**为黄金真值 |
| D4 | Fixture 格式 | TS 文件（`fixtures.ts`）+ `it.each(...)` 参数化 | 类型安全；不需要 JSON 解析；diff 友好 |
| D5 | 测试覆盖目标 | **关键路径 fixture 覆盖**（主入口 + AllocateByWeight + BuildAppliedFees + BuildContributions 每分支 ≥ 1 个 fixture 通过）+ **100% pass rate vs C# 输出**（金额 2 位、weight 4 位字符串相等）；**不**做 line coverage 工具门槛（`@vitest/coverage-v8` 未装） | 与 C# 对齐是唯一硬指标；line coverage 是间接指标，人工 review §5.1 fixture 矩阵 → 关键路径直接保证更可靠 |
| D6 | RPC 复用 vs 重建 | **复用 Phase 2 `create_bill_with_items` / `update_bill_with_items`**；如有字段不匹配，新加 migration 调整（**不删旧 RPC**） | 减少 schema 漂移；保留 Phase 2 测试覆盖 |
| D7 | RPC 输入 payload 装配位置 | **Node TS service**（`bills.ts`）；BillCalculator 输出 + UUID 分配 + responsibility flatten 全在 Node 完成 | RPC 保持 SQL-only 写入；不在 plpgsql 重写 BillCalculator |
| D8 | 编辑场景的子表替换策略 | 调 `update_bill_with_items` RPC（Phase 2 实现是 delete + reinsert pattern）；前端不需感知 | 旧 BillsService.UpdateAsync 行为等价 |
| D9 | Status 锁（bill 仅在 group `Unresolved` 时可改） | **四层防御**（v1.3 升级）：①UI 在 `settling/settled` 隐藏 "New bill" / "Edit" / "Delete" ②Server Action / service `requireEditableGroup` ③**RLS write policy 含 `groups.status = 0` 条件**（F15）④**子表 trigger fail-fast** 校验 `groups.status = 0`（F15）。前两层是 UX / 调试友好，后两层是数据完整性 hard gate；缺一不可——参考 v1.3 changelog ② | 旧 [BillsService.cs:601](../apps/backend/src/Splity.Application/Services/BillsService.cs#L601) 是服务层校验；新架构因为 Supabase 暴露 Data API 直写，必须把锁下沉到 RLS + trigger |
| D14 | RPC 入口校验 vs DB 层防御 | **同时存在**（v1.3 决策）：F6 (RPC 内) 用于"调试友好的早失败 + payload-level cross-bill-item"；F15 (trigger + RLS) 用于"完整性最后防线，拦 Data API 直写绕过"。**不**通过 REVOKE 子表 INSERT/UPDATE/DELETE GRANT 来收口（会破坏 INVOKER RPC 语义） | RPC 唯入口 + REVOKE 模式需要 SECURITY DEFINER + 函数内手写 auth.uid()，违反 ADR-002 INVOKER 路线且改动面大；trigger 路径侵入小、不动 GRANT、不动 RPC 安全模式 |
| D10 | Bills 列表分页 | **不做**（Phase 5）；按 transaction_date_utc DESC 一次取最多 100 条 | Splity 是私人小群组应用，单 group 账单数小；分页 Phase 8 视觉迁移再做 |
| D11 | UI form 状态管理 | **client component 内部 `useState`**（不引入 react-hook-form / formik） | items 数量动态变化但每个 item 字段简单；自管 state 比引依赖快 |
| D12 | Currency code | 表单默认 `MYR`（Phase 0 schema-truth 备注），不暴露 currency picker | 旧 app 实际只用 MYR；保留字段但 UI 简化；Phase 8 才考虑多币种 |
| D13 | 输入校验位置 | TS 端在 `BillCalculator` 入口抛 `BillValidationError`（对齐 C# `DomainValidationException`）；Server Action 翻译为 form 错误 | 与 C# 行为对等 |

---

## 4. C# → TS 移植对照表（BillCalculator.cs 逐节）

| C# 函数 / 段 | C# 行 | TS 对应 | 注意 |
|---|---|---|---|
| `BillCalculator.CalculateBillShares(input)` | 8-78 | `function calculateBillShares(input: BillCalculationInput): BillComputationResult` | 主入口；保持同名 |
| Input validation（参与者非空、items 非空、payer 在参与者中、责任人去重 / 非空、weight > 0、contribution 合法） | 10-78 | TS 等价；每条对应 `throw new BillValidationError(...)` | 错误信息**完全照搬 C# 字符串** |
| `subtotal = RoundToCurrency(items.Sum(amount))` | 80 | 同名；TS 用 `Decimal` `.plus()` 累加后 `.toDecimalPlaces(2, ROUND_HALF_UP)` | 舍入点 #1 |
| `appliedFees = BuildAppliedFees(input.Fees, subtotal)` | 81 | 同名 helper；FeeType.Percentage / Fixed 两路 | 舍入点 #6 #7 |
| `totalFee = RoundToCurrency(appliedFees.Sum(...))` | 82 | 同 | 舍入点 #2 |
| `grandTotal = RoundToCurrency(subtotal + totalFee)` | 83 | 同 | 舍入点 #3 |
| `BuildShares(input, subtotal, totalFee)` 内部 pre-fee 分配循环 | 90-130 | 同名；含 `AllocateByWeight` 调用 | 舍入点 #4 #5 |
| `BuildShares` 最终 `RoundToCurrency(preFeeAmount + feeAmount)` | 127 | 同 | 舍入点 #5（同 127 行） |
| `BuildAppliedFees` | 140-160 | 同 | 舍入点 #6 #7 |
| `BuildContributions` extra 累加 | 170-180 | 同 | 舍入点 #8 |
| `extraTotal = RoundToCurrency(contributionMap.Sum)` | 183 | 同 | 舍入点 #9 |
| `remaining = RoundToCurrency(grandTotal - extraTotal)` | 189 | 同 | 舍入点 #10 |
| `contributionMap[primaryPayer] = RoundToCurrency(...)` | 191 | 同 | 舍入点 #11 |
| `contributionTotal = RoundToCurrency(...)` | 193 | 同 | 舍入点 #12 |
| `AllocateByWeight(totalAmount, splits)` | 200-235 | 同名；最关键的"cent 分配 + 误差修正"算法 | 舍入点 #13 #14 |
| `ToCents(amount)` | 238-241 | 同 | 舍入点 #14 |
| `RoundToCurrency(amount)` | 243-246 | 同 | 舍入点 #15（helper） |

**绝对禁止**：合并相邻 `RoundToCurrency` 调用、跳过中间舍入"延迟到末尾"。

---

## 5. Fixture 设计（Phase 5 最关键产物）

### 5.1 必须覆盖的边界（10 条以上）

| # | 场景 | 关键检验 | 来源 |
|---|---|---|---|
| 1 | Equal split + 6% percentage fee（100 分到 3 人，无法整除） | 舍入产生 .34/.33/.33 分配；总和回到 grandTotal | C# `EqualSplitWithSst` 测试直接翻译 |
| 2 | Weighted 2:1 + 9 元 fixed fee + B 预付 20 | 加权 + 额外贡献 | C# `WeightedSplitAndFixedFee` 测试 |
| 3 | 100/7 多人均分（不能整除） | AllocateByWeight cent 分配修正 | 手算 + C# 实测 |
| 4 | 责任人子集（item 只对 2/4 人）+ 加权 | item-level responsibility 不等于参与者全集 | 手算 + C# 实测 |
| 5 | 两个 percentage fee（SST 6% + Service 10%）+ 一个 fixed | 多 fee 累加 + applied amount 独立舍入 | 手算 + C# 实测 |
| 6 | **反例**：fee.value < 0（负 fee） | 必须抛 `BillValidationError`，消息含 `"Fee value must be zero or greater."`（对齐 [BillCalculator.cs:74](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L74)） | C# 已验证拒绝 |
| 7 | 单一参与者 single-pay | 边界：share = grandTotal | 手算 |
| 8 | 大额 + 高 weight 比例（1:99） | weight 4 位精度边界 | 手算 + C# 实测 |
| 9 | 多 contributors（A pays 30, B pays 20, primary C pays remainder） | contribution 合法性校验 | 手算 + C# 实测 |
| 10 | Contribution 总和恰好 = grandTotal（primary 不再付） | primary contribution = 0 边界 | 手算 + C# 实测 |
| 11 | **反例**：Contribution 超过 grandTotal | 应抛 `BillValidationError`（确认 C# 行为） | C# 实测 |
| 12 | **反例**：weight = 0 或负数 | 应抛 `BillValidationError` | C# 实测 |
| 13 | 多 items + 不同 responsibility 子集（item A: 2 人，item B: 全员） | item-level responsibility 聚合到 share 的累加路径 | 手算 + C# 实测 |
| 14 | **反例**：item.responsibleParticipantIds 为空集合 | 应抛 `BillValidationError` 含 `"At least one"` 或等价 C# 消息（对齐 [BillCalculator.cs:44-46](../apps/backend/src/Splity.Application/Calculations/BillCalculator.cs#L44)） | C# 实测 |

**统计**：happy = 10（#1-5, #7-10, #13）；反例 = 4（#6, #11, #12, #14）；与 §10.1 验收口径精确对齐。

### 5.2 Fixture 数据形态

```ts
// fixtures.ts
import type { BillCalculationInput, BillComputationResult } from "../types";

export type Fixture = {
  id: string;
  label: string;
  source: "csharp-test" | "csharp-runtime" | "handcrafted";
  input: BillCalculationInput;
  expected: BillComputationResult;
};

export const FIXTURES: Fixture[] = [
  {
    id: "F01-equal-split-sst",
    label: "Equal split with 6% SST",
    source: "csharp-test",
    input: { /* ... */ },
    expected: {
      subtotalAmount: "100",
      totalFeeAmount: "6",
      grandTotalAmount: "106",
      shares: [
        { participantId: "...001", weight: "1.0000", preFeeAmount: "33.34",
          feeAmount: "2.00", totalShareAmount: "35.34" },
        // ...
      ],
      contributions: [
        { participantId: "...001", amount: "106" }
      ],
      appliedFees: [{ name: "SST", feeType: 1, value: "6", appliedAmount: "6" }],
    },
  },
  // ... ≥ 10 more
];
```

### 5.3 Fixture 校验流程

```ts
// bill-calculator.test.ts
import { describe, it, expect } from "vitest";
import { calculateBillShares } from "../bill-calculator";
import { FIXTURES } from "./fixtures";

describe("BillCalculator parity with C#", () => {
  it.each(FIXTURES)("$id: $label", ({ input, expected }) => {
    const actual = calculateBillShares(input);
    // 字符串精确比对（避免 number 误差）
    expect(actual.subtotalAmount).toBe(expected.subtotalAmount);
    expect(actual.totalFeeAmount).toBe(expected.totalFeeAmount);
    expect(actual.grandTotalAmount).toBe(expected.grandTotalAmount);

    // shares 按 participantId 排序后逐字段比
    const actualShares  = sortById(actual.shares);
    const expectedShares = sortById(expected.shares);
    expect(actualShares).toEqual(expectedShares);

    const actualContribs  = sortById(actual.contributions);
    const expectedContribs = sortById(expected.contributions);
    expect(actualContribs).toEqual(expectedContribs);
  });

  // 单独的反例：抛错路径
  it.each([
    { fixture: F11_overpaid_contribution, errorContains: "contribution" },
    { fixture: F12_zero_weight,           errorContains: "weight" },
  ])("$fixture.id rejects with $errorContains", ({ fixture, errorContains }) => {
    expect(() => calculateBillShares(fixture.input)).toThrow(errorContains);
  });
});
```

### 5.4 怎么从 C# 拿 expected 输出（D3 黄金真值）

**用旧 .NET 后端跑出来**，不靠手算：

```bash
# 一次性临时脚本，跑在旧后端目录
cd apps/backend/tests/Splity.UnitTests
# 添加自己的 [Fact] 用 fixture input，把 result 打印为 JSON
dotnet test --filter "FullyQualifiedName~BillCalculatorTests"
# 拷贝输出 JSON 到 TS fixtures
```

> 如果用 `Console.WriteLine(JsonSerializer.Serialize(result, ...))` 加到测试里，最快。Phase 5 Day 1 末就该出至少 5 条对照。

---

## 6. RPC payload 装配（D7）

`create_bill_with_items` Phase 2 已建。Node 端流程：

```ts
// lib/services/bills.ts
export async function createBill(input: CreateBillInput) {
  await requireEditableGroup(input.groupId);

  // 1. 拉取 group's participants（用于 weight 默认 / 责任人校验）
  const participants = await listParticipants(input.groupId);

  // 2. 装配 BillCalculator 入参
  const calcInput: BillCalculationInput = buildCalcInput(input, participants);

  // 3. 算
  const result = calculateBillShares(calcInput);  // throws BillValidationError

  // 4. 给 items 分配 UUID（responsibility 需要引用）
  const itemsWithIds = input.items.map(item => ({ ...item, id: crypto.randomUUID() }));

  // 5. 装配 RPC payload（注意 responsibilities 需要从 item 内 flatten）
  const payload = {
    store_name: input.storeName,
    reference_image_data_url: input.referenceImageDataUrl,
    transaction_date_utc: input.transactionDateUtc,
    currency_code: input.currencyCode ?? "MYR",
    split_mode: input.splitMode,
    primary_payer_participant_id: input.primaryPayerParticipantId,
    items: itemsWithIds.map(it => ({ id: it.id, description: it.description, amount: it.amount })),
    fees: input.fees,
    shares: result.shares.map(s => ({
      participant_id: s.participantId,
      weight: s.weight,
      pre_fee_amount: s.preFeeAmount,
      fee_amount: s.feeAmount,
      total_share_amount: s.totalShareAmount,
    })),
    payment_contributions: result.contributions.map(c => ({
      participant_id: c.participantId,
      amount: c.amount,
    })),
    responsibilities: itemsWithIds.flatMap(it =>
      it.responsibleParticipantIds.map(pid => ({
        bill_item_id: it.id,
        participant_id: pid,
      }))
    ),
  };

  // 6. 调 RPC
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_bill_with_items", {
    p_group_id: input.groupId,
    p_input: payload,
  });
  if (error) throw error;
  return data as string;  // bill id
}
```

**Day 2 第一步**：跑一遍最简 fixture（1 个 item / 2 个参与者 / 无 fee），从 Studio 看 `bills` + `bill_items` + `bill_shares` + `bill_item_responsibilities` 是否都写对。

**Day 2 第二步（F6 必做）**：写 `0007_bill_cross_group_integrity.sql` 给两个 RPC 增补**三类**校验。

**变量约定**（关键，避免 v1.1 骨架错引 `p_group_id` 的坑）：
- `create_bill_with_items(p_group_id UUID, p_input JSONB)` 中 `v_target_group_id := p_group_id`
- `update_bill_with_items(p_bill_id UUID, p_input JSONB)` 中 `v_target_group_id := (SELECT group_id FROM public.bills WHERE id = p_bill_id)`；如果 SELECT 返回 NULL → bill 不存在，抛 `RAISE EXCEPTION 'bill not found'`

骨架（两个 RPC 各自在函数体首段插入）：

```sql
DECLARE
  v_target_group_id UUID;
BEGIN
  -- ============ CREATE 路径 ============
  v_target_group_id := p_group_id;
  -- ============ UPDATE 路径 ============
  -- SELECT b.group_id INTO v_target_group_id FROM public.bills b WHERE b.id = p_bill_id;
  -- IF v_target_group_id IS NULL THEN
  --   RAISE EXCEPTION 'bill % not found', p_bill_id USING ERRCODE = '02000';
  -- END IF;

  -- ----- 校验 1：primary payer 必须属于 target group -----
  IF NOT EXISTS (
    SELECT 1 FROM public.participants p
    WHERE p.id = (p_input->>'primary_payer_participant_id')::UUID
      AND p.group_id = v_target_group_id
  ) THEN
    RAISE EXCEPTION 'primary_payer_participant_id % not in group %',
      p_input->>'primary_payer_participant_id', v_target_group_id
      USING ERRCODE = '23514';
  END IF;

  -- ----- 校验 2：所有 participant_id 必须属于 target group -----
  IF EXISTS (
    WITH foreign_pids AS (
      SELECT (x->>'participant_id')::UUID AS pid
        FROM jsonb_array_elements(p_input->'shares') x
      UNION
      SELECT (x->>'participant_id')::UUID
        FROM jsonb_array_elements(p_input->'payment_contributions') x
      UNION
      SELECT (x->>'participant_id')::UUID
        FROM jsonb_array_elements(p_input->'responsibilities') x
    )
    SELECT 1 FROM foreign_pids fp
    WHERE NOT EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.id = fp.pid AND p.group_id = v_target_group_id
    )
  ) THEN
    RAISE EXCEPTION 'one or more participant_ids do not belong to group %', v_target_group_id
      USING ERRCODE = '23514';
  END IF;

  -- ----- 校验 3（v1.2 新增）：responsibilities[].bill_item_id 必须 ∈ 本次 payload items[].id -----
  -- 防止把 GroupX 已有 bill 的 item id 挂到 GroupY 的新 bill 上.
  IF EXISTS (
    WITH payload_item_ids AS (
      SELECT (x->>'id')::UUID AS bid
        FROM jsonb_array_elements(p_input->'items') x
    ),
    responsibility_item_ids AS (
      SELECT (x->>'bill_item_id')::UUID AS bid
        FROM jsonb_array_elements(p_input->'responsibilities') x
    )
    SELECT 1 FROM responsibility_item_ids rid
    WHERE NOT EXISTS (SELECT 1 FROM payload_item_ids pid WHERE pid.bid = rid.bid)
  ) THEN
    RAISE EXCEPTION 'responsibility bill_item_id must reference an item declared in this payload'
      USING ERRCODE = '23514';
  END IF;
  -- ↑ 这也隐式防止 bill_item_id 属于另一个 bill —— 因为本次 payload items 全是新生成的 UUID
  -- (create 路径) 或 update 路径下 update_bill_with_items 是 delete + reinsert，
  -- responsibilities 永远只能引用本次新建的 items.

  -- ============ 之后是已有的 INSERT bills / items / fees / ... 逻辑 ============
END;
```

**为什么需要 RPC 内校验**（与 F15 trigger 互补，**不是替代**）：
- RPC 内能表达 **payload-level** 约束（cross-bill-item：responsibilities.bill_item_id 必须在本次 payload items 内）——trigger 看不到 payload 整体。
- 调试友好的早失败：RPC 在写入前一次校验，errcode + 信息明确。
- 但 RPC **不是完整安全边界**——`authenticated` 仍持有子表直写 GRANT，调用方可 `.from("bill_item_responsibilities").insert(...)` 绕过 RPC。**F15 trigger 是兜底**（v1.3 新增）。

---

## 6.5 F15 DB 层防御（trigger + RLS status lock，v1.3 新增）

**Day 2 第三步（F15 必做）**：写 `0008_bill_integrity_db_defense.sql`，**必须在 F6 之后 push**（同一个 dev 周期内顺序应用）。

### 6.5.1 BEFORE INSERT/UPDATE trigger（**4 张表**，v1.4：bills 加入）

```sql
-- 通用 helper：用 (participant_id, expected_group_id) 校验同组 + group unresolved
CREATE OR REPLACE FUNCTION public.assert_bill_writable(
  p_participant_id UUID,
  p_bill_group_id  UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_participant_group UUID;
  v_status SMALLINT;
BEGIN
  SELECT p.group_id INTO v_participant_group
    FROM public.participants p WHERE p.id = p_participant_id;
  IF v_participant_group IS NULL THEN
    RAISE EXCEPTION 'participant % does not exist', p_participant_id USING ERRCODE = '23503';
  END IF;
  IF v_participant_group <> p_bill_group_id THEN
    RAISE EXCEPTION 'participant % belongs to group % but bill belongs to %',
      p_participant_id, v_participant_group, p_bill_group_id USING ERRCODE = '23514';
  END IF;

  SELECT g.status INTO v_status FROM public.groups g WHERE g.id = p_bill_group_id;
  IF v_status <> 0 THEN
    RAISE EXCEPTION 'group % is not unresolved (status=%); bill subtables are locked',
      p_bill_group_id, v_status USING ERRCODE = '23514';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assert_bill_writable(UUID, UUID) FROM PUBLIC;
-- 仅 trigger 内部调用，不 grant 给 authenticated.
-- ⚠️ v1.5：因为 helper 被 REVOKE FROM PUBLIC 后没 grant 给 authenticated，
-- 下面 4 个 trigger function **必须**都是 SECURITY DEFINER，
-- 否则 authenticated 调用者触发 trigger → trigger 默认 INVOKER →
-- 内部 PERFORM assert_bill_writable(...) 因为 authenticated 无 EXECUTE
-- 权限会 permission denied，**合法 bill 写入也会被拒**.

-- bill_shares trigger（直接持有 bill_id）
CREATE OR REPLACE FUNCTION public.trg_bill_shares_integrity() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER                          -- v1.5
SET search_path = public, pg_temp         -- v1.5
AS $$
DECLARE v_gid UUID;
BEGIN
  SELECT group_id INTO v_gid FROM public.bills WHERE id = NEW.bill_id;
  PERFORM public.assert_bill_writable(NEW.participant_id, v_gid);
  RETURN NEW;
END;
$$;
CREATE TRIGGER bill_shares_integrity_check
  BEFORE INSERT OR UPDATE ON public.bill_shares
  FOR EACH ROW EXECUTE FUNCTION public.trg_bill_shares_integrity();

-- payment_contributions trigger（同 bill_shares 模式，同样 SECURITY DEFINER）
-- (略，复用同 helper)

-- bill_item_responsibilities trigger（通过 bill_item 反查 bill.group_id）
CREATE OR REPLACE FUNCTION public.trg_bill_item_resp_integrity() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER                          -- v1.5
SET search_path = public, pg_temp         -- v1.5
AS $$
DECLARE v_gid UUID;
BEGIN
  SELECT b.group_id INTO v_gid
    FROM public.bill_items bi
    JOIN public.bills b ON b.id = bi.bill_id
    WHERE bi.id = NEW.bill_item_id;
  IF v_gid IS NULL THEN
    RAISE EXCEPTION 'bill_item % does not exist', NEW.bill_item_id USING ERRCODE = '23503';
  END IF;
  PERFORM public.assert_bill_writable(NEW.participant_id, v_gid);
  RETURN NEW;
END;
$$;
CREATE TRIGGER bill_item_responsibilities_integrity_check
  BEFORE INSERT OR UPDATE ON public.bill_item_responsibilities
  FOR EACH ROW EXECUTE FUNCTION public.trg_bill_item_resp_integrity();

-- bills trigger（v1.4 新增）—— 校验 primary_payer_participant_id 与 NEW.group_id 同组 + status
CREATE OR REPLACE FUNCTION public.trg_bills_integrity() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER                          -- v1.5
SET search_path = public, pg_temp         -- v1.5
AS $$
BEGIN
  -- 第二参数直接传 NEW.group_id（bills 行本身就携带）
  PERFORM public.assert_bill_writable(NEW.primary_payer_participant_id, NEW.group_id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER bills_integrity_check
  BEFORE INSERT OR UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.trg_bills_integrity();
```

**为什么 4 个 trigger function 全要 DEFINER（v1.5 关键点）**：
- Postgres trigger function 默认 INVOKER 模式 —— 以触发行写入的"调用者"权限执行其函数体。
- 调用者是 `authenticated` 时，函数体内 `PERFORM public.assert_bill_writable(...)` 会做权限检查：authenticated 是否有 EXECUTE 权限？
- 因为 helper 被 REVOKE FROM PUBLIC 且没 GRANT TO authenticated → **检查失败 → 抛 permission denied**。
- 这会让正常的 bill 写入路径在 trigger 阶段就崩溃，**合法操作被误拦**。
- 修复有两条路：①给 helper `GRANT EXECUTE TO authenticated`（破坏"仅内部"的封闭语义）；②**把 trigger function 升 DEFINER**（trigger 以 owner 身份执行，自然能调任何 owner 拥有的函数）。
- v1.5 选 ②：保留 helper 封闭性 + 把权限边界统一收在 trigger function 边界。同时 `SET search_path = public, pg_temp` 防 search_path 攻击（与 §4.2 DEFINER 函数审计标准一致）。

> 关键设计：trigger 同时校验"同组"+"group.status = 0"，**一处兜住两类攻击**。`bill_items` / `bill_fees` 表只有 `bill_id` 没有 `participant_id`，不需要"同组"校验；但仍需要 status lock —— 通过下面的 RLS 修订完成。
>
> **v1.4 重要补强**：`bills` 表自身的 `primary_payer_participant_id` 攻击路径——`.from("bills").insert/update({ group_id: GY, primary_payer_participant_id: PX_in_GX, ... })`——必须由 `bills_integrity_check` trigger 拦截。**没有 bills trigger，整个 F15 防御链有洞**。

### 6.5.2 RLS write policy 修订（6 张表加 status = 0）

```sql
DROP POLICY IF EXISTS bills_write_creator ON public.bills;
CREATE POLICY bills_write_creator ON public.bills
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.created_by_user_id = (select auth.uid())
      AND g.status = 0  -- v1.3: unresolved-only writes
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_id
      AND g.created_by_user_id = (select auth.uid())
      AND g.status = 0
  ));

-- bill_items / bill_fees 类似（通过 bill 反查 group）
-- bill_item_responsibilities / bill_shares / payment_contributions 类似
-- （6 张表 policy 都要重写）
```

**注意 SELECT policy 不动**：成员可见 `bill_*` 子表的读权限不应受 status 影响（settled group 仍可查看历史账单）。

**注意 group DELETE 不受影响**：删 group 走 `groups.DELETE` policy（无 status 条件），CASCADE 删 bills 是 DB owner 权限，不走 RLS。所以"settling 时删整个 group"仍可行——与旧 C# 行为一致。

---

## 7.0 Read-side aggregation（P2 修订新增）

`bills` 表**不存** `subtotal / total_fee / grand_total` 字段（[schema-truth.md T4](schema-truth.md)），但旧 DTO `BillDetailDto` / `BillSummaryDto` 要求这些值。对应 C# 读 path 是**从已写入的子表派生**（[BillsService.cs:327-356](../apps/backend/src/Splity.Application/Services/BillsService.cs#L327)）：

| 字段 | 来源 | 注意 |
|---|---|---|
| `subtotalAmount` | `RoundToCurrency(SUM(bill_items.amount))` | 用 `Decimal.js` 累加后舍入 |
| `totalFeeAmount` | `RoundToCurrency(SUM(applied_fee))`，其中 `applied_fee` per fee 重算（见下） | 不存 → 重算；与写时一致 |
| `grandTotalAmount` | `RoundToCurrency(SUM(bill_shares.total_share_amount))` | 直接取子表汇总 |
| `appliedFees[]` | per fee：percentage → `subtotal * value/100`；fixed → `value`。**重新舍入一次**（对齐 [BillsService.cs:333-343](../apps/backend/src/Splity.Application/Services/BillsService.cs#L333)） | 不全等于 fee.value：percentage 已展开成金额 |
| `shares[]` | 直接 SELECT `bill_shares.*` | 不重算（已含 weight/pre/fee/total）|
| `contributions[]` | 直接 SELECT `payment_contributions.*` | 不重算 |

**实现要点**：
- `lib/services/bills.ts` 的 `getBill(billId)` 一次查 `bills + items + fees + shares + contributions`（用 Supabase nested select：`.select("*, bill_items(*), bill_fees(*), bill_shares(*), payment_contributions(*)")`）。
- 在 TS 端 **派生**上述 4 个汇总字段（不再调用 `calculateBillShares`——calculator 是写时算的，读时只是聚合）。
- 写一个 helper `lib/calculations/bill-read-projection.ts`：`function projectBillToDetail(row): BillDetailDto`，专门负责派生 + applied fee 重算。
- `listBills(groupId)` 用同模式 + 选少字段（`subtotalAmount` / `grandTotalAmount` 足够列表显示），减少 egress。

**禁止**：
- ❌ 加列 `bills.subtotal_amount / total_fee_amount / grand_total_amount`——存冗余字段会与子表脱节，反而引入"写入时 totals 与子表对不上"的 bug 类。
- ❌ 读时调 `calculateBillShares()`——calculator 输入是"用户意图"（items + 责任人 + fees），读时应用"已落地结果"，两者不应混用。

---

## 7. UI 设计要点

### 7.1 Bill 创建表单（F9）

```
┌─ Bill basics ────────────────────────────┐
│ Store name [_____________]                │
│ Date       [📅 2026-05-20]                │
│ Primary payer [Alice ▾]                   │
│ Split mode  ( ) Equal  (•) Weighted       │
└──────────────────────────────────────────┘

┌─ Items ──────────────────────────────────┐
│ + Add item                                │
│ ┌──────────────────────────────────────┐ │
│ │ Description [Grocery]   Amount [50.00]│ │
│ │ Responsible: [✓] Alice [✓] Bob [ ] Carl│ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘

┌─ Fees (optional) ────────────────────────┐
│ + Add fee                                 │
│ Name [SST] Type [Percent ▾] Value [6.00] │
└──────────────────────────────────────────┘

┌─ Weights (only if Split mode = Weighted) ┐
│ Alice [2.0000]   Bob [1.0000]            │
└──────────────────────────────────────────┘

┌─ Pre-payments / extra contributions ─────┐
│ + Add contribution                        │
│ Bob [20.00]                               │
└──────────────────────────────────────────┘

[Cancel]  [Preview]  [Save bill]
```

- **Preview 按钮可选**：触发本地 `calculateBillShares()` 显示预估分账（不入库）；如果 Phase 5 时间紧可省，留 Phase 8。
- **Edit 复用同一 form**：page 加载现有 bill detail 转成 form state 即可。

### 7.2 Bill 详情页（F10）

只读展示：
- 标题、日期、店名、付款人
- Items 列表（描述 / 金额 / 责任人）
- Fees 列表（如果有）
- Shares 表格：每人 weight / pre_fee / fee / total
- Contributions 表格

**不暴露**：bill id、internal 字段名。

---

## 8. 执行步骤（28 小时时间盒，3.5 工作日）

### Day 1（8 小时）：算法移植 + 初步 fixture

| 时段 | 任务 | 输出 |
|---|---|---|
| 0:00-0:30 | 读 BillCalculator.cs 全文 + CalculationModels.cs；标 15 处舍入点 | 头脑模型对齐 |
| 0:30-2:30 | 写 F1 `types.ts`（CalculationModels 直接翻 TS 类型） | 类型层 |
| 2:30-5:30 | 写 F2 `bill-calculator.ts` 主体 1:1 移植 | 算法层 |
| 5:30-7:00 | 翻译 C# 2 条测试为 Fixture 1 + 2；写 F3 测试框架；跑通这 2 条 | 测试运行 |
| 7:00-8:00 | 写一段一次性 `[Fact]` 注入 fixture 3-7 的 input，跑 C# 后 dump JSON | 5 条 expected 输出落盘 |

### Day 2（8 小时）：fixture 收尾 + Service 层

| 时段 | 任务 | 输出 |
|---|---|---|
| 8:00-9:30 | 把 Day 1 末尾 dump 的 5 条转成 TS fixtures；跑测试，预计有 1-2 处舍入对不上 → 调试 | 7 条 fixture 通过 |
| 9:30-11:00 | fixture 8-10 covering 剩余舍入边界 + 12 条反例（throws）；vitest 跑通全部 | 10+ fixture 通过 |
| 11:00-12:30 | 写 F5 `lib/services/bills.ts`：listBills / getBill / createBill / updateBill / deleteBill；含 D9 status 锁 | service 层 |
| 12:30-13:00 | 调一次最简 createBill → 检查 Supabase Studio 各子表写入正确 | RPC happy-path 联调 |
| 13:00-13:45 | **F6 必做**：写 `0007_bill_cross_group_integrity.sql` → push → 用错配的 participant_id 调 RPC 验证抛错 | cross-group 校验上线 |
| 13:45-14:45 | **F15 必做（v1.3 / v1.4）**：写 `0008_bill_integrity_db_defense.sql`（**4 个** trigger 含 v1.4 新加 `bills_integrity_check` + 6 张子表 RLS status 修订）→ push → 用 `RESET ROLE` 直写试两类攻击（cross-group / settling-group）验证 trigger 拦截 | DB 层防御上线 |
| 14:45-15:30 | F12 Server Action 骨架 + 读侧 `bill-read-projection.ts` 派生 totals | actions + read 派生 |
| 15:30-16:00 | F13 `phase-5-fk.sql` 含 ① FK + ② RPC cross-group 4 类 + ③ RPC cross-bill-item + ④ authenticated direct-write（cross-group + status）+ ⑤ postgres direct-write（trigger 兜底）+ ⑥ RPC status lock；本地跑通 | 自动化测试 |

### Day 3（8 小时）：UI 实现

| 时段 | 任务 | 输出 |
|---|---|---|
| 16:00-18:00 | F7 group page 加 Bills 区块（列表 + New CTA）；调 listBills | 列表可见 |
| 18:00-21:00 | F8 + F9 创建账单页 + 复合 form（items / fees / weights / contributions） | 创建可用 |
| 21:00-22:00 | createBillAction（F12 partial）；本地走通"建账单 → 详情页跳转" | 创建闭环 |
| 22:00-24:00 | F10 详情页（只读，含 shares 表格） | 详情可看 |

### Day 4（4 小时 Buffer）：编辑 / 删除 / 收尾

| 时段 | 任务 | 输出 |
|---|---|---|
| 24:00-25:30 | F11 编辑页 + updateBillAction（复用 F9 form） | 编辑闭环 |
| 25:30-26:30 | deleteBillAction + confirm dialog；测试 J5 完整旅程 | 删除闭环 |
| 26:30-27:30 | UX polish（loading state / error toast）；typecheck；fixture 全跑 | 质量过线 |
| 27:30-28:00 | 写 F14 review checklist + commit | Phase 5 关闭 |

---

## 9. 风险清单

| ID | 风险 | 等级 | 应对 |
|---|---|---|---|
| P5-R1 | **某条 fixture 输出与 C# 差 1 分** | 🔴 高 | 不是"延后修复"——立刻定位舍入点；最常见原因：累加顺序不同 / 中间结果没舍入 / `Decimal.js` rounding mode 误设 |
| P5-R2 | `Decimal.js` 全局默认 rounding mode 已在 Phase 2 设为 `ROUND_HALF_UP`，但 `.toFixed()` / `.toDecimalPlaces()` 不传第二参可能用默认 | 🟡 中 | 所有 `.toDecimalPlaces(2)` 调用**显式传** `ROUND_HALF_UP` 第二参；写 lint rule 或 grep 检查 |
| P5-R3 | RPC payload 字段名与 Phase 2 实现不匹配 | 🟡 中 | Day 2 联调步骤就是为此；不匹配则写 F6 migration 而非改 RPC 本体（保留 Phase 2 测试覆盖） |
| P5-R4 | `BillsService.cs` 677 行隐藏的 validation 规则被漏抄 | 🟡 中 | 必读：第 600-677 行 status 锁 / 边界检查；其余路径只抄 happy path |
| P5-R5 | Form state 复杂度高（items 动态增删 + responsibility checkboxes）→ Phase 5 UI 占时间 | 🟡 中 | D11 选自管 state；Day 3 占 8h；如超期 simplify：Phase 5 只接最简（每个 item 描述 + 金额 + 责任人），高级编辑（如照片上传 `reference_image_data_url`）留 Phase 8 |
| P5-R6 | UI Preview 按钮（calculateBillShares 本地预算）超期 | 🟢 低 | 可选；删除不影响验收 |
| P5-R7 | C# 测试只有 2 条 `[Fact]`，fixture 来源 #2-#10 全靠 runtime dump | 🟡 中 | Day 1 末 1 小时专门做这个，不要拖到 Day 2 中段 |
| P5-R8 | Money 库 scale 校验在 BillCalculator 内部用 `Decimal.js` 时不触发（Money 包装只在边界） | 🟢 低 | 边界明确：input DTO 进来时用 Money 校验 scale，进 calculator 转 Decimal；output 出去时再包 Money。Calculator 内部不用 Money |
| P5-R9 | reference_image_data_url 是 base64 LONGTEXT；大图传 RPC 可能超出 Postgres 单 row 8KB 默认 page → toast | 🟢 低 | TEXT 字段 Postgres 自动用 TOAST 存；不阻塞但 R11 of PRD 已注 |
| P5-R10 | UI form state 跨"Edit"页面 hydration 时序错（client form 拿不到 server-loaded bill） | 🟡 中 | F11 在 Server Component 加载 bill detail，传 props 给 client form 作为 initialState |

---

## 10. 验收清单

### 10.1 算法 1:1 移植（最高优先级）
- [ ] `pnpm --filter splity-web vitest run lib/calculations` 全绿。
- [ ] **至少 10 条 happy-path fixture**，至少 3 条来自 C# 直接对照（`source: "csharp-runtime"` 或 `"csharp-test"`）。
- [ ] **每条 fixture 的 `shares` / `contributions` / `subtotalAmount` / `totalFeeAmount` / `grandTotalAmount` 与 C# 输出字符串相等**（不允许"约等于"）。
- [ ] **至少 4 条反例 fixture** 覆盖 C# 抛错路径：fee.value < 0、contribution 超额、weight ≤ 0、责任人为空集合；错误消息子串与 C# 一致。
- [ ] **关键代码路径全覆盖**：BillCalculator 主入口 + AllocateByWeight + BuildAppliedFees + BuildContributions 每个分支至少有 1 个 fixture 通过它（人工 review，不依赖 coverage 工具）。
- ~~Line coverage ≥ 80%（`vitest run --coverage`）。~~ **v1.1 删除**：`@vitest/coverage-v8` 未安装且非核心目标；用上面"至少 N 条 fixture + 关键路径全覆盖"代替。

### 10.2 RPC 集成
- [ ] 本地建一个含 2 items / 1 fee / 3 participants 的 bill；Studio 看 `bills` + `bill_items` + `bill_item_responsibilities` + `bill_fees` + `bill_shares` + `payment_contributions` 全部写入完整。
- [ ] 行数：1 bill + N items + Σ responsibilities + M fees + K shares + L contributions。
- [ ] `update_bill_with_items`：编辑前后子表替换正确，无残留旧 row。
- [ ] Delete bill 后所有子表通过 CASCADE 清空。

### 10.2.5 Cross-group / cross-bill-item integrity + DB-level defense（P1 / v1.2 / v1.3 修订验收）

**RPC 入口校验（F6）**
- [ ] **F6 migration 已 push**：两个 RPC 函数体含**三类**校验：①cross-group primary payer、②cross-group share/contribution/responsibility participant、③**cross-bill-item responsibility**。grep 函数源码命中 `not in group %` + `responsibility bill_item_id must reference`。
- [ ] **`phase-5-fk.sql` cross-group participant 污染段（4 类）通过**：primary_payer / share / contribution / responsibility 各一条反例分别被 F6 拒绝。
- [ ] **`phase-5-fk.sql` cross-bill-item 污染段通过**：A 在 GroupX 有 bill_item BIX；调 `create_bill_with_items(GroupY, { items: [新 itemY], responsibilities: [{ bill_item_id: BIX, ... }] })` 应被 F6 校验 3 拒绝。
- [ ] **变量名审计**：`update_bill_with_items` 函数体内 v1.1 骨架曾误用 `p_group_id`（实际无此参数），v1.2 已改为 `v_target_group_id`。grep RPC 源码确认没有未声明的 `p_group_id` 引用。

**DB 层防御（F15，v1.3 / v1.4）**
- [ ] **F15 migration 已 push**：`assert_bill_writable(uuid, uuid)` helper + **4 个** BEFORE INSERT/UPDATE trigger（`bills_integrity_check` / `bill_shares_integrity_check` / `payment_contributions_integrity_check` / `bill_item_responsibilities_integrity_check`）在 Studio Functions 可见——**v1.4 起 `bills_integrity_check` 必须存在**，否则 direct-write `bills.primary_payer_participant_id` 攻击有缺口。
- [ ] **Trigger function 权限链审计（v1.5 必跑）**：以下 SQL 必须返回每行 `prosecdef = true` 且 `proconfig` 含 `search_path=public, pg_temp`：
      ```sql
      SELECT proname, prosecdef, proconfig
      FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pronamespace
      WHERE nspname = 'public'
        AND proname IN ('trg_bill_shares_integrity',
                        'trg_payment_contributions_integrity',
                        'trg_bill_item_resp_integrity',
                        'trg_bills_integrity',
                        'assert_bill_writable');
      ```
      如有一行 `prosecdef = false`，**合法 bill 写入会被 permission denied 而非完成**——即 v1.5 修复未到位。
- [ ] **合法 happy-path 不被误拦（regression）**：unresolved group + 同组 participant 走 RPC `create_bill_with_items` 正常成功（这是 v1.5 修复的核心反向断言：trigger DEFINER 升级后**不能**破坏合法路径）。建议 Day 2 F15 push 完成后立刻跑此用例。
- [ ] **6 张子表 RLS write policy 已含 `groups.status = 0` 条件**：`SELECT polname, qual::text, with_check::text FROM pg_policies WHERE schemaname='public' AND tablename IN ('bills','bill_items','bill_item_responsibilities','bill_fees','bill_shares','payment_contributions') AND cmd <> 'SELECT'` 每行 `qual` 和 `with_check` 都含 `g.status = 0`（或 `status = 0`）。

**Direct-write 攻击测试（v1.4 测试角色分层）**
- [ ] **§F13 ④ Authenticated JWT 路径**：`SET LOCAL ROLE authenticated` + `set_config('request.jwt.claim.sub', creator_uid, true)` 后直接 `INSERT INTO bill_shares` 用：(a) cross-group participant payload → **被 RLS policy 拦（0 rows affected）或被 trigger 抛 23514**（任一即通过）；(b) target bill 的 group 是 `settling` → 同上结果。**特别：bills 表直写 `primary_payer_participant_id = 跨组 participant` 应被 `bills_integrity_check` trigger 拒**（v1.4 必跑）。
- [ ] **§F13 ⑤ Postgres role / RLS 绕过路径**：`RESET ROLE` 后直接 `INSERT INTO bill_*` 用 cross-group payload 或 settling-group payload；由于 RLS 被绕过，**仅 trigger 是最后防线**，每条必须被 trigger 抛 23514。**这是 v1.3/v1.4 引入 trigger 的根本原因**——如果跑通说明绕 RLS 仍防得住。

**注意**：不再要求 trigger 拦 direct-write cross-bill-item。**cross-bill-item 是 payload-level 概念**（攻击者声明的 items 集合与 responsibilities.bill_item_id 集合错位），direct-write 单行 `INSERT INTO bill_item_responsibilities (bill_item_id, participant_id)` 没有"本次 payload"语义可比较。该测试只在 §10.2.5 RPC 层验。

**RPC 层 status lock**
- [ ] **`phase-5-fk.sql` ⑥ 段通过**：settling group 调 `create_bill_with_items` / `update_bill_with_items` 各被 F6/F15 拒；authenticated JWT delete bill 在 settling group 被 RLS policy 拒（0 rows affected）。

**回归**
- [ ] **现有 Phase 2 / Phase 4 测试不回归**：`phase-2-rls.sql` + `phase-4-rls.sql` 全跑通。
- [ ] **现有 Phase 4 D11 锁不破坏**：unresolved group 内正常加 participant / 建 bill 仍正常工作（trigger / RLS 不误拦合法路径）。

### 10.3 读模型聚合（P2 修订新增）
- [ ] `getBill` 返回的 `subtotalAmount / totalFeeAmount / grandTotalAmount` = 子表派生值（不存表中），与同一 fixture 经 calculator 算出的结果一致（**写后立即读必须一致**）。
- [ ] `listBills` 返回的 BillSummaryDto 每行三个汇总字段同上规则。
- [ ] `appliedFees[i].appliedAmount` 在读时**重新舍入**（不是直接 `fee.value`）；percentage fee 在读 path 和写 path 的舍入结果完全相等。

### 10.4 UI 端到端（J1 / J5 子集）
- [ ] 在 unresolved group 内：建账单 → 详情显示正确分账（每人金额 = fixture 期望）。
- [ ] 编辑账单：改 items 数量 + 改 fee value → 重新计算的分账 与新 input 通过 calculator 一致。
- [ ] 删除账单：确认 dialog → 跳回 group 详情，列表少一条。
- [ ] **Status 锁验证**：把 group 改为 `settling` → "New bill" / "Edit" / "Delete" 按钮消失 / 禁用；服务层即使 hack 表单提交也被 `GroupLockedError` 拒绝。

### 10.5 跨账号 RLS（Phase 4 §7.2 延伸）
- [ ] 账号 A 建 bill；账号 B（accepted group member）能 SELECT 该 bill 详情，但表单不出现 Edit/Delete CTA（非 creator）。
- [ ] 账号 B 直接 `UPDATE/DELETE` bills 表 row → RLS 拦截（0 rows affected）。

### 10.6 FK 自动化（替代 Phase 4 手动验证）
- [ ] `psql ... -f supabase/tests/phase-5-fk.sql` 跑通，含：建 group + 加 participant + 建 bill 引用该 participant → 删 participant 应抛 `23503` foreign_key_violation。

### 10.7 代码质量
- [ ] `pnpm --filter splity-web typecheck` 通过。
- [ ] `grep -rn "auth.getSession()" apps/web/ --include='*.ts'` 仍 0 命中。
- [ ] `grep -rn "createAdminClient(" apps/web/ --include='*.ts' | grep -v 'lib/supabase/admin.ts'` 仍 0 命中（service_role **不**进 Phase 5 业务路径，对齐 PRD ADR-010）。
- [ ] BillCalculator.ts 每个 `RoundCurrency` / `toCents` 调用上方有 C# 行号注释（如 `// BillCalculator.cs:80`）。

### 10.8 PRD 对齐
- [ ] api-inventory.md C1-C5 五条接口的功能在新版可复现（每个 Server Action 注释关联 ID）。
- [ ] DEFINER 函数审计仍通过（Phase 5 没新增 DEFINER 函数，预计 100%）。

---

## 11. 完成后立即触发

1. 标 Phase 5 → completed，Phase 6 → in_progress。
2. commit: `feat(bills): bill calculator port + bills crud (phase 5)`。
3. **重要**：Phase 5 末把 BillCalculator port 完成后，Phase 6 的 SettlementCalculator port 工作模式高度相似（移植 + fixture parity），可复用本期建立的 fixture infrastructure。
4. 进入 **Phase 6 plan 生成**：SettlementCalculator port + `record_settlement_action` 端到端联调 + transfer state machine UI。

---

**文档结束**
