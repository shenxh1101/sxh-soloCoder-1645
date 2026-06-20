import React, { useState, useEffect } from 'react';
import {
  Tabs,
  List,
  Tag,
  Button,
  Space,
  Card,
  Empty,
  message,
  Badge,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  BellOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getCurrentUser, api } from '../utils/auth';
import { Notification } from '../types';

const NotificationCenter: React.FC = () => {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getMyNotifications(user.id);
      setNotifications(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      const count = await api.markAllNotificationsRead(user.id);
      message.success(`已将 ${count} 条通知标记为已读`);
      loadNotifications();
    } catch (error: any) {
      message.error(error?.message || '操作失败');
    }
  };

  const handleNotificationClick = async (item: Notification) => {
    if (!item.isRead) {
      await api.markNotificationRead(item.id);
      loadNotifications();
    }

    if (item.reimbursementId) {
      navigate(`/reimbursement/${item.reimbursementId}`);
    } else if (item.type === 'budget' && item.budgetId) {
      if (user?.role === 'FINANCE_HEAD' || user?.role === 'ADMIN') {
        navigate(`/budget?tab=warning&budgetId=${item.budgetId}`);
      }
    } else if (item.type === 'escalation') {
      if (user?.role === 'ADMIN') {
        navigate('/approval?tab=escalated');
      }
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('approval') || type === 'rejection' || type === 'escalation') {
      if (type === 'rejection') return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      if (type === 'escalation') return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    }
    if (type.includes('finance') || type === 'payment') {
      return <DollarOutlined style={{ color: '#1890ff' }} />;
    }
    if (type === 'budget') {
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
    return <BellOutlined style={{ color: '#8c8c8c' }} />;
  };

  const getTypeTag = (type: string) => {
    if (type.includes('approval') || type === 'rejection' || type === 'escalation') {
      const color = type === 'rejection' ? 'red' : type === 'escalation' ? 'orange' : 'green';
      return <Tag color={color}>审批</Tag>;
    }
    if (type.includes('finance') || type === 'payment') {
      return <Tag color="blue">财务</Tag>;
    }
    if (type === 'budget') {
      return <Tag color="orange">预算预警</Tag>;
    }
    return <Tag>系统</Tag>;
  };

  const filterNotifications = (type: string) => {
    if (type === 'all') return notifications;
    if (type === 'unread') return notifications.filter((n) => !n.isRead);
    if (type === 'approval') {
      return notifications.filter(
        (n) =>
          n.type.includes('approval') ||
          n.type === 'rejection' ||
          n.type === 'escalation'
      );
    }
    if (type === 'finance') {
      return notifications.filter(
        (n) => n.type.includes('finance') || n.type === 'payment'
      );
    }
    if (type === 'budget') {
      return notifications.filter((n) => n.type === 'budget');
    }
    return notifications;
  };

  const displayedNotifications = filterNotifications(activeTab);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const approvalCount = notifications.filter(
    (n) =>
      n.type.includes('approval') || n.type === 'rejection' || n.type === 'escalation'
  ).length;
  const financeCount = notifications.filter(
    (n) => n.type.includes('finance') || n.type === 'payment'
  ).length;
  const budgetCount = notifications.filter((n) => n.type === 'budget').length;

  const tabs = [
    { key: 'all', label: `全部 (${notifications.length})` },
    { key: 'unread', label: (
      <span>
        <Badge count={unreadCount} size="small" offset={[4, -2]}>
          未读
        </Badge>
      </span>
    )},
    { key: 'approval', label: `审批 (${approvalCount})` },
    { key: 'finance', label: `财务 (${financeCount})` },
    { key: 'budget', label: `预算预警 (${budgetCount})` },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title" style={{ margin: 0 }}>
          通知中心
        </div>
        <Space>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            一键已读
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="全部通知"
              value={notifications.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<BellOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="未读通知"
              value={unreadCount}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="审批相关"
              value={approvalCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title="财务相关"
              value={financeCount}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabs}
          tabBarStyle={{ padding: '0 16px', margin: 0, borderBottom: '1px solid #f0f0f0' }}
        />

        {displayedNotifications.length === 0 ? (
          <div style={{ padding: '60px 0' }}>
            <Empty description="暂无通知" />
          </div>
        ) : (
          <List
            dataSource={displayedNotifications}
            loading={loading}
            renderItem={(item) => (
              <List.Item
                key={item.id}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid #f0f0f0',
                  background: item.isRead ? '#fff' : '#f6ffed',
                  cursor: 'pointer',
                }}
                onClick={() => handleNotificationClick(item)}
                hoverable
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    width: '100%',
                  }}
                >
                  <div style={{ flex: 1, marginRight: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: 6,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      {getTypeIcon(item.type)}
                      <strong style={{ fontSize: 15 }}>{item.title}</strong>
                      {!item.isRead && <Tag color="red">新</Tag>}
                      {getTypeTag(item.type)}
                      {item.reimbursementId && (
                        <Tag color="blue" style={{ marginLeft: 'auto' }}>
                          点击查看报销单
                        </Tag>
                      )}
                    </div>
                    <div
                      style={{
                        color: '#595959',
                        marginBottom: 6,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.content}
                    </div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>

      <Divider />

      <Card title="通知类型说明" size="small" style={{ marginTop: 16 }}>
        <Row gutter={[16, 8]}>
          <Col span={12}>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span style={{ color: '#595959' }}>审批通知：部门审批、经理复核、审批拒绝等</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <DollarOutlined style={{ color: '#1890ff' }} />
              <span style={{ color: '#595959' }}>财务通知：财务审核通过/退回、款项支付等</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              <span style={{ color: '#595959' }}>预算预警：预算超支、审批超时升级等</span>
            </Space>
          </Col>
          <Col span={12}>
            <Space>
              <BellOutlined style={{ color: '#8c8c8c' }} />
              <span style={{ color: '#595959' }}>其他系统通知</span>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default NotificationCenter;
