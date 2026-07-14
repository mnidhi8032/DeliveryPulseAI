import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, getSubmissionTimeline } from "../../services/projectService";
import { formatStatus, getStatusBadgeClass } from "../../utils/formatters";
import type { Project } from "../../types/project";
import type { SubmissionTimelineEvent } from "../../types/timeline";

// ─── SVG Sparkline / Health Chart ─────────────────────────────────────────────

function HealthChart({ events }: { events: SubmissionTimelineEvent[] }) {
  const scored = events.filter((e) => e.overall_score !== null);
  if (scored.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        At least 2 scored submissions needed to render the trend chart.
      </div>
    );
  }

  const W = 700;
  const H = 180;
  const PAD = { top: 20, right: 24, bottom: 36, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minY = 0;
  const maxY = 100;

  const xStep = chartW / (scored.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - ((v - minY) / (maxY - minY)) * chartH;

  const points = scored.map((e, i) => `${toX(i)},${toY(Number(e.overall_score))}`).join(" ");
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...scored.map((e, i) => `${toX(i)},${toY(Number(e.overall_score))}`),
    `${toX(scored.length - 1)},${PAD.top + chartH}`,
  ].join(" ");

  const ragColor = (score: number) =>
    score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";

  const yGridLines = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Y-grid lines */}
      {yGridLines.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left} x2={PAD.left + chartW}
            y1={toY(v)} y2={toY(v)}
            stroke="var(--border)" strokeWidth={1}
            strokeDasharray={v === 50 ? "4 3" : v === 80 ? "4 3" : undefined}
          />
          <text x={PAD.left - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill="var(--muted)">{v}</text>
        </g>
      ))}

      {/* RAG band fills */}
      <rect x={PAD.left} y={toY(100)} width={chartW} height={toY(80) - toY(100)} fill="#10b98112" />
      <rect x={PAD.left} y={toY(80)} width={chartW} height={toY(50) - toY(80)} fill="#f59e0b0d" />
      <rect x={PAD.left} y={toY(50)} width={chartW} height={toY(0) - toY(50)} fill="#f43f5e0d" />

      {/* Area fill under line */}
      <polygon points={areaPoints} fill="url(#areaGrad)" opacity={0.3} />
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Line */}
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {scored.map((e, i) => {
        const score = Number(e.overall_score);
        const cx = toX(i);
        const cy = toY(score);
        const color = ragColor(score);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={5} fill={color} stroke="white" strokeWidth={2} />
            <text x={cx} y={cy - 9} textAnchor="middle" fontSize={9} fontWeight="bold" fill={color}>
              {score.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {scored.map((e, i) => (
        <text
          key={i}
          x={toX(i)}
          y={H - 6}
          textAnchor="middle"
          fontSize={8.5}
          fill="var(--muted)"
        >
          {new Date(e.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </text>
      ))}

      {/* Axis lines */}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + chartH} stroke="var(--border)" strokeWidth={1} />
      <line x1={PAD.left} x2={PAD.left + chartW} y1={PAD.top + chartH} y2={PAD.top + chartH} stroke="var(--border)" strokeWidth={1} />
    </svg>
  );
}

// ─── RAG Badge ─────────────────────────────────────────────────────────────────

function RagPill({ rag }: { rag: string }) {
  const cls =
    rag === "GREEN" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
    rag === "AMBER" ? "bg-amber-100 text-amber-800 border-amber-200" :
    rag === "CRITICAL" ? "bg-rose-100 text-rose-900 border-rose-300" :
    "bg-rose-100 text-rose-800 border-rose-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${cls}`}>
      {rag}
    </span>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function ProjectHealthTimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [timeline, setTimeline] = useState<SubmissionTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([getProject(projectId), getSubmissionTimeline(projectId)])
      .then(([proj, evts]) => {
        setProject(proj);
        setTimeline(evts);
      })
      .catch((e: any) => {
        if (e.response?.status === 403) navigate("/unauthorized");
        else setError("Failed to load timeline.");
      })
      .finally(() => setLoading(false));
  }, [projectId, navigate]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse mx-auto max-w-5xl">
        <div className="h-8 w-1/3 rounded bg-slate-200" />
        <div className="h-52 rounded-xl bg-slate-200" />
        <div className="h-64 rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (error || !project) {
    return <p className="p-4 text-sm text-red-600">{error || "Project not found"}</p>;
  }

  const scored = timeline.filter((e) => e.overall_score !== null);
  const latest = scored[0] ?? null;
  const latestRag = latest?.rag_status ?? null;

  const ragBg =
    latestRag === "GREEN" ? "from-emerald-700 to-emerald-900" :
    latestRag === "AMBER" ? "from-amber-600 to-amber-800" :
    latestRag === "RED" || latestRag === "CRITICAL" ? "from-rose-700 to-rose-900" :
    "from-slate-700 to-slate-900";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Hero banner */}
      <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${ragBg} p-6 text-white shadow-lg`}>
        <div className="relative z-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{project.project_code}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">{project.project_name}</h1>
              <p className="mt-1 text-sm text-white/70">{project.business_unit_name} · {project.account_name}</p>
            </div>
            {latestRag && (
              <div className="text-right">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">Current Health</p>
                <p className="mt-1 text-3xl font-extrabold">
                  {latest?.overall_score !== null ? Number(latest?.overall_score).toFixed(1) : "—"}
                </p>
                <p className="text-sm font-bold text-white/80">{latestRag}</p>
              </div>
            )}
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-10">
          <svg className="h-40 w-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M3 13.5l4-4 3 3 4-4 4 4" />
          </svg>
        </div>
      </div>

      {/* Health trend chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900">Health Score Trend</h2>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block"></span> Green ≥ 80</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block"></span> Amber 50–79</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block"></span> Red &lt; 50</span>
          </div>
        </div>
        <HealthChart events={timeline} />
      </div>

      {/* Summary stats */}
      {scored.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Submissions", value: timeline.length },
            { label: "Scored Submissions", value: scored.length },
            {
              label: "Best Score",
              value: Math.max(...scored.map((e) => Number(e.overall_score))).toFixed(1),
            },
            {
              label: "Latest Score",
              value: latest ? Number(latest.overall_score).toFixed(1) : "—",
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Submission history table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">Submission History</h2>
          <span className="text-xs text-slate-500">{timeline.length} submission{timeline.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm text-left text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">RAG</th>
                <th className="px-6 py-3">Trend</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Action / Actor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {timeline.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No submissions found for this project.
                  </td>
                </tr>
              ) : (
                timeline.map((event) => (
                  <tr key={event.submission_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {new Date(event.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {event.overall_score !== null ? (
                        <span>{Number(event.overall_score).toFixed(1)}</span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {event.rag_status ? <RagPill rag={event.rag_status} /> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      {event.trend === "improving" && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                          Improving
                        </span>
                      )}
                      {event.trend === "declining" && (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                          Declining
                        </span>
                      )}
                      {event.trend === "stable" && (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-semibold text-xs">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" /></svg>
                          Stable
                        </span>
                      )}
                      {event.trend === "none" && <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeClass(event.status_code)}`}>
                        {formatStatus(event.status_code)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{event.action_description}</div>
                      {event.actor_role && (
                        <div className="text-xs text-slate-400 mt-0.5">{event.actor_role}</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
