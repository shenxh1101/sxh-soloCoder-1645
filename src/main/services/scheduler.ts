import * as cron from 'node-cron';
import { checkAndEscalateOverdue } from './approvalService';
import { getPrismaClient } from './database';
import { ReimbursementStatus } from '../types/enums';
import { createNotification } from './notificationService';
import { sendToRenderer, showDesktopNotification } from '../main';

let isRunning = false;

export function startScheduledTasks() {
  console.log('启动定时任务调度器...');

  cron.schedule('0 0 9 * * 1-5', async () => {
    console.log('[工作日9:00] 检查审批超时的报销单...');
    try {
      const result = await checkAndEscalateOverdue();
      console.log(`处理了 ${result.length} 个超时报销单`);
    } catch (error) {
      console.error('检查超时报销单失败:', error);
    }
  });

  cron.schedule('0 0 10 1 * *', async () => {
    console.log('[每月1日10:00] 扫描逾期未处理报销单并生成催办通知...');
    try {
      await scanOverdueAndNotify();
    } catch (error) {
      console.error('月度催办通知失败:', error);
    }
  });

  cron.schedule('0 */30 * * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    try {
      await checkAndEscalateOverdue();
    } finally {
      isRunning = false;
    }
  });

  console.log('定时任务调度器已启动');
}

async function scanOverdueAndNotify() {
  const prisma = getPrismaClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pendingList = await prisma.reimbursement.findMany({
    where: {
      status: {
        in: [
          ReimbursementStatus.PENDING_APPROVAL,
          ReimbursementStatus.ESCALATED,
          ReimbursementStatus.PENDING_FINANCE,
        ],
      },
      submitDate: {
        lte: sevenDaysAgo,
      },
    },
    include: {
      employee: true,
      department: true,
    },
  });

  for (const rb of pendingList) {
    let notifyType = '';
    let notifyTitle = '';
    let notifyContent = '';

    if (
      rb.status === ReimbursementStatus.PENDING_APPROVAL ||
      rb.status === ReimbursementStatus.ESCALATED
    ) {
      notifyType = 'reminder_approval';
      notifyTitle = '【月度催办】报销单待审批';
      notifyContent = `报销单"${rb.title}"(${rb.totalAmount.toFixed(2)}元)提交已超过7天仍未处理，请尽快审批。`;

      const approvers = await prisma.employee.findMany({
        where: {
          role: { in: ['DEPARTMENT_HEAD', 'ADMIN'] },
        },
      });
      for (const approver of approvers) {
        await createNotification({
          employeeId: approver.id,
          reimbursementId: rb.id,
          title: notifyTitle,
          content: notifyContent,
          type: notifyType,
        });
      }
    }

    if (rb.status === ReimbursementStatus.PENDING_FINANCE) {
      notifyType = 'reminder_finance';
      notifyTitle = '【月度催办】报销单待财务审核';
      notifyContent = `报销单"${rb.title}"(${rb.totalAmount.toFixed(2)}元)提交已超过7天仍未财务审核，请尽快处理。`;

      const financeEmployees = await prisma.employee.findMany({
        where: { role: { in: ['FINANCE_HEAD', 'ADMIN'] } },
      });
      for (const fin of financeEmployees) {
        await createNotification({
          employeeId: fin.id,
          reimbursementId: rb.id,
          title: notifyTitle,
          content: notifyContent,
          type: notifyType,
        });
      }
    }

    await createNotification({
      employeeId: rb.employeeId,
      reimbursementId: rb.id,
      title: '【月度催办】您的报销单仍在处理中',
      content: `您的报销单"${rb.title}"提交已超过7天，我们已通知相关人员尽快处理。`,
      type: 'reminder_applicant',
    });
  }

  sendToRenderer('notification:new', {
    type: 'monthly_reminder',
    count: pendingList.length,
  });
  showDesktopNotification(
    '月度催办通知已生成',
    `共扫描到 ${pendingList.length} 个逾期未处理的报销单`
  );

  console.log(`月度催办完成，处理了 ${pendingList.length} 个逾期报销单`);
  return pendingList.length;
}
