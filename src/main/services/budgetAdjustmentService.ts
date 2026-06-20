import { getPrismaClient } from './database';
import { BudgetAdjustment, Employee, Budget, PrismaClient } from '@prisma/client';
import { createNotification } from './notificationService';

export interface CreateBudgetAdjustmentParams {
  budgetId: number;
  applicantId: number;
  adjustmentType: 'INCREASE' | 'DECREASE';
  amount: number;
  reason: string;
}

export interface BudgetAdjustmentWithRelations extends BudgetAdjustment {
  applicant: Employee;
  approver?: Employee | null;
  budget: Budget & {
    department: { id: number; name: string };
  };
}

export async function createBudgetAdjustment(
  params: CreateBudgetAdjustmentParams
): Promise<BudgetAdjustment> {
  const prisma = getPrismaClient();

  const budget = await prisma.budget.findUnique({
    where: { id: params.budgetId },
    include: { department: true },
  });

  if (!budget) {
    throw new Error('预算不存在');
  }

  if (params.adjustmentType === 'DECREASE') {
    const newTotal = budget.totalAmount - params.amount;
    if (newTotal < budget.usedAmount) {
      throw new Error('调减后的预算总额不能小于已使用金额');
    }
  }

  const adjustment = await prisma.budgetAdjustment.create({
    data: {
      budgetId: params.budgetId,
      applicantId: params.applicantId,
      adjustmentType: params.adjustmentType,
      amount: params.amount,
      reason: params.reason,
      status: 'PENDING',
    },
  });

  const applicant = await prisma.employee.findUnique({
    where: { id: params.applicantId },
  });

  const categoryName = getCategoryName(budget.category);
  const deptName = budget.department?.name || '未知部门';
  const budgetTitle = `${deptName} ${budget.year}年${budget.month}月 ${categoryName}`;
  const typeText = params.adjustmentType === 'INCREASE' ? '追加' : '调减';

  const admins = await prisma.employee.findMany({
    where: {
      OR: [{ role: 'ADMIN' }, { role: 'FINANCE_HEAD' }],
    },
  });

  for (const admin of admins) {
    await createNotification({
      employeeId: admin.id,
      type: 'budget_adjustment',
      title: `【预算调整待审批】${budgetTitle}`,
      content: `${applicant?.name || '未知用户'} 申请${typeText}预算 ¥${params.amount.toFixed(2)}，请及时审批。`,
    });
  }

  return adjustment;
}

export async function approveBudgetAdjustment(
  adjustmentId: number,
  approverId: number,
  comment?: string
): Promise<BudgetAdjustment> {
  const prisma = getPrismaClient();

  const adjustment = await prisma.budgetAdjustment.findUnique({
    where: { id: adjustmentId },
    include: { budget: true },
  });

  if (!adjustment) {
    throw new Error('调整申请不存在');
  }

  if (adjustment.status !== 'PENDING') {
    throw new Error('该申请已处理，无法重复审批');
  }

  return await prisma.$transaction(async (tx: any) => {
    const updatedAdjustment = await tx.budgetAdjustment.update({
      where: { id: adjustmentId },
      data: {
        status: 'APPROVED',
        approverId,
        approvalComment: comment,
        approvedAt: new Date(),
      },
    });

    const budget = adjustment.budget;
    const newTotal =
      adjustment.adjustmentType === 'INCREASE'
        ? budget.totalAmount + adjustment.amount
        : budget.totalAmount - adjustment.amount;

    await tx.budget.update({
      where: { id: adjustment.budgetId },
      data: { totalAmount: newTotal },
    });

    const applicant = await tx.employee.findUnique({
      where: { id: adjustment.applicantId },
    });

    const approver = await tx.employee.findUnique({
      where: { id: approverId },
    });

    if (applicant) {
      await createNotification({
        employeeId: applicant.id,
        type: 'budget_adjustment',
        title: '【预算调整审批结果】已通过',
        content: `您的预算调整申请（ID: ${adjustmentId}）已由 ${approver?.name || '审批人'} 通过。`,
      });
    }

    return updatedAdjustment;
  });
}

export async function rejectBudgetAdjustment(
  adjustmentId: number,
  approverId: number,
  comment: string
): Promise<BudgetAdjustment> {
  const prisma = getPrismaClient();

  const adjustment = await prisma.budgetAdjustment.findUnique({
    where: { id: adjustmentId },
  });

  if (!adjustment) {
    throw new Error('调整申请不存在');
  }

  if (adjustment.status !== 'PENDING') {
    throw new Error('该申请已处理，无法重复审批');
  }

  const updatedAdjustment = await prisma.budgetAdjustment.update({
    where: { id: adjustmentId },
    data: {
      status: 'REJECTED',
      approverId,
      approvalComment: comment,
    },
  });

  const applicant = await prisma.employee.findUnique({
    where: { id: adjustment.applicantId },
  });

  const approver = await prisma.employee.findUnique({
    where: { id: approverId },
  });

  if (applicant) {
    await createNotification({
      employeeId: applicant.id,
      type: 'budget_adjustment',
      title: '【预算调整审批结果】已拒绝',
      content: `您的预算调整申请（ID: ${adjustmentId}）已由 ${approver?.name || '审批人'} 拒绝。原因：${comment}`,
    });
  }

  return updatedAdjustment;
}

export async function getBudgetAdjustments(params: {
  budgetId?: number;
  applicantId?: number;
  status?: string;
  departmentId?: number;
}): Promise<BudgetAdjustmentWithRelations[]> {
  const prisma = getPrismaClient();
  const where: any = {};

  if (params.budgetId) where.budgetId = params.budgetId;
  if (params.applicantId) where.applicantId = params.applicantId;
  if (params.status) where.status = params.status;
  if (params.departmentId) {
    where.budget = {
      departmentId: params.departmentId,
    };
  }

  return prisma.budgetAdjustment.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      applicant: true,
      approver: true,
      budget: {
        include: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  }) as unknown as BudgetAdjustmentWithRelations[];
}

export async function getBudgetAdjustmentsByBudgetId(
  budgetId: number
): Promise<BudgetAdjustmentWithRelations[]> {
  return getBudgetAdjustments({ budgetId });
}

function getCategoryName(category: string): string {
  const names: Record<string, string> = {
    TRANSPORT: '交通费',
    MEAL: '餐饮费',
    ACCOMMODATION: '住宿费',
    OFFICE: '办公用品',
    ENTERTAINMENT: '招待费',
    TRAVEL: '差旅费',
    OTHER: '其他',
  };
  return names[category] || category;
}
