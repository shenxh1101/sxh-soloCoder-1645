import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { getCurrentUser } from './utils/auth';
import { Employee as EmployeeType } from './types';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
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
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="my-reimbursements" element={<MyReimbursements />} />
          <Route path="reimbursement/new" element={<ReimbursementForm />} />
          <Route path="reimbursement/:id" element={<ReimbursementDetail />} />
          <Route path="reimbursement/edit/:id" element={<ReimbursementForm />} />
          <Route path="approval" element={<Approval />} />
          <Route path="finance" element={<Finance />} />
          <Route path="budget" element={<Budget />} />
          <Route path="statistics" element={<Statistics />} />
          <Route path="department" element={<Department />} />
          <Route path="employee" element={<Employee />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
