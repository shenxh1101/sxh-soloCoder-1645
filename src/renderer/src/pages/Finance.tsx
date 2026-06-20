import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Tag,
  Input,
  Space,
  Modal,
  message,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS, CATEGORY_NAMES } from '../types';

const Finance: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('PENDING_FINANCE');
  const [stats, setStats] = useState({ pending: 0, approved: 0, paid: 0 });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.getReimbursements({
        page,
        pageSize,
        keyword,
        status,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);

      const [pendingResult, approvedResult, paidResult] = await Promise.all([
        api.getReimbursements({ status: 'PENDING_FINANCE', pageSize: 1000 }),
        api.getReimbursements({ status: 'APPROVED', pageSize: 1000 }),
        api.getReimbursements({ status: 'PAID', pageSize: 1000 }),
      ]);

      let pendingAmount = 0;
      (pendingResult?.data || []).forEach((r: Reimbursement) => pendingAmount += r.totalAmount);
      let approvedAmount = 0;
      (approvedResult?.data || []).forEach((r: Reimbursement) => approvedAmount += r.totalAmount);
      let paidAmount = 0;
      (paidResult?.data || []).forEach((r: Reimbursement) => paidAmount += r.totalAmount);

      setStats({
        pending: pendingAmount,
        approved: approvedAmount,
        paid: paidAmount,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, status]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const columns = [
    {
      title: '单号',
      dataIndex: 'reimburseNo',
      width: 160,
    },
    {
      title: '申请人',
      dataIndex: ['employee', 'name'],
      width: 100,
    },
    {
      title: '部门',
      dataIndex: ['department', 'name'],
      width: 120,
    },
    {
      title: '标题',
      dataIndex: 'title',
    },
    {
      title: '费用类别',
      width: 150,
      render: (_: any, record: Reimbursement) => {
        const cats = new Set(record.items?.map((i) => i.category));
        return (
          <Space wrap>
            {[...cats].map((cat) => (
              <Tag key={cat} color="blue">
                {CATEGORY_NAMES[cat as keyof typeof CATEGORY_NAMES]}
              </Tag>
            ))}
          </Space>
        );
      },
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
      title: '提交时间',
      dataIndex: 'submitDate',
      width: 160,
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: Reimbursement) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reimbursement/${record.id}`)}
        >
          审核
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">财务审核</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="待审核金额"
              value={stats.pending}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已审核待支付"
              value={stats.approved}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已支付金额"
              value={stats.paid}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <div className="card-actions">
        <Input
          placeholder="搜索单号/标题/申请人"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 220 }}
          allowClear
          prefix={<SearchOutlined />}
        />
        <Space.Compact>
          <Button
            type={status === 'PENDING_FINANCE' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('PENDING_FINANCE');
              setPage(1);
            }}
          >
            待审核
          </Button>
          <Button
            type={status === 'APPROVED' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('APPROVED');
              setPage(1);
            }}
          >
            待支付
          </Button>
          <Button
            type={status === 'PAID' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('PAID');
              setPage(1);
            }}
          >
            已支付
          </Button>
          <Button
            type={!status ? 'primary' : 'default'}
            onClick={() => {
              setStatus('');
              setPage(1);
            }}
          >
            全部
          </Button>
        </Space.Compact>
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1300 }}
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

export default Finance;
