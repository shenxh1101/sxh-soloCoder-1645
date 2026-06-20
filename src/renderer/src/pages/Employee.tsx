import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { api } from '../utils/auth';
import {
  Employee as EmployeeModel,
  ROLE_NAMES,
  Role,
} from '../types';

const Employee: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<EmployeeModel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [departments, setDepartments] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeModel | null>(null);
  const [form] = Form.useForm();

  const loadDepartments = async () => {
    const depts = await api.getAllDepartments();
    setDepartments(depts || []);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getAllEmployees({
        page,
        pageSize,
        keyword,
        role: roleFilter,
      });
      setData(result?.data || []);
      setTotal(result?.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadData();
  }, [page, pageSize, keyword, roleFilter]);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      role: 'EMPLOYEE',
      password: '123456',
    });
    setModalOpen(true);
  };

  const handleEdit = (record: EmployeeModel) => {
    setEditing(record);
    form.setFieldsValue({
      employeeNo: record.employeeNo,
      name: record.name,
      email: record.email,
      phone: record.phone,
      role: record.role,
      departmentId: record.departmentId,
      password: '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteEmployee(id);
      message.success('删除成功');
      loadData();
    } catch (error: any) {
      message.error(error?.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.updateEmployee(editing.id, values);
        message.success('更新成功');
      } else {
        await api.createEmployee(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      loadData();
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(error?.message || '操作失败');
      }
    }
  };

  const columns = [
    {
      title: '工号',
      dataIndex: 'employeeNo',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 100,
    },
    {
      title: '角色',
      dataIndex: 'role',
      width: 120,
      render: (val: Role) => (
        <Tag
          color={
            val === 'ADMIN'
              ? 'red'
              : val === 'FINANCE_HEAD'
              ? 'purple'
              : val === 'DEPARTMENT_HEAD'
              ? 'blue'
              : 'default'
          }
        >
          {ROLE_NAMES[val]}
        </Tag>
      ),
    },
    {
      title: '所属部门',
      dataIndex: ['department', 'name'],
      width: 120,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 200,
    },
    {
      title: '电话',
      dataIndex: 'phone',
      width: 140,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: EmployeeModel) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此员工？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">员工管理</div>

      <div className="card-actions">
        <Input
          placeholder="搜索工号/姓名/邮箱"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          style={{ width: 220 }}
          allowClear
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="选择角色"
          value={roleFilter}
          onChange={(val) => {
            setRoleFilter(val);
            setPage(1);
          }}
          style={{ width: 160 }}
          allowClear
          options={Object.entries(ROLE_NAMES).map(([key, label]) => ({
            value: key,
            label,
          }))}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ marginLeft: 'auto' }}
        >
          新建员工
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1100 }}
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
        bordered
      />

      <Modal
        title={editing ? '编辑员工' : '新建员工'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              label="工号"
              name="employeeNo"
              rules={[{ required: true, message: '请输入工号' }]}
            >
              <Input placeholder="请输入工号，如：EMP001" disabled={!!editing} />
            </Form.Item>
            <Form.Item
              label="姓名"
              name="name"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={editing ? [] : [{ required: true, message: '请输入初始密码' }]}
              extra={editing ? '留空表示不修改密码' : '初始密码，员工登录后可修改'}
            >
              <Input.Password
                placeholder={editing ? '留空不修改' : '请输入初始密码'}
              />
            </Form.Item>
            <Form.Item label="邮箱" name="email">
              <Input placeholder="请输入邮箱" />
            </Form.Item>
            <Form.Item label="电话" name="phone">
              <Input placeholder="请输入电话" />
            </Form.Item>
            <Form.Item
              label="角色"
              name="role"
              rules={[{ required: true, message: '请选择角色' }]}
            >
              <Select
                placeholder="请选择角色"
                options={Object.entries(ROLE_NAMES).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
              />
            </Form.Item>
            <Form.Item label="所属部门" name="departmentId">
              <Select
                placeholder="请选择部门"
                allowClear
                options={departments.map((d) => ({
                  value: d.id,
                  label: d.name,
                }))}
              />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
};

export default Employee;
