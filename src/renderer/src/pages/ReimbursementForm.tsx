import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Table,
  Select,
  DatePicker,
  InputNumber,
  Card,
  Space,
  message,
  Divider,
  Row,
  Col,
  Alert,
  Modal,
} from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, SendOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { BudgetCategory, CATEGORY_NAMES, ReimbursementItem, Reimbursement } from '../types';

const { TextArea } = Input;

interface ReimbursementItemForm {
  key: string;
  category: BudgetCategory;
  amount: number;
  invoiceNo: string;
  invoiceDate: dayjs.Dayjs;
  description?: string;
  error?: string;
}

const ReimbursementForm: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ReimbursementItemForm[]>([
    {
      key: Date.now().toString(),
      category: 'TRAVEL' as BudgetCategory,
      amount: 0,
      invoiceNo: '',
      invoiceDate: dayjs(),
      description: '',
    },
  ]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const detail: Reimbursement = await api.getReimbursementById(Number(id));
      if (detail) {
        form.setFieldsValue({
          title: detail.title,
          description: detail.description,
        });
        if (detail.items && detail.items.length > 0) {
          setItems(
            detail.items.map((item: ReimbursementItem) => ({
              key: item.id.toString(),
              category: item.category,
              amount: item.amount,
              invoiceNo: item.invoiceNo,
              invoiceDate: dayjs(item.invoiceDate),
              description: item.description,
            }))
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit) {
      loadDetail();
    }
  }, [id]);

  const addItem = () => {
    setItems([
      ...items,
      {
        key: Date.now().toString(),
        category: 'OTHER' as BudgetCategory,
        amount: 0,
        invoiceNo: '',
        invoiceDate: dayjs(),
        description: '',
      },
    ]);
  };

  const removeItem = (key: string) => {
    if (items.length <= 1) {
      message.warning('至少保留一项费用明细');
      return;
    }
    setItems(items.filter((item) => item.key !== key));
  };

  const updateItem = (key: string, field: string, value: any) => {
    setItems(
      items.map((item) => (item.key === key ? { ...item, [field]: value } : item))
    );
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + (item.amount || 0), 0);
  };

  const validateItems = async (): Promise<{ valid: boolean; errors: string[] }> => {
    const now = new Date();
    const validationData = {
      items: items.map((item) => ({
        category: item.category,
        amount: item.amount,
        invoiceNo: item.invoiceNo,
        invoiceDate: item.invoiceDate.toDate(),
        description: item.description,
      })),
      departmentId: user?.departmentId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    };

    const result = await api.validateReimbursement(validationData);
    const errors = result.errors || [];
    setValidationErrors(errors);
    return { valid: result.valid, errors };
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (items.some((item) => !item.amount || item.amount <= 0)) {
        message.error('请填写有效的费用金额');
        return;
      }
      if (items.some((item) => !item.invoiceNo.trim())) {
        message.error('请填写发票号码');
        return;
      }

      setLoading(true);
      const data = {
        title: values.title,
        description: values.description,
        employeeId: user?.id,
        departmentId: user?.departmentId,
        items: items.map((item) => ({
          category: item.category,
          amount: item.amount,
          invoiceNo: item.invoiceNo,
          invoiceDate: item.invoiceDate.format('YYYY-MM-DD'),
          description: item.description,
        })),
      };

      if (isEdit) {
        await api.updateReimbursement(Number(id), data);
        message.success('保存成功');
      } else {
        await api.createReimbursement(data);
        message.success('创建成功');
      }
      navigate('/my-reimbursements');
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const localErrors: string[] = [];
      items.forEach((item, idx) => {
        if (!item.amount || item.amount <= 0) {
          localErrors.push(`第${idx + 1}项: 请填写有效的费用金额（必须大于0）`);
        }
        if (!item.invoiceNo.trim()) {
          localErrors.push(`第${idx + 1}项: 发票号码不能为空`);
        }
      });

      setSubmitting(true);
      const { valid, errors } = await validateItems();
      const allErrors = [...localErrors, ...errors];

      if (allErrors.length > 0) {
        Modal.error({
          title: '校验不通过，无法提交',
          width: 620,
          okText: '我知道了',
          content: (
            <div>
              <p style={{ marginBottom: 12, color: '#595959' }}>
                共发现 <strong style={{ color: '#ff4d4f' }}>{allErrors.length}</strong> 个问题，请修正后再次提交：
              </p>
              <div
                style={{
                  background: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: 6,
                  padding: '12px 16px',
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
              >
                <ol style={{ margin: 0, paddingLeft: 24 }}>
                  {allErrors.map((err, idx) => (
                    <li
                      key={idx}
                      style={{
                        color: '#ff4d4f',
                        marginBottom: idx < allErrors.length - 1 ? 8 : 0,
                        lineHeight: 1.6,
                      }}
                    >
                      {err}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ),
        });
        setSubmitting(false);
        return;
      }

      const data = {
        title: values.title,
        description: values.description,
        employeeId: user?.id,
        departmentId: user?.departmentId,
        items: items.map((item) => ({
          category: item.category,
          amount: item.amount,
          invoiceNo: item.invoiceNo,
          invoiceDate: item.invoiceDate.format('YYYY-MM-DD'),
          description: item.description,
        })),
      };

      let reimbursementId: number;
      if (isEdit) {
        await api.updateReimbursement(Number(id), data);
        reimbursementId = Number(id);
      } else {
        const created = await api.createReimbursement(data);
        reimbursementId = created.id;
      }

      await api.submitReimbursement(reimbursementId);
      message.success('提交成功，等待部门主管审批');
      navigate('/my-reimbursements');
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }
      message.error(error?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const itemColumns = [
    {
      title: '费用类别',
      dataIndex: 'category',
      width: 150,
      render: (_: any, record: ReimbursementItemForm, index: number) => (
        <Select
          value={record.category}
          onChange={(val) => updateItem(record.key, 'category', val)}
          style={{ width: '100%' }}
          options={Object.entries(CATEGORY_NAMES).map(([key, label]) => ({
            value: key,
            label,
          }))}
        />
      ),
    },
    {
      title: '金额(元)',
      dataIndex: 'amount',
      width: 140,
      render: (_: any, record: ReimbursementItemForm) => (
        <InputNumber
          value={record.amount}
          onChange={(val) => updateItem(record.key, 'amount', val || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
          placeholder="请输入金额"
        />
      ),
    },
    {
      title: '发票号码',
      dataIndex: 'invoiceNo',
      width: 200,
      render: (_: any, record: ReimbursementItemForm) => (
        <Input
          value={record.invoiceNo}
          onChange={(e) => updateItem(record.key, 'invoiceNo', e.target.value)}
          placeholder="请输入发票号码"
          maxLength={20}
        />
      ),
    },
    {
      title: '发票日期',
      dataIndex: 'invoiceDate',
      width: 160,
      render: (_: any, record: ReimbursementItemForm) => (
        <DatePicker
          value={record.invoiceDate}
          onChange={(val) => updateItem(record.key, 'invoiceDate', val)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      render: (_: any, record: ReimbursementItemForm) => (
        <Input
          value={record.description}
          onChange={(e) => updateItem(record.key, 'description', e.target.value)}
          placeholder="费用说明"
        />
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: any, record: ReimbursementItemForm) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="card-actions">
        <Button
          icon={<LeftOutlined />}
          onClick={() => navigate('/my-reimbursements')}
        >
          返回
        </Button>
        <div className="page-title" style={{ margin: 0, flex: 1 }}>
          {isEdit ? '编辑报销单' : '新建报销单'}
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert
          message="校验提示"
          description={
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="基本信息" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="报销标题"
                name="title"
                rules={[{ required: true, message: '请输入报销标题' }]}
              >
                <Input placeholder="请输入报销标题，如：3月北京出差费用" maxLength={100} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="所属部门">
                <Input value={user?.department?.name} disabled />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="备注说明" name="description">
            <TextArea
              rows={3}
              placeholder="请输入备注说明（选填）"
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          <Space>
            <span>费用明细</span>
            <span style={{ color: '#999', fontWeight: 'normal', fontSize: 14 }}>
              共 {items.length} 项，合计
              <span className="amount-text" style={{ marginLeft: 8 }}>
                ¥{getTotalAmount().toFixed(2)}
              </span>
            </span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={addItem}>
            添加费用项
          </Button>
        }
      >
        <Table
          columns={itemColumns}
          dataSource={items}
          rowKey="key"
          pagination={false}
          bordered
          size="middle"
        />
      </Card>

      <Divider />

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => navigate('/my-reimbursements')}>取消</Button>
          <Button
            icon={<SaveOutlined />}
            loading={loading}
            onClick={handleSave}
          >
            保存草稿
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            onClick={handleSubmit}
          >
            提交审批
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ReimbursementForm;
