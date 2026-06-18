import type { GovernancePeriod } from "../types/governance";
import type { SubmissionHealth } from "../types/metrics";
import type { Project } from "../types/project";
import type { Submission } from "../types/submission";

export interface DHSubmissionRow {
  submission: Submission;
  project: Project;
  period: GovernancePeriod | null;
  health: SubmissionHealth | null;
}

export const PENDING_DH_STATUSES = ["SUBMITTED", "UNDER_REVIEW"] as const;

export function buildSubmissionRows(
  submissions: Submission[],
  projectById: Map<string, Project>,
  periodById: Map<string, GovernancePeriod>,
  healthBySubmissionId: Map<string, SubmissionHealth | null>,
): DHSubmissionRow[] {
  return submissions
    .map((submission) => {
      const project = projectById.get(submission.project_id);
      if (!project) return null;
      return {
        submission,
        project,
        period: periodById.get(submission.governance_period_id) ?? null,
        health: healthBySubmissionId.get(submission.id) ?? null,
      };
    })
    .filter((row): row is DHSubmissionRow => row !== null);
}

export function filterSubmissionRows(
  rows: DHSubmissionRow[],
  filters: {
    status: string;
    businessUnit: string;
    projectId: string;
  },
): DHSubmissionRow[] {
  return rows.filter((row) => {
    if (filters.status !== "ALL" && row.submission.status_code !== filters.status) {
      return false;
    }
    if (
      filters.businessUnit !== "ALL" &&
      row.project.business_unit_name !== filters.businessUnit
    ) {
      return false;
    }
    if (filters.projectId !== "ALL" && row.project.id !== filters.projectId) {
      return false;
    }
    return true;
  });
}

export function formatPeriodLabel(period: GovernancePeriod | null): string {
  if (!period) return "—";
  return `${period.name} (${period.period_type})`;
}

export function shortSubmissionId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}
