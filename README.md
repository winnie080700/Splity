# Splity

Splity 是一个按 Group 组织的分账与结算应用，适合聚餐、旅行、同住或小团队共同消费场景。

当前项目包含两种使用入口：

- 主应用：登录后管理 Group、成员、账单和结算
- 分享页：通过公开分享链接进入，给 payer / receiver 分别提供结算操作视角

## 项目简介

这个项目的核心目标是把「记账 -> 分摊 -> 结算 -> 分享支付信息 -> 确认收款」串成一个完整流程。

当前实现已经覆盖：

- Group、Participants、Bills、Settlements 的完整主流程
- 登录 / 注册与本地 JWT 会话
- 账单 item 级别负责人分配
- Equal / Weighted 两种分摊模式
- 结算分享链接
- payer / receiver 两种分享页视角
- payment info、payment QR、proof screenshot
- Group / Participant / Bill 的编辑与删除

## 当前功能概览

### 1. Group 架构

- 一个 Group 有名称、创建时间，以及可选的创建者用户
- 一个 Group 下包含多名 Participants 和多张 Bills
- 前端会把最近打开过的 Group 保存在浏览器 `localStorage`，方便快速切换

### 2. Participants / Bills / Settlement

- Participant 归属于单个 Group，组内名称唯一
- Bill 归属于单个 Group，包含：
  - `storeName`
  - `transactionDateUtc`
  - `splitMode`
  - `primaryPayerParticipantId`
  - `items`
  - `fees`
  - `shares`
  - `contributions`
- 每个 bill item 都可以指定 1 个或多个 responsible participants
- Settlement 根据当前 Group 的账单实时聚合 net balances 和 transfer plan
- Settlement 支持按日期区间过滤

### 3. 已支持的分享流程

- 从结算页生成分享链接
- 分享链接使用后端保存的 opaque token，公开访问路径为 `/s/{shareToken}`
- 分享链接可附带：
  - creator name
  - payee name
  - payment method
  - account name / account number
  - notes
  - payment QR 图片

### 4. payer / receiver 视角

- payer 视角：
  - 选择自己的身份
  - 查看总应付金额、应付对象、付款信息和付款二维码
  - 查看按账单拆解的 payable receipt
  - 上传 proof screenshot
  - 将待支付 transfer 标记为 `Paid`
- receiver 视角：
  - 选择自己的身份
  - 查看总应收金额和每笔 incoming transfer
  - 查看 payer 上传的 proof screenshot
  - 将已付款 transfer 标记为 `Received`

### 5. 编辑 / 删除能力

- Group：支持编辑名称、删除
- Participant：支持编辑名称、删除
  - 如果该成员已被账单引用，后端会阻止删除
- Bill：支持编辑、删除
- Settlement transfer：不支持编辑金额，但支持更新状态为 `Unpaid -> Paid -> Received`

## 技术栈

### Frontend

- React 18
- TypeScript
- Vite
- React Router 7
- TanStack Query
- Tailwind CSS

### Backend

- ASP.NET Core 10 Minimal APIs
- .NET SDK 10（`global.json` 当前锁定 `10.0.103`）
- Entity Framework Core
- MySQL / InMemory provider switch
- JWT Bearer Authentication

### Shared / Tooling

- `packages/api-client`：前后端共享的 typed API client
- `.vscode/launch.json`：VS Code 一键启动 frontend / backend / full stack
- `scripts/dev.js`、`scripts/backend.js`：根目录统一开发脚本

## 项目结构

```text
.
├─ apps/
│  ├─ frontend/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  ├─ features/
│  │  │  │  ├─ auth/
│  │  │  │  ├─ groups/
│  │  │  │  ├─ participants/
│  │  │  │  ├─ bills/
│  │  │  │  └─ settlements/
│  │  │  └─ shared/
│  │  └─ .env.example
│  └─ backend/
│     ├─ src/
│     │  ├─ Splity.Api/
│     │  ├─ Splity.Application/
│     │  ├─ Splity.Domain/
│     │  └─ Splity.Infrastructure/
│     └─ tests/
├─ packages/
│  └─ api-client/
├─ database/
│  └─ init.mysql.sql
├─ docs/
├─ scripts/
│  ├─ backend.js
│  └─ dev.js
└─ .vscode/
   └─ launch.json
```

## 安装步骤

### 环境要求

- Node.js + npm
- .NET SDK 10（仓库当前使用 `10.0.103`）
- 本地 MySQL 实例

### 数据库配置

当前后端默认读取：

- `apps/backend/src/Splity.Api/appsettings.json`
- `apps/backend/src/Splity.Api/appsettings.Development.json`

默认配置为：

- Provider: `MySql`
- Connection string: `server=localhost;port=3306;database=splity_dev;user=root;password=root`

如果你本地数据库配置不同，请先修改这两个配置文件，或用环境变量覆盖。

如需手动初始化库，可执行 `database/init.mysql.sql`。  
后端启动时也会执行 `EnsureCreated`，并在数据库为空时自动 seed 一组 `Demo Group` 数据。

### 安装前端依赖

在仓库根目录执行：

```powershell
npm run install:frontend
```

### 还原后端依赖

推荐直接使用根目录脚本或在 API 项目目录执行：

```powershell
cd apps/backend/src/Splity.Api
$env:DOTNET_CLI_HOME = (Resolve-Path ..\..\..\..\.dotnet).Path
dotnet restore
```

