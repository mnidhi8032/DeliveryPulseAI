/**
 * Delivery Head Layout — theme-aware, uses CSS variables for dark/light mode.
 */
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

export function DeliveryHeadLayout() {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar title="Delivery Head" role="DELIVERY_HEAD" basePath="/delivery-head" />
      <main className="flex-1 overflow-auto min-w-0" style={{ background: "var(--bg)" }}>
        <div className="px-8 py-7 max-w-[1400px]">
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
