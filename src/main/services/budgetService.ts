import { getPrismaClient } from './database';
import { Budget } from '@prisma/client';
import { BudgetCategory } from '../types/enums';
import { createNotification } from './notificationService';
import { getCategoryName } from './reimbursementService';

export async function getAllBudgets(params?: any): Promise<{ data: Budget[]; total: number }> {
  const prisma = getPrismaClient();
  const { page = 1, pageSize = 20, departmentId, year, month } = params || {};
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (departmentId) where.departmentId = departmentId;
  if (year) where.year = year;
  if (month) where.month = month;

  const [data, total] = await Promise.all([
    prisma.budget.findMany({
      where,
      skip,
      take: pageSize,
      include: { department: true },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { departmentId: 'asc' }],
    }),
    prisma.budget.count({ where }),
  ]);

  return { data, total };
}

export async function getBudgetByDeptAndCategory(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number
): Promise<Budget | null> {
  const prisma = getPrismaClient();
  return prisma.budget.findFirst({
    where: { departmentId, category, year, month },
    include: { department: true },
  });
}

export async function createBudget(data: any): Promise<Budget> {
  const prisma = getPrismaClient();
  return prisma.budget.create({
    data: {
      departmentId: data.departmentId,
      category: data.category as BudgetCategory,
      year: data.year,
      month: data.month,
      totalAmount: data.totalAmount,
      usedAmount: data.usedAmount || 0,
    },
    include: { department: true },
  });
}

export async function updateBudget(id: number, data: any): Promise<Budget> {
  const prisma = getPrismaClient();
  return prisma.budget.update({
    where: { id },
    data: {
      totalAmount: data.totalAmount,
      usedAmount: data.usedAmount,
    },
    include: { department: true },
  });
}

export async function addBudgetUsedAmount(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number,
  amount: number
): Promise<void> {
  const prisma = getPrismaClient();
  const budget = await getBudgetByDeptAndCategory(departmentId, category, year, month);
  if (budget) {
    const oldUsagePercent = budget.totalAmount > 0
      ? Math.round((budget.usedAmount / budget.totalAmount) * 100)
      : 0;

    const updatedBudget = await prisma.budget.update({
      where: { id: budget.id },
      data: { usedAmount: { increment: amount } },
      include: { department: true },
    });

    const newUsagePercent = updatedBudget.totalAmount > 0
      ? Math.round((updatedBudget.usedAmount / updatedBudget.totalAmount) * 100)
      : 0;

    const categoryName = getCategoryName(category);
    const deptName = updatedBudget.department?.name || '未知部门';
    const budgetTitle = `${deptName} ${year}年${month}月 ${categoryName}`;

    if (oldUsagePercent < 70 && newUsagePercent >= 70 && newUsagePercent < 100) {
      await createBudgetWarningNotification(
        departmentId,
        budget.id,
        budgetTitle,
        newUsagePercent,
        'warning',
        year,
        month,
        category
      );
    }
    if (oldUsagePercent < 100 && newUsagePercent >= 100) {
      await createBudgetWarningNotification(
        departmentId,
        budget.id,
        budgetTitle,
        newUsagePercent,
        'danger',
        year,
        month,
        category
      );
    }
  }
}

