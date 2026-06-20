import { getPrismaClient } from './database';
import {
  ReimbursementStatus,
  BudgetCategory,
  Role,
} from '../types/enums';
import { checkBudgetBalance } from './budgetService';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ReimbursementItemData {
  category: BudgetCategory;
  amount: number;
  invoiceNo: string;
  invoiceDate: Date;
  description?: string;
}

export function validateInvoiceNo(invoiceNo: string): { valid: boolean; error?: string } {
  if (!invoiceNo || invoiceNo.trim() === '') {
    return { valid: false, error: '发票号码不能为空' };
  }

  const invoicePatterns = [
    /^[0-9]{8,20}$/,
    /^[A-Z]{2}[0-9]{8,20}$/,
    /^[0-9]{10,12}$/,
    /^[0-9]{18,20}$/,
  ];

  const normalizedNo = invoiceNo.trim().toUpperCase();
  const isValid = invoicePatterns.some((pattern) => pattern.test(normalizedNo));

  if (!isValid) {
    return {
      valid: false,
      error: `发票号码"${invoiceNo}"格式不正确，应为8-20位数字或字母开头的号码`,
    };
  }

  return { valid: true };
}

export function validateAmount(
  amount: number,
  category: BudgetCategory
): { valid: boolean; error?: string } {
  if (!amount || amount <= 0) {
    return { valid: false, error: '报销金额必须大于0' };
  }

  const categoryLimits: Record<BudgetCategory, number> = {
    [BudgetCategory.TRAVEL]: 50000,
    [BudgetCategory.ENTERTAINMENT]: 20000,
    [BudgetCategory.OFFICE_SUPPLIES]: 10000,
    [BudgetCategory.MEAL]: 5000,
    [BudgetCategory.TRANSPORTATION]: 10000,
    [BudgetCategory.COMMUNICATION]: 2000,
    [BudgetCategory.TRAINING]: 30000,
    [BudgetCategory.OTHER]: 10000,
  };

  const limit = categoryLimits[category] || 10000;
  if (amount > limit) {
    return {
      valid: false,
      error: `${getCategoryName(category)}单笔金额${amount.toFixed(2)}元超过限额${limit}元`,
    };
  }

  return { valid: true };
}

export function getCategoryName(category: BudgetCategory): string {
  const names: Record<BudgetCategory, string> = {
    [BudgetCategory.TRAVEL]: '差旅费',
    [BudgetCategory.ENTERTAINMENT]: '业务招待费',
    [BudgetCategory.OFFICE_SUPPLIES]: '办公用品费',
    [BudgetCategory.MEAL]: '餐饮费',
    [BudgetCategory.TRANSPORTATION]: '交通费',
    [BudgetCategory.COMMUNICATION]: '通讯费',
    [BudgetCategory.TRAINING]: '培训费',
    [BudgetCategory.OTHER]: '其他费用',
  };
  return names[category] || '其他费用';
}

