import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
// Layout
import { RootLayout } from '@/components/layout/RootLayout';
// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OffersPage } from '@/pages/OffersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
// Dashboard Pages
import { ProfilePage } from '@/pages/dashboard/ProfilePage';
import { MyOffersPage } from '@/pages/dashboard/MyOffersPage';
import { MyRequestsPage } from '@/pages/dashboard/MyRequestsPage';
import { BookingsPage } from '@/pages/dashboard/BookingsPage';
import { SettingsPage } from '@/pages/dashboard/SettingsPage';
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/offers", element: <OffersPage /> },
      {
        path: "/dashboard",
        element: <DashboardPage />,
        children: [
          { index: true, element: <Navigate to="profile" replace /> },
          { path: "profile", element: <ProfilePage /> },
          { path: "offers", element: <MyOffersPage /> },
          { path: "requests", element: <MyRequestsPage /> },
          { path: "bookings", element: <BookingsPage /> },
          { path: "settings", element: <SettingsPage /> },
        ]
      },
      {
        path: "/admin",
        children: [
          { index: true, element: <Navigate to="disputes" replace /> },
          { path: "disputes", element: <AdminPage /> },
        ]
      },
    ]
  },
]);
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)