export const Role = {
  EMPLOYEE: 'EMPLOYEE',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  FINANCE_HEAD: 'FINANCE_HEAD',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ReimbursementStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PENDING_FINANCE: 'PENDING_FINANCE',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  PAID: 'PAID',
  ESCALATED: 'ESCALATED',
} as const;

export type ReimbursementStatus = (typeof ReimbursementStatus)[keyof typeof ReimbursementStatus];

export const ApprovalType = {
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  MANAGER_ESCALATION: 'MANAGER_ESCALATION',
  FINANCE: 'FINANCE',
} as const;

export type ApprovalType = (typeof ApprovalType)[keyof typeof ApprovalType];

export const ApprovalAction = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  ESCALATE: 'ESCALATE',
} as const;

export type ApprovalAction = (typeof ApprovalAction)[keyof typeof ApprovalAction];

export const BudgetCategory = {
  TRAVEL: 'TRAVEL',
  ENTERTAINMENT: 'ENTERTAINMENT',
  OFFICE_SUPPLIES: 'OFFICE_SUPPLIES',
  MEAL: 'MEAL',
  TRANSPORTATION: 'TRANSPORTATION',
  COMMUNICATION: 'COMMUNICATION',
  TRAINING: 'TRAINING',
  OTHER: 'OTHER',
} as const;

export type BudgetCategory = (typeof BudgetCategory)[keyof typeof BudgetCategory];
