import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Input, Select, Space, Popconfirm, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS } from '../types';

const { RangePicker } = DatePicker;

const MyReimbursements: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string | undefined>();

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.getReimbursements({
        employeeId: user.id,
        page,
        pageSize,
        keyword,
        status,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, user?.id]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setKeyword('');
    setStatus(undefined);
    setPage(1);
    setTimeout(loadData, 50);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteReimbursement(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const handleSubmit = async (id: number) => {
    try {
      const reimbursement = await api.getReimbursementById(id);
      if (!reimbursement) {
        message.error('报销单不存在');
        return;
      }

      const items = reimbursement.items?.map((item) => ({
        category: item.category,
        amount: item.amount,
        invoiceNo: item.invoiceNo,
        invoiceDate: item.invoiceDate,
        description: item.description,
      })) || [];

      const now = new Date();
      const validation = await api.validateReimbursement({
        items,
        departmentId: user?.departmentId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });

      if (!validation.valid) {
        message.error(
          { content: (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>校验不通过：</div>
              {validation.errors.map((err: string, idx: number) => (
                <div key={idx}>• {err}</div>
              ))}
            </div>
          ) },
          5
        );
        return;
      }

      await api.submitReimbursement(id);
      message.success('提交成功，等待部门主管审批');
      loadData();
    } catch (error: any) {
      message.error(error?.message || '提交失败');
    }
  };

  const columns = [
    {
      title: '单号',
      dataIndex: 'reimburseNo',
      width: 160,
    },
    {
      title: '标题',
      dataIndex: 'title',
    },
    {
      title: '金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (val: number) => <span className="amount-text">¥{val.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 130,
      render: (val: string) => (
        <Tag color={(STATUS_COLORS as any)[val]}>
          {(STATUS_NAMES as any)[val]}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 280,
      fixed: 'right' as const,
      render: (_: any, record: Reimbursement) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reimbursement/${record.id}`)}
          >
            查看
          </Button>
          {record.status === 'DRAFT' && (
            <>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => navigate(`/reimbursement/edit/${record.id}`)}
              >
                编辑
              </Button>
              <Button
                type="link"
                size="small"
                onClick={() => handleSubmit(record.id)}
              >
                提交
              </Button>
              <Popconfirm
                title="确定删除此报销单？"
                onConfirm={() => handleDelete(record.id)}
              >
                <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                  删除
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">我的报销单</div>

      <div className="card-actions">
        <Input
          placeholder="搜索标题/单号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 200 }}
          allowClear
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="选择状态"
          value={status}
          onChange={(val) => setStatus(val)}
          style={{ width: 160 }}
          allowClear
          options={Object.entries(STATUS_NAMES).map(([key, label]) => ({
            value: key,
            label,
          }))}
        />
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
        <Button onClick={handleReset}>重置</Button>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/reimbursement/new')}
          style={{ marginLeft: 'auto' }}
        >
          新建报销
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1000 }}
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
    </div>
  );
};

export default MyReimbursements;
