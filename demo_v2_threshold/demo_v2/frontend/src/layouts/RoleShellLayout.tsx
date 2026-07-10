import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

type RoleCode = "PM" | "CEO" | "DELIVERY_HEAD" | "DELIVERY_MANAGER" | "PLATFORM_ADMIN" | "DELIVERY_EXCELLENCE";

interface RoleShellLayoutProps {
  title: string;
  role: RoleCode;
  basePath: string;
}

export function RoleShellLayout({ title, role, basePath }: RoleShellLayoutProps) {
  return (
    <div className="flex min-h-screen" style={{ background: "#f0f2ff" }}>
      <Sidebar title={title} role={role} basePath={basePath} />
      <main className="flex-1 overflow-auto min-w-0" style={{ background: "#f0f2ff" }}>
        <div className="px-8 py-7 max-w-[1400px]">
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
