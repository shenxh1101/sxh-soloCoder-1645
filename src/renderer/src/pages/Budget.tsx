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
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { api } from '../utils/auth';
import {
  Budget as BudgetModel,
  BudgetCategory,
  CATEGORY_NAMES,
} from '../types';

const Budget: React.FC = () => {
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

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadData();
  }, [page, pageSize, departmentId]);

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

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'exception';
    if (percent >= 70) return 'active';
    return 'normal';
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

  return (
    <div className="page-container">
      <div className="page-title">预算管理</div>

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
    </div>
  );
};

export default Budget;
