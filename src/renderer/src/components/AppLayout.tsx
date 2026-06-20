import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Popover, List, Typography, message, Tag } from 'antd';
import {
  DashboardOutlined,
  FileTextOutlined,
  PlusCircleOutlined,
  CheckCircleOutlined,
  DollarCircleOutlined,
  PieChartOutlined,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { getMenusByRole, MenuItem } from '../config/menuConfig';
import { getCurrentUser, clearCurrentUser, api } from '../utils/auth';
import { Notification as NotificationType, ROLE_NAMES } from '../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const iconMap: Record<string, React.ReactNode> = {
  DashboardOutlined: <DashboardOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  PlusCircleOutlined: <PlusCircleOutlined />,
  CheckCircleOutlined: <CheckCircleOutlined />,
  DollarCircleOutlined: <DollarCircleOutlined />,
  PieChartOutlined: <PieChartOutlined />,
  BarChartOutlined: <BarChartOutlined />,
  TeamOutlined: <TeamOutlined />,
  UserOutlined: <UserOutlined />,
};

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);

  const loadNotifications = async () => {
    if (user) {
      const data = await api.getMyNotifications(user.id);
      setNotifications(data || []);
    }
  };

  useEffect(() => {
    loadNotifications();
    const unsubscribe = api.onNotification(() => {
      loadNotifications();
    });
    return () => unsubscribe && unsubscribe();
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const menus: MenuItem[] = user ? getMenusByRole(user.role) : [];

  const handleLogout = () => {
    clearCurrentUser();
    navigate('/login');
  };

  const handleMarkRead = async (id: number) => {
    await api.markNotificationRead(id);
    loadNotifications();
  };

  const handleNotificationClick = async (item: NotificationType) => {
    if (!item.isRead) {
      await api.markNotificationRead(item.id);
      loadNotifications();
    }
    if (item.reimbursementId) {
      navigate(`/reimbursement/${item.reimbursementId}`);
    } else if ((item.type === 'budget') && (item as any).budgetId) {
      navigate(`/budget?tab=warning&budgetId=${(item as any).budgetId}&openDetail=true`);
    } else if (item.type === 'escalation') {
      navigate('/approval?tab=escalated');
    }
  };

  const menuItems = menus.map((item) => ({
    key: item.path,
    icon: iconMap[item.icon],
    label: item.label,
    onClick: () => navigate(item.path),
  }));

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: (
          <span>
            <UserOutlined /> 个人信息
          </span>
        ),
      },
      { type: 'divider' as const },
      {
        key: 'logout',
        label: (
          <span onClick={handleLogout}>
            <LogoutOutlined /> 退出登录
          </span>
        ),
      },
    ],
  };

  const notificationContent = (
    <div style={{ width: 360 }}>
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 600 }}>通知消息</span>
        <Button
          type="link"
          size="small"
          onClick={() => navigate('/notifications')}
        >
          查看全部
        </Button>
      </div>
      {unreadCount > 0 && (
        <div
          style={{
            padding: '8px 16px',
            background: '#f6ffed',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Button
            type="link"
            size="small"
            onClick={async () => {
              if (user) {
                const count = await api.markAllNotificationsRead(user.id);
                message.success(`已将 ${count} 条通知标记为已读`);
                loadNotifications();
              }
            }}
          >
            一键全部已读
          </Button>
        </div>
      )}
      <List
        dataSource={notifications.slice(0, 8)}
        locale={{ emptyText: '暂无通知' }}
        renderItem={(item) => (
          <List.Item
            key={item.id}
            className={item.isRead ? 'notification-item' : 'notification-item unread'}
            onClick={() => handleNotificationClick(item)}
            style={{ cursor: 'pointer' }}
          >
            <List.Item.Meta
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong>{item.title}</Text>
                  {!item.isRead && <Tag color="red">新</Tag>}
                  {item.reimbursementId && <Tag color="blue">可跳转</Tag>}
                </div>
              }
              description={
                <div>
                  <div style={{ color: '#666', fontSize: 13 }}>{item.content}</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={(value) => setCollapsed(value)}
        theme="dark"
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: collapsed ? 14 : 18,
            fontWeight: 700,
            background: 'rgba(255,255,255,0.1)',
            margin: 16,
            borderRadius: 6,
          }}
        >
          {collapsed ? '报销' : '费用报销系统'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#001529',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 500 }}>
            企业员工费用报销与预算管控系统
          </div>
          <div className="header-user-info">
            <Popover
              content={notificationContent}
              trigger="click"
              placement="bottomRight"
            >
              <Badge count={unreadCount} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined style={{ color: '#fff', fontSize: 18 }} />}
                />
              </Badge>
            </Popover>
            <Dropdown menu={userMenu} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <div style={{ fontSize: 14 }}>
                  <div>{user?.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
                    {user?.role ? ROLE_NAMES[user.role] : ''}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content style={{ margin: 0, padding: 0 }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
