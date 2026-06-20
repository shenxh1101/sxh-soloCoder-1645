import { getPrismaClient } from './database';
import { Employee } from '@prisma/client';
import { Role } from '../types/enums';

export async function login(employeeNo: string, password: string): Promise<Employee | null> {
  const prisma = getPrismaClient();
  const employee = await prisma.employee.findFirst({
    where: {
      employeeNo,
      password,
    },
    include: {
      department: true,
    },
  });
  return employee;
}

export async function getAllEmployees(params?: any): Promise<{ data: Employee[]; total: number }> {
  const prisma = getPrismaClient();
  const { page = 1, pageSize = 10, keyword = '', role } = params || {};
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { employeeNo: { contains: keyword } },
      { email: { contains: keyword } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: pageSize,
      include: { department: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.employee.count({ where }),
  ]);

  return { data, total };
}

export async function getEmployeeById(id: number): Promise<Employee | null> {
  const prisma = getPrismaClient();
  return prisma.employee.findUnique({
    where: { id },
    include: { department: true },
  });
}

export async function createEmployee(data: any): Promise<Employee> {
  const prisma = getPrismaClient();
  return prisma.employee.create({
    data: {
      employeeNo: data.employeeNo,
      name: data.name,
      password: data.password || '123456',
      email: data.email,
      phone: data.phone,
      role: data.role as Role,
      departmentId: data.departmentId,
    },
    include: { department: true },
  });
}

export async function updateEmployee(id: number, data: any): Promise<Employee> {
  const prisma = getPrismaClient();
  const updateData: any = {
    name: data.name,
    email: data.email,
    phone: data.phone,
    role: data.role as Role,
    departmentId: data.departmentId,
  };
  if (data.password) {
    updateData.password = data.password;
  }
  return prisma.employee.update({
    where: { id },
    data: updateData,
    include: { department: true },
  });
}

export async function deleteEmployee(id: number): Promise<boolean> {
  const prisma = getPrismaClient();
  await prisma.employee.delete({ where: { id } });
  return true;
}

export async function getDepartmentHeads(departmentId: number): Promise<Employee[]> {
  const prisma = getPrismaClient();
  return prisma.employee.findMany({
    where: {
      departmentId,
      role: { in: [Role.DEPARTMENT_HEAD, Role.ADMIN] },
    },
    include: { department: true },
  });
}
