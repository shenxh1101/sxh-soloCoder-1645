import { Role } from '../types/enums';

let currentUser: {
  id: number;
  employeeNo: string;
  name: string;
  role: Role;
  departmentId: number | null;
} | null = null;

export function setCurrentAuthUser(user: any) {
  if (user) {
    currentUser = {
      id: user.id,
      employeeNo: user.employeeNo,
      name: user.name,
      role: user.role as Role,
      departmentId: user.departmentId || null,
    };
  } else {
    currentUser = null;
  }
}

export function getCurrentAuthUser() {
  return currentUser;
}

export function requireRole(allowedRoles: Role[]): boolean {
  if (!currentUser) {
    throw new Error('未登录，无权执行此操作');
  }
  if (!allowedRoles.includes(currentUser.role)) {
    const roleNames: Record<Role, string> = {
      [Role.EMPLOYEE]: '普通员工',
      [Role.DEPARTMENT_HEAD]: '部门主管',
      [Role.FINANCE_HEAD]: '财务主管',
      [Role.ADMIN]: '系统管理员',
    };
    const allowedNames = allowedRoles.map((r) => roleNames[r]).join('、');
    throw new Error(
      `您当前角色为【${roleNames[currentUser.role]}】，无权执行此操作。需要角色：${allowedNames}`
    );
  }
  return true;
}

export function requireLogin() {
  if (!currentUser) {
    throw new Error('未登录，请先登录');
  }
  return currentUser;
}

export function isDepartmentHeadOf(departmentId: number | null): boolean {
  if (!currentUser || !departmentId) return false;
  if (currentUser.role === Role.ADMIN) return true;
  if (currentUser.role === Role.DEPARTMENT_HEAD && currentUser.departmentId === departmentId) {
    return true;
  }
  return false;
}

export function isOwnerOrAdmin(ownerId: number): boolean {
  if (!currentUser) return false;
  if (currentUser.role === Role.ADMIN) return true;
  if (currentUser.id === ownerId) return true;
  return false;
}
