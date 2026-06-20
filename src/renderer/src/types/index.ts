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
  title: string;
  content: string;
  isRead: boolean;
  type: string;
  createdAt: string;
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