async function createBudgetWarningNotification(
  departmentId: number,
  budgetId: number,
  budgetTitle: string,
  usagePercent: number,
  level: 'warning' | 'danger',
  year: number,
  month: number,
  category: BudgetCategory
): Promise<void> {
  const prisma = getPrismaClient();

  const admins = await prisma.employee.findMany({
    where: {
      OR: [
        { role: 'ADMIN' },
        { role: 'FINANCE_HEAD' },
        { departmentId, role: 'DEPARTMENT_HEAD' },
      ],
    },
  });

  const title = level === 'danger'
    ? `【预算超支预警】${budgetTitle} 已超支`
    : `【预算预警】${budgetTitle} 使用率达 ${usagePercent}%`;

  const content = level === 'danger'
    ? `${budgetTitle} 预算使用率已达 ${usagePercent}%，已超支，请及时关注并调整后续报销计划。点击查看占用明细。`
    : `${budgetTitle} 预算使用率已达 ${usagePercent}%，接近超支，请合理控制后续报销金额。点击查看占用明细。`;

  for (const admin of admins) {
    const existing = await prisma.notification.findFirst({
      where: {
        employeeId: admin.id,
        type: 'budget',
        budgetId,
        isRead: false,
        title,
      },
    });

    if (!existing) {
      await createNotification({
        employeeId: admin.id,
        type: 'budget',
        title,
        content,
        budgetId,
        budgetUrlParams: {
          budgetId,
          departmentId,
          year,
          month,
          category,
        },
      });
    }
  }
}

export async function reduceBudgetUsedAmount(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number,
  amount: number
): Promise<void> {
  const prisma = getPrismaClient();
  const budget = await getBudgetByDeptAndCategory(departmentId, category, year, month);
  if (budget) {
    await prisma.budget.update({
      where: { id: budget.id },
      data: { usedAmount: { decrement: amount } },
    });
  }
}

export async function checkBudgetBalance(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number,
  amount: number
): Promise<{ sufficient: boolean; remaining: number; total: number; used: number }> {
  const budget = await getBudgetByDeptAndCategory(departmentId, category, year, month);
  if (!budget) {
    return { sufficient: false, remaining: 0, total: 0, used: 0 };
  }
  const remaining = budget.totalAmount - budget.usedAmount;
  return {
    sufficient: remaining >= amount,
    remaining,
    total: budget.totalAmount,
    used: budget.usedAmount,
  };
}

export type BudgetWarningLevel = 'normal' | 'warning' | 'danger';

export interface BudgetWarningItem {
  id: number;
  departmentId: number;
  departmentName: string;
  category: BudgetCategory;
  categoryName: string;
  year: number;
  month: number;
  totalAmount: number;
  usedAmount: number;
  remainingAmount: number;
  usagePercent: number;
  warningLevel: BudgetWarningLevel;
}

export async function getBudgetWarnings(params?: {
  departmentId?: number;
  year?: number;
  month?: number;
  warningLevel?: BudgetWarningLevel;
}): Promise<BudgetWarningItem[]> {
  const prisma = getPrismaClient();
  const now = new Date();
  const {
    departmentId,
    year = now.getFullYear(),
    month = now.getMonth() + 1,
    warningLevel,
  } = params || {};

  const where: any = { year, month };
  if (departmentId) where.departmentId = departmentId;

  const budgets = await prisma.budget.findMany({
    where,
    include: { department: true },
    orderBy: [{ departmentId: 'asc' }, { category: 'asc' }],
  });

  const results: BudgetWarningItem[] = [];

  for (const budget of budgets) {
    const usagePercent = budget.totalAmount > 0
      ? Math.round((budget.usedAmount / budget.totalAmount) * 100)
      : 0;

    let level: BudgetWarningLevel = 'normal';
    if (usagePercent >= 100) level = 'danger';
    else if (usagePercent >= 70) level = 'warning';

    if (warningLevel && level !== warningLevel) continue;

    const categoryNames: Record<BudgetCategory, string> = {
      [BudgetCategory.TRAVEL]: '差旅费',
      [BudgetCategory.ENTERTAINMENT]: '业务招待费',
      [BudgetCategory.OFFICE_SUPPLIES]: '办公用品费',
      [BudgetCategory.MEAL]: '餐饮费',
      [BudgetCategory.TRANSPORTATION]: '交通费',
      [BudgetCategory.COMMUNICATION]: '通讯费',
      [BudgetCategory.TRAINING]: '培训费',
      [BudgetCategory.OTHER]: '其他费用',
    };

    results.push({
      id: budget.id,
      departmentId: budget.departmentId,
      departmentName: budget.department?.name || '未知部门',
      category: budget.category as BudgetCategory,
      categoryName: categoryNames[budget.category as BudgetCategory] || budget.category,
      year: budget.year,
      month: budget.month,
      totalAmount: budget.totalAmount,
      usedAmount: budget.usedAmount,
      remainingAmount: budget.totalAmount - budget.usedAmount,
      usagePercent,
      warningLevel: level,
    });
  }

  return results;
}

