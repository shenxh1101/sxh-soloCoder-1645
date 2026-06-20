import { contextBridge, ipcRenderer } from 'electron';

const electronAPI = {
  login: (employeeNo: string, password: string) =>
    ipcRenderer.invoke('auth:login', employeeNo, password),

  logout: () => ipcRenderer.invoke('auth:logout'),

  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

  getAllEmployees: (params?: any) => ipcRenderer.invoke('employee:getAll', params),
  getEmployeeById: (id: number) => ipcRenderer.invoke('employee:getById', id),
  createEmployee: (data: any) => ipcRenderer.invoke('employee:create', data),
  updateEmployee: (id: number, data: any) => ipcRenderer.invoke('employee:update', id, data),
  deleteEmployee: (id: number) => ipcRenderer.invoke('employee:delete', id),

  getAllDepartments: () => ipcRenderer.invoke('department:getAll'),
  createDepartment: (data: any) => ipcRenderer.invoke('department:create', data),
  updateDepartment: (id: number, data: any) => ipcRenderer.invoke('department:update', id, data),
  deleteDepartment: (id: number) => ipcRenderer.invoke('department:delete', id),

  getBudgets: (params?: any) => ipcRenderer.invoke('budget:getAll', params),
  getBudgetByDeptAndCategory: (deptId: number, category: string, year: number, month: number) =>
    ipcRenderer.invoke('budget:getByDeptAndCategory', deptId, category, year, month),
  createBudget: (data: any) => ipcRenderer.invoke('budget:create', data),
  updateBudget: (id: number, data: any) => ipcRenderer.invoke('budget:update', id, data),
  getBudgetWarnings: (params?: any) => ipcRenderer.invoke('budget:getWarnings', params),
  getBudgetReimbursements: (departmentId: number, category: string, year: number, month: number) =>
    ipcRenderer.invoke('budget:getReimbursements', departmentId, category, year, month),

  createBudgetAdjustment: (params: any) => ipcRenderer.invoke('budgetAdjustment:create', params),
  approveBudgetAdjustment: (adjustmentId: number, comment?: string) =>
    ipcRenderer.invoke('budgetAdjustment:approve', adjustmentId, comment),
  rejectBudgetAdjustment: (adjustmentId: number, comment: string) =>
    ipcRenderer.invoke('budgetAdjustment:reject', adjustmentId, comment),
  getBudgetAdjustments: (params?: any) => ipcRenderer.invoke('budgetAdjustment:getList', params),
  getBudgetAdjustmentsByBudgetId: (budgetId: number) =>
    ipcRenderer.invoke('budgetAdjustment:getByBudgetId', budgetId),

  getReimbursements: (params?: any) => ipcRenderer.invoke('reimbursement:getAll', params),
  getReimbursementById: (id: number) => ipcRenderer.invoke('reimbursement:getById', id),
  createReimbursement: (data: any) => ipcRenderer.invoke('reimbursement:create', data),
  updateReimbursement: (id: number, data: any) => ipcRenderer.invoke('reimbursement:update', id, data),
  submitReimbursement: (id: number) => ipcRenderer.invoke('reimbursement:submit', id),
  deleteReimbursement: (id: number) => ipcRenderer.invoke('reimbursement:delete', id),
  validateReimbursement: (data: any) => ipcRenderer.invoke('reimbursement:validate', data),

  approveReimbursement: (id: number, approverId: number, comment?: string) =>
    ipcRenderer.invoke('reimbursement:approve', id, approverId, comment),
  rejectReimbursement: (id: number, approverId: number, comment: string) =>
    ipcRenderer.invoke('reimbursement:reject', id, approverId, comment),
  financeApprove: (id: number, approverId: number, comment?: string) =>
    ipcRenderer.invoke('reimbursement:financeApprove', id, approverId, comment),
  financeReject: (id: number, approverId: number, comment: string) =>
    ipcRenderer.invoke('reimbursement:financeReject', id, approverId, comment),
  markAsPaid: (id: number) => ipcRenderer.invoke('reimbursement:markAsPaid', id),
  batchFinanceApprove: (ids: number[]) => ipcRenderer.invoke('reimbursement:batchFinanceApprove', ids),
  batchFinanceReject: (ids: number[], comment: string) =>
    ipcRenderer.invoke('reimbursement:batchFinanceReject', ids, comment),

  getMyNotifications: (employeeId: number) =>
    ipcRenderer.invoke('notification:getMy', employeeId),
  markNotificationRead: (id: number) =>
    ipcRenderer.invoke('notification:markRead', id),
  markAllNotificationsRead: (employeeId: number) =>
    ipcRenderer.invoke('notification:markAllRead', employeeId),

  getStatisticsByDepartment: (year: number, month: number) =>
    ipcRenderer.invoke('statistics:byDepartment', year, month),
  getStatisticsByCategory: (year: number, month: number) =>
    ipcRenderer.invoke('statistics:byCategory', year, month),
  exportMonthlyReport: (year: number, month: number, filePath?: string) =>
    ipcRenderer.invoke('statistics:exportReport', year, month, filePath),

  checkOverdueReimbursements: () =>
    ipcRenderer.invoke('scheduler:checkOverdue'),

  onNotification: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('notification:new', subscription);
    return () => ipcRenderer.removeListener('notification:new', subscription);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
