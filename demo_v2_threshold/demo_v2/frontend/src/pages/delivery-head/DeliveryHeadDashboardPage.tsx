/**
 * Delivery Head Dashboard — dark executive UI
 *
 * Inspired by the DM mockup: dark canvas, coloured stat tiles,
 * SVG bar chart for health distribution, donut for review status,
 * and a dark project table. Fully BU-scoped and read-only.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import type { BusinessUnit } from "../../services/businessUnitService";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

// ─── RAG colour map ───────────────────────────────────────────────────────────
const RAG_DOT: Record<string, string> = {
  GREEN:    "bg-emerald-400",
  AMBER:    "bg-amber-400",
  RED:      "bg-rose-500",
  CRITICAL: "bg-rose-700",
};
const RAG_TEXT: Record<string, string> = {
  GREEN:    "text-emerald-400",
  AMBER:    "text-amber-400",
  RED:      "text-rose-400",
  CRITICAL: "text-rose-300",
};

// ─── Coloured stat tile ───────────────────────────────────────────────────────
function StatTile({
  label, value, bg, icon,
}: {
  label: string; value: number; bg: string; icon: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 shadow-lg ${bg}`}>
      {/* faint square icon top-right */}
      <div className="absolute top-3 right-3 opacity-30 text-white text-2xl select-none">{icon}</div>
      <p className="text-4xl font-black text-white leading-none">{value}</p>
      <p className="text-sm font-semibold text-white/80">{label}</p>
    </div>
  );
}

