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
  InputNumber,
  Checkbox,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Reimbursement, STATUS_NAMES, STATUS_COLORS, CATEGORY_NAMES } from '../types';

const { TextArea } = Input;

interface BatchResult {
  success: number[];
  failed: { id: number; reimburseNo: string; reason: string }[];
}

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

  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject'>('approve');
  const [batchRejectComment, setBatchRejectComment] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [resultModalOpen, setResultModalOpen] = useState(false);

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
      (pendingResult?.data || []).forEach((r: Reimbursement) => (pendingAmount += r.totalAmount));
      let approvedAmount = 0;
      (approvedResult?.data || []).forEach((r: Reimbursement) => (approvedAmount += r.totalAmount));
      let paidAmount = 0;
      (paidResult?.data || []).forEach((r: Reimbursement) => (paidAmount += r.totalAmount));

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

  const pendingIds = data
    .filter((r) => r.status === 'PENDING_FINANCE')
    .map((r) => r.id);

  const handleSelectAll = () => {
    if (selectedRowKeys.length === pendingIds.length) {
      setSelectedRowKeys([]);
    } else {
      setSelectedRowKeys([...pendingIds]);
    }
  };

  const handleBatchApprove = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要审核的报销单');
      return;
    }
    setBatchAction('approve');
    setBatchModalOpen(true);
  };

  const handleBatchReject = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要退回的报销单');
      return;
    }
    setBatchAction('reject');
    setBatchRejectComment('');
    setBatchModalOpen(true);
  };

  const handleBatchConfirm = async () => {
    if (batchAction === 'reject' && !batchRejectComment.trim()) {
      message.error('请填写退回原因');
      return;
    }

    setBatchLoading(true);
    try {
      let result: BatchResult;
      if (batchAction === 'approve') {
        result = await api.batchFinanceApprove(selectedRowKeys);
      } else {
        result = await api.batchFinanceReject(selectedRowKeys, batchRejectComment);
      }

      setBatchResult(result);
      setResultModalOpen(true);
      setBatchModalOpen(false);
      setSelectedRowKeys([]);
      loadData();
    } catch (error: any) {
      message.error(error?.message || '批量操作失败');
    } finally {
      setBatchLoading(false);
    }
  };

  const columns = [
    {
      title: '选择',
      dataIndex: 'id',
      width: 60,
      fixed: 'left' as const,
      render: (_: any, record: Reimbursement) => (
        <Checkbox
          disabled={record.status !== 'PENDING_FINANCE'}
          checked={selectedRowKeys.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowKeys([...selectedRowKeys, record.id]);
            } else {
              setSelectedRowKeys(selectedRowKeys.filter((k) => k !== record.id));
            }
          }}
        />
      ),
    },
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

  const selectedTotalAmount = data
    .filter((r) => selectedRowKeys.includes(r.id))
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const pendingCount = pendingIds.length;

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
              setSelectedRowKeys([]);
            }}
          >
            待审核
          </Button>
          <Button
            type={status === 'APPROVED' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('APPROVED');
              setPage(1);
              setSelectedRowKeys([]);
            }}
          >
            待支付
          </Button>
          <Button
            type={status === 'PAID' ? 'primary' : 'default'}
            onClick={() => {
              setStatus('PAID');
              setPage(1);
              setSelectedRowKeys([]);
            }}
          >
            已支付
          </Button>
          <Button
            type={!status ? 'primary' : 'default'}
            onClick={() => {
              setStatus('');
              setPage(1);
              setSelectedRowKeys([]);
            }}
          >
            全部
          </Button>
        </Space.Compact>
        <Button type="primary" onClick={handleSearch}>
          查询
        </Button>
      </div>

      {status === 'PENDING_FINANCE' && (
        <div
          style={{
            background: '#f0f5ff',
            border: '1px solid #d6e4ff',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Space>
              <Checkbox
                checked={selectedRowKeys.length === pendingCount && pendingCount > 0}
                indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < pendingCount}
                onChange={handleSelectAll}
              >
                <span style={{ fontWeight: 600 }}>
                  本页共 {pendingCount} 单待审核
                </span>
              </Checkbox>
              {selectedRowKeys.length > 0 && (
                <Tag color="blue">
                  已选 {selectedRowKeys.length} 单，合计 ¥{selectedTotalAmount.toFixed(2)}
                </Tag>
              )}
            </Space>
          </div>
          <Space>
            <Button
              type="primary"
              icon={<DollarOutlined />}
              onClick={handleBatchApprove}
              disabled={selectedRowKeys.length === 0}
            >
              批量通过
            </Button>
            <Button
              danger
              icon={<CloseOutlined />}
              onClick={handleBatchReject}
              disabled={selectedRowKeys.length === 0}
            >
              批量退回
            </Button>
          </Space>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
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
            setSelectedRowKeys([]);
          },
        }}
      />

      <Modal
        title={
          batchAction === 'approve' ? '批量财务审核通过' : '批量财务审核退回'
        }
        open={batchModalOpen}
        onOk={handleBatchConfirm}
        onCancel={() => setBatchModalOpen(false)}
        okText={batchAction === 'approve' ? '确认通过' : '确认退回'}
        okButtonProps={batchAction === 'reject' ? { danger: true } : undefined}
        confirmLoading={batchLoading}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <InfoCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />
          即将对 <strong>{selectedRowKeys.length}</strong> 张报销单执行
          <strong style={{ color: batchAction === 'approve' ? '#52c41a' : '#ff4d4f', margin: '0 4px' }}>
            {batchAction === 'approve' ? '批量通过' : '批量退回'}
          </strong>
          操作
        </div>

        <div
          style={{
            background: '#e6f7ff',
            border: '1px solid #91d5ff',
            borderRadius: 6,
            padding: '12px 16px',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 12, color: '#1890ff', marginBottom: 6 }}>
            <CheckOutlined /> 系统校验说明
          </div>
          <div style={{ fontSize: 12, color: '#595959', lineHeight: 1.6 }}>
            批量通过时将逐张进行费用类别匹配校验和预算余额校验。
            校验不通过的单据将被自动退回并单独列出。
          </div>
        </div>

        {batchAction === 'reject' && (
          <div>
            <p style={{ marginBottom: 8 }}>请填写退回原因：</p>
            <TextArea
              rows={4}
              value={batchRejectComment}
              onChange={(e) => setBatchRejectComment(e.target.value)}
              placeholder="请详细说明退回原因，如费用类别与预算科目不匹配等"
            />
          </div>
        )}
      </Modal>

      <Modal
        title="批量处理结果"
        open={resultModalOpen}
        onOk={() => setResultModalOpen(false)}
        onCancel={() => setResultModalOpen(false)}
        width={700}
        footer={
          <Button type="primary" onClick={() => setResultModalOpen(false)}>
            我知道了
          </Button>
        }
      >
        {batchResult && (
          <div>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="处理成功"
                    value={batchResult.success.length}
                    valueStyle={{ color: '#52c41a' }}
                    prefix={<CheckOutlined />}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="处理失败"
                    value={batchResult.failed.length}
                    valueStyle={{ color: '#ff4d4f' }}
                    prefix={<CloseOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            {batchResult.failed.length > 0 && (
              <div>
                <Divider orientation="left">失败明细（自动退回）</Divider>
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
                  {batchResult.failed.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '8px 12px',
                        marginBottom: idx < batchResult.failed.length - 1 ? 8 : 0,
                        background: '#fff',
                        borderRadius: 4,
                        borderLeft: '3px solid #ff4d4f',
                      }}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <strong>{item.reimburseNo}</strong>
                      </div>
                      <div style={{ color: '#ff4d4f', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Finance;
