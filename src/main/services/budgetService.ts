import { getPrismaClient } from './database';
import { Budget } from '@prisma/client';
import { BudgetCategory } from '../types/enums';

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
    await prisma.budget.update({
      where: { id: budget.id },
      data: { usedAmount: { increment: amount } },
    });
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

export async function getBudgetReimbursements(
  departmentId: number,
  category: BudgetCategory,
  year: number,
  month: number
): Promise<any[]> {
  const prisma = getPrismaClient();
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const items = await prisma.reimbursementItem.findMany({
    where: {
      category: category as string,
      reimbursement: {
        departmentId,
        status: { in: ['PENDING_FINANCE', 'APPROVED', 'PAID'] },
        submitDate: { gte: startDate, lte: endDate },
      },
    },
    include: {
      reimbursement: {
        include: {
          employee: true,
          department: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return items.map((item) => ({
    id: item.id,
    reimbursementId: item.reimbursementId,
    reimburseNo: item.reimbursement.reimburseNo,
    title: item.reimbursement.title,
    employeeName: item.reimbursement.employee?.name || '未知',
    departmentName: item.reimbursement.department?.name || '未知',
    amount: item.amount,
    invoiceNo: item.invoiceNo,
    invoiceDate: item.invoiceDate,
    description: item.description,
    status: item.reimbursement.status,
    submitDate: item.reimbursement.submitDate,
  }));
}

export async function markAllNotificationsRead(employeeId: number): Promise<number> {
  const prisma = getPrismaClient();
  const result = await prisma.notification.updateMany({
    where: { employeeId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
