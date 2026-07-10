/**
 * Delivery Head Layout — light background, uses the shared Header.
 */
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

export function DeliveryHeadLayout() {
  return (
    <div className="flex min-h-screen bg-[#f5f7fa]">
      <Sidebar title="Delivery Head" role="DELIVERY_HEAD" basePath="/delivery-head" />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="px-8 py-7 max-w-[1400px]">
          <Header />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
