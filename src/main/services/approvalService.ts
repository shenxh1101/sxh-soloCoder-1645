import { getPrismaClient } from './database';
import {
  ReimbursementStatus,
  ApprovalType,
  ApprovalAction,
  BudgetCategory,
} from '../types/enums';
import {
  getReimbursementById,
  validateFinanceCategoryMatch,
  getCategoryName,
} from './reimbursementService';
import { addBudgetUsedAmount, reduceBudgetUsedAmount, checkBudgetBalance } from './budgetService';
import { createNotification } from './notificationService';
import { sendToRenderer, showDesktopNotification } from '../main';

const ESCALATION_THRESHOLD = 5000;

export async function approveReimbursement(
  reimbursementId: number,
  approverId: number,
  comment?: string
): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(reimbursementId);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (
    reimbursement.status !== ReimbursementStatus.PENDING_APPROVAL &&
    reimbursement.status !== ReimbursementStatus.ESCALATED
  ) {
    throw new Error('当前状态不允许审批');
  }

  const isFirstApproval = reimbursement.status === ReimbursementStatus.PENDING_APPROVAL;
  const approvalType = isFirstApproval ? ApprovalType.DEPARTMENT_HEAD : ApprovalType.MANAGER_ESCALATION;

  const approvalRecord = await prisma.approvalRecord.create({
    data: {
      reimbursementId,
      approverId,
      approvalType,
      action: ApprovalAction.APPROVE,
      comment,
    },
    include: { approver: true },
  });

  let nextStatus = ReimbursementStatus.PENDING_FINANCE;
  let nextStepMessage = '等待财务审核';

  if (isFirstApproval && reimbursement.totalAmount >= ESCALATION_THRESHOLD) {
    nextStatus = ReimbursementStatus.ESCALATED;
    nextStepMessage = '已通过部门主管审批，等待经理复核';
  }

  const updateData: any = {
    status: nextStatus,
  };
  if (nextStatus === ReimbursementStatus.PENDING_FINANCE) {
    updateData.approvalDate = new Date();
  }

  const updated = await prisma.reimbursement.update({
    where: { id: reimbursementId },
    data: updateData,
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });

  await createNotification({
    employeeId: reimbursement.employeeId,
    reimbursementId,
    title: isFirstApproval ? '部门主管审批通过' : '经理复核通过',
    content: `您的报销单"${reimbursement.title}"${nextStepMessage}。`,
    type: 'approval',
  });

  if (nextStatus === ReimbursementStatus.PENDING_FINANCE) {
    const financeEmployees = await prisma.employee.findMany({
      where: { role: { in: ['FINANCE_HEAD', 'ADMIN'] } },
    });
    for (const fin of financeEmployees) {
      await createNotification({
        employeeId: fin.id,
        reimbursementId,
        title: '新报销单待财务审核',
        content: `报销单"${reimbursement.title}"(${reimbursement.totalAmount.toFixed(2)}元)已通过审批，请您审核。`,
        type: 'finance',
      });
    }
  } else if (nextStatus === ReimbursementStatus.ESCALATED) {
    const managers = await prisma.employee.findMany({
      where: { role: { in: ['ADMIN'] } },
    });
    for (const manager of managers) {
      await createNotification({
        employeeId: manager.id,
        reimbursementId,
        title: '大额报销单待经理复核',
        content: `报销单"${reimbursement.title}"(${reimbursement.totalAmount.toFixed(2)}元)金额超过${ESCALATION_THRESHOLD}元，已通过部门主管审批，请您复核。`,
        type: 'escalation',
      });
    }
  }

  sendToRenderer('notification:new', { type: 'approval', reimbursementId });
  showDesktopNotification(
    isFirstApproval ? '部门主管审批通过' : '经理复核通过',
    `报销单"${reimbursement.title}"${nextStepMessage}`
  );

  return updated;
}

