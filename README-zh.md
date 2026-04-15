# Splity

Splity 是一个面向真实分账流程的共享账单工作区。  
它把 `创建群组 -> 添加成员 -> 添加账单 -> 进入结算 -> 分享付款链接 -> 确认收款` 串成一条完整路径，并新增了邀请制只读协作能力。

## 项目简介

当前仓库包含：

- `apps/frontend`: React + TypeScript + Vite 前端
- `apps/backend`: ASP.NET Core 10 Minimal API + EF Core 后端
- `packages/api-client`: 前后端共享的 typed API client

## 核心功能

### 认证与访问

- 基于 Clerk 的登录体系（邮箱密码、邮箱验证码、社交登录）
- 支持 Continue as Guest 快速体验
- Settings 页面统一管理账号资料、收款资料、语言和登出
- 侧边栏 Profile Card 右侧支持一键登出图标

### 群组与协作

- 群组创建、改名、删除（仅群主可编辑）
- 群组状态流转：`unresolved -> settling -> settled`
- 通过 Participant 的 `@username` 发起邀请
- 新增 `Invitations` Tab 处理邀请（Accept / Decline）
- 被邀请并 Accept 的用户可查看群组，但为只读（`canEdit: false`）
- Decline 不会破坏群组数据，群主侧可看到成员状态为 `declined`
- 成员邀请状态：`none / pending / accepted / declined`
- 若成员仍被账单引用，删除会被拦截并提示先清理相关账单

### 账单与结算

- 账单创建 / 编辑 / 预览采用引导式 modal
- Bill item 支持多 Responsible
- Settlement 支持按日期过滤与转账状态操作
- 当群组为 `unresolved` 时，先展示下一步引导，再进入完整结算流程

### Settlement Share 页面（`/s/:shareToken`）

- 三步流程：身份确认 -> 付款视图 -> 完成
- Payer 视图聚焦付款操作：
  - 金额总览
  - Status card
  - 独立 Payment proof screenshot card
- Receiver 视图改为表格：
  - `Name | Amount | Status | Proof | Actions`
  - Proof 有截图时显示 `View`，无则 `-`
  - Actions 支持 `Mark as received`
- Receipt details 改为可折叠模块，默认折叠，展开收起带平滑过渡

### 图片导出

- 支持结算汇总图与收据图导出
- 导出文件名格式：`{uuid}-summary.png`
- 参与者标题行右侧显示净额：
  - 应收金额为青色
  - 应付金额为红色
- 对 payer 在金额左侧展示付款状态 pill（`Paid` / `Unpaid`）
- Receiver payment details 只在整张图末尾追加一次
- 未提供收款资料时，回退文案为：
  - `Not provided. Ask receiver.`

### UI 与响应式

- 全站统一 light theme
- Desktop / Tablet / Mobile 三端响应式统一优化
- 已重点优化页面：
  - App shell / 导航
  - Dashboard activity
  - Groups list / Group detail
  - Invitations
  - Settlement share

## 主要页面

1. Home

- 未登录用户落地页
- 展示产品定位和使用流程

2. Auth

- Clerk 登录 / 注册
- 支持社交登录
- Forgot password 走 Clerk 邮箱验证码流程

3. Dashboard

- 提供 `month / year` 维度的财务概览
- 展示群组、账单和活动洞察

4. Groups

- 群组列表、状态与操作入口
- Group detail / overview / participants / bills / settlements
- 对受邀非群主用户展示只读标识和只读限制

5. Invitations

- 查看待处理邀请
- 直接 Accept / Decline

6. Settlement Share

- 群主生成并分享结算链接
- payer / receiver 在公开分享页完成确认流

7. Settings

- 账号资料维护
- 收款资料维护（用于分享页自动预填）
- 语言切换与登出

## 群组状态规则

- `unresolved`
  - 可编辑（群主）
  - 可维护成员和账单
- `settling`
  - 数据编辑只读
  - 允许结算相关状态动作
- `settled`
  - 只读
  - 分享页仍可查看，但不允许新的支付动作

## 多语言

- 支持语言：`en`、`zh`
- 语言选择会持久化，刷新后保留
- 主要页面使用统一 i18n 体系

## 环境变量

### Frontend（`apps/frontend/.env`）

主要变量：

- `VITE_CLERK_PUBLISHABLE_KEY`（Clerk 必填）
- `VITE_API_BASE_URL`（可选）
- `VITE_DEV_API_PROXY_TARGET`
- `VITE_DEV_ALLOWED_HOSTS`（可选）

示例：

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_DEV_API_PROXY_TARGET=http://localhost:5204
# VITE_API_BASE_URL=https://api.example.com
# VITE_DEV_ALLOWED_HOSTS=.trycloudflare.com
```

### Backend（`apps/backend/src/Splity.Api/appsettings*.json` 或环境变量）

常用配置：

数据库：

- `ConnectionStrings__DefaultConnection`
- `Database__Provider`

Clerk：

- `Clerk__Authority`
- `Clerk__SecretKey`
- `Clerk__ApiUrl`
- `Clerk__JwksUrl`（可选；默认 `<Authority>/.well-known/jwks.json`）
- `Clerk__AuthorizedParties__0`
- `Clerk__AuthorizedParties__1`

前端 CORS：

- `Frontend__AllowedOrigins__0`
- `Frontend__AllowedOrigins__1`

## 本地开发

### 环境要求

- Node.js + npm
- .NET SDK 10
- MySQL

### 安装前端依赖

```powershell
npm run install:frontend
```

### 启动前端

```powershell
npm run dev:frontend
```

默认地址：

- `http://localhost:5173`

### 启动后端

```powershell
npm run dev:backend
```

默认地址：

- API：`http://localhost:5204`
- Health：`http://localhost:5204/health`

### 同时启动前后端

```powershell
npm run dev
```

## Cloudflare Tunnel（本地分享）

当前为单 tunnel 开发模式：

- 浏览器通过同域 `/api` 调后端
- Vite 代理 `/api` 与 `/health` 到后端
- 只需暴露前端 `5173`

### 1. 安装 cloudflared

```powershell
winget install --id Cloudflare.cloudflared
cloudflared --version
```

### 2. 启动 Splity

```powershell
npm run dev
```

确认可访问：

- `http://localhost:5173`
- `http://localhost:5173/health`

### 3. 启动 tunnel

```powershell
cloudflared tunnel --url http://localhost:5173
```

### 4. 常见问题

- 前端未运行在 `5173`
- 后端未启动（页面可开但 API 失败）
- Vite host 未放行（`Blocked request. This host is not allowed.`）
- `.env` 中遗留 `VITE_API_BASE_URL=http://localhost:5204`
- Clerk / 后端的 authorized parties 或 allowed origins 未包含公网访问域名

## 构建命令

```powershell
# frontend build
npm run build:frontend

# backend build
npm run build:backend

# full build
npm run build
```
