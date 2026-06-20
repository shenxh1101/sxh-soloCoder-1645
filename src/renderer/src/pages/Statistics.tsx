import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Statistic,
  Tabs,
  message,
  Tag,
  Modal,
} from 'antd';
import { ExportOutlined, BarChartOutlined, PieChartOutlined, FolderOpenOutlined } from '@ant-design/icons';
import { api } from '../utils/auth';
import { CATEGORY_NAMES } from '../types';

const Statistics: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [catData, setCatData] = useState<any[]>([]);

  const years = [];
  for (let y = now.getFullYear() - 3; y <= now.getFullYear() + 1; y++) {
    years.push({ value: y, label: `${y}年` });
  }

  const months = [];
  for (let m = 1; m <= 12; m++) {
    months.push({ value: m, label: `${m}月` });
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptResult, catResult] = await Promise.all([
        api.getStatisticsByDepartment(year, month),
        api.getStatisticsByCategory(year, month),
      ]);
      setDeptData(deptResult || []);
      setCatData(catResult || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const handleExport = async () => {
    try {
      const result = await api.exportMonthlyReport(year, month);
      if (result?.canceled) {
        return;
      }
      if (result?.success) {
        Modal.success({
          title: '导出成功',
          width: 520,
          okText: '我知道了',
          content: (
            <div>
              <p style={{ marginBottom: 8 }}>
                月度报表已成功导出！
              </p>
              <div
                style={{
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: 6,
                  padding: '12px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <FolderOpenOutlined style={{ color: '#52c41a' }} />
                  <strong>保存位置</strong>
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    background: '#fff',
                    padding: '8px 12px',
                    borderRadius: 4,
                    wordBreak: 'break-all',
                    color: '#262626',
                    fontSize: 13,
                  }}
                >
                  {result.filePath}
                </div>
              </div>
              <p style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
                共导出 {result.recordCount || 0} 条报销记录，已自动打开所在文件夹
              </p>
            </div>
          ),
        });
      } else {
        message.error('导出失败');
      }
    } catch (error: any) {
      message.error(error?.message || '导出失败');
    }
  };

  const totalAmount = deptData.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalCount = deptData.reduce((sum, d) => sum + d.count, 0);
  const totalItems = deptData.reduce((sum, d) => sum + d.itemCount, 0);

  const deptColumns = [
    {
      title: '部门',
      dataIndex: 'departmentName',
      width: 150,
    },
    {
      title: '报销笔数',
      dataIndex: 'count',
      width: 100,
      sorter: (a: any, b: any) => a.count - b.count,
    },
    {
      title: '费用项数',
      dataIndex: 'itemCount',
      width: 100,
      sorter: (a: any, b: any) => a.itemCount - b.itemCount,
    },
    {
      title: '报销总金额',
      dataIndex: 'totalAmount',
      width: 140,
      render: (val: number) => <span className="amount-text">¥{val.toFixed(2)}</span>,
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
    },
    {
      title: '各类别金额',
      render: (_: any, record: any) => {
        return (
          <div>
            {Object.entries(record.categoryAmounts || {}).map(([cat, amt]) => (
              <Tag key={cat} color="blue">
                {CATEGORY_NAMES[cat as keyof typeof CATEGORY_NAMES]}: ¥
                {(amt as number).toFixed(2)}
              </Tag>
            ))}
          </div>
        );
      },
    },
  ];

  const catColumns = [
    {
      title: '费用类别',
      dataIndex: 'categoryName',
      width: 150,
    },
    {
      title: '笔数',
      dataIndex: 'count',
      width: 100,
      sorter: (a: any, b: any) => a.count - b.count,
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      width: 140,
      render: (val: number) => <span className="amount-text">¥{val.toFixed(2)}</span>,
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
    },
    {
      title: '占比',
      width: 120,
      render: (_: any, record: any) => {
        const percent = totalAmount > 0 ? (record.totalAmount / totalAmount) * 100 : 0;
        return <span>{percent.toFixed(1)}%</span>;
      },
    },
    {
      title: '各部门分布',
      render: (_: any, record: any) => {
        return (
          <div>
            {Object.entries(record.departments || {}).map(([dept, info]: [string, any]) => (
              <Tag key={dept}>
                {dept}: {info.count}笔/¥{info.amount.toFixed(2)}
              </Tag>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <div className="page-container">
      <div className="page-title">统计报表</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: '100%' }}
            options={years}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            value={month}
            onChange={setMonth}
            style={{ width: '100%' }}
            options={months}
          />
        </Col>
        <Col xs={24} sm={24} md={12} style={{ textAlign: 'right' }}>
          <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
            导出Excel月度报表
          </Button>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`${year}年${month}月报销总金额`}
              value={totalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`${year}年${month}月报销笔数`}
              value={totalCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title={`${year}年${month}月费用项数`}
              value={totalItems}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs
          items={[
            {
              key: 'department',
              label: (
                <span>
                  <BarChartOutlined /> 按部门统计
                </span>
              ),
              children: (
                <Table
                  columns={deptColumns}
                  dataSource={deptData}
                  rowKey="departmentId"
                  loading={loading}
                  pagination={false}
                  bordered
                />
              ),
            },
            {
              key: 'category',
              label: (
                <span>
                  <PieChartOutlined /> 按类别统计
                </span>
              ),
              children: (
                <Table
                  columns={catColumns}
                  dataSource={catData}
                  rowKey="category"
                  loading={loading}
                  pagination={false}
                  bordered
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default Statistics;
