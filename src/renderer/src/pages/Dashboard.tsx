import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Table, Tag, Statistic, Button } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS, CATEGORY_NAMES } from '../types';

const Dashboard: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [myList, setMyList] = useState<Reimbursement[]>([]);
  const [pendingApproval, setPendingApproval] = useState<Reimbursement[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
  });

  const loadData = async () => {
    if (!user) return;

    const myResult = await api.getReimbursements({ employeeId: user.id, pageSize: 5 });
    setMyList(myResult?.data || []);

    let total = 0;
    let pending = 0;
    let approved = 0;
    let totalAmount = 0;

    const allResult = await api.getReimbursements({ employeeId: user.id, pageSize: 1000 });
    (allResult?.data || []).forEach((item: Reimbursement) => {
      total++;
      if (
        item.status === 'PENDING_APPROVAL' ||
        item.status === 'PENDING_FINANCE' ||
        item.status === 'ESCALATED'
      ) {
        pending++;
      }
      if (item.status === 'APPROVED' || item.status === 'PAID') {
        approved++;
        totalAmount += item.totalAmount;
      }
    });
    setStats({ total, pending, approved, totalAmount });

    if (user.role === 'DEPARTMENT_HEAD' || user.role === 'ADMIN') {
      const approvalResult = await api.getReimbursements({
        status: 'PENDING_APPROVAL',
        departmentId: user.departmentId,
        pageSize: 10,
      });
      setPendingApproval(approvalResult?.data || []);
    } else if (user.role === 'FINANCE_HEAD') {
      const approvalResult = await api.getReimbursements({
        status: 'PENDING_FINANCE',
        pageSize: 10,
      });
      setPendingApproval(approvalResult?.data || []);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const myColumns = [
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
      width: 120,
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
      width: 80,
      render: (_: any, record: Reimbursement) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reimbursement/${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  const pendingColumns = [
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
      title: '提交时间',
      dataIndex: 'submitDate',
      width: 160,
      render: (val: string) => (val ? dayjs(val).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 80,
      render: (_: any, record: Reimbursement) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reimbursement/${record.id}`)}
        >
          处理
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">工作台</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="报销单总数"
              value={stats.total}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="待处理"
              value={stats.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已通过"
              value={stats.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="已报销金额"
              value={stats.totalAmount}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="元"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={pendingApproval.length > 0 ? 12 : 24}>
          <Card title="我的报销单" extra={<Button type="link" onClick={() => navigate('/my-reimbursements')}>查看全部</Button>}>
            <Table
              columns={myColumns}
              dataSource={myList}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        {pendingApproval.length > 0 && (
          <Col xs={24} lg={12}>
            <Card
              title={
                user?.role === 'FINANCE_HEAD'
                  ? '待财务审核'
                  : '待我审批'
              }
              extra={
                <Button
                  type="link"
                  onClick={() =>
                    navigate(user?.role === 'FINANCE_HEAD' ? '/finance' : '/approval')
                  }
                >
                  查看全部
                </Button>
              }
            >
              <Table
                columns={pendingColumns}
                dataSource={pendingApproval}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default Dashboard;
