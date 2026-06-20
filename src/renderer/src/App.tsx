import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import MyReimbursements from './pages/MyReimbursements';
import ReimbursementForm from './pages/ReimbursementForm';
import ReimbursementDetail from './pages/ReimbursementDetail';
import Approval from './pages/Approval';
import Finance from './pages/Finance';
import Budget from './pages/Budget';
import Statistics from './pages/Statistics';
import Department from './pages/Department';
import Employee from './pages/Employee';
import NotificationCenter from './pages/NotificationCenter';
import { getCurrentUser } from './utils/auth';
import { Employee as EmployeeType, Role, ROLE_NAMES } from './types';
import { hasPermission } from './config/menuConfig';
import { message } from 'antd';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowedRoles: Role[] }> = ({
  children,
  allowedRoles,
}) => {
  const user = getCurrentUser();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role as Role)) {
    message.error(`您当前角色为【${ROLE_NAMES[user.role as Role]}】，无权访问该页面`);
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PermissionCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getCurrentUser();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      const path = location.pathname;
      const exemptPaths = ['/dashboard', '/my-reimbursements', '/reimbursement/new'];
      const isDetailOrEdit = path.startsWith('/reimbursement/');
      if (!exemptPaths.includes(path) && !isDetailOrEdit && !hasPermission(user.role as Role, path)) {
        message.error(`您当前角色为【${ROLE_NAMES[user.role as Role]}】，无权访问该页面`);
      }
    }
  }, [location.pathname, user]);

  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<EmployeeType | null>(getCurrentUser());

  useEffect(() => {
    const checkUser = () => {
      setUser(getCurrentUser());
    };
    window.addEventListener('storage', checkUser);
    return () => window.removeEventListener('storage', checkUser);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <PermissionCheck>
                <AppLayout />
              </PermissionCheck>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-reimbursements" element={<MyReimbursements />} />
          <Route path="notifications" element={<NotificationCenter />} />
          <Route path="reimbursement/new" element={<ReimbursementForm />} />
          <Route path="reimbursement/:id" element={<ReimbursementDetail />} />
          <Route path="reimbursement/edit/:id" element={<ReimbursementForm />} />
          <Route
            path="approval"
            element={
              <RoleRoute allowedRoles={['DEPARTMENT_HEAD', 'ADMIN']}>
                <Approval />
              </RoleRoute>
            }
          />
          <Route
            path="finance"
            element={
              <RoleRoute allowedRoles={['FINANCE_HEAD', 'ADMIN']}>
                <Finance />
              </RoleRoute>
            }
          />
          <Route
            path="budget"
            element={
              <RoleRoute allowedRoles={['FINANCE_HEAD', 'ADMIN']}>
                <Budget />
              </RoleRoute>
            }
          />
          <Route
            path="statistics"
            element={
              <RoleRoute allowedRoles={['FINANCE_HEAD', 'ADMIN', 'DEPARTMENT_HEAD']}>
                <Statistics />
              </RoleRoute>
            }
          />
          <Route
            path="department"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <Department />
              </RoleRoute>
            }
          />
          <Route
            path="employee"
            element={
              <RoleRoute allowedRoles={['ADMIN']}>
                <Employee />
              </RoleRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
