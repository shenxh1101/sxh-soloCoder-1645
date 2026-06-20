# 企业员工费用报销与预算管控桌面系统

基于 Electron + React + TypeScript + SQLite 构建的企业级费用报销与预算管理系统。

## 功能特性

### 1. 报销单管理
- ✅ 报销单录入：支持多费用明细项
- ✅ 发票号码格式自动校验
- ✅ 费用金额合理性校验（按类别限额）
- ✅ 部门月度预算余额实时校验
- ✅ 校验不通过明确错误提示，禁止提交

### 2. 审批流程
- ✅ 报销申请推送至部门主管审批
- ✅ 超2个工作日未处理自动升级至经理审批
- ✅ 审批通过/拒绝操作，支持审批意见

### 3. 财务审核
- ✅ 自动校验费用类别与预算科目匹配度
- ✅ 不匹配则退回并提示原因
- ✅ 财务审核通过后自动扣减预算额度
- ✅ 标记已付款功能

### 4. 定时任务
- ✅ 每月1日定时扫描逾期未处理报销单
- ✅ 自动生成催办通知
- ✅ 每30分钟检查审批超时自动升级

### 5. 统计报表
- ✅ 按部门统计报销金额与笔数
- ✅ 按费用类别统计报销金额与笔数
- ✅ 支持导出Excel月度报表（多Sheet）

### 6. 角色权限系统
- **普通员工 (EMPLOYEE)**：我的报销、新建报销、工作台
- **部门主管 (DEPARTMENT_HEAD)**：员工权限 + 审批管理 + 统计报表
- **财务主管 (FINANCE_HEAD)**：员工权限 + 财务审核 + 预算管理 + 统计报表
- **系统管理员 (ADMIN)**：全部权限 + 部门管理 + 员工管理

## 技术栈

- **桌面框架**: Electron
- **前端框架**: React 18 + TypeScript
- **UI组件库**: Ant Design 5
- **路由**: React Router 6
- **数据库**: SQLite
- **ORM**: Prisma
- **定时任务**: node-cron
- **Excel导出**: xlsx (SheetJS)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:init
```

该命令会自动：
- 生成 Prisma Client
- 创建 SQLite 数据库表
- 插入测试数据（部门、员工、预算）

### 3. 启动开发模式

```bash
npm run dev
```

### 4. 构建生产版本

```bash
npm run build
npm start
```

## 测试账号

| 角色 | 工号 | 密码 | 说明 |
|------|------|------|------|
| 系统管理员 | ADMIN001 | 123456 | 拥有全部权限 |
| 普通员工 | EMP001 | 123456 | 技术部员工 |
| 普通员工 | EMP002 | 123456 | 市场部员工 |
| 部门主管 | HEAD001 | 123456 | 技术部主管 |
| 部门主管 | HEAD002 | 123456 | 市场部主管 |
| 财务主管 | FIN001 | 123456 | 财务部主管 |

## 项目结构

```
.
├── prisma/
│   ├── schema.prisma     # 数据模型定义
│   └── seed.ts           # 初始化种子数据
├── src/
│   ├── main/             # Electron 主进程
│   │   ├── main.ts       # 主进程入口
│   │   ├── preload.ts    # 预加载脚本（IPC暴露）
│   │   ├── ipc.ts        # IPC处理器
│   │   └── services/     # 业务服务层
│   │       ├── database.ts
│   │       ├── employeeService.ts
│   │       ├── departmentService.ts
│   │       ├── budgetService.ts
│   │       ├── reimbursementService.ts
│   │       ├── approvalService.ts
│   │       ├── notificationService.ts
│   │       ├── statisticsService.ts
│   │       └── scheduler.ts
│   └── renderer/         # 前端渲染进程
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── types/        # TypeScript 类型定义
│           ├── config/       # 配置（菜单、权限）
│           ├── utils/        # 工具函数
│           ├── components/   # 通用组件
│           ├── pages/        # 页面组件
│           │   ├── Login.tsx
│           │   ├── Dashboard.tsx
│           │   ├── MyReimbursements.tsx
│           │   ├── ReimbursementForm.tsx
│           │   ├── ReimbursementDetail.tsx
│           │   ├── Approval.tsx
│           │   ├── Finance.tsx
│           │   ├── Budget.tsx
│           │   ├── Statistics.tsx
│           │   ├── Department.tsx
│           │   └── Employee.tsx
│           └── styles/
├── package.json
├── tsconfig.json
├── tsconfig.main.json
├── tsconfig.node.json
└── vite.config.ts
```

## 业务校验规则

### 发票号码格式
- 支持 8-20 位纯数字
- 支持字母开头（2位大写字母）+ 8-20位数字
- 增值税发票格式（10-12位或18-20位数字）

### 单笔金额限额
| 费用类别 | 单笔限额 |
|----------|----------|
| 差旅费 | 50,000元 |
| 业务招待费 | 20,000元 |
| 办公用品费 | 10,000元 |
| 餐饮费 | 5,000元 |
| 交通费 | 10,000元 |
| 通讯费 | 2,000元 |
| 培训费 | 30,000元 |
| 其他费用 | 10,000元 |

### 审批超时规则
- 工作日9:00 自动检查
- 每30分钟增量检查
- 超过2个工作日未处理 → 自动升级至经理审批
- 每月1日10:00 → 扫描所有超7天未处理单据并发送催办通知

## Excel报表说明

导出的Excel包含4个工作表：
1. **报销明细**：报销单号、申请人、部门、金额、状态、各时间节点
2. **费用明细**：每项费用的类别、金额、发票号、发票日期
3. **部门统计**：各部门报销笔数、金额、各类别明细
4. **类别统计**：各费用类别笔数、总金额
