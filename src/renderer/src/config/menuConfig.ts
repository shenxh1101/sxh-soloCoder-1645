import { Role } from '../types';

export interface MenuItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  roles: Role[];
}

export const MENU_ITEMS: MenuItem[] = [
  {
    key: 'dashboard',
    label: '工作台',
    icon: 'DashboardOutlined',
    path: '/dashboard',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'notifications',
    label: '通知中心',
    icon: 'MailOutlined',
    path: '/notifications',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'my-reimbursements',
    label: '我的报销',
    icon: 'FileTextOutlined',
    path: '/my-reimbursements',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'reimbursement-new',
    label: '新建报销',
    icon: 'PlusCircleOutlined',
    path: '/reimbursement/new',
    roles: ['EMPLOYEE', 'DEPARTMENT_HEAD', 'FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'approval',
    label: '审批管理',
    icon: 'CheckCircleOutlined',
    path: '/approval',
    roles: ['DEPARTMENT_HEAD', 'ADMIN'],
  },
  {
    key: 'finance',
    label: '财务审核',
    icon: 'DollarCircleOutlined',
    path: '/finance',
    roles: ['FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'budget',
    label: '预算管理',
    icon: 'PieChartOutlined',
    path: '/budget',
    roles: ['DEPARTMENT_HEAD', 'FINANCE_HEAD', 'ADMIN'],
  },
  {
    key: 'statistics',
    label: '统计报表',
    icon: 'BarChartOutlined',
    path: '/statistics',
    roles: ['FINANCE_HEAD', 'ADMIN', 'DEPARTMENT_HEAD'],
  },
  {
    key: 'department',
    label: '部门管理',
    icon: 'TeamOutlined',
    path: '/department',
    roles: ['ADMIN'],
  },
  {
    key: 'employee',
    label: '员工管理',
    icon: 'UserOutlined',
    path: '/employee',
    roles: ['ADMIN'],
  },
];

export function getMenusByRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => item.roles.includes(role));
}

export function hasPermission(role: Role, path: string): boolean {
  return MENU_ITEMS.some((item) => item.path === path && item.roles.includes(role));
}
