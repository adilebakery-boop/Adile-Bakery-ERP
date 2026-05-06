import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProductionPage from '../pages/production/ProductionPage';
import RemainingPage from '../pages/remaining/RemainingPage';
import ReportsPage from '../pages/reports/ReportsPage';
import ProductsPage from '../pages/products/ProductsPage';
import BranchesPage from '../pages/branches/BranchesPage';
import UsersPage from '../pages/users/UsersPage';
import NotFoundPage from '../pages/NotFoundPage';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'production',
        element: <ProductionPage />,
      },
      {
        path: 'remaining',
        element: <RemainingPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'products',
        element: <ProductsPage />,
      },
      {
        path: 'branches',
        element: <BranchesPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;