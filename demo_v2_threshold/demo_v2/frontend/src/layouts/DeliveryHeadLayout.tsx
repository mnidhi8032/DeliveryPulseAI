/**
 * Delivery Head Layout — dark canvas to match the DH executive UI.
 * Uses its own shell instead of the shared light RoleShellLayout.
 */
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { DHHeader } from "../components/DHHeader";

export function DeliveryHeadLayout() {
  return (
    <div className="flex min-h-screen bg-[#13131f]">
      <Sidebar title="Delivery Head" role="DELIVERY_HEAD" basePath="/delivery-head" />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="px-8 py-7 max-w-[1400px]">
          <DHHeader />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
