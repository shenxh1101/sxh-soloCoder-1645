import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Input, Space, Modal, message, Card, Row, Col, Statistic } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS } from '../types';

const Approval: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('PENDING_APPROVAL');
  const [stats, setStats] = useState({ pending: 0, escalated: 0, total: 0 });

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await api.getReimbursements({
        departmentId: user.role === 'ADMIN' ? undefined : user.departmentId,
        page,
        pageSize,
        keyword,
        status,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);

      const [pendingResult, escalatedResult, allResult] = await Promise.all([
        api.getReimbursements({
          departmentId: user.role === 'ADMIN' ? undefined : user.departmentId,
          status: 'PENDING_APPROVAL',
          pageSize: 1000,
        }),
        api.getReimbursements({
          departmentId: user.role === 'ADMIN' ? undefined : user.departmentId,
          status: 'ESCALATED',
          pageSize: 1000,
        }),
        api.getReimbursements({
          departmentId: user.role === 'ADMIN' ? undefined : user.departmentId,
          pageSize: 1000,
        }),
      ]);

      setStats({
        pending: pendingResult?.total || 0,
        escalated: escalatedResult?.total || 0,
        total: allResult?.total || 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, status, user?.id]);

  const handleSearch = () => {
    setPage(1);
    loadData();
  };

  const handleCheckOverdue = async () => {
    try {
      const result = await api.checkOverdueReimbursements();
      if (result && result.length > 0) {
        message.success(`已处理 ${result.length} 个超时报销单`);
      } else {
        message.info('暂无超时报销单');
      }
      loadData();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
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
      title: '金额',
      dataIndex: 'totalAmount',
      width: 120,
      render: (val: number) => <span className="amount-text">¥{val.toFixed(2)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 140,
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
      title: '超时',
      width: 80,
      render: (_: any, record: Reimbursement) => {
        if (!record.submitDate) return '-';
        const diff = dayjs().diff(dayjs(record.submitDate), 'day');
        return diff >= 2 ? (
          <Tag color="red">已超时</Tag>
        ) : (
          <Tag color="green">{diff}天</Tag>
        );
      },
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
          审批
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">审批管理</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="待审批"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已升级超时"
              value={stats.escalated}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="审批总量" value={stats.total} />
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
            type={status === 'PENDING_APPROVAL' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('PENDING_APPROVAL');
              setPage(1);
            }}
          >
            待审批({stats.pending})
          </Button>
          <Button
            type={status === 'ESCALATED' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('ESCALATED');
              setPage(1);
            }}
          >
            超时升级({stats.escalated})
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
        <Button onClick={handleCheckOverdue} danger>
          检查超时
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
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

export default Approval;
