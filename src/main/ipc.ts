import { ipcMain, dialog, shell } from 'electron';
import * as employeeService from './services/employeeService';
import * as departmentService from './services/departmentService';
import * as budgetService from './services/budgetService';
import * as reimbursementService from './services/reimbursementService';
import * as approvalService from './services/approvalService';
import * as notificationService from './services/notificationService';
import * as statisticsService from './services/statisticsService';
import * as authService from './services/authService';
import * as path from 'path';
import { getMainWindow } from './main';
import { Role } from './types/enums';
import { getPrismaClient } from './services/database';

export function setupIPCHandlers() {
  ipcMain.handle('auth:login', async (_event, employeeNo, password) => {
    const user = await employeeService.login(employeeNo, password);
    if (user) {
      authService.setCurrentAuthUser(user);
    }
    return user;
  });

  ipcMain.handle('auth:logout', async () => {
    authService.setCurrentAuthUser(null);
    return { success: true };
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return authService.getCurrentAuthUser();
  });

  ipcMain.handle('employee:getAll', async (_event, params) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.DEPARTMENT_HEAD, Role.ADMIN]);
    return employeeService.getAllEmployees(params);
  });

  ipcMain.handle('employee:getById', async (_event, id) => {
    authService.requireLogin();
    return employeeService.getEmployeeById(id);
  });

  ipcMain.handle('employee:create', async (_event, data) => {
    authService.requireRole([Role.ADMIN]);
    return employeeService.createEmployee(data);
  });

  ipcMain.handle('employee:update', async (_event, id, data) => {
    authService.requireRole([Role.ADMIN]);
    return employeeService.updateEmployee(id, data);
  });

  ipcMain.handle('employee:delete', async (_event, id) => {
    authService.requireRole([Role.ADMIN]);
    return employeeService.deleteEmployee(id);
  });

  ipcMain.handle('department:getAll', async () => {
    authService.requireLogin();
    return departmentService.getAllDepartments();
  });

  ipcMain.handle('department:create', async (_event, data) => {
    authService.requireRole([Role.ADMIN]);
    return departmentService.createDepartment(data);
  });

  ipcMain.handle('department:update', async (_event, id, data) => {
    authService.requireRole([Role.ADMIN]);
    return departmentService.updateDepartment(id, data);
  });

  ipcMain.handle('department:delete', async (_event, id) => {
    authService.requireRole([Role.ADMIN]);
    return departmentService.deleteDepartment(id);
  });

  ipcMain.handle('budget:getAll', async (_event, params) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);
    return budgetService.getAllBudgets(params);
  });

  ipcMain.handle('budget:getByDeptAndCategory', async (_event, deptId, category, year, month) => {
    authService.requireLogin();
    return budgetService.getBudgetByDeptAndCategory(deptId, category, year, month);
  });

  ipcMain.handle('budget:create', async (_event, data) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    return budgetService.createBudget(data);
  });

  ipcMain.handle('budget:update', async (_event, id, data) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    return budgetService.updateBudget(id, data);
  });

  ipcMain.handle('reimbursement:getAll', async (_event, params) => {
    authService.requireLogin();
    return reimbursementService.getAllReimbursements(params);
  });

  ipcMain.handle('reimbursement:getById', async (_event, id) => {
    authService.requireLogin();
    return reimbursementService.getReimbursementById(id);
  });

  ipcMain.handle('reimbursement:create', async (_event, data) => {
    authService.requireLogin();
    return reimbursementService.createReimbursement(data);
  });

  ipcMain.handle('reimbursement:update', async (_event, id, data) => {
    const user = authService.requireLogin();
    const rb = await reimbursementService.getReimbursementById(id);
    if (rb && rb.employeeId !== user.id && user.role !== Role.ADMIN) {
      throw new Error('无权修改他人的报销单');
    }
    return reimbursementService.updateReimbursement(id, data);
  });

  ipcMain.handle('reimbursement:submit', async (_event, id) => {
    const user = authService.requireLogin();
    const rb = await reimbursementService.getReimbursementById(id);
    if (rb && rb.employeeId !== user.id && user.role !== Role.ADMIN) {
      throw new Error('无权提交他人的报销单');
    }
    return reimbursementService.submitReimbursement(id);
  });

  ipcMain.handle('reimbursement:delete', async (_event, id) => {
    const user = authService.requireLogin();
    const rb = await reimbursementService.getReimbursementById(id);
    if (rb && rb.employeeId !== user.id && user.role !== Role.ADMIN) {
      throw new Error('无权删除他人的报销单');
    }
    return reimbursementService.deleteReimbursement(id);
  });

  ipcMain.handle('reimbursement:validate', async (_event, data) => {
    authService.requireLogin();
    const { items, departmentId, year, month } = data;
    return reimbursementService.validateReimbursementItems(items, departmentId, year, month);
  });

  ipcMain.handle('reimbursement:approve', async (_event, id, approverId, comment) => {
    authService.requireRole([Role.DEPARTMENT_HEAD, Role.ADMIN]);
    const user = authService.getCurrentAuthUser()!;
    const rb = await reimbursementService.getReimbursementById(id);
    if (rb && user.role === Role.DEPARTMENT_HEAD && !authService.isDepartmentHeadOf(rb.departmentId)) {
      throw new Error('您不是该部门主管，无权审批此报销单');
    }
    return approvalService.approveReimbursement(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:reject', async (_event, id, approverId, comment) => {
    authService.requireRole([Role.DEPARTMENT_HEAD, Role.ADMIN]);
    const user = authService.getCurrentAuthUser()!;
    const rb = await reimbursementService.getReimbursementById(id);
    if (rb && user.role === Role.DEPARTMENT_HEAD && !authService.isDepartmentHeadOf(rb.departmentId)) {
      throw new Error('您不是该部门主管，无权拒绝此报销单');
    }
    return approvalService.rejectReimbursement(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:financeApprove', async (_event, id, approverId, comment) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    return approvalService.financeApprove(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:financeReject', async (_event, id, approverId, comment) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    return approvalService.financeReject(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:markAsPaid', async (_event, id) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    return approvalService.markAsPaid(id);
  });

  ipcMain.handle('notification:getMy', async (_event, employeeId) => {
    authService.requireLogin();
    const user = authService.getCurrentAuthUser()!;
    if (employeeId !== user.id && user.role !== Role.ADMIN) {
      throw new Error('无权查看他人的通知');
    }
    return notificationService.getMyNotifications(employeeId);
  });

  ipcMain.handle('notification:markRead', async (_event, id) => {
    authService.requireLogin();
    return notificationService.markNotificationRead(id);
  });

  ipcMain.handle('statistics:byDepartment', async (_event, year, month) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);
    return statisticsService.getStatisticsByDepartment(year, month);
  });

  ipcMain.handle('statistics:byCategory', async (_event, year, month) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);
    return statisticsService.getStatisticsByCategory(year, month);
  });

  ipcMain.handle('statistics:exportReport', async (_event, year, month, filePath) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);

    if (filePath) {
      return statisticsService.exportMonthlyReport(year, month, filePath);
    }

    const mainWindow = getMainWindow();
    const defaultName = `报销月度报表_${year}年${month}月_${new Date().getTime()}.xlsx`;

    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '导出Excel月度报表',
      defaultPath: defaultName,
      filters: [
        { name: 'Excel文件', extensions: ['xlsx'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const savePath = result.filePath.endsWith('.xlsx')
      ? result.filePath
      : result.filePath + '.xlsx';

    const exportResult = await statisticsService.exportMonthlyReport(year, month, savePath);

    if (exportResult.success) {
      shell.showItemInFolder(savePath);
    }

    return exportResult;
  });

  ipcMain.handle('scheduler:checkOverdue', async () => {
    authService.requireRole([Role.ADMIN]);
    return approvalService.checkAndEscalateOverdue();
  });

  ipcMain.handle('budget:getWarnings', async (_event, params) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);
    return budgetService.getBudgetWarnings(params);
  });

  ipcMain.handle('budget:getReimbursements', async (_event, departmentId, category, year, month) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN, Role.DEPARTMENT_HEAD]);
    const currentUser = authService.getCurrentAuthUser();
    if (currentUser?.role === Role.DEPARTMENT_HEAD) {
      if (currentUser.departmentId !== departmentId) {
        throw new Error('部门主管只能查看本部门预算占用明细');
      }
    }
    return budgetService.getBudgetReimbursements(departmentId, category, year, month);
  });

  ipcMain.handle('notification:markAllRead', async (_event, employeeId) => {
    authService.requireLogin();
    const currentUser = authService.getCurrentAuthUser();
    if (!currentUser || currentUser.id !== employeeId) {
      throw new Error('只能标记自己的通知为已读');
    }
    return budgetService.markAllNotificationsRead(employeeId);
  });

  ipcMain.handle('reimbursement:batchFinanceApprove', async (_event, ids) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    const results = {
      success: [] as number[],
      failed: [] as { id: number; reimburseNo: string; reason: string }[],
    };
    for (const id of ids) {
      try {
        await approvalService.financeApprove(id, '批量财务审核通过', authService.getCurrentAuthUser()?.id);
        results.success.push(id);
      } catch (err: any) {
        const reim = await getPrismaClient().reimbursement.findUnique({ where: { id } });
        results.failed.push({
          id,
          reimburseNo: reim?.reimburseNo || String(id),
          reason: err?.message || '未知错误',
        });
      }
    }
    return results;
  });

  ipcMain.handle('reimbursement:batchFinanceReject', async (_event, ids, comment) => {
    authService.requireRole([Role.FINANCE_HEAD, Role.ADMIN]);
    const results = {
      success: [] as number[],
      failed: [] as { id: number; reimburseNo: string; reason: string }[],
    };
    for (const id of ids) {
      try {
        await approvalService.financeReject(id, comment || '批量财务审核退回', authService.getCurrentAuthUser()?.id);
        results.success.push(id);
      } catch (err: any) {
        const reim = await getPrismaClient().reimbursement.findUnique({ where: { id } });
        results.failed.push({
          id,
          reimburseNo: reim?.reimburseNo || String(id),
          reason: err?.message || '未知错误',
        });
      }
    }
    return results;
  });
}
