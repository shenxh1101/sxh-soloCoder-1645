import React, { useState, useEffect } from 'react';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Input,
  Steps,
  message,
  Empty,
  Row,
  Col,
  Statistic,
  Progress,
} from 'antd';
import {
  LeftOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  SendOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import {
  Reimbursement,
  STATUS_NAMES,
  STATUS_COLORS,
  CATEGORY_NAMES,
  ROLE_NAMES,
} from '../types';

const { TextArea } = Input;

const ReimbursementDetail: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { id } = useParams();
  const [detail, setDetail] = useState<Reimbursement | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [financeRejectModal, setFinanceRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [budgets, setBudgets] = useState<any[]>([]);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getReimbursementById(Number(id));
      setDetail(data);

      if (data?.departmentId && data?.items) {
        const categorySet = new Set(data.items.map((i) => i.category));
        const budgetResults: any[] = [];
        const now = new Date();
        for (const cat of categorySet) {
          const budget = await api.getBudgetByDeptAndCategory(
            data.departmentId,
            cat,
            now.getFullYear(),
            now.getMonth() + 1
          );
          if (budget) {
            budgetResults.push(budget);
          }
        }
        setBudgets(budgetResults);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (!detail && !loading) {
    return (
      <div className="page-container">
        <Empty description="报销单不存在" />
        <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
      </div>
    );
  }

  const canApprove =
    (user?.role === 'DEPARTMENT_HEAD' || user?.role === 'ADMIN') &&
    (detail?.status === 'PENDING_APPROVAL' || detail?.status === 'ESCALATED');

  const canFinanceApprove =
    (user?.role === 'FINANCE_HEAD' || user?.role === 'ADMIN') &&
    detail?.status === 'PENDING_FINANCE';

  const canMarkPaid =
    (user?.role === 'FINANCE_HEAD' || user?.role === 'ADMIN') &&
    detail?.status === 'APPROVED';

  const isOwner = detail?.employeeId === user?.id;
  const canEdit = isOwner && detail?.status === 'DRAFT';
  const canSubmit = isOwner && detail?.status === 'DRAFT';

  const handleApprove = async () => {
    try {
      await api.approveReimbursement(detail?.id, user?.id);
      message.success('审批通过');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '审批失败');
    }
  };

  const handleReject = async () => {
    if (!rejectComment.trim()) {
      message.error('请填写拒绝原因');
      return;
    }
    try {
      await api.rejectReimbursement(detail?.id, user?.id, rejectComment);
      message.success('已拒绝');
      setRejectModal(false);
      setRejectComment('');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const handleFinanceApprove = async () => {
    try {
      await api.financeApprove(detail?.id, user?.id);
      message.success('财务审核通过');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '审核失败');
    }
  };

  const handleFinanceReject = async () => {
    if (!rejectComment.trim()) {
      message.error('请填写拒绝原因');
      return;
    }
    try {
      await api.financeReject(detail?.id, user?.id, rejectComment);
      message.success('已退回');
      setFinanceRejectModal(false);
      setRejectComment('');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const handleMarkPaid = async () => {
    try {
      await api.markAsPaid(detail?.id);
      message.success('已标记为已付款');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const handleSubmit = async () => {
    try {
      if (detail?.departmentId && detail?.items) {
        const now = new Date();
        const validation = await api.validateReimbursement({
          items: detail.items.map((i) => ({
            category: i.category,
            amount: i.amount,
            invoiceNo: i.invoiceNo,
            invoiceDate: i.invoiceDate,
            description: i.description,
          })),
          departmentId: detail.departmentId,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        });
        if (!validation.valid) {
          Modal.error({
            title: '校验不通过',
            content: validation.errors.map((e: string, i: number) => (
              <div key={i}>• {e}</div>
            )),
          });
          return;
        }
      }
      await api.submitReimbursement(detail?.id);
      message.success('提交成功');
      loadDetail();
    } catch (error: any) {
      message.error(error?.message || '提交失败');
    }
  };

  const getSteps = () => {
    const steps = [
      { title: '提交申请', status: detail?.submitDate ? 'finish' : (detail?.status === 'DRAFT' ? 'wait' : 'process') },
      { title: '部门审批', status: 'wait' as const },
      { title: '财务审核', status: 'wait' as const },
      { title: '完成支付', status: 'wait' as const },
    ];

    if (
      detail?.status === 'PENDING_APPROVAL' ||
      detail?.status === 'ESCALATED'
    ) {
      steps[1].status = 'process';
    } else if (
      detail?.status === 'PENDING_FINANCE' ||
      detail?.approvalDate
    ) {
      steps[1].status = 'finish';
      steps[2].status =
        detail?.status === 'PENDING_FINANCE' ? 'process' : 'wait';
    }

    if (
      detail?.status === 'APPROVED' ||
      detail?.status === 'PAID' ||
      detail?.financeDate
    ) {
      steps[1].status = 'finish';
      steps[2].status = 'finish';
      steps[3].status = detail?.status === 'PAID' ? 'finish' : 'process';
    }

    if (detail?.status === 'REJECTED') {
      steps[1].status = 'error';
    }

    return steps;
  };

  const itemColumns = [
    {
      title: '序号',
      width: 60,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: '费用类别',
      dataIndex: 'category',
      width: 140,
      render: (val: string) => CATEGORY_NAMES[val as keyof typeof CATEGORY_NAMES],
    },
    {
      title: '金额',
      dataIndex: 'amount',
      width: 120,
      render: (val: number) => <span className="amount-text">¥{val.toFixed(2)}</span>,
    },
    {
      title: '发票号码',
      dataIndex: 'invoiceNo',
      width: 180,
    },
    {
      title: '发票日期',
      dataIndex: 'invoiceDate',
      width: 120,
      render: (val: string) => dayjs(val).format('YYYY-MM-DD'),
    },
    {
      title: '说明',
      dataIndex: 'description',
    },
  ];

  return (
    <div className="page-container">
      <div className="card-actions">
        <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
        <div className="page-title" style={{ margin: 0 }}>
          报销单详情
        </div>
        <Space style={{ marginLeft: 'auto' }}>
          {canEdit && (
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/reimbursement/edit/${detail?.id}`)}
            >
              编辑
            </Button>
          )}
          {canSubmit && (
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
            >
              提交审批
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApprove}
              >
                通过
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectModal(true)}
              >
                拒绝
              </Button>
            </>
          )}
          {canFinanceApprove && (
            <>
              <Button
                type="primary"
                icon={<DollarOutlined />}
                onClick={handleFinanceApprove}
              >
                财务通过
              </Button>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setFinanceRejectModal(true)}
              >
                退回
              </Button>
            </>
          )}
          {canMarkPaid && (
            <Button type="primary" onClick={handleMarkPaid}>
              标记已付款
            </Button>
          )}
        </Space>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Steps current={-1} items={getSteps()} />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="基本信息" style={{ marginBottom: 16 }}>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="报销单号">
                {detail?.reimburseNo}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={(STATUS_COLORS as any)[detail?.status || 'DRAFT']}>
                  {STATUS_NAMES[detail?.status as keyof typeof STATUS_NAMES]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题">
                {detail?.title}
              </Descriptions.Item>
              <Descriptions.Item label="总金额">
                <span className="amount-text">
                  ¥{detail?.totalAmount.toFixed(2)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="申请人">
                {detail?.employee?.name}
              </Descriptions.Item>
              <Descriptions.Item label="所属部门">
                {detail?.department?.name}
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {detail?.submitDate
                  ? dayjs(detail.submitDate).format('YYYY-MM-DD HH:mm')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(detail?.createdAt).format('YYYY-MM-DD HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="备注说明" span={2}>
                {detail?.description || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title={`费用明细（共${detail?.items?.length || 0}项）`} style={{ marginBottom: 16 }}>
            <Table
              columns={itemColumns}
              dataSource={detail?.items || []}
              rowKey="id"
              pagination={false}
              size="small"
              bordered
              summary={(pageData) => {
                let total = 0;
                pageData.forEach((item) => {
                  total += item.amount || 0;
                });
                return (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2}>
                        合计
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2}>
                        <span className="amount-text">¥{total.toFixed(2)}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} colSpan={3} />
                    </Table.Summary.Row>
                  </Table.Summary>
                );
              }}
            />
          </Card>

          {detail?.approvals && detail.approvals.length > 0 && (
            <Card title="审批记录">
              {detail.approvals.map((approval, idx) => (
                <div
                  key={approval.id}
                  style={{
                    padding: '12px 16px',
                    marginBottom: idx < detail.approvals!.length - 1 ? 12 : 0,
                    background: '#fafafa',
                    borderRadius: 6,
                    borderLeft: `3px solid ${
                      approval.action === 'APPROVE' ? '#52c41a' : '#ff4d4f'
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <strong>{approval.approver?.name}</strong>
                      <Tag style={{ marginLeft: 8 }}>
                        {ROLE_NAMES[approval.approver?.role || 'EMPLOYEE']}
                      </Tag>
                    </div>
                    <Tag color={approval.action === 'APPROVE' ? 'green' : 'red'}>
                      {approval.action === 'APPROVE' ? '通过' : '拒绝'}
                    </Tag>
                  </div>
                  {approval.comment && (
                    <div style={{ color: '#666', marginBottom: 4 }}>
                      原因：{approval.comment}
                    </div>
                  )}
                  <div style={{ color: '#999', fontSize: 12 }}>
                    {dayjs(approval.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
              ))}
            </Card>
          )}
        </Col>

        <Col xs={24} lg={8}>
          <Card title="预算占用情况" style={{ marginBottom: 16 }}>
            {budgets.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                {budgets.map((budget) => {
                  const percent = Math.min(
                    100,
                    (budget.usedAmount / budget.totalAmount) * 100
                  );
                  return (
                    <div key={budget.id}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span>{CATEGORY_NAMES[budget.category]}</span>
                        <span>
                          ¥{budget.usedAmount.toFixed(0)} / ¥
                          {budget.totalAmount.toFixed(0)}
                        </span>
                      </div>
                      <Progress
                        percent={Math.round(percent)}
                        status={percent >= 90 ? 'exception' : percent >= 70 ? 'active' : 'normal'}
                        size="small"
                      />
                    </div>
                  );
                })}
              </Space>
            ) : (
              <Empty description="暂无预算数据" />
            )}
          </Card>

          <Card title="金额统计">
            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Statistic
                  title="总金额"
                  value={detail?.totalAmount || 0}
                  precision={2}
                  prefix="¥"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="费用项数"
                  value={detail?.items?.length || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Modal
        title="拒绝报销申请"
        open={rejectModal}
        onOk={handleReject}
        onCancel={() => {
          setRejectModal(false);
          setRejectComment('');
        }}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginBottom: 12 }}>请填写拒绝原因：</p>
        <TextArea
          rows={4}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="请详细说明拒绝原因"
        />
      </Modal>

      <Modal
        title="退回报销申请"
        open={financeRejectModal}
        onOk={handleFinanceReject}
        onCancel={() => {
          setFinanceRejectModal(false);
          setRejectComment('');
        }}
        okText="确认退回"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginBottom: 12 }}>请填写退回原因：</p>
        <TextArea
          rows={4}
          value={rejectComment}
          onChange={(e) => setRejectComment(e.target.value)}
          placeholder="请详细说明退回原因，如费用类别与预算科目不匹配等"
        />
      </Modal>
    </div>
  );
};

export default ReimbursementDetail;
