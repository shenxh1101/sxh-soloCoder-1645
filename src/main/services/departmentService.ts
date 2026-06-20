import { getPrismaClient } from './database';
import { Department } from '@prisma/client';

export async function getAllDepartments(): Promise<Department[]> {
  const prisma = getPrismaClient();
  return prisma.department.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      employees: true,
      budgets: true,
    },
  });
}

export async function createDepartment(data: any): Promise<Department> {
  const prisma = getPrismaClient();
  return prisma.department.create({
    data: {
      name: data.name,
      description: data.description,
    },
    include: { employees: true, budgets: true },
  });
}

export async function updateDepartment(id: number, data: any): Promise<Department> {
  const prisma = getPrismaClient();
  return prisma.department.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
    },
    include: { employees: true, budgets: true },
  });
}

export async function deleteDepartment(id: number): Promise<boolean> {
  const prisma = getPrismaClient();
  await prisma.department.delete({ where: { id } });
  return true;
}
