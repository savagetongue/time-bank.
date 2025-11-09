import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { User, Briefcase, BookOpen, Settings } from "lucide-react";
const dashboardNavLinks = [
  { to: "/dashboard/profile", label: "Profile", icon: User },
  { to: "/dashboard/offers", label: "My Offers", icon: Briefcase },
  { to: "/dashboard/bookings", label: "My Bookings", icon: BookOpen },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
];
const DashboardNavLink = ({ to, label, icon: Icon }: typeof dashboardNavLinks[0]) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
        isActive && "bg-muted text-primary"
      )
    }
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);
export function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-8 md:py-10 lg:py-12">
        <div className="grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] gap-6">
          <div className="flex flex-col gap-2">
            <nav className="grid gap-1 text-sm font-medium">
              {dashboardNavLinks.map(link => (
                <DashboardNavLink key={link.to} {...link} />
              ))}
            </nav>
          </div>
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}