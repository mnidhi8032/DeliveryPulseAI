import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

type RoleCode = "PM" | "CEO" | "BU_HEAD" | "PLATFORM_ADMIN" | "DELIVERY_EXCELLENCE";

interface RoleShellLayoutProps {
  title: string;
  role: RoleCode;
  basePath: string;
}

export function RoleShellLayout({ title, role, basePath }: RoleShellLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar title={title} role={role} basePath={basePath} />
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
