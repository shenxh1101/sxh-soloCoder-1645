import { ipcMain } from 'electron';
import * as employeeService from './services/employeeService';
import * as departmentService from './services/departmentService';
import * as budgetService from './services/budgetService';
import * as reimbursementService from './services/reimbursementService';
import * as approvalService from './services/approvalService';
import * as notificationService from './services/notificationService';
import * as statisticsService from './services/statisticsService';

export function setupIPCHandlers() {
  ipcMain.handle('auth:login', async (_event, employeeNo, password) => {
    return employeeService.login(employeeNo, password);
  });

  ipcMain.handle('auth:logout', async () => {
    return { success: true };
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return null;
  });

  ipcMain.handle('employee:getAll', async (_event, params) => {
    return employeeService.getAllEmployees(params);
  });

  ipcMain.handle('employee:getById', async (_event, id) => {
    return employeeService.getEmployeeById(id);
  });

  ipcMain.handle('employee:create', async (_event, data) => {
    return employeeService.createEmployee(data);
  });

  ipcMain.handle('employee:update', async (_event, id, data) => {
    return employeeService.updateEmployee(id, data);
  });

  ipcMain.handle('employee:delete', async (_event, id) => {
    return employeeService.deleteEmployee(id);
  });

  ipcMain.handle('department:getAll', async () => {
    return departmentService.getAllDepartments();
  });

  ipcMain.handle('department:create', async (_event, data) => {
    return departmentService.createDepartment(data);
  });

  ipcMain.handle('department:update', async (_event, id, data) => {
    return departmentService.updateDepartment(id, data);
  });

  ipcMain.handle('department:delete', async (_event, id) => {
    return departmentService.deleteDepartment(id);
  });

  ipcMain.handle('budget:getAll', async (_event, params) => {
    return budgetService.getAllBudgets(params);
  });

  ipcMain.handle('budget:getByDeptAndCategory', async (_event, deptId, category, year, month) => {
    return budgetService.getBudgetByDeptAndCategory(deptId, category, year, month);
  });

  ipcMain.handle('budget:create', async (_event, data) => {
    return budgetService.createBudget(data);
  });

  ipcMain.handle('budget:update', async (_event, id, data) => {
    return budgetService.updateBudget(id, data);
  });

  ipcMain.handle('reimbursement:getAll', async (_event, params) => {
    return reimbursementService.getAllReimbursements(params);
  });

  ipcMain.handle('reimbursement:getById', async (_event, id) => {
    return reimbursementService.getReimbursementById(id);
  });

  ipcMain.handle('reimbursement:create', async (_event, data) => {
    return reimbursementService.createReimbursement(data);
  });

  ipcMain.handle('reimbursement:update', async (_event, id, data) => {
    return reimbursementService.updateReimbursement(id, data);
  });

  ipcMain.handle('reimbursement:submit', async (_event, id) => {
    return reimbursementService.submitReimbursement(id);
  });

  ipcMain.handle('reimbursement:delete', async (_event, id) => {
    return reimbursementService.deleteReimbursement(id);
  });

  ipcMain.handle('reimbursement:validate', async (_event, data) => {
    const { items, departmentId, year, month } = data;
    return reimbursementService.validateReimbursementItems(items, departmentId, year, month);
  });

  ipcMain.handle('reimbursement:approve', async (_event, id, approverId, comment) => {
    return approvalService.approveReimbursement(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:reject', async (_event, id, approverId, comment) => {
    return approvalService.rejectReimbursement(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:financeApprove', async (_event, id, approverId, comment) => {
    return approvalService.financeApprove(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:financeReject', async (_event, id, approverId, comment) => {
    return approvalService.financeReject(id, approverId, comment);
  });

  ipcMain.handle('reimbursement:markAsPaid', async (_event, id) => {
    return approvalService.markAsPaid(id);
  });

  ipcMain.handle('notification:getMy', async (_event, employeeId) => {
    return notificationService.getMyNotifications(employeeId);
  });

  ipcMain.handle('notification:markRead', async (_event, id) => {
    return notificationService.markNotificationRead(id);
  });

  ipcMain.handle('statistics:byDepartment', async (_event, year, month) => {
    return statisticsService.getStatisticsByDepartment(year, month);
  });

  ipcMain.handle('statistics:byCategory', async (_event, year, month) => {
    return statisticsService.getStatisticsByCategory(year, month);
  });

  ipcMain.handle('statistics:exportReport', async (_event, year, month, filePath) => {
    return statisticsService.exportMonthlyReport(year, month, filePath);
  });

  ipcMain.handle('scheduler:checkOverdue', async () => {
    return approvalService.checkAndEscalateOverdue();
  });
}
