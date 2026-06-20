import { getPrismaClient } from './database';
import { ReimbursementStatus, BudgetCategory } from '../types/enums';
import { getCategoryName } from './reimbursementService';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

export async function getStatisticsByDepartment(year: number, month: number) {
  const prisma = getPrismaClient();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const results: any[] = [];

  for (const dept of departments) {
    const reimbursements = await prisma.reimbursement.findMany({
      where: {
        departmentId: dept.id,
        status: {
          in: [
            ReimbursementStatus.APPROVED,
            ReimbursementStatus.PAID,
          ],
        },
        submitDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { items: true },
    });

    let totalAmount = 0;
    const categoryAmounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const rb of reimbursements) {
      for (const item of rb.items) {
        totalAmount += item.amount;
        categoryAmounts[item.category] = (categoryAmounts[item.category] || 0) + item.amount;
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      }
    }

    results.push({
      departmentId: dept.id,
      departmentName: dept.name,
      count: reimbursements.length,
      itemCount: Object.values(categoryCounts).reduce((sum, c) => sum + c, 0),
      totalAmount,
      categoryAmounts,
      categoryCounts,
    });
  }

  return results;
}

export async function getStatisticsByCategory(year: number, month: number) {
  const prisma = getPrismaClient();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const items = await prisma.reimbursementItem.findMany({
    where: {
      reimbursement: {
        status: {
          in: [ReimbursementStatus.APPROVED, ReimbursementStatus.PAID],
        },
        submitDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
    include: {
      reimbursement: {
        include: { department: true },
      },
    },
  });

  const categoryMap: Record<string, any> = {};

  for (const item of items) {
    const cat = item.category;
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        categoryName: getCategoryName(cat as BudgetCategory),
        count: 0,
        totalAmount: 0,
        departments: {},
      };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].totalAmount += item.amount;

    const deptName = item.reimbursement.department?.name || '未分配';
    if (!categoryMap[cat].departments[deptName]) {
      categoryMap[cat].departments[deptName] = { count: 0, amount: 0 };
    }
    categoryMap[cat].departments[deptName].count += 1;
    categoryMap[cat].departments[deptName].amount += item.amount;
  }

  return Object.values(categoryMap);
}

export async function exportMonthlyReport(year: number, month: number, filePath: string) {
  const prisma = getPrismaClient();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const reimbursements = await prisma.reimbursement.findMany({
    where: {
      submitDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
    orderBy: { submitDate: 'asc' },
  });

  const summaryByDept = await getStatisticsByDepartment(year, month);
  const summaryByCategory = await getStatisticsByCategory(year, month);

  const wb = XLSX.utils.book_new();

  const detailData = reimbursements.map((rb) => ({
    '报销单号': rb.reimburseNo,
    '标题': rb.title,
    '申请人': rb.employee?.name || '',
    '部门': rb.department?.name || '',
    '总金额(元)': rb.totalAmount,
    '状态': getStatusName(rb.status),
    '提交时间': rb.submitDate ? formatDate(rb.submitDate) : '',
    '审批时间': rb.approvalDate ? formatDate(rb.approvalDate) : '',
    '财务审核时间': rb.financeDate ? formatDate(rb.financeDate) : '',
    '支付时间': rb.paidDate ? formatDate(rb.paidDate) : '',
    '备注': rb.description || '',
  }));
  const detailSheet = XLSX.utils.json_to_sheet(detailData);
  detailSheet['!cols'] = [
    { wch: 18 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, detailSheet, '报销明细');

  const itemRows: any[] = [];
  for (const rb of reimbursements) {
    for (const item of rb.items) {
      itemRows.push({
        '报销单号': rb.reimburseNo,
        '申请人': rb.employee?.name || '',
        '部门': rb.department?.name || '',
        '费用类别': getCategoryName(item.category as BudgetCategory),
        '金额(元)': item.amount,
        '发票号码': item.invoiceNo,
        '发票日期': formatDate(item.invoiceDate),
        '说明': item.description || '',
      });
    }
  }
  const itemSheet = XLSX.utils.json_to_sheet(itemRows);
  itemSheet['!cols'] = [
    { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
    { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, itemSheet, '费用明细');

  const deptSummaryData = summaryByDept.map((d) => ({
    '部门': d.departmentName,
    '报销笔数': d.count,
    '费用项数': d.itemCount,
    '总金额(元)': d.totalAmount,
    ...Object.fromEntries(
      Object.entries(d.categoryAmounts).map(([k, v]) => [
        getCategoryName(k as BudgetCategory) + '(元)',
        v,
      ])
    ),
  }));
  const deptSheet = XLSX.utils.json_to_sheet(deptSummaryData);
  XLSX.utils.book_append_sheet(wb, deptSheet, '部门统计');

  const catSummaryData = summaryByCategory.map((c) => ({
    '费用类别': c.categoryName,
    '笔数': c.count,
    '总金额(元)': c.totalAmount,
  }));
  const catSheet = XLSX.utils.json_to_sheet(catSummaryData);
  catSheet['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, catSheet, '类别统计');

  XLSX.writeFile(wb, filePath);
  return { success: true, filePath, recordCount: reimbursements.length };
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getStatusName(status: string): string {
  const names: Record<string, string> = {
    [ReimbursementStatus.DRAFT]: '草稿',
    [ReimbursementStatus.PENDING_APPROVAL]: '待部门审批',
    [ReimbursementStatus.ESCALATED]: '已升级经理审批',
    [ReimbursementStatus.PENDING_FINANCE]: '待财务审核',
    [ReimbursementStatus.APPROVED]: '审核通过',
    [ReimbursementStatus.REJECTED]: '已拒绝',
    [ReimbursementStatus.PAID]: '已支付',
  };
  return names[status] || status;
}
