import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Input, Space, Modal, message, Card, Row, Col, Statistic, Alert, Tabs } from 'antd';
import { SearchOutlined, EyeOutlined, InfoCircleOutlined, UserOutlined, CrownOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS, ROLE_NAMES } from '../types';

const ESCALATION_THRESHOLD = 5000;

const Approval: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Reimbursement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [activeTab, setActiveTab] = useState<string>(user?.role === 'ADMIN' ? 'escalated' : 'pending');
  const [stats, setStats] = useState({ pending: 0, escalated: 0, total: 0 });

  const isAdmin = user?.role === 'ADMIN';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const status = activeTab === 'pending' ? 'PENDING_APPROVAL' : activeTab === 'escalated' ? 'ESCALATED' : undefined;

      const deptFilter = isAdmin ? undefined : user.departmentId;

      const result = await api.getReimbursements({
        departmentId: deptFilter,
        page,
        pageSize,
        keyword,
        status,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);

      const [pendingResult, escalatedResult] = await Promise.all([
        api.getReimbursements({
          departmentId: deptFilter,
          status: 'PENDING_APPROVAL',
          pageSize: 1000,
        }),
        api.getReimbursements({
          departmentId: isAdmin ? undefined : -1,
          status: 'ESCALATED',
          pageSize: 1000,
        }),
      ]);

      setStats({
        pending: pendingResult?.total || 0,
        escalated: escalatedResult?.total || 0,
        total: (pendingResult?.total || 0) + (escalatedResult?.total || 0),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize, activeTab, user?.id]);

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

  const getApprovalStepLabel = (record: Reimbursement) => {
    if (record.totalAmount >= ESCALATION_THRESHOLD) {
      if (record.status === 'PENDING_APPROVAL') {
        return <Tag color="blue"><UserOutlined /> 第一步：部门主管审批</Tag>;
      }
      if (record.status === 'ESCALATED') {
        return <Tag color="orange"><CrownOutlined /> 第二步：经理复核</Tag>;
      }
    }
    return null;
  };

  const handleApprove = async (record: Reimbursement) => {
    Modal.confirm({
      title: '确认通过',
      content: `确定要通过报销单"${record.title}"吗？`,
      okText: '通过',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        try {
          await api.approveReimbursement(record.id, '审批通过');
          message.success('审批通过成功');
          loadData();
        } catch (error: any) {
          message.error(error?.message || '操作失败');
        }
      },
    });
  };

  const handleReject = (record: Reimbursement) => {
    let comment = '';
    Modal.confirm({
      title: '拒绝报销单',
      content: (
        <div>
          <p>请填写拒绝原因：</p>
          <Input.TextArea
            rows={4}
            placeholder="请输入拒绝原因..."
            onChange={(e) => (comment = e.target.value)}
            autoFocus
          />
        </div>
      ),
      okText: '拒绝',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        if (!comment.trim()) {
          message.warning('请填写拒绝原因');
          return Promise.reject();
        }
        try {
          await api.rejectReimbursement(record.id, comment);
          message.success('已拒绝');
          loadData();
        } catch (error: any) {
          message.error(error?.message || '操作失败');
        }
      },
    });
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
      width: 160,
      render: (val: number) => (
        <div>
          <span className="amount-text" style={{ color: '#fa8c16', fontWeight: 600 }}>¥{val.toFixed(2)}</span>
          {val >= ESCALATION_THRESHOLD && (
            <Tag color="orange" style={{ marginLeft: 8, marginTop: 4 }}>
              <InfoCircleOutlined /> 大额
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: '审批阶段',
      dataIndex: 'status',
      width: 160,
      render: (val: string, record: Reimbursement) => (
        <div>
          <Tag color={(STATUS_COLORS as any)[val]}>
            {(STATUS_NAMES as any)[val]}
          </Tag>
          {getApprovalStepLabel(record)}
        </div>
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
      width: 180,
      fixed: 'right' as const,
      render: (_: any, record: Reimbursement) => (
        <Space size={4}>
          <Button size="small" type="link" onClick={() => navigate(`/reimbursement/${record.id}`)}>
            <EyeOutlined /> 查看
          </Button>
          <Button size="small" type="primary" onClick={() => handleApprove(record)}>
            通过
          </Button>
          <Button size="small" danger onClick={() => handleReject(record)}>
            拒绝
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [];

  if (isDeptHead || isAdmin) {
    tabItems.push({
      key: 'pending',
      label: (
        <span>
          <UserOutlined /> 待部门审批
          {stats.pending > 0 && <Tag color="red" style={{ marginLeft: 8 }}>{stats.pending}</Tag>}
        </span>
      ),
    });
  }

  if (isAdmin) {
    tabItems.push({
      key: 'escalated',
      label: (
        <span>
          <CrownOutlined /> 经理复核
          {stats.escalated > 0 && <Tag color="orange" style={{ marginLeft: 8 }}>{stats.escalated}</Tag>}
        </span>
      ),
    });
  }

  tabItems.push({
    key: 'all',
    label: (
      <span>
        全部审批
        {stats.total > 0 && <Tag style={{ marginLeft: 8 }}>{stats.total}</Tag>}
      </span>
    ),
  });

  return (
    <div className="page-container">
      <div className="page-title">审批管理</div>

      {isAdmin && (
        <Alert
          message="审批规则说明"
          description={
            <div>
              <p>• <strong>小额报销（&lt; ¥5,000）</strong>：提交 → 部门主管审批 → 财务审核 → 支付</p>
              <p>• <strong>大额报销（≥ ¥5,000）</strong>：提交 → 部门主管审批 → <span style={{ color: '#fa8c16', fontWeight: 600 }}>经理复核</span> → 财务审核 → 支付</p>
              <p>• 您作为管理员，可以处理所有部门的待审批单据和所有大额的经理复核单据</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isDeptHead && (
        <Alert
          message="审批规则说明"
          description={
            <div>
              <p>• <strong>小额报销（&lt; ¥5,000）</strong>：您审批通过后直接进入财务审核</p>
              <p>• <strong>大额报销（≥ ¥5,000）</strong>：您审批通过后需由经理复核，大额单的复核由管理员处理</p>
              <p>• 您作为部门主管，只能处理本部门的待审批单据</p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="待部门审批"
              value={stats.pending}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        {isAdmin && (
          <Col xs={12} sm={6}>
            <Card>
              <Statistic
                title="待经理复核"
                value={stats.escalated}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<CrownOutlined />}
              />
            </Card>
          </Col>
        )}
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="当前登录人"
              value={user?.name || '-'}
              valueStyle={{ color: '#52c41a', fontSize: 18 }}
              prefix={<span style={{ fontSize: 16 }}>{ROLE_NAMES[user?.role || 'EMPLOYEE']}</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="审批总量"
              value={stats.total}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Input
              placeholder="搜索单号/标题/申请人"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 240 }}
              prefix={<SearchOutlined />}
            />
            <Button type="primary" onClick={handleSearch}>
              <SearchOutlined /> 搜索
            </Button>
            {isAdmin && (
              <Button onClick={handleCheckOverdue}>
                检查超时
              </Button>
            )}
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setPage(1);
          }}
          items={tabItems}
          style={{ marginBottom: 16 }}
        />

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
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default Approval;
