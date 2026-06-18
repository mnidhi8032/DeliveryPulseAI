import type { Submission } from "../types/submission";

interface TimelineStep {
  label: string;
  at: string | null;
  active: boolean;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function buildSteps(submission: Submission): TimelineStep[] {
  const code = submission.status_code;
  const rank: Record<string, number> = {
    DRAFT: 0,
    SUBMITTED: 1,
    UNDER_REVIEW: 2,
    APPROVED: 3,
    REJECTED: 2,
    REOPENED: 0,
    LOCKED: 4,
  };
  const current = rank[code] ?? 0;

  return [
    {
      label: "Created",
      at: submission.created_at,
      active: current >= 0,
    },
    {
      label: "Submitted",
      at: submission.submission_date,
      active: current >= 1 || code === "REJECTED",
    },
    {
      label: "Under review",
      at:
        submission.submission_date &&
        ["UNDER_REVIEW", "APPROVED", "REJECTED", "LOCKED"].includes(code)
          ? submission.submission_date
          : null,
      active: current >= 2 || code === "REJECTED",
    },
    {
      label: "Approved",
      at: submission.approval_date,
      active: current >= 3 || code === "LOCKED",
    },
    {
      label: "Locked",
      at: submission.locked_at,
      active: code === "LOCKED",
    },
  ];
}

interface SubmissionTimelineProps {
  submission: Submission;
}

export function SubmissionTimeline({ submission }: SubmissionTimelineProps) {
  const steps = buildSteps(submission);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Submission timeline</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.label} className="flex gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                step.active ? "bg-slate-900" : "bg-slate-300"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  step.active ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-slate-500">{formatWhen(step.at)}</p>
            </div>
          </li>
        ))}
      </ol>
      {submission.review_comments && (
        <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Review comments: </span>
          {submission.review_comments}
        </p>
      )}
    </div>
  );
}