export async function validateReimbursementItems(
  items: ReimbursementItemData[],
  departmentId: number,
  year: number,
  month: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const categoryTotals: Record<string, number> = {};

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const invoiceCheck = validateInvoiceNo(item.invoiceNo);
    if (!invoiceCheck.valid) {
      errors.push(`第${i + 1}项: ${invoiceCheck.error}`);
    }

    const amountCheck = validateAmount(item.amount, item.category);
    if (!amountCheck.valid) {
      errors.push(`第${i + 1}项: ${amountCheck.error}`);
    }

    categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
  }

  for (const [category, total] of Object.entries(categoryTotals)) {
    const budgetCheck = await checkBudgetBalance(
      departmentId,
      category as BudgetCategory,
      year,
      month,
      total
    );
    if (!budgetCheck.sufficient) {
      errors.push(
        `${getCategoryName(category as BudgetCategory)}月度预算不足，已使用${budgetCheck.used.toFixed(
          2
        )}元/总额度${budgetCheck.total.toFixed(2)}元，还需报销${total.toFixed(2)}元，超出${(
          total - budgetCheck.remaining
        ).toFixed(2)}元`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export async function validateFinanceCategoryMatch(
  items: ReimbursementItemData[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const allowedCategories = Object.values(BudgetCategory);

  const categoryKeywords: Record<BudgetCategory, string[]> = {
    [BudgetCategory.TRAVEL]: ['机票', '飞机票', '火车票', '高铁', '动车', '酒店', '住宿', '差旅', '出差', '航空', '机票', '打票', '行程', '携程', '飞猪', '去哪儿', '航空', '出行'],
    [BudgetCategory.ENTERTAINMENT]: ['招待', '宴请', '礼品', '礼物', '客户', '应酬', '烟酒', '茶叶', '公关', '商务', '接待'],
    [BudgetCategory.OFFICE_SUPPLIES]: ['文具', '纸张', '打印', '墨盒', '硒鼓', '笔', '本子', '文件夹', '订书机', '办公', '耗材', '电脑', '打印机', '显示器', '键盘', '鼠标', 'U盘', '硬盘', '设备'],
    [BudgetCategory.MEAL]: ['餐', '饭', '餐饮', '美食', '外卖', '午餐', '晚餐', '早餐', '聚餐', '食堂', '餐厅', '饭馆', '饭店', '麦当劳', '肯德基', '星巴克', '咖啡'],
    [BudgetCategory.TRANSPORTATION]: ['出租', '打车', '滴滴', '快车', '专车', '地铁', '公交', '巴士', '出租车', '网约车', '加油', '停车', '过路费', '高速', 'ETC', '加油票'],
    [BudgetCategory.COMMUNICATION]: ['电话', '话费', '手机', '流量', '通讯', '宽带', '网络', '电信', '移动', '联通'],
    [BudgetCategory.TRAINING]: ['培训', '课程', '学习', '讲座', '会议', '研讨', '认证', '考试', '教材', '学费'],
    [BudgetCategory.OTHER]: ['其他', '杂项', '零星'],
  };

  const categoryHintKeywords: Record<BudgetCategory, string[]> = {
    [BudgetCategory.TRAVEL]: [],
    [BudgetCategory.ENTERTAINMENT]: [],
    [BudgetCategory.OFFICE_SUPPLIES]: [],
    [BudgetCategory.MEAL]: [],
    [BudgetCategory.TRANSPORTATION]: [],
    [BudgetCategory.COMMUNICATION]: [],
    [BudgetCategory.TRAINING]: [],
    [BudgetCategory.OTHER]: [],
  };

  items.forEach((item, index) => {
    if (!allowedCategories.includes(item.category)) {
      errors.push(`第${index + 1}项: 费用类别"${item.category}"不是有效的预算科目`);
      return;
    }

    const desc = (item.description || '').trim();
    const categoryName = getCategoryName(item.category);

    if (!desc || desc.length < 2) {
      errors.push(`第${index + 1}项: ${categoryName}费用说明过短（"${desc || '空'}"），请补充更详细的费用说明以便审核`);
      return;
    }

    const keywords = categoryKeywords[item.category] || [];
    const descLower = desc.toLowerCase();
    const matched = keywords.some((kw) => descLower.includes(kw.toLowerCase()));

    if (!matched) {
      let hintCategory = '';
      for (const [cat, kws] of Object.entries(categoryKeywords)) {
        if (cat === item.category) continue;
        const hasMatch = kws.some((kw) => descLower.includes(kw.toLowerCase()));
        if (hasMatch) {
          hintCategory = getCategoryName(cat as BudgetCategory);
          break;
        }
      }

      const expectedExamples = keywords.slice(0, 5).join('、');
      if (hintCategory) {
        errors.push(
          `第${index + 1}项: 费用类别"${categoryName}"与说明"${desc}"明显不匹配。说明内容更像是【${hintCategory}】。${categoryName}通常应包含如：${expectedExamples}等关键词`
        );
      } else {
        errors.push(
          `第${index + 1}项: 费用类别"${categoryName}"与说明"${desc}"匹配度不足。${categoryName}通常应包含如：${expectedExamples}等关键词，请核对类别是否正确或补充说明`
        );
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

export async function getAllReimbursements(
  params?: any
): Promise<{ data: any[]; total: number }> {
  const prisma = getPrismaClient();
  const {
    page = 1,
    pageSize = 10,
    status,
    employeeId,
    departmentId,
    keyword,
    approverId,
  } = params || {};
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  if (departmentId) where.departmentId = departmentId;
  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { reimburseNo: { contains: keyword } },
      { description: { contains: keyword } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.reimbursement.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        employee: { include: { department: true } },
        department: true,
        items: true,
        approvals: { include: { approver: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.reimbursement.count({ where }),
  ]);

  return { data, total };
}

export async function getReimbursementById(id: number): Promise<any | null> {
  const prisma = getPrismaClient();
  return prisma.reimbursement.findUnique({
    where: { id },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });
}

function generateReimburseNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `BX${year}${month}${day}${random}`;
}

export async function createReimbursement(data: any): Promise<any> {
  const prisma = getPrismaClient();
  const reimburseNo = generateReimburseNo();

  const items = data.items || [];
  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

  return prisma.reimbursement.create({
    data: {
      reimburseNo,
      title: data.title,
      employeeId: data.employeeId,
      departmentId: data.departmentId,
      totalAmount,
      description: data.description,
      items: {
        create: items.map((item: any) => ({
          category: item.category,
          amount: item.amount,
          invoiceNo: item.invoiceNo,
          invoiceDate: new Date(item.invoiceDate),
          description: item.description,
        })),
      },
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });
}

export async function updateReimbursement(id: number, data: any): Promise<any> {
  const prisma = getPrismaClient();

  if (data.items) {
    await prisma.reimbursementItem.deleteMany({ where: { reimbursementId: id } });
    const totalAmount = data.items.reduce(
      (sum: number, item: any) => sum + (item.amount || 0),
      0
    );

    return prisma.reimbursement.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        totalAmount,
        items: {
          create: data.items.map((item: any) => ({
            category: item.category,
            amount: item.amount,
            invoiceNo: item.invoiceNo,
            invoiceDate: new Date(item.invoiceDate),
            description: item.description,
          })),
        },
      },
      include: {
        employee: { include: { department: true } },
        department: true,
        items: true,
        approvals: { include: { approver: true } },
      },
    });
  }

  return prisma.reimbursement.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });
}

export async function submitReimbursement(id: number): Promise<any> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(id);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (reimbursement.status !== ReimbursementStatus.DRAFT) {
    throw new Error('只有草稿状态的报销单可以提交');
  }

  return prisma.reimbursement.update({
    where: { id },
    data: {
      status: ReimbursementStatus.PENDING_APPROVAL,
      submitDate: new Date(),
    },
    include: {
      employee: { include: { department: true } },
      department: true,
      items: true,
      approvals: { include: { approver: true } },
    },
  });
}

export async function deleteReimbursement(id: number): Promise<boolean> {
  const prisma = getPrismaClient();
  const reimbursement = await getReimbursementById(id);

  if (!reimbursement) {
    throw new Error('报销单不存在');
  }

  if (reimbursement.status !== ReimbursementStatus.DRAFT) {
    throw new Error('只有草稿状态的报销单可以删除');
  }

  await prisma.reimbursementItem.deleteMany({ where: { reimbursementId: id } });
  await prisma.reimbursement.delete({ where: { id } });
  return true;
}
