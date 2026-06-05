import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import LoginPage from '../pages/auth/LoginPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProductionPage from '../pages/production/ProductionPage';
import RemainingPage from '../pages/remaining/RemainingPage';
import ReportsPage from '../pages/reports/ReportsPage';
import ProductsPage from '../pages/products/ProductsPage';
import WastePage from '../pages/waste/WastePage';
import BranchesPage from '../pages/branches/BranchesPage';
import UsersPage from '../pages/users/UsersPage';
import ProfilePage from '../pages/profile/ProfilePage';
import NotFoundPage from '../pages/NotFoundPage';
import { getUserRole, getToken } from '../utils/authUtils';
import { hasPageAccess, PAGES } from '../utils/permissions';

const ProtectedRoute = ({ children, requiredPage }) => {
  const token = getToken();
  const role = getUserRole();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPage && !hasPageAccess(role, requiredPage)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
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
        element: (
          <ProtectedRoute requiredPage={PAGES.DASHBOARD}>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'production',
        element: (
          <ProtectedRoute requiredPage={PAGES.PRODUCTION}>
            <ProductionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'remaining',
        element: (
          <ProtectedRoute requiredPage={PAGES.REMAINING}>
            <RemainingPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'reports',
        element: (
          <ProtectedRoute requiredPage={PAGES.REPORTS}>
            <ReportsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'products',
        element: (
          <ProtectedRoute requiredPage={PAGES.PRODUCTS}>
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'waste',
        element: (
          <ProtectedRoute requiredPage={PAGES.WASTE}>
            <WastePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'branches',
        element: (
          <ProtectedRoute requiredPage={PAGES.BRANCHES}>
            <BranchesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute requiredPage={PAGES.USERS}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute requiredPage={PAGES.PROFILE}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;