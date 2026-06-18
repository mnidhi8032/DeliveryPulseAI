import { Route, Routes } from "react-router-dom";

// Layouts
import { PlatformLayout }   from "../layouts/PlatformLayout";
import { CEOLayout }        from "../layouts/CEOLayout";
import { BUHeadLayout }     from "../layouts/BUHeadLayout";
import { PMLayout }         from "../layouts/PMLayout";

// Platform Admin pages
import { PlatformAdminDashboardPage }   from "../pages/platform/PlatformAdminDashboardPage";
import { PlatformAdminBusinessUnitsPage } from "../pages/platform/PlatformAdminBusinessUnitsPage";
import { PlatformAdminBUAnalysisPage }  from "../pages/platform/PlatformAdminBUAnalysisPage";
import { PlatformAdminReportsPage }     from "../pages/platform/PlatformAdminReportsPage";
import { PlatformAdminSettingsPage }    from "../pages/platform/PlatformAdminSettingsPage";

// CEO pages
import { CEODashboardPage }       from "../pages/ceo/CEODashboardPage";
import { CEOBusinessUnitsPage }   from "../pages/ceo/CEOBusinessUnitsPage";
import { CEOProjectsPage }        from "../pages/ceo/CEOProjectsPage";
import { CEOBUDetailPage }        from "../pages/ceo/CEOBUDetailPage";
import { PlatformAdminReportsPage as CEOReportsPage } from "../pages/platform/PlatformAdminReportsPage";

// BU Head pages
import { BUHeadDashboardPage }  from "../pages/bu-head/BUHeadDashboardPage";
import { BUHeadProjectsPage }   from "../pages/bu-head/BUHeadProjectsPage";
import { BUHeadMyBUPage }       from "../pages/bu-head/BUHeadMyBUPage";

// PM pages
import { PMProjectsPage }     from "../pages/pm/PMProjectsPage";
import { PMProjectDetailPage } from "../pages/pm/PMProjectDetailPage";
import { ProjectPhasesPage }  from "../pages/pm/ProjectPhasesPage";
import { ActionItemsPage }    from "../pages/pm/ActionItemsPage";
import { QPMPlanPage }        from "../pages/pm/QPMPlanPage";
import { QPMDataEntryPage }   from "../pages/pm/QPMDataEntryPage";
import { QPMTrackerPage }     from "../pages/pm/QPMTrackerPage";
import { QPMSummaryPage }     from "../pages/pm/QPMSummaryPage";
import { QPMDocInfoPage }     from "../pages/pm/QPMDocInfoPage";

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
      {/* Public */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Platform Admin -- creates BUs/accounts, manages users, system config */}
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

      {/* CEO -- read-only across ALL BUs and projects */}
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

      {/* BU Head -- read-only for their BU only */}
      <Route element={<ProtectedRoute allowedRoles={["BU_HEAD"]} />}>
        <Route path="/bu-head" element={<BUHeadLayout />}>
          <Route index element={<BUHeadDashboardPage />} />
          <Route path="business-unit" element={<BUHeadMyBUPage />} />
          <Route path="projects" element={<BUHeadProjectsPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
        </Route>
      </Route>

      {/* PM -- creates projects, fills QPM plan, submits (auto-approved) */}
      <Route element={<ProtectedRoute allowedRoles={["PM"]} />}>
        <Route path="/pm" element={<PMLayout />}>
          <Route index element={<DashboardShellPage />} />
          <Route path="projects" element={<PMProjectsPage />} />
          <Route path="projects/:projectId" element={<PMProjectDetailPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="projects/:projectId/phases" element={<ProjectPhasesPage />} />
          <Route path="projects/:projectId/actions" element={<ActionItemsPage />} />
          <Route path="projects/:projectId/qpm" element={<QPMPlanPage />} />
          <Route path="projects/:projectId/qpm/entry" element={<QPMDataEntryPage />} />
          <Route path="projects/:projectId/qpm/tracker" element={<QPMTrackerPage />} />
          <Route path="projects/:projectId/qpm/summary" element={<QPMSummaryPage />} />
          <Route path="projects/:projectId/qpm/doc-info" element={<QPMDocInfoPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
