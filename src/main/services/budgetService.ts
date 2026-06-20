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
