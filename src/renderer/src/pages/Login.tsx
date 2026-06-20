import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, setCurrentUser } from '../utils/auth';

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: { employeeNo: string; password: string }) => {
    setLoading(true);
    try {
      const user = await api.login(values.employeeNo, values.password);
      if (user) {
        setCurrentUser(user);
        message.success(`欢迎回来，${user.name}！`);
        navigate('/dashboard');
      } else {
        message.error('工号或密码错误');
      }
    } catch (error: any) {
      message.error(error?.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">企业员工费用报销与预算管控系统</div>
        <div className="login-subtitle">请输入您的工号和密码登录</div>
        <Form
          name="login"
          onFinish={onFinish}
          initialValues={{ employeeNo: '', password: '' }}
          size="large"
        >
          <Form.Item
            name="employeeNo"
            rules={[{ required: true, message: '请输入工号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="工号" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, fontSize: 16 }}
            >
              登 录
            </Button>
          </Form.Item>
        </Form>
        <div
          style={{
            marginTop: 24,
            padding: 12,
            background: '#f5f5f5',
            borderRadius: 6,
            fontSize: 12,
            color: '#666',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8 }}>测试账号：</div>
          <div>系统管理员：ADMIN001 / 123456</div>
          <div>普通员工(技术部)：EMP001 / 123456</div>
          <div>部门主管(技术部)：HEAD001 / 123456</div>
          <div>财务主管：FIN001 / 123456</div>
        </div>
      </div>
    </div>
  );
};

export default Login;