## 本地运行方式

### 启动 backend

推荐命令：

```powershell
npm run dev:backend
```

这会实际执行：

- `dotnet watch run --launch-profile http`
- 工作目录：`apps/backend/src/Splity.Api`

默认地址：

- API: `http://localhost:5204`
- Health check: `http://localhost:5204/health`

如果你想直接在项目目录启动：

```powershell
cd apps/backend/src/Splity.Api
$env:DOTNET_CLI_HOME = (Resolve-Path ..\..\..\..\.dotnet).Path
dotnet watch run --launch-profile http
```

### 启动 frontend

推荐命令：

```powershell
npm run dev:frontend
```

这会实际在 `apps/frontend` 下执行：

```powershell
npm run dev
```

默认前端地址为 Vite 默认端口：

- `http://localhost:5173`

前端 API 地址默认读取 `VITE_API_BASE_URL`。  
如果未额外配置，`packages/api-client` 默认会请求 `http://localhost:5204`。

如需自定义 API 地址，可在 `apps/frontend` 下创建 `.env`：

```env
VITE_API_BASE_URL=http://localhost:5204
```

## 如何同时启动 frontend 和 backend

在仓库根目录执行：

```powershell
npm run dev
```

这个命令会同时启动：

- frontend：`apps/frontend`
- backend：`apps/backend/src/Splity.Api`

如果 frontend 依赖未安装，脚本会先报错并提示先执行 `npm install`。

### VS Code 启动方式

仓库已经提供 `.vscode/launch.json`，可直接使用：

- `Launch Backend`
- `Launch Frontend`
- `Launch Full Stack`

## 主要使用流程

### 1. 注册 / 登录

- 打开 `/auth`
- 注册本地开发账号，或直接登录已有账号
- 登录后主应用页面会进入受保护的工作区

### 2. 创建 Group

- 在首页输入 Group 名称并创建
- 创建后 Group 会出现在侧边栏和首页最近 Group 列表中

### 3. 添加成员

- 进入 `Participants` 页面
- 输入成员名称并添加
- 当前页面支持成员重命名与删除
- 如果成员已经被某些账单引用，删除会被后端阻止

### 4. 创建账单

- 进入 `Bills` 页面
- 填写商家名称、消费日期
- 选择 split mode：
  - `Equal`
  - `Weighted`
- 选择 primary payer
- 添加一个或多个账单 item

### 5. 给账单添加项目

每个 item 都需要填写：

- description
- amount
- responsible participants

说明：

- item 至少要有一个负责人
- 一个 item 可以分配给多个负责人
- `Weighted` 模式下，每个参与者还需要设置 weight
- fee 支持：
  - percentage
  - fixed

保存后，后端会重新计算：

- pre-fee share
- fee share
- total share
- payment contributions

### 6. 查看和管理账单

- 账单列表会显示历史 bill、subtotal、fees、total 和 split mode
- 可对已有 bill 执行：
  - 编辑
  - 删除

### 7. 查看结算

- 进入 `Settlements` 页面
- 可按日期区间过滤
- 可选择 `acting as` 某个 participant
- 页面会显示：
  - net balances
  - transfer plan
  - 当前 transfer 状态：`Unpaid` / `Paid` / `Received`

在主应用结算页里：

- payer 身份可以把属于自己的 transfer 标记为 `Paid`
- receiver 身份可以把已付款 transfer 标记为 `Received`

### 8. 生成分享链接

- 在 `Settlements` 页面点击分享按钮
- 可选填写 receiver 侧会看到的 payment info：
  - 收款人名称
  - 支付方式
  - 账户名
  - 账号
  - 备注
  - 支付二维码图片
- 生成后得到公开链接 `/s/{shareToken}`

### 9. payer 在分享页如何使用

- 打开分享链接
- 先选择自己的 participant 身份
- 如果系统判断你是 payer，会进入 payer summary
- payer 可查看：
  - 总应付金额
  - 收款对象
  - payment info
  - payment QR
  - 按账单拆解的 payable receipt
- payer 可上传 payment proof screenshot
- 提交后会把该 participant 当前待付款的 transfers 标记为 `Paid`

### 10. receiver 在分享页如何使用

- 打开相同分享链接
- 选择自己的 participant 身份
- 如果系统判断你是 receiver，会进入 receiver summary
- receiver 可查看：
  - 总应收金额
  - 各 payer 的 transfer 列表
  - payer 上传的 proof screenshot
  - 按账单拆解的 receivable receipt
- 对已经标记为 `Paid` 的 transfer，receiver 可继续标记为 `Received`

## 常用命令

```powershell
# 安装前端依赖
npm run install:frontend

# 仅启动 frontend
npm run dev:frontend

# 仅启动 backend
npm run dev:backend

# 同时启动 frontend + backend
npm run dev

# 构建 frontend
npm run build:frontend

# 构建 backend
npm run build:backend

# 全量构建
npm run build
```

## 补充说明

- 主应用页面默认需要登录；公开分享页 `/s/{shareToken}` 可直接访问
- backend 的 CORS 允许来源目前配置在 `appsettings.json` / `appsettings.Development.json`
- API client 集中在 `packages/api-client`
- 如果数据库中还没有 group，backend 首次启动会自动创建一组 demo 数据
