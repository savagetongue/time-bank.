import { Outlet } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
export function RootLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}