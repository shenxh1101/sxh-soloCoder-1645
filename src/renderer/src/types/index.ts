export type Role = 'EMPLOYEE' | 'DEPARTMENT_HEAD' | 'FINANCE_HEAD' | 'ADMIN';

export type ReimbursementStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'ESCALATED'
  | 'PENDING_FINANCE'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID';

export type BudgetCategory =
  | 'TRAVEL'
  | 'ENTERTAINMENT'
  | 'OFFICE_SUPPLIES'
  | 'MEAL'
  | 'TRANSPORTATION'
  | 'COMMUNICATION'
  | 'TRAINING'
  | 'OTHER';

export interface Department {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Employee {
  id: number;
  employeeNo: string;
  name: string;
  password?: string;
  email?: string;
  phone?: string;
  role: Role;
  departmentId?: number;
  department?: Department;
  createdAt: string;
}

export interface Budget {
  id: number;
  departmentId: number;
  department?: Department;
  category: BudgetCategory;
  year: number;
  month: number;
  totalAmount: number;
  usedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementItem {
  id: number;
  reimbursementId: number;
  category: BudgetCategory;
  amount: number;
  invoiceNo: string;
  invoiceDate: string;
  description?: string;
  createdAt: string;
}

export interface ApprovalRecord {
  id: number;
  reimbursementId: number;
  approverId: number;
  approver?: Employee;
  approvalType: 'DEPARTMENT_HEAD' | 'MANAGER_ESCALATION' | 'FINANCE';
  action: 'APPROVE' | 'REJECT' | 'ESCALATE';
  comment?: string;
  createdAt: string;
}

export interface Reimbursement {
  id: number;
  reimburseNo: string;
  title: string;
  employeeId: number;
  employee?: Employee;
  departmentId?: number;
  department?: Department;
  totalAmount: number;
  status: ReimbursementStatus;
  submitDate?: string;
  approvalDate?: string;
  financeDate?: string;
  paidDate?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items?: ReimbursementItem[];
  approvals?: ApprovalRecord[];
}

export interface Notification {
  id: number;
  employeeId: number;
  reimbursementId?: number;
  reimbursement?: Reimbursement;
  budgetId?: number;
  budget?: Budget;
  title: string;
  content: string;
  isRead: boolean;
  type: string;
  createdAt: string;
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
  submitDate: string | null;
  categoryItems: {
    id: number;
    description: string;
    amount: number;
    invoiceNo: string;
  }[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const CATEGORY_NAMES: Record<BudgetCategory, string> = {
  TRAVEL: '差旅费',
  ENTERTAINMENT: '业务招待费',
  OFFICE_SUPPLIES: '办公用品费',
  MEAL: '餐饮费',
  TRANSPORTATION: '交通费',
  COMMUNICATION: '通讯费',
  TRAINING: '培训费',
  OTHER: '其他费用',
};

export const STATUS_NAMES: Record<ReimbursementStatus, string> = {
  DRAFT: '草稿',
  PENDING_APPROVAL: '待部门审批',
  ESCALATED: '已升级经理审批',
  PENDING_FINANCE: '待财务审核',
  APPROVED: '审核通过',
  REJECTED: '已拒绝',
  PAID: '已支付',
};

export const STATUS_COLORS: Record<ReimbursementStatus, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  ESCALATED: 'orange',
  PENDING_FINANCE: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  PAID: 'green',
};

export const ROLE_NAMES: Record<Role, string> = {
  EMPLOYEE: '普通员工',
  DEPARTMENT_HEAD: '部门主管',
  FINANCE_HEAD: '财务主管',
  ADMIN: '系统管理员',
};

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

export const APPROVAL_TYPE_NAMES: Record<string, string> = {
  DEPARTMENT_HEAD: '部门主管审批',
  MANAGER_ESCALATION: '经理复核',
  FINANCE: '财务审核',
};

export type BudgetAdjustmentType = 'INCREASE' | 'DECREASE';
export type BudgetAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface BudgetAdjustment {
  id: number;
  budgetId: number;
  budget?: Budget & {
    department: Department;
  };
  applicantId: number;
  applicant?: Employee;
  approverId?: number;
  approver?: Employee;
  adjustmentType: BudgetAdjustmentType;
  amount: number;
  reason: string;
  status: BudgetAdjustmentStatus;
  approvalComment?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const ADJUSTMENT_TYPE_NAMES: Record<BudgetAdjustmentType, string> = {
  INCREASE: '追加预算',
  DECREASE: '调减预算',
};

export const ADJUSTMENT_STATUS_NAMES: Record<BudgetAdjustmentStatus, string> = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

export const ADJUSTMENT_STATUS_COLORS: Record<BudgetAdjustmentStatus, string> = {
  PENDING: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
};
