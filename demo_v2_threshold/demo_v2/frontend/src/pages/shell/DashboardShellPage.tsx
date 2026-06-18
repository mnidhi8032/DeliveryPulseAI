import { useAuth } from "../../contexts/AuthContext";
import { PMDashboardPage } from "./PMDashboardPage";
import { DHDashboardPage } from "./DHDashboardPage";
import { ShellPlaceholder } from "../../components/ShellPlaceholder";

export function DashboardShellPage() {
  const { user } = useAuth();

  if (user?.role_code === "PM") {
    return <PMDashboardPage />;
  }

  if (user?.role_code === "DELIVERY_HEAD") {
    return <DHDashboardPage />;
  }

  return <ShellPlaceholder title="Dashboard" />;
}