// ─── SVG Bar chart ────────────────────────────────────────────────────────────
function HealthBarChart({
  green, amber, red, title,
}: {
  green: number; amber: number; red: number; title: string;
}) {
  const max = Math.max(green, amber, red, 1);
  const CHART_HEIGHT = 110; // px inside the svg viewbox

  const bars = [
    { label: "Green",  value: green, color: "#10b981" },
    { label: "Amber",  value: amber, color: "#f59e0b" },
    { label: "Red",    value: red,   color: "#f43f5e" },
  ];

  const W = 300;
  const H = 160;
  const padL = 24; const padR = 16; const padT = 20; const padB = 28;
  const plotH = H - padT - padB;
  const barW  = 52;
  const gap   = (W - padL - padR - bars.length * barW) / (bars.length + 1);

  return (
    <div className="rounded-2xl bg-[#1e1e2e] border border-white/5 p-5 shadow-lg">
      <p className="text-sm font-bold text-white mb-0.5">{title}</p>
      <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-widest">Project health distribution</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "160px" }}>
        {/* horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padT + (1 - frac) * plotH;
          const val = Math.round(frac * max);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke="#ffffff08" strokeWidth="1" strokeDasharray={frac === 0 ? "none" : "3,3"} />
              {frac > 0 && (
                <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#475569">{val}</text>
              )}
            </g>
          );
        })}

        {/* bars */}
        {bars.map((b, i) => {
          const x      = padL + gap * (i + 1) + barW * i;
          const barH   = max === 0 ? 2 : Math.max(2, (b.value / max) * plotH);
          const y      = padT + plotH - barH;
          const labelY = H - padB + 14;
          const valY   = y - 5;
          return (
            <g key={b.label}>
              {/* bar rounded top */}
              <rect x={x} y={y} width={barW} height={barH}
                rx="5" ry="5" fill={b.color} opacity="0.9" />
              {/* value above bar */}
              <text x={x + barW / 2} y={valY} textAnchor="middle" fontSize="11"
                fontWeight="700" fill={b.color}>
                {b.value}
              </text>
              {/* label below */}
              <text x={x + barW / 2} y={labelY} textAnchor="middle" fontSize="9"
                fill="#64748b">
                {b.label}
              </text>
            </g>
          );
        })}

        {/* baseline */}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH}
          stroke="#ffffff15" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─── SVG Donut for review status ──────────────────────────────────────────────
function ReviewDonut({ needsAttention, upToDate }: { needsAttention: number; upToDate: number }) {
  const total = needsAttention + upToDate || 1;
  const pct   = Math.round((needsAttention / total) * 100);

  // SVG donut params
  const cx = 80; const cy = 80; const R = 58; const SW = 20;
  const circ = 2 * Math.PI * R;
  // start at top (12 o'clock) → offset = circ/4
  const startOffset = circ / 4;

  // green arc first (up to date), then red (needs attention) immediately after
  const greenLen = (upToDate / total) * circ;
  const redLen   = (needsAttention / total) * circ;

  return (
    <div className="rounded-2xl bg-[#1e1e2e] border border-white/5 p-5 shadow-lg flex flex-col">
      <p className="text-sm font-bold text-white mb-0.5">Review status</p>
      <p className="text-[10px] text-slate-500 mb-3 uppercase tracking-widest">All accounts</p>
      <div className="flex-1 flex items-center justify-around gap-4">
        {/* donut */}
        <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
          {/* track */}
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2a2a3e" strokeWidth={SW} />
          {/* green segment */}
          {upToDate > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke="#10b981" strokeWidth={SW}
              strokeDasharray={`${greenLen} ${circ - greenLen}`}
              strokeDashoffset={startOffset}
              strokeLinecap="round"
            />
          )}
          {/* red segment — starts after green */}
          {needsAttention > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none"
              stroke="#f43f5e" strokeWidth={SW}
              strokeDasharray={`${redLen} ${circ - redLen}`}
              strokeDashoffset={startOffset - greenLen}
              strokeLinecap="round"
            />
          )}
          {/* centre text */}
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22"
            fontWeight="800" fill="#f43f5e">{pct}%</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9"
            fill="#94a3b8">needs review</text>
        </svg>

        {/* legend + counts */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Needs review</p>
              <p className="text-xl font-black text-white leading-none">{needsAttention}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Up to date</p>
              <p className="text-xl font-black text-white leading-none">{upToDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function DeliveryHeadDashboardPage() {
  const navigate = useNavigate();
  const [bu, setBu]           = useState<BusinessUnit | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState("");
  const [ragFilter, setRagFilter] = useState<string>("ALL");

  useEffect(() => {
    Promise.all([listBusinessUnits(), listProjects()])
      .then(([bus, projs]) => { setBu(bus[0] ?? null); setProjects(projs); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── stats ──────────────────────────────────────────────────────────────────
  const greenCount    = useMemo(() => projects.filter(p => p.current_rag === "GREEN").length,    [projects]);
  const amberCount    = useMemo(() => projects.filter(p => p.current_rag === "AMBER").length,    [projects]);
  const redCount      = useMemo(() => projects.filter(p => p.current_rag === "RED").length,      [projects]);
  const criticalCount = useMemo(() => projects.filter(p => p.current_rag === "CRITICAL").length, [projects]);

  // "needs review" = RED or CRITICAL; "up to date" = GREEN
  const needsAttention = redCount + criticalCount;
  const upToDate       = greenCount;

  // filtered table rows
  const filtered = useMemo(() => projects.filter(p => {
    const matchSearch =
      !search ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.account_name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRag =
      ragFilter === "ALL" ||
      (ragFilter === "NO_DATA" ? !p.current_rag : p.current_rag === ragFilter);
    return matchSearch && matchRag;
  }), [projects, search, ragFilter]);

  // ── skeleton ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-slate-700" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-700" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="h-48 rounded-2xl bg-slate-700" />
          <div className="h-48 rounded-2xl bg-slate-700" />
        </div>
        <div className="h-64 rounded-2xl bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Page title ───────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Delivery Head
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {bu?.name ?? "Business Unit"} · read-only overview
        </p>
      </div>

      {/* ── Stat tiles ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total projects"  value={projects.length} bg="bg-violet-600"  icon="⊞" />
        <StatTile label="Needs attention" value={needsAttention}  bg="bg-sky-500"     icon="⊞" />
        <StatTile label="Green health"    value={greenCount}      bg="bg-emerald-600" icon="⊞" />
        <StatTile label="At risk"         value={amberCount + redCount + criticalCount} bg="bg-orange-500" icon="⊞" />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <HealthBarChart
          title={bu?.name ?? "Business Unit"}
          green={greenCount}
          amber={amberCount}
          red={redCount + criticalCount}
        />
        <ReviewDonut needsAttention={needsAttention} upToDate={upToDate} />
      </div>

      {/* ── Projects table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-[#1e1e2e] border border-white/5 shadow-lg overflow-hidden">

        {/* table header / toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <p className="text-sm font-bold text-white">
            {bu?.name ?? "BU"} projects
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "GREEN", "AMBER", "RED", "CRITICAL"] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRagFilter(r)}
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border transition cursor-pointer ${
                  ragFilter === r
                    ? "bg-white text-slate-900 border-white"
                    : "border-white/20 text-slate-400 hover:border-white/40 hover:text-white"
                }`}
              >
                {r === "ALL" ? "All" : r}
              </button>
            ))}
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white placeholder-slate-500 w-36 focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {/* column headers */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] px-5 py-2 border-b border-white/5">
          {["Project", "PM", "Health", "Status"].map(h => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{h}</p>
          ))}
        </div>

        {/* rows */}
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500">No projects match your filter.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(p => {
              const rag = p.current_rag;
              const isAtRisk = rag === "RED" || rag === "CRITICAL";
              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/delivery-head/projects/${p.id}/summary`)}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors group"
                >
                  {/* project name */}
                  <div>
                    <p className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors">
                      {p.project_name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{p.project_code}</p>
                  </div>

                  {/* PM */}
                  <p className="text-sm text-slate-400">{p.project_manager_name ?? "—"}</p>

                  {/* health dot + label */}
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${rag ? RAG_DOT[rag] : "bg-slate-600"}`} />
                    <span className={`text-sm font-semibold ${rag ? RAG_TEXT[rag] : "text-slate-500"}`}>
                      {rag ?? "No data"}
                    </span>
                  </div>

                  {/* status pill */}
                  <div className="flex items-center justify-between">
                    <span className={`rounded-lg px-3 py-1 text-xs font-bold ${
                      isAtRisk
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : rag === "AMBER"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : rag === "GREEN"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-700 text-slate-400 border border-white/10"
                    }`}>
                      {isAtRisk ? "Needs review" : rag === "GREEN" ? "Up to date" : rag === "AMBER" ? "Monitor" : "No data"}
                    </span>
                    {/* row arrow */}
                    <Link
                      to={`/delivery-head/projects/${p.id}/summary`}
                      onClick={e => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
