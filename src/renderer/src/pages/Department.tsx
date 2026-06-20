import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../utils/auth';
import { Department as DepartmentType } from '../types';

const Department: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DepartmentType[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentType | null>(null);
  const [form] = Form.useForm();
  const [keyword, setKeyword] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await api.getAllDepartments();
      let list = result || [];
      if (keyword) {
        list = list.filter(
          (d) =>
            d.name.includes(keyword) ||
            (d.description && d.description.includes(keyword))
        );
      }
      setData(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [keyword]);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: DepartmentType) => {
    setEditing(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteDepartment(id);
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
        await api.updateDepartment(editing.id, values);
        message.success('更新成功');
      } else {
        await api.createDepartment(values);
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
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '部门名称',
      dataIndex: 'name',
      width: 200,
    },
    {
      title: '部门描述',
      dataIndex: 'description',
    },
    {
      title: '员工数量',
      width: 120,
      render: (_: any, record: any) => record.employees?.length || 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
      render: (val: string) => new Date(val).toLocaleString(),
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: DepartmentType) => (
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
            title="确定删除此部门？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">部门管理</div>

      <div className="card-actions">
        <Input
          placeholder="搜索部门名称/描述"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 240 }}
          allowClear
          prefix={<SearchOutlined />}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          style={{ marginLeft: 'auto' }}
        >
          新建部门
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        bordered
      />

      <Modal
        title={editing ? '编辑部门' : '新建部门'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="部门名称"
            name="name"
            rules={[{ required: true, message: '请输入部门名称' }]}
          >
            <Input placeholder="请输入部门名称" maxLength={50} />
          </Form.Item>
          <Form.Item label="部门描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入部门描述" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Department;
