import { getPrismaClient } from './database';
import { Notification } from '@prisma/client';

export async function getMyNotifications(employeeId: number): Promise<Notification[]> {
  const prisma = getPrismaClient();
  return prisma.notification.findMany({
    where: { employeeId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      reimbursement: {
        include: { employee: true },
      },
    },
  });
}

export async function createNotification(data: any): Promise<Notification> {
  const prisma = getPrismaClient();
  return prisma.notification.create({
    data: {
      employeeId: data.employeeId,
      reimbursementId: data.reimbursementId,
      title: data.title,
      content: data.content,
      type: data.type,
    },
  });
}

export async function markNotificationRead(id: number): Promise<Notification> {
  const prisma = getPrismaClient();
  return prisma.notification.update({
    where: { id },
    data: { isRead: true },
  });
}

export async function markAllRead(employeeId: number): Promise<number> {
  const prisma = getPrismaClient();
  const result = await prisma.notification.updateMany({
    where: { employeeId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}

export async function getUnreadCount(employeeId: number): Promise<number> {
  const prisma = getPrismaClient();
  return prisma.notification.count({
    where: { employeeId, isRead: false },
  });
}