export async function rejectReimbursement(
  reimbursementId: number,
  approverId: number,
  comment: string
): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(reimbursementId);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (
    reimbursement.status !== ReimbursementStatus.PENDING_APPROVAL &&
    reimbursement.status !== ReimbursementStatus.ESCALATED
  ) {
    throw new Error('当前状态不允许审批');
  }

  if (!comment || comment.trim() === '') {
    throw new Error('拒绝时必须填写拒绝原因');
  }

  const isFirstApproval = reimbursement.status === ReimbursementStatus.PENDING_APPROVAL;
  const approvalType = isFirstApproval ? ApprovalType.DEPARTMENT_HEAD : ApprovalType.MANAGER_ESCALATION;
  const rejectTitle = isFirstApproval ? '报销单被部门主管拒绝' : '报销单经经理复核被拒绝';

  await prisma.approvalRecord.create({
    data: {
      reimbursementId,
      approverId,
      approvalType,
      action: ApprovalAction.REJECT,
      comment,
    },
  });

  const updated = await prisma.reimbursement.update({
    where: { id: reimbursementId },
    data: {
      status: ReimbursementStatus.REJECTED,
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });

  await createNotification({
    employeeId: reimbursement.employeeId,
    reimbursementId,
    title: rejectTitle,
    content: `您的报销单"${reimbursement.title}"被拒绝，原因：${comment}`,
    type: 'rejection',
  });

  sendToRenderer('notification:new', { type: 'rejection', reimbursementId });
  return updated;
}

