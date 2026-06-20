import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  message,
  Progress,
  Tag,
  Card,
  Row,
  Col,
  Tabs,
  Statistic,
  Empty,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  RiseOutlined,
  FallOutlined,
  HistoryOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, api } from '../utils/auth';
import {
  Budget as BudgetModel,
  BudgetCategory,
  CATEGORY_NAMES,
  BudgetWarningItem,
  BudgetWarningLevel,
  BudgetAdjustment,
  BudgetAdjustmentType,
  BudgetAdjustmentStatus,
  ADJUSTMENT_TYPE_NAMES,
  ADJUSTMENT_STATUS_NAMES,
  ADJUSTMENT_STATUS_COLORS,
} from '../types';

const Budget: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [activeTab, setActiveTab] = useState<'list' | 'warning'>('list');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetModel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [departmentId, setDepartmentId] = useState<number | undefined>(
    user?.role === 'DEPARTMENT_HEAD' ? user.departmentId : undefined
  );
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetModel | null>(null);
  const [form] = Form.useForm();

  const [warningData, setWarningData] = useState<BudgetWarningItem[]>([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState<BudgetWarningLevel | 'all'>('all');
  const [warningYear, setWarningYear] = useState(new Date().getFullYear());
  const [warningMonth, setWarningMonth] = useState(new Date().getMonth() + 1);
  const [warningDeptFilter, setWarningDeptFilter] = useState<number | undefined>(
    user?.role === 'DEPARTMENT_HEAD' ? user.departmentId : undefined
  );
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<BudgetWarningItem | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [highlightBudgetId, setHighlightBudgetId] = useState<number | null>(null);

  const [detailKeyword, setDetailKeyword] = useState('');
  const [detailStageFilter, setDetailStageFilter] = useState<string>('all');
  const [detailDeductedFilter, setDetailDeductedFilter] = useState<string>('all');
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);

  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isFinanceOrAdmin = user?.role === 'FINANCE_HEAD' || user?.role === 'ADMIN';

  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentRecordModalOpen, setAdjustmentRecordModalOpen] = useState(false);
  const [adjustmentForm] = Form.useForm();
  const [selectedBudgetForAdjustment, setSelectedBudgetForAdjustment] = useState<BudgetWarningItem | null>(null);
  const [adjustmentRecords, setAdjustmentRecords] = useState<BudgetAdjustment[]>([]);
  const [adjustmentRecordsLoading, setAdjustmentRecordsLoading] = useState(false);
  const [rejectForm] = Form.useForm();

  const loadDepartments = async () => {
    const depts = await api.getAllDepartments();
    setDepartments(depts || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getBudgets({
        page,
        pageSize,
        departmentId,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  const loadWarningData = async () => {
    setLoading(true);
    try {
      const result = await api.getBudgetWarnings({
        departmentId: warningDeptFilter,
        year: warningYear,
        month: warningMonth,
      });
      let filtered = result || [];
      if (warningLevelFilter !== 'all') {
        filtered = filtered.filter((w: BudgetWarningItem) => w.warningLevel === warningLevelFilter);
      }
      setWarningData(filtered);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const budgetId = params.get('budgetId');
    const deptId = params.get('departmentId');
    const year = params.get('year');
    const month = params.get('month');
    const openDetail = params.get('openDetail');

    if (tab === 'warning') {
      setActiveTab('warning');
    }

    if (year) setWarningYear(Number(year));
    if (month) setWarningMonth(Number(month));
    if (deptId && !isDeptHead) {
      setWarningDeptFilter(Number(deptId));
    }

    if (budgetId && tab === 'warning') {
      setHighlightBudgetId(Number(budgetId));
      setTimeout(() => {
        const targetCard = document.getElementById(`budget-card-${budgetId}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (openDetail === 'true') {
          setTimeout(() => {
            const targetItem = warningData.find((w) => w.id === Number(budgetId));
            if (targetItem) {
              handleViewDetail(targetItem);
            }
          }, 300);
        }
      }, 600);
    }
  }, [location.search, warningData.length]);

  useEffect(() => {
    if (activeTab === 'list') {
      loadData();
    } else {
      loadWarningData();
    }
  }, [page, pageSize, departmentId, activeTab, warningLevelFilter, warningYear, warningMonth]);

  const handleEdit = (record: BudgetModel) => {
    setEditing(record);
    form.setFieldsValue({
      totalAmount: record.totalAmount,
      usedAmount: record.usedAmount,
    });
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      totalAmount: 0,
      usedAmount: 0,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.updateBudget(editing.id, values);
        message.success('更新成功');
      } else {
        await api.createBudget(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '操作失败');
      }
    }
  };

  const handleViewDetail = async (warning: BudgetWarningItem) => {
    setSelectedWarning(warning);
    setDetailModalOpen(true);
    setDetailLoading(true);
    handleDetailFilterReset();
    try {
      const data = await api.getBudgetReimbursements(
        warning.departmentId,
        warning.category,
        warning.year,
        warning.month
      );
      setDetailData(data || []);
    } catch (err: any) {
      message.error(err?.message || '加载明细失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenAdjustmentModal = (e: React.MouseEvent, budget: BudgetWarningItem) => {
    e.stopPropagation();
    setSelectedBudgetForAdjustment(budget);
    adjustmentForm.resetFields();
    adjustmentForm.setFieldsValue({
      adjustmentType: 'INCREASE',
      amount: undefined,
      reason: '',
    });
    setAdjustmentModalOpen(true);
  };

  const handleSubmitAdjustment = async () => {
    try {
      const values = await adjustmentForm.validateFields();
      if (!selectedBudgetForAdjustment) return;

      await api.createBudgetAdjustment({
        budgetId: selectedBudgetForAdjustment.id,
        ...values,
      });

      message.success('申请已提交，等待审批');
      setAdjustmentModalOpen(false);
      loadWarningData();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '提交失败');
      }
    }
  };

  const handleViewAdjustmentRecords = async (e: React.MouseEvent, budget: BudgetWarningItem) => {
    e.stopPropagation();
    setSelectedBudgetForAdjustment(budget);
    setAdjustmentRecordModalOpen(true);
    setAdjustmentRecordsLoading(true);
    try {
      const records = await api.getBudgetAdjustmentsByBudgetId(budget.id);
      setAdjustmentRecords(records || []);
    } catch (err: any) {
      message.error(err?.message || '加载调整记录失败');
    } finally {
      setAdjustmentRecordsLoading(false);
    }
  };

  const handleApproveAdjustment = async (record: BudgetAdjustment) => {
    try {
      await api.approveBudgetAdjustment(record.id);
      message.success('审批通过');
      if (selectedBudgetForAdjustment) {
        const records = await api.getBudgetAdjustmentsByBudgetId(selectedBudgetForAdjustment.id);
        setAdjustmentRecords(records || []);
      }
      loadWarningData();
    } catch (err: any) {
      message.error(err?.message || '操作失败');
    }
  };

  const handleRejectAdjustment = (record: BudgetAdjustment) => {
    rejectForm.resetFields();
    Modal.confirm({
      title: '拒绝调整申请',
      content: (
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            label="拒绝原因"
            name="rejectReason"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea rows={3} placeholder="请输入拒绝原因" />
          </Form.Item>
        </Form>
      ),
      okText: '确认拒绝',
      cancelText: '取消',
      onOk: async () => {
        try {
          const values = await rejectForm.validateFields();
          await api.rejectBudgetAdjustment(record.id, values.rejectReason);
          message.success('已拒绝');
          if (selectedBudgetForAdjustment) {
            const records = await api.getBudgetAdjustmentsByBudgetId(selectedBudgetForAdjustment.id);
            setAdjustmentRecords(records || []);
          }
          loadWarningData();
        } catch (err: any) {
          message.error(err?.message || '操作失败');
          return Promise.reject(err);
        }
      },
    });
  };

  const filteredDetailData = detailData.filter((item) => {
    const matchKeyword = !detailKeyword ||
      item.reimburseNo.toLowerCase().includes(detailKeyword.toLowerCase()) ||
      item.title.toLowerCase().includes(detailKeyword.toLowerCase()) ||
      item.employeeName.toLowerCase().includes(detailKeyword.toLowerCase());
    const matchStage = detailStageFilter === 'all' || item.approvalStage === detailStageFilter;
    const matchDeducted = detailDeductedFilter === 'all' ||
      (detailDeductedFilter === 'yes' && item.budgetDeducted) ||
      (detailDeductedFilter === 'no' && !item.budgetDeducted);
    return matchKeyword && matchStage && matchDeducted;
  });

  const handleExportDetail = () => {
    if (!selectedWarning) return;
    const deptName = selectedWarning.departmentName;
    const categoryName = selectedWarning.categoryName;
    const dateStr = `${selectedWarning.year}年${selectedWarning.month}月`;
    const fileName = `${deptName}_${categoryName}_${dateStr}_预算占用明细.csv`;

    const headers = ['报销单号', '标题', '申请人', '报销总金额', '本类别占用', '审批阶段', '预算扣减', '提交日期'];
    const rows = filteredDetailData.map((item) => [
      item.reimburseNo,
      item.title,
      item.employeeName,
      item.totalAmount.toFixed(2),
      item.categoryAmount.toFixed(2),
      item.approvalStage,
      item.budgetDeducted ? '已扣减' : '待扣减',
      item.submitDate ? new Date(item.submitDate).toLocaleDateString() : '-',
    ]);

    let csvContent = '\uFEFF' + headers.join(',') + '\n';
    rows.forEach((row) => {
      const escaped = row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`);
      csvContent += escaped.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('导出成功');
  };

  const handleDetailFilterReset = () => {
    setDetailKeyword('');
    setDetailStageFilter('all');
    setDetailDeductedFilter('all');
    setDetailPage(1);
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'exception';
    if (percent >= 70) return 'active';
    return 'normal';
  };

  const getWarningTag = (level: BudgetWarningLevel) => {
    if (level === 'danger') {
      return <Tag icon={<ExclamationCircleOutlined />} color="error">已超支</Tag>;
    }
    if (level === 'warning') {
      return <Tag icon={<WarningOutlined />} color="orange">预警</Tag>;
    }
    return <Tag icon={<CheckCircleOutlined />} color="success">正常</Tag>;
  };

  const getWarningBgColor = (level: BudgetWarningLevel) => {
    if (level === 'danger') return '#fff2f0';
    if (level === 'warning') return '#fffbe6';
    return '#f6ffed';
  };

  const getWarningBorderColor = (level: BudgetWarningLevel) => {
    if (level === 'danger') return '#ff4d4f';
    if (level === 'warning') return '#faad14';
    return '#52c41a';
  };

  const warningStats = {
    normal: warningData.filter((w) => w.warningLevel === 'normal').length,
    warning: warningData.filter((w) => w.warningLevel === 'warning').length,
    danger: warningData.filter((w) => w.warningLevel === 'danger').length,
  };

  const columns = [
    {
      title: '部门',
      dataIndex: ['department', 'name'],
      width: 120,
    },
    {
      title: '费用类别',
      dataIndex: 'category',
      width: 140,
      render: (val: BudgetCategory) => <Tag color="blue">{CATEGORY_NAMES[val]}</Tag>,
    },
    {
      title: '年度',
      dataIndex: 'year',
      width: 80,
    },
    {
      title: '月份',
      dataIndex: 'month',
      width: 80,
    },
    {
      title: '预算额度',
      dataIndex: 'totalAmount',
      width: 120,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '已使用',
      dataIndex: 'usedAmount',
      width: 120,
      render: (val: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{val.toFixed(2)}</span>
      ),
    },
    {
      title: '剩余额度',
      width: 120,
      render: (_: any, record: BudgetModel) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          ¥{(record.totalAmount - record.usedAmount).toFixed(2)}
        </span>
      ),
    },
    {
      title: '使用率',
      width: 200,
      render: (_: any, record: BudgetModel) => {
        const percent = Math.min(
          100,
          Math.round((record.usedAmount / (record.totalAmount || 1)) * 100)
        );
        return (
          <Progress
            percent={percent}
            status={getProgressColor(percent) as any}
            size="small"
          />
        );
      },
    },
    {
      title: '操作',
      width: 80,
      fixed: 'right' as const,
      render: (_: any, record: BudgetModel) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  const warningColumns = [
    {
      title: '状态',
      dataIndex: 'warningLevel',
      width: 100,
      render: (val: BudgetWarningLevel) => getWarningTag(val),
    },
    {
      title: '部门',
      dataIndex: 'departmentName',
      width: 120,
    },
    {
      title: '费用类别',
      dataIndex: 'categoryName',
      width: 140,
    },
    {
      title: '预算额度',
      dataIndex: 'totalAmount',
      width: 120,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '已使用',
      dataIndex: 'usedAmount',
      width: 120,
      render: (val: number) => (
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{val.toFixed(2)}</span>
      ),
    },
    {
      title: '剩余额度',
      dataIndex: 'remainingAmount',
      width: 120,
      render: (val: number) => (
        <span style={{ color: val >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 600 }}>
          ¥{val.toFixed(2)}
        </span>
      ),
    },
    {
      title: '使用率',
      dataIndex: 'usagePercent',
      width: 150,
      render: (val: number, record: BudgetWarningItem) => (
        <Progress
          percent={Math.min(100, val)}
          status={getProgressColor(val) as any}
          size="small"
        />
      ),
    },
    {
      title: '操作',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: BudgetWarningItem) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看明细
        </Button>
      ),
    },
  ];

  const detailColumns = [
    {
      title: '报销单号',
      dataIndex: 'reimburseNo',
      width: 160,
      render: (val: string, record: any) => (
        <a onClick={() => window.open(`#/reimbursement/${record.reimbursementId}`, '_blank')}>
          {val}
        </a>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '申请人',
      dataIndex: 'employeeName',
      width: 100,
    },
    {
      title: '报销总金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (val: number) => <span style={{ color: '#666' }}>¥{val.toFixed(2)}</span>,
    },
    {
      title: '本类别占用',
      dataIndex: 'categoryAmount',
      width: 120,
      render: (val: number) => <strong style={{ color: '#1890ff' }}>¥{val.toFixed(2)}</strong>,
    },
    {
      title: '审批阶段',
      dataIndex: 'approvalStage',
      width: 120,
      render: (val: string) => <Tag color="blue">{val}</Tag>,
    },
    {
      title: '预算扣减',
      dataIndex: 'budgetDeducted',
      width: 100,
      render: (val: boolean) => (
        <Tag color={val ? 'green' : 'default'}>
          {val ? '✓ 已扣减' : '待扣减'}
        </Tag>
      ),
    },
    {
      title: '提交日期',
      dataIndex: 'submitDate',
      width: 120,
      render: (val: string) => val ? new Date(val).toLocaleDateString() : '-',
    },
  ];

  const expandedRowRender = (record: any) => (
    <div style={{ padding: '8px 24px', background: '#fafafa' }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#333' }}>
        费用明细（共 {record.categoryItems?.length || 0} 项）
      </div>
      <Table
        size="small"
        columns={[
          { title: '序号', dataIndex: 'index', width: 60, render: (_: any, __: any, i: number) => i + 1 },
          { title: '费用说明', dataIndex: 'description' },
          { title: '发票号码', dataIndex: 'invoiceNo', width: 160 },
          {
            title: '金额',
            dataIndex: 'amount',
            width: 120,
            render: (val: number) => `¥${val.toFixed(2)}`,
          },
        ]}
        dataSource={record.categoryItems || []}
        rowKey="id"
        pagination={false}
      />
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-title">预算管理</div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key as 'list' | 'warning');
          setPage(1);
        }}
        items={[
          {
            key: 'list',
            label: '预算列表',
          },
          {
            key: 'warning',
            label: '预警视图',
          },
        ]}
      />

      {activeTab === 'list' && (
        <>
          <div className="card-actions">
            <Select
              placeholder="选择部门"
              value={departmentId}
              onChange={(val) => {
                setDepartmentId(val);
                setPage(1);
              }}
              style={{ width: 180 }}
              allowClear
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
              style={{ marginLeft: 'auto' }}
            >
              新建预算
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1100 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (t) => `共 ${t} 条记录`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              },
            }}
          />
        </>
      )}

      {activeTab === 'warning' && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic
                  title="正常预算"
                  value={warningStats.normal}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="预警预算"
                  value={warningStats.warning}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<WarningOutlined />}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic
                  title="已超支"
                  value={warningStats.danger}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <div className="card-actions">
            <Select
              placeholder="选择部门"
              value={warningDeptFilter}
              onChange={(val) => {
                setWarningDeptFilter(val);
                setPage(1);
              }}
              style={{ width: 180 }}
              allowClear={!isDeptHead}
              disabled={isDeptHead}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <InputNumber
              min={2020}
              max={2099}
              value={warningYear}
              onChange={(val) => setWarningYear(val as number)}
              style={{ width: 120 }}
              addonBefore="年度"
            />
            <InputNumber
              min={1}
              max={12}
              value={warningMonth}
              onChange={(val) => setWarningMonth(val as number)}
              style={{ width: 120 }}
              addonBefore="月份"
            />
            <Select
              value={warningLevelFilter}
              onChange={(val) => setWarningLevelFilter(val)}
              style={{ width: 150 }}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'normal', label: '正常' },
                { value: 'warning', label: '预警' },
                { value: 'danger', label: '已超支' },
              ]}
            />
          </div>

          {warningData.length === 0 ? (
            <Empty description="暂无预算数据" />
          ) : (
            <Row gutter={[16, 16]}>
              {warningData.map((item) => (
                <Col span={12} key={item.id}>
                  <Card
                    id={`budget-card-${item.id}`}
                    style={{
                      borderLeft: `4px solid ${getWarningBorderColor(item.warningLevel)}`,
                      background: getWarningBgColor(item.warningLevel),
                      boxShadow: highlightBudgetId === item.id ? '0 0 0 3px rgba(24, 144, 255, 0.5)' : 'none',
                      transition: 'box-shadow 0.3s',
                    }}
                    bodyStyle={{ padding: '16px 20px' }}
                    onClick={() => handleViewDetail(item)}
                    hoverable
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {item.departmentName} - {item.categoryName}
                      </div>
                      {getWarningTag(item.warningLevel)}
                    </div>
                    <Progress
                      percent={Math.min(100, item.usagePercent)}
                      status={getProgressColor(item.usagePercent) as any}
                      strokeWidth={12}
                      style={{ marginBottom: 12 }}
                    />
                    <Row gutter={16}>
                      <Col span={8}>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>预算额度</div>
                        <div style={{ fontWeight: 600 }}>¥{item.totalAmount.toFixed(2)}</div>
                      </Col>
                      <Col span={8}>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>已使用</div>
                        <div style={{ fontWeight: 600, color: '#ff4d4f' }}>¥{item.usedAmount.toFixed(2)}</div>
                      </Col>
                      <Col span={8}>
                        <div style={{ color: '#8c8c8c', fontSize: 12 }}>剩余</div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: item.remainingAmount >= 0 ? '#52c41a' : '#ff4d4f',
                          }}
                        >
                          ¥{item.remainingAmount.toFixed(2)}
                        </div>
                      </Col>
                    </Row>
                    <div style={{ textAlign: 'right', marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <Button
                        type="link"
                        size="small"
                        icon={<HistoryOutlined />}
                        onClick={(e) => handleViewAdjustmentRecords(e, item)}
                      >
                        调整记录
                      </Button>
                      {isDeptHead && (
                        <Button
                          type="link"
                          size="small"
                          icon={<RiseOutlined />}
                          onClick={(e) => handleOpenAdjustmentModal(e, item)}
                        >
                          申请调整
                        </Button>
                      )}
                      <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetail(item);
                        }}
                      >
                        查看占用明细
                      </Button>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      <Modal
        title={editing ? '编辑预算' : '新建预算'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {!editing && (
            <>
              <Form.Item
                label="部门"
                name="departmentId"
                rules={[{ required: true, message: '请选择部门' }]}
              >
                <Select
                  placeholder="请选择部门"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                />
              </Form.Item>
              <Form.Item
                label="费用类别"
                name="category"
                rules={[{ required: true, message: '请选择费用类别' }]}
              >
                <Select
                  placeholder="请选择费用类别"
                  options={Object.entries(CATEGORY_NAMES).map(([key, label]) => ({
                    value: key,
                    label,
                  }))}
                />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="年度"
                    name="year"
                    rules={[{ required: true, message: '请输入年度' }]}
                  >
                    <InputNumber min={2020} max={2099} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="月份"
                    name="month"
                    rules={[{ required: true, message: '请输入月份' }]}
                  >
                    <InputNumber min={1} max={12} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
          <Form.Item
            label="预算总额度(元)"
            name="totalAmount"
            rules={[{ required: true, message: '请输入预算额度' }]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="已使用金额(元)" name="usedAmount">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={selectedWarning ? `预算占用明细 - ${selectedWarning.departmentName} ${selectedWarning.categoryName}` : ''}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={1000}
        footer={null}
      >
        {selectedWarning && (
          <div>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>月度</div>
                <div style={{ fontWeight: 600 }}>{selectedWarning.year}年{selectedWarning.month}月</div>
              </Col>
              <Col span={6}>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>预算额度</div>
                <div style={{ fontWeight: 600 }}>¥{selectedWarning.totalAmount.toFixed(2)}</div>
              </Col>
              <Col span={6}>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>已使用</div>
                <div style={{ fontWeight: 600, color: '#ff4d4f' }}>¥{selectedWarning.usedAmount.toFixed(2)}</div>
              </Col>
              <Col span={6}>
                <div style={{ color: '#8c8c8c', fontSize: 12 }}>使用率</div>
                <div style={{ fontWeight: 600 }}>{selectedWarning.usagePercent}%</div>
              </Col>
            </Row>
            <Divider style={{ margin: '12px 0' }} />
            <div className="card-actions" style={{ marginBottom: 16 }}>
              <Input
                placeholder="搜索报销单号、标题、申请人"
                value={detailKeyword}
                onChange={(e) => {
                  setDetailKeyword(e.target.value);
                  setDetailPage(1);
                }}
                style={{ width: 240 }}
                allowClear
                prefix={<SearchOutlined />}
              />
              <Select
                placeholder="审批阶段"
                value={detailStageFilter}
                onChange={(val) => {
                  setDetailStageFilter(val);
                  setDetailPage(1);
                }}
                style={{ width: 140 }}
                options={[
                  { value: 'all', label: '全部阶段' },
                  { value: '待部门审批', label: '待部门审批' },
                  { value: '待经理复核', label: '待经理复核' },
                  { value: '待财务审核', label: '待财务审核' },
                  { value: '审核通过', label: '审核通过' },
                  { value: '已拒绝', label: '已拒绝' },
                  { value: '已支付', label: '已支付' },
                ]}
              />
              <Select
                placeholder="预算扣减"
                value={detailDeductedFilter}
                onChange={(val) => {
                  setDetailDeductedFilter(val);
                  setDetailPage(1);
                }}
                style={{ width: 140 }}
                options={[
                  { value: 'all', label: '全部' },
                  { value: 'yes', label: '已扣减' },
                  { value: 'no', label: '待扣减' },
                ]}
              />
              <Button onClick={handleDetailFilterReset}>重置</Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportDetail}
                style={{ marginLeft: 'auto' }}
                disabled={filteredDetailData.length === 0}
              >
                导出当前结果
              </Button>
            </div>
            <Table
              columns={detailColumns}
              dataSource={filteredDetailData}
              rowKey="id"
              loading={detailLoading}
              scroll={{ x: 1000 }}
              expandable={{ expandedRowRender, defaultExpandAllRows: false }}
              pagination={{
                current: detailPage,
                pageSize: detailPageSize,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 张报销单（筛选后）`,
                onChange: (page, size) => {
                  setDetailPage(page);
                  setDetailPageSize(size);
                },
              }}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="预算调整申请"
        open={adjustmentModalOpen}
        onOk={handleSubmitAdjustment}
        onCancel={() => setAdjustmentModalOpen(false)}
        width={500}
        destroyOnClose
      >
        {selectedBudgetForAdjustment && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#8c8c8c' }}>预算项：</span>
              <strong>{selectedBudgetForAdjustment.departmentName} - {selectedBudgetForAdjustment.categoryName}</strong>
            </div>
            <div>
              <span style={{ color: '#8c8c8c' }}>当前额度：</span>
              ¥{selectedBudgetForAdjustment.totalAmount.toFixed(2)}
              <span style={{ color: '#8c8c8c', marginLeft: 16 }}>已使用：</span>
              <span style={{ color: '#ff4d4f' }}>¥{selectedBudgetForAdjustment.usedAmount.toFixed(2)}</span>
            </div>
          </div>
        )}
        <Form form={adjustmentForm} layout="vertical">
          <Form.Item
            label="调整类型"
            name="adjustmentType"
            rules={[{ required: true, message: '请选择调整类型' }]}
          >
            <Select placeholder="请选择调整类型">
              <Select.Option value="INCREASE">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <RiseOutlined style={{ color: '#52c41a' }} /> 追加预算
                </span>
              </Select.Option>
              <Select.Option value="DECREASE">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FallOutlined style={{ color: '#faad14' }} /> 调减预算
                </span>
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="调整金额(元)"
            name="amount"
            rules={[
              { required: true, message: '请输入调整金额' },
              { type: 'number', min: 0.01, message: '调整金额必须大于0' },
            ]}
          >
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="请输入调整金额" />
          </Form.Item>
          <Form.Item
            label="调整原因"
            name="reason"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请详细说明调整原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="预算调整记录"
        open={adjustmentRecordModalOpen}
        onCancel={() => setAdjustmentRecordModalOpen(false)}
        width={900}
        footer={null}
        destroyOnClose
      >
        <Table
          rowKey="id"
          loading={adjustmentRecordsLoading}
          dataSource={adjustmentRecords}
          columns={[
            {
              title: '调整类型',
              dataIndex: 'adjustmentType',
              width: 120,
              render: (val: string) => (
                <Tag color={val === 'INCREASE' ? 'green' : 'orange'} icon={val === 'INCREASE' ? <RiseOutlined /> : <FallOutlined />}>
                  {ADJUSTMENT_TYPE_NAMES[val as BudgetAdjustmentType]}
                </Tag>
              ),
            },
            {
              title: '调整金额',
              dataIndex: 'amount',
              width: 120,
              render: (val: number, record: BudgetAdjustment) => (
                <span style={{ color: record.adjustmentType === 'INCREASE' ? '#52c41a' : '#faad14', fontWeight: 600 }}>
                  {record.adjustmentType === 'INCREASE' ? '+' : '-'}¥{val.toFixed(2)}
                </span>
              ),
            },
            {
              title: '申请人',
              dataIndex: ['applicant', 'name'],
              width: 100,
            },
            {
              title: '申请时间',
              dataIndex: 'createdAt',
              width: 170,
              render: (val: string) => new Date(val).toLocaleString('zh-CN'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (val: string) => (
                <Tag color={ADJUSTMENT_STATUS_COLORS[val as BudgetAdjustmentStatus]}>
                  {ADJUSTMENT_STATUS_NAMES[val as BudgetAdjustmentStatus]}
                </Tag>
              ),
            },
            {
              title: '审批人',
              dataIndex: ['approver', 'name'],
              width: 100,
              render: (val) => val || '-',
            },
            {
              title: '操作',
              key: 'action',
              width: 120,
              render: (_, record) => {
                if (record.status !== 'PENDING' || !isFinanceOrAdmin) {
                  return null;
                }
                return (
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                      onClick={() => handleApproveAdjustment(record)}
                    >
                      通过
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleRejectAdjustment(record)}
                    >
                      拒绝
                    </Button>
                  </Space>
                );
              },
            },
            {
              title: '审批意见',
              dataIndex: 'approvalComment',
              render: (val) => val || '-',
            },
          ]}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 24px', background: '#fafafa', borderRadius: 4 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: '#8c8c8c' }}>调整原因：</span>
                  {record.reason}
                </div>
              </div>
            ),
          }}
        />
      </Modal>
    </div>
  );
};

export default Budget;