export interface BudgetReimbursementDetail {
  id: number;
  reimbursementId: number;
  reimburseNo: string;
  title: string;
  employeeName: string;
  departmentName: string;
  totalAmount: number;
  categoryAmount: number;
  approvalStage: string;
  budgetDeducted: boolean;
  status: string;
  submitDate: Date | null;
  categoryItems: {
    id: number;
    description: string;
    amount: number;
    invoiceNo: string;
  }[];
}

export async function getBudgetReimbursements(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number
): Promise<BudgetReimbursementDetail[]> {
  const prisma = getPrismaClient();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const items = await prisma.reimbursementItem.findMany({
    where: {
      category: category as string,
      reimbursement: {
        departmentId,
        status: { in: ['PENDING_APPROVAL', 'ESCALATED', 'PENDING_FINANCE', 'APPROVED', 'PAID'] },
        submitDate: { gte: startDate, lte: endDate },
      },
    },
    include: {
      reimbursement: {
        include: {
          employee: true,
          department: true,
          approvals: {
            include: { approver: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const reimMap = new Map<number, BudgetReimbursementDetail>();

  for (const item of items) {
    const reim = item.reimbursement;
    const stageInfo = getApprovalStageInfo(reim.status, reim.approvals || []);

    if (!reimMap.has(reim.id)) {
      reimMap.set(reim.id, {
        id: reim.id,
        reimbursementId: reim.id,
        reimburseNo: reim.reimburseNo,
        title: reim.title,
        employeeName: reim.employee?.name || '未知',
        departmentName: reim.department?.name || '未知',
        totalAmount: reim.totalAmount,
        categoryAmount: 0,
        approvalStage: stageInfo.stage,
        budgetDeducted: stageInfo.budgetDeducted,
        status: reim.status,
        submitDate: reim.submitDate,
        categoryItems: [],
      });
    }

    const detail = reimMap.get(reim.id)!;
    detail.categoryAmount += item.amount;
    detail.categoryItems.push({
      id: item.id,
      description: item.description || '',
      amount: item.amount,
      invoiceNo: item.invoiceNo,
    });
  }

  return Array.from(reimMap.values()).sort((a, b) =>
    (b.submitDate?.getTime() || 0) - (a.submitDate?.getTime() || 0)
  );
}

function getApprovalStageInfo(status: string, approvals: any[]): { stage: string; budgetDeducted: boolean } {
  const stageMap: Record<string, { stage: string; budgetDeducted: boolean }> = {
    PENDING_APPROVAL: { stage: '待部门审批', budgetDeducted: false },
    ESCALATED: { stage: '待经理复核', budgetDeducted: false },
    PENDING_FINANCE: { stage: '待财务审核', budgetDeducted: false },
    APPROVED: { stage: '财务已通过', budgetDeducted: true },
    PAID: { stage: '已支付', budgetDeducted: true },
    REJECTED: { stage: '已拒绝', budgetDeducted: false },
    CANCELLED: { stage: '已取消', budgetDeducted: false },
    FINANCE_REJECTED: { stage: '财务退回', budgetDeducted: false },
  };

  return stageMap[status] || { stage: status, budgetDeducted: false };
}

export async function markAllNotificationsRead(employeeId: number): Promise<number> {
  const prisma = getPrismaClient();
  const result = await prisma.notification.updateMany({
    where: { employeeId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
