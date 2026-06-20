import { PrismaClient } from '@prisma/client';
import { Role, BudgetCategory } from '../src/main/types/enums';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  await prisma.notification.deleteMany();
  await prisma.approvalRecord.deleteMany();
  await prisma.reimbursementItem.deleteMany();
  await prisma.reimbursement.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  const techDept = await prisma.department.create({
    data: { name: '技术部', description: '负责公司技术研发工作' },
  });
  const marketDept = await prisma.department.create({
    data: { name: '市场部', description: '负责公司市场营销工作' },
  });
  const financeDept = await prisma.department.create({
    data: { name: '财务部', description: '负责公司财务管理工作' },
  });
  const hrDept = await prisma.department.create({
    data: { name: '人事部', description: '负责公司人力资源管理工作' },
  });
  const adminDept = await prisma.department.create({
    data: { name: '行政部', description: '负责公司行政管理工作' },
  });
  console.log('创建部门: 5');

  const employeesData = [
    {
      employeeNo: 'ADMIN001',
      name: '系统管理员',
      password: '123456',
      email: 'admin@company.com',
      phone: '13800000000',
      role: Role.ADMIN,
      departmentId: hrDept.id,
    },
    {
      employeeNo: 'EMP001',
      name: '张三',
      password: '123456',
      email: 'zhangsan@company.com',
      phone: '13800000001',
      role: Role.EMPLOYEE,
      departmentId: techDept.id,
    },
    {
      employeeNo: 'EMP002',
      name: '李四',
      password: '123456',
      email: 'lisi@company.com',
      phone: '13800000002',
      role: Role.EMPLOYEE,
      departmentId: marketDept.id,
    },
    {
      employeeNo: 'HEAD001',
      name: '王主管',
      password: '123456',
      email: 'wanghead@company.com',
      phone: '13800000003',
      role: Role.DEPARTMENT_HEAD,
      departmentId: techDept.id,
    },
    {
      employeeNo: 'HEAD002',
      name: '赵主管',
      password: '123456',
      email: 'zhaohead@company.com',
      phone: '13800000004',
      role: Role.DEPARTMENT_HEAD,
      departmentId: marketDept.id,
    },
    {
      employeeNo: 'FIN001',
      name: '钱财务',
      password: '123456',
      email: 'qianfin@company.com',
      phone: '13800000005',
      role: Role.FINANCE_HEAD,
      departmentId: financeDept.id,
    },
    {
      employeeNo: 'MGR001',
      name: '孙经理',
      password: '123456',
      email: 'sunmgr@company.com',
      phone: '13800000006',
      role: Role.DEPARTMENT_HEAD,
      departmentId: techDept.id,
    },
  ];

  for (const emp of employeesData) {
    await prisma.employee.create({ data: emp });
  }
  console.log(`创建员工: ${employeesData.length}`);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const categories = Object.values(BudgetCategory);
  const depts = [techDept, marketDept, financeDept, hrDept, adminDept];
  let budgetCount = 0;

  for (const dept of depts) {
    for (const cat of categories) {
      await prisma.budget.create({
        data: {
          departmentId: dept.id,
          category: cat,
          year: currentYear,
          month: currentMonth,
          totalAmount: 50000,
          usedAmount: Math.floor(Math.random() * 10000),
        },
      });
      budgetCount++;
    }
  }
  console.log(`创建预算: ${budgetCount}`);

  console.log('数据库初始化完成!');
  console.log('');
  console.log('测试账号:');
  console.log('  系统管理员: ADMIN001 / 123456');
  console.log('  普通员工(技术部): EMP001 / 123456');
  console.log('  普通员工(市场部): EMP002 / 123456');
  console.log('  部门主管(技术部): HEAD001 / 123456');
  console.log('  部门主管(市场部): HEAD002 / 123456');
  console.log('  财务主管: FIN001 / 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
