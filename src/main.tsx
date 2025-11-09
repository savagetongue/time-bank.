import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'
// Layout
import { AppLayout } from '@/components/layout/AppLayout';
// Pages
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { OffersPage } from '@/pages/OffersPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AdminPage } from '@/pages/AdminPage';
const RootLayout = () => (
  <AppLayout>
    <Outlet />
  </AppLayout>
);
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
          // Placeholder for nested dashboard routes
          { path: "profile", element: <div>Profile Page</div> },
          { path: "offers", element: <div>My Offers Page</div> },
          { path: "bookings", element: <div>My Bookings Page</div> },
          { path: "settings", element: <div>Settings Page</div> },
        ]
      },
      { path: "/admin", element: <AdminPage /> },
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