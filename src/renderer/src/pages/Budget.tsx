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
} from '@ant-design/icons';
import { api } from '../utils/auth';
import {
  Budget as BudgetModel,
  BudgetCategory,
  CATEGORY_NAMES,
  BudgetWarningItem,
  BudgetWarningLevel,
} from '../types';

const Budget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'warning'>('list');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BudgetModel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [departmentId, setDepartmentId] = useState<number | undefined>();
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetModel | null>(null);
  const [form] = Form.useForm();

  const [warningData, setWarningData] = useState<BudgetWarningItem[]>([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState<BudgetWarningLevel | 'all'>('all');
  const [warningYear, setWarningYear] = useState(new Date().getFullYear());
  const [warningMonth, setWarningMonth] = useState(new Date().getMonth() + 1);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<BudgetWarningItem | null>(null);
  const [detailData, setDetailData] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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
        departmentId,
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
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (val: number) => `¥${val.toFixed(2)}`,
    },
    {
      title: '发票号',
      dataIndex: 'invoiceNo',
      width: 140,
    },
    {
      title: '费用说明',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (val: string) => {
        const statusNames: Record<string, string> = {
          PENDING_FINANCE: '待财务审核',
          APPROVED: '审核通过',
          PAID: '已支付',
        };
        return statusNames[val] || val;
      },
    },
  ];

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
              value={departmentId}
              onChange={(val) => {
                setDepartmentId(val);
                setPage(1);
              }}
              style={{ width: 180 }}
              allowClear
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
                    style={{
                      borderLeft: `4px solid ${getWarningBorderColor(item.warningLevel)}`,
                      background: getWarningBgColor(item.warningLevel),
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
                    <div style={{ textAlign: 'right', marginTop: 12 }}>
                      <Button type="link" size="small" icon={<EyeOutlined />}>
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
            <Table
              columns={detailColumns}
              dataSource={detailData}
              rowKey="id"
              loading={detailLoading}
              scroll={{ x: 900 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (t) => `共 ${t} 条占用记录`,
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Budget;
