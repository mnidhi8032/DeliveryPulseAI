import { Route, Routes } from "react-router-dom";

// Layouts
import { PlatformLayout }           from "../layouts/PlatformLayout";
import { CEOLayout }                from "../layouts/CEOLayout";
import { BUHeadLayout }             from "../layouts/BUHeadLayout";
import { PMLayout }                 from "../layouts/PMLayout";
import { DeliveryExcellenceLayout } from "../layouts/DeliveryExcellenceLayout";

// Delivery Excellence
import { DECatalogPage } from "../pages/delivery-excellence/DECatalogPage";

// Platform Admin pages
import { PlatformAdminDashboardPage }   from "../pages/platform/PlatformAdminDashboardPage";
import { PlatformAdminBusinessUnitsPage } from "../pages/platform/PlatformAdminBusinessUnitsPage";
import { PlatformAdminBUAnalysisPage }  from "../pages/platform/PlatformAdminBUAnalysisPage";
import { PlatformAdminReportsPage }     from "../pages/platform/PlatformAdminReportsPage";
import { PlatformAdminSettingsPage }    from "../pages/platform/PlatformAdminSettingsPage";

// CEO pages
import { CEODashboardPage }     from "../pages/ceo/CEODashboardPage";
import { CEOBusinessUnitsPage } from "../pages/ceo/CEOBusinessUnitsPage";
import { CEOProjectsPage }      from "../pages/ceo/CEOProjectsPage";
import { CEOBUDetailPage }      from "../pages/ceo/CEOBUDetailPage";
import { PlatformAdminReportsPage as CEOReportsPage } from "../pages/platform/PlatformAdminReportsPage";

// BU Head pages
import { BUHeadDashboardPage } from "../pages/bu-head/BUHeadDashboardPage";
import { BUHeadProjectsPage }  from "../pages/bu-head/BUHeadProjectsPage";
import { BUHeadMyBUPage }      from "../pages/bu-head/BUHeadMyBUPage";

// PM pages
import { PMProjectsPage }   from "../pages/pm/PMProjectsPage";
import { PMProjectDetailPage } from "../pages/pm/PMProjectDetailPage";
import { ProjectPhasesPage }  from "../pages/pm/ProjectPhasesPage";
import { ActionItemsPage }    from "../pages/pm/ActionItemsPage";
import { QPMDataEntryPage }   from "../pages/pm/QPMDataEntryPage";
import { QPMTrackerPage }     from "../pages/pm/QPMTrackerPage";
import { QPMDocInfoPage }     from "../pages/pm/QPMDocInfoPage";
import { PMSummaryPage }      from "../pages/pm/PMSummaryPage";

// Shared
import { ProjectHealthTimelinePage } from "../pages/shared/ProjectHealthTimelinePage";
import { DashboardShellPage }        from "../pages/shell/DashboardShellPage";

// Auth
import { LoginPage }        from "../pages/LoginPage";
import { NotFoundPage }     from "../pages/NotFoundPage";
import { UnauthorizedPage } from "../pages/UnauthorizedPage";
import { ProtectedRoute, PublicOnlyRoute } from "./ProtectedRoute";
import { RootRedirect }     from "./RootRedirect";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Delivery Excellence -- metric catalog management */}
      <Route element={<ProtectedRoute allowedRoles={["DELIVERY_EXCELLENCE"]} />}>
        <Route path="/delivery-excellence" element={<DeliveryExcellenceLayout />}>
          <Route index element={<DECatalogPage />} />
        </Route>
      </Route>

      {/* Platform Admin */}
      <Route element={<ProtectedRoute allowedRoles={["PLATFORM_ADMIN"]} />}>
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<PlatformAdminDashboardPage />} />
          <Route path="business-units" element={<PlatformAdminBusinessUnitsPage />} />
          <Route path="bu/:id" element={<PlatformAdminBUAnalysisPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="reports" element={<PlatformAdminReportsPage />} />
          <Route path="settings" element={<PlatformAdminSettingsPage />} />
        </Route>
      </Route>

      {/* CEO */}
      <Route element={<ProtectedRoute allowedRoles={["CEO"]} />}>
        <Route path="/ceo" element={<CEOLayout />}>
          <Route index element={<CEODashboardPage />} />
          <Route path="business-units" element={<CEOBusinessUnitsPage />} />
          <Route path="business-units/:id" element={<CEOBUDetailPage />} />
          <Route path="projects" element={<CEOProjectsPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="reports" element={<CEOReportsPage />} />
        </Route>
      </Route>

      {/* BU Head */}
      <Route element={<ProtectedRoute allowedRoles={["BU_HEAD"]} />}>
        <Route path="/bu-head" element={<BUHeadLayout />}>
          <Route index element={<BUHeadDashboardPage />} />
          <Route path="business-unit" element={<BUHeadMyBUPage />} />
          <Route path="projects" element={<BUHeadProjectsPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
        </Route>
      </Route>

      {/* PM */}
      <Route element={<ProtectedRoute allowedRoles={["PM"]} />}>
        <Route path="/pm" element={<PMLayout />}>
          <Route index element={<DashboardShellPage />} />
          <Route path="projects" element={<PMProjectsPage />} />
          <Route path="projects/:projectId" element={<PMProjectDetailPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="projects/:projectId/phases" element={<ProjectPhasesPage />} />
          <Route path="projects/:projectId/actions" element={<ActionItemsPage />} />
          <Route path="projects/:projectId/qpm/entry" element={<QPMDataEntryPage />} />
          <Route path="projects/:projectId/qpm/tracker" element={<QPMTrackerPage />} />
          <Route path="projects/:projectId/qpm/doc-info" element={<QPMDocInfoPage />} />
          <Route path="summary" element={<PMSummaryPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