export async function financeApprove(
  reimbursementId: number,
  approverId: number,
  comment?: string
): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(reimbursementId);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (reimbursement.status !== ReimbursementStatus.PENDING_FINANCE) {
    throw new Error('当前状态不允许财务审核');
  }

  const itemsData = reimbursement.items.map((item: any) => ({
    category: item.category as BudgetCategory,
    amount: item.amount,
    invoiceNo: item.invoiceNo,
    invoiceDate: item.invoiceDate,
    description: item.description || '',
  }));

  const categoryValidation = await validateFinanceCategoryMatch(itemsData);
  if (!categoryValidation.valid) {
    const rejectReason = `财务审核自动退回：费用类别与说明不匹配。具体问题：\n${categoryValidation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;

    await prisma.approvalRecord.create({
      data: {
        reimbursementId,
        approverId,
        approvalType: ApprovalType.FINANCE,
        action: ApprovalAction.REJECT,
        comment: rejectReason,
      },
    });

    const rejected = await prisma.reimbursement.update({
      where: { id: reimbursementId },
      data: {
        status: ReimbursementStatus.REJECTED,
      },
      include: {
        employee: { include: { department: true } },
        department: true,
        items: true,
        approvals: { include: { approver: true } },
      },
    });

    await createNotification({
      employeeId: reimbursement.employeeId,
      reimbursementId,
      title: '报销单财务审核未通过（自动退回）',
      content: `您的报销单"${reimbursement.title}"因费用类别与说明不匹配被自动退回。\n具体原因：${categoryValidation.errors.join('；')}`,
      type: 'finance_rejection',
    });

    sendToRenderer('notification:new', { type: 'finance_rejected', reimbursementId });
    showDesktopNotification(
      '财务审核自动退回',
      `报销单"${reimbursement.title}"因类别不匹配被退回`
    );

    throw new Error(rejectReason);
  }

  const submitDate = reimbursement.submitDate || new Date();
  const year = submitDate.getFullYear();
  const month = submitDate.getMonth() + 1;

  if (reimbursement.departmentId) {
    const categoryTotals: Record<string, number> = {};
    for (const item of reimbursement.items) {
      categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
    }
    for (const [category, total] of Object.entries(categoryTotals)) {
      const budgetCheck = await checkBudgetBalance(
        reimbursement.departmentId,
        category as BudgetCategory,
        year,
        month,
        total
      );
      if (!budgetCheck.sufficient) {
        throw new Error(
          `${getCategoryName(category as BudgetCategory)}月度预算不足，无法通过财务审核`
        );
      }
      await addBudgetUsedAmount(
        reimbursement.departmentId,
        category as BudgetCategory,
        year,
        month,
        total
      );
    }
  }

  await prisma.approvalRecord.create({
    data: {
      reimbursementId,
      approverId,
      approvalType: ApprovalType.FINANCE,
      action: ApprovalAction.APPROVE,
      comment,
    },
  });

  const updated = await prisma.reimbursement.update({
    where: { id: reimbursementId },
    data: {
      status: ReimbursementStatus.APPROVED,
      financeDate: new Date(),
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });

  await createNotification({
    employeeId: reimbursement.employeeId,
    reimbursementId,
    title: '报销单财务审核通过',
    content: `您的报销单"${reimbursement.title}"已通过财务审核，等待付款。`,
    type: 'finance',
  });

  sendToRenderer('notification:new', { type: 'finance_approved', reimbursementId });
  return updated;
}

export async function financeReject(
  reimbursementId: number,
  approverId: number,
  comment: string
): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(reimbursementId);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (reimbursement.status !== ReimbursementStatus.PENDING_FINANCE) {
    throw new Error('当前状态不允许财务审核');
  }

  if (!comment || comment.trim() === '') {
    throw new Error('拒绝时必须填写拒绝原因');
  }

  await prisma.approvalRecord.create({
    data: {
      reimbursementId,
      approverId,
      approvalType: ApprovalType.FINANCE,
      action: ApprovalAction.REJECT,
      comment,
    },
  });

  const updated = await prisma.reimbursement.update({
    where: { id: reimbursementId },
    data: {
      status: ReimbursementStatus.REJECTED,
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });

  await createNotification({
    employeeId: reimbursement.employeeId,
    reimbursementId,
    title: '报销单财务审核未通过',
    content: `您的报销单"${reimbursement.title}"财务审核未通过，原因：${comment}`,
    type: 'finance_rejection',
  });

  sendToRenderer('notification:new', { type: 'finance_rejected', reimbursementId });
  return updated;
}

export async function markAsPaid(reimbursementId: number): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(reimbursementId);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (reimbursement.status !== ReimbursementStatus.APPROVED) {
    throw new Error('只有已通过审核的报销单可以标记为已付款');
  }

  const updated = await prisma.reimbursement.update({
    where: { id: reimbursementId },
    data: {
      status: ReimbursementStatus.PAID,
      paidDate: new Date(),
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });

  await createNotification({
    employeeId: reimbursement.employeeId,
    reimbursementId,
    title: '报销款项已支付',
    content: `您的报销单"${reimbursement.title}"款项已支付，金额${reimbursement.totalAmount.toFixed(2)}元。`,
    type: 'payment',
  });

  sendToRenderer('notification:new', { type: 'paid', reimbursementId });
  return updated;
}

export async function checkAndEscalateOverdue(): Promise<any[]> {
  const prisma = getPrismaClient();
  const now = new Date();
  const twoWorkingDaysAgo = new Date(now);
  twoWorkingDaysAgo.setDate(twoWorkingDaysAgo.getDate() - 3);

  const overdueReimbursements = await prisma.reimbursement.findMany({
    where: {
      status: { in: [ReimbursementStatus.PENDING_APPROVAL, ReimbursementStatus.ESCALATED] },
      submitDate: {
        lte: twoWorkingDaysAgo,
      },
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
    },
  });

  const escalated: any[] = [];

  for (const reimbursement of overdueReimbursements) {
    if (reimbursement.status === ReimbursementStatus.PENDING_APPROVAL) {
      await prisma.reimbursement.update({
        where: { id: reimbursement.id },
        data: { status: ReimbursementStatus.ESCALATED },
      });

      const managers = await prisma.employee.findMany({
        where: { role: 'DEPARTMENT_HEAD' },
      });

      for (const manager of managers) {
        await createNotification({
          employeeId: manager.id,
          reimbursementId: reimbursement.id,
          title: '【催办】报销单审批超时自动升级',
          content: `报销单"${reimbursement.title}"(${reimbursement.totalAmount.toFixed(2)}元)提交超过2个工作日未处理，已自动升级至经理审批。`,
          type: 'escalation',
        });
      }

      await createNotification({
        employeeId: reimbursement.employeeId,
        reimbursementId: reimbursement.id,
        title: '报销单审批超时',
        content: `您的报销单"${reimbursement.title}"提交超过2个工作日未处理，已自动升级至经理审批。`,
        type: 'escalation',
      });

      escalated.push(reimbursement);
      showDesktopNotification(
        '审批超时自动升级',
        `报销单"${reimbursement.title}"已升级至经理审批`
      );
    }
  }

  sendToRenderer('notification:new', { type: 'escalation_check', count: escalated.length });
  return escalated;
}
