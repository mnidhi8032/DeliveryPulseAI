import { Route, Routes } from "react-router-dom";

// Layouts
import { PlatformLayout }           from "../layouts/PlatformLayout";
import { CEOLayout }                from "../layouts/CEOLayout";
import { DeliveryHeadLayout }             from "../layouts/DeliveryHeadLayout";
import { DeliveryManagerLayout }          from "../layouts/DeliveryManagerLayout";
import { PMLayout }                 from "../layouts/PMLayout";
import { DeliveryExcellenceLayout } from "../layouts/DeliveryExcellenceLayout";

// Shared - Portfolio Dashboard (Platform Admin, CEO, Delivery Excellence)
import { PortfolioDashboardPage } from "../pages/shared/PortfolioDashboardPage";

// Delivery Excellence
import { DECatalogPage } from "../pages/delivery-excellence/DECatalogPage";

// Platform Admin pages
import { PlatformAdminBusinessUnitsPage } from "../pages/platform/PlatformAdminBusinessUnitsPage";
import { PlatformAdminBUAnalysisPage }  from "../pages/platform/PlatformAdminBUAnalysisPage";
import { PlatformAdminReportsPage }     from "../pages/platform/PlatformAdminReportsPage";
import { PlatformAdminSettingsPage }    from "../pages/platform/PlatformAdminSettingsPage";

// CEO pages
import { CEOBusinessUnitsPage } from "../pages/ceo/CEOBusinessUnitsPage";
import { CEOProjectsPage }      from "../pages/ceo/CEOProjectsPage";
import { CEOBUDetailPage }      from "../pages/ceo/CEOBUDetailPage";
import { PlatformAdminReportsPage as CEOReportsPage } from "../pages/platform/PlatformAdminReportsPage";

// Delivery Head pages
import { DeliveryHeadDashboardPage }     from "../pages/delivery-head/DeliveryHeadDashboardPage";
import { DeliveryHeadProjectsPage }      from "../pages/delivery-head/DeliveryHeadProjectsPage";
import { DeliveryHeadMyBUPage }          from "../pages/delivery-head/DeliveryHeadMyBUPage";
import { DHSubmissionsPage }       from "../pages/dh/DHSubmissionsPage";
import { DHSubmissionReviewPage }  from "../pages/dh/DHSubmissionReviewPage";
import { GovernanceReviewsPage }   from "../pages/dh/GovernanceReviewsPage";
import { DHQPMReviewPage }         from "../pages/dh/DHQPMReviewPage";

// Delivery Manager pages
import { DMDashboardPage }          from "../pages/delivery-manager/DMDashboardPage";
import { DMProjectReviewPage }      from "../pages/delivery-manager/DMProjectReviewPage";
import { DMActionItemsPage }        from "../pages/delivery-manager/DMActionItemsPage";

// PM pages
import { PMProjectsPage }      from "../pages/pm/PMProjectsPage";
import { PMProjectDetailPage } from "../pages/pm/PMProjectDetailPage";
import { PMSubmissionPage }    from "../pages/pm/PMSubmissionPage";
import { ProjectPhasesPage }   from "../pages/pm/ProjectPhasesPage";
import { ActionItemsPage }     from "../pages/pm/ActionItemsPage";
import { QPMPlanPage }         from "../pages/pm/QPMPlanPage";
import { QPMDataEntryPage }    from "../pages/pm/QPMDataEntryPage";
import { QPMTrackerPage }      from "../pages/pm/QPMTrackerPage";
import { QPMSummaryPage }      from "../pages/pm/QPMSummaryPage";
import { QPMDocInfoPage }      from "../pages/pm/QPMDocInfoPage";
import { PMSummaryPage }       from "../pages/pm/PMSummaryPage";

// Shared
import { ProjectHealthTimelinePage } from "../pages/shared/ProjectHealthTimelinePage";
import { ComplianceReportPage }      from "../pages/shared/ComplianceReportPage";
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

      {/* Delivery Excellence -- same dashboard as Platform Admin + Metric Catalog */}
      <Route element={<ProtectedRoute allowedRoles={["DELIVERY_EXCELLENCE"]} />}>
        <Route path="/delivery-excellence" element={<DeliveryExcellenceLayout />}>
          <Route index element={<PortfolioDashboardPage />} />
          <Route path="catalog" element={<DECatalogPage />} />
        </Route>
      </Route>

      {/* Platform Admin */}
      <Route element={<ProtectedRoute allowedRoles={["PLATFORM_ADMIN"]} />}>
        <Route path="/platform" element={<PlatformLayout />}>
          <Route index element={<PortfolioDashboardPage />} />
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
          <Route index element={<PortfolioDashboardPage />} />
          <Route path="business-units" element={<CEOBusinessUnitsPage />} />
          <Route path="business-units/:id" element={<CEOBUDetailPage />} />
          <Route path="projects" element={<CEOProjectsPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="reports" element={<CEOReportsPage />} />
        </Route>
      </Route>

      {/* Delivery Head */}
      <Route element={<ProtectedRoute allowedRoles={["DELIVERY_HEAD"]} />}>
        <Route path="/delivery-head" element={<DeliveryHeadLayout />}>
          <Route index element={<DeliveryHeadDashboardPage />} />
          <Route path="business-unit" element={<DeliveryHeadMyBUPage />} />
          <Route path="projects" element={<DeliveryHeadProjectsPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="projects/:projectId/qpm-review" element={<DHQPMReviewPage />} />
          <Route path="submissions" element={<DHSubmissionsPage />} />
          <Route path="submissions/:submissionId" element={<DHSubmissionReviewPage />} />
          <Route path="governance-reviews" element={<GovernanceReviewsPage />} />
          <Route path="compliance" element={<ComplianceReportPage />} />
        </Route>
      </Route>

      {/* Delivery Manager */}
      <Route element={<ProtectedRoute allowedRoles={["DELIVERY_MANAGER"]} />}>
        <Route path="/delivery-manager" element={<DeliveryManagerLayout />}>
          <Route index element={<DMDashboardPage />} />
          <Route path="projects/:projectId/review" element={<DMProjectReviewPage />} />
          <Route path="actions" element={<DMActionItemsPage />} />
        </Route>
      </Route>

      {/* PM */}
      <Route element={<ProtectedRoute allowedRoles={["PM"]} />}>
        <Route path="/pm" element={<PMLayout />}>
          <Route index element={<DashboardShellPage />} />
          <Route path="projects" element={<PMProjectsPage />} />
          <Route path="projects/:projectId" element={<PMProjectDetailPage />} />
          <Route path="projects/:projectId/submissions/:submissionId" element={<PMSubmissionPage />} />
          <Route path="projects/:projectId/timeline" element={<ProjectHealthTimelinePage />} />
          <Route path="projects/:projectId/phases" element={<ProjectPhasesPage />} />
          <Route path="projects/:projectId/actions" element={<ActionItemsPage />} />
          <Route path="projects/:projectId/qpm" element={<QPMPlanPage />} />
          <Route path="projects/:projectId/qpm/entry" element={<QPMDataEntryPage />} />
          <Route path="projects/:projectId/qpm/tracker" element={<QPMTrackerPage />} />
          <Route path="projects/:projectId/qpm/summary" element={<QPMSummaryPage />} />
          <Route path="projects/:projectId/qpm/doc-info" element={<QPMDocInfoPage />} />
          <Route path="summary" element={<PMSummaryPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
