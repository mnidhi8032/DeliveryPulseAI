/**
 * Delivery Head Dashboard — light theme
 * Coloured stat tiles, SVG bar + donut charts, PM-style card rows.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listBusinessUnits } from "../../services/businessUnitService";
import type { BusinessUnit } from "../../services/businessUnitService";
import { listProjects } from "../../services/projectService";
import type { Project } from "../../types/project";

// ── RAG helpers ───────────────────────────────────────────────────────────────
const RAG_HEX: Record<string, string> = {
  GREEN: "#10b981", AMBER: "#f59e0b", RED: "#f43f5e", CRITICAL: "#be123c",
};
const RAG_DOT_BG: Record<string, string> = {
  GREEN: "bg-emerald-500", AMBER: "bg-amber-400", RED: "bg-rose-500", CRITICAL: "bg-rose-700",
};

// ── Stat tile ─────────────────────────────────────────────────────────────────
function StatTile({ label, value, bg }: { label: string; value: number; bg: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 flex flex-col gap-2 shadow-md ${bg}`}>
      <div className="absolute top-3 right-3 opacity-20 text-white text-4xl select-none font-black">◫</div>
      <p className="text-4xl font-black text-white leading-none">{value}</p>
      <p className="text-sm font-semibold text-white/85">{label}</p>
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function HealthBarChart({ green, amber, red, title }: { green: number; amber: number; red: number; title: string }) {
  const max = Math.max(green, amber, red, 1);

  const bars = [
    { label: "Green", value: green, color: "#10b981" },
    { label: "Amber", value: amber, color: "#f59e0b" },
    { label: "Red",   value: red,   color: "#f43f5e" },
  ];
  const W = 300; const H = 160;
  const padL = 28; const padR = 16; const padT = 20; const padB = 28;
  const plotH = H - padT - padB;
  const barW = 52;
  const gap = (W - padL - padR - bars.length * barW) / (bars.length + 1);

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-800 mb-0.5">{title}</p>
      <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-widest">Project health distribution</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "160px" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
          const y = padT + (1 - frac) * plotH;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--bg)" strokeWidth="1" strokeDasharray={frac === 0 ? "none" : "3,3"} />
              {frac > 0 && <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="8" fill="var(--muted)">{Math.round(frac * max)}</text>}
            </g>
          );
        })}
        {bars.map((b, i) => {
          const x = padL + gap * (i + 1) + barW * i;
          const barH = max === 0 ? 2 : Math.max(2, (b.value / max) * plotH);
          const y = padT + plotH - barH;
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={barW} height={barH} rx="6" ry="6" fill={b.color} opacity="0.9" />
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill={b.color}>{b.value}</text>
              <text x={x + barW / 2} y={H - padB + 14} textAnchor="middle" fontSize="9" fill="var(--muted)">{b.label}</text>
            </g>
          );
        })}
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} stroke="var(--border)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function ReviewDonut({ needsAttention, upToDate }: { needsAttention: number; upToDate: number }) {
  const total = needsAttention + upToDate || 1;
  const pct = Math.round((needsAttention / total) * 100);
  const cx = 80; const cy = 80; const R = 58; const SW = 20;
  const circ = 2 * Math.PI * R;
  const startOffset = circ / 4;
  const greenLen = (upToDate / total) * circ;
  const redLen = (needsAttention / total) * circ;

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm flex flex-col">
      <p className="text-sm font-bold text-slate-800 mb-0.5">Review status</p>
      <p className="text-[10px] text-slate-400 mb-3 uppercase tracking-widest">All accounts</p>
      <div className="flex-1 flex items-center justify-around gap-4">
        <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--bg)" strokeWidth={SW} />
          {upToDate > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#10b981" strokeWidth={SW}
              strokeDasharray={`${greenLen} ${circ - greenLen}`} strokeDashoffset={startOffset} strokeLinecap="round" />
          )}
          {needsAttention > 0 && (
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f43f5e" strokeWidth={SW}
              strokeDasharray={`${redLen} ${circ - redLen}`} strokeDashoffset={startOffset - greenLen} strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 7} textAnchor="middle" fontSize="22" fontWeight="800" fill="#f43f5e">{pct}%</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="var(--muted)">needs review</text>
        </svg>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Needs review</p>
              <p className="text-xl font-black text-slate-900 leading-none">{needsAttention}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Up to date</p>
              <p className="text-xl font-black text-slate-900 leading-none">{upToDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function DeliveryHeadDashboardPage() {
  const navigate = useNavigate();
  const [bu, setBu]             = useState<BusinessUnit | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [ragFilter, setRagFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([listBusinessUnits(), listProjects()])
      .then(([bus, projs]) => {
        setBu(bus[0] ?? null);
        setProjects(projs.sort((a, b) => a.project_name.localeCompare(b.project_name)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greenCount    = useMemo(() => projects.filter(p => p.current_rag === "GREEN").length,    [projects]);
  const amberCount    = useMemo(() => projects.filter(p => p.current_rag === "AMBER").length,    [projects]);
  const redCount      = useMemo(() => projects.filter(p => p.current_rag === "RED").length,      [projects]);
  const criticalCount = useMemo(() => projects.filter(p => p.current_rag === "CRITICAL").length, [projects]);
  const noDataCount   = useMemo(() => projects.filter(p => !p.current_rag).length,               [projects]);
  const needsAttention = redCount + criticalCount;
  const upToDate       = greenCount;

  const filtered = useMemo(() => projects.filter(p => {
    const ms = !search ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.account_name ?? "").toLowerCase().includes(search.toLowerCase());
    const mr = ragFilter === "ALL" || (ragFilter === "NO_DATA" ? !p.current_rag : p.current_rag === ragFilter);
    return ms && mr;
  }), [projects, search, ragFilter]);

  if (loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-slate-200" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-slate-200" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="h-48 rounded-2xl bg-slate-200" />
        <div className="h-48 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* page title */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Delivery Head · Read-only</p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">{bu?.name ?? "Business Unit"} — project health overview</p>
      </div>

      {/* stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Total projects"  value={projects.length}                      bg="bg-violet-600" />
        <StatTile label="Needs attention" value={needsAttention}                       bg="bg-sky-500" />
        <StatTile label="Green health"    value={greenCount}                           bg="bg-emerald-600" />
        <StatTile label="At risk"         value={amberCount + redCount + criticalCount} bg="bg-orange-500" />
      </div>

      {/* charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        <HealthBarChart title={bu?.name ?? "BU"} green={greenCount} amber={amberCount} red={redCount + criticalCount} />
        <ReviewDonut needsAttention={needsAttention} upToDate={upToDate} />
      </div>

      {/* stat chips + search */}
      <div className="flex flex-wrap gap-2 items-center">
        {([
          { label: "All",      key: "ALL",      val: projects.length, color: "#6366f1", bg: "rgba(99,102,241,0.08)"  },
          { label: "Green",    key: "GREEN",    val: greenCount,      color: "#16a34a", bg: "rgba(22,163,74,0.08)"   },
          { label: "Amber",    key: "AMBER",    val: amberCount,      color: "#d97706", bg: "rgba(217,119,6,0.08)"   },
          { label: "Red",      key: "RED",      val: redCount,        color: "#dc2626", bg: "rgba(220,38,38,0.08)"   },
          { label: "Critical", key: "CRITICAL", val: criticalCount,   color: "#9f1239", bg: "rgba(159,18,57,0.08)"   },
          { label: "No score", key: "NO_DATA",  val: noDataCount,     color: "var(--muted)", bg: "rgba(100,116,139,0.08)" },
        ] as { label: string; key: string; val: number; color: string; bg: string }[]).map(s => (
          <button key={s.key} type="button" onClick={() => setRagFilter(s.key)} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            borderRadius: 999, padding: "5px 14px", cursor: "pointer",
            background: ragFilter === s.key ? s.color : s.bg,
            border: `1.5px solid ${s.color}${ragFilter === s.key ? "" : "40"}`,
            transition: "background 0.15s",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: ragFilter === s.key ? "var(--surface)" : s.color, display: "inline-block" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: ragFilter === s.key ? "var(--surface)" : s.color }}>{s.val}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: ragFilter === s.key ? "rgba(255,255,255,0.85)" : s.color }}>{s.label}</span>
          </button>
        ))}
        <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 w-44 focus:outline-none focus:ring-1 focus:ring-indigo-300" />
      </div>

      {/* project card rows */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-400">No projects match your filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(p => {
            const rag = p.current_rag;
            const isAtRisk = rag === "RED" || rag === "CRITICAL";
            const borderColor = rag ? RAG_HEX[rag] : "var(--border)";
            const statusBg: Record<string, string> = {
              ACTIVE:    "bg-emerald-50  text-emerald-700 border-emerald-200",
              ON_HOLD:   "bg-amber-50    text-amber-700   border-amber-200",
              COMPLETED: "bg-blue-50     text-blue-700    border-blue-200",
              CANCELLED: "bg-slate-100   text-slate-500   border-slate-200",
            };
            const statusLabel: Record<string, string> = {
              ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETED: "Completed", CANCELLED: "Cancelled",
            };

            return (
              <div key={p.id}
                onClick={() => navigate(`/delivery-head/projects/${p.id}/summary`)}
                className="group flex items-center rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer shadow-sm overflow-hidden"
                style={{ borderLeft: `4px solid ${borderColor}` }}>

                {/* glow dot */}
                <div className="px-4 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full block" style={{ background: borderColor }} />
                </div>

                {/* code + name */}
                <div className="flex-1 min-w-0 py-4 pr-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black text-indigo-500 font-mono uppercase tracking-wide">{p.project_code}</span>
                    <span className={`text-[9px] font-bold rounded-full px-2 py-0.5 border ${statusBg[p.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors truncate">{p.project_name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">{p.account_name ?? "—"}</p>
                </div>

                {/* PM */}
                <div className="w-40 flex-shrink-0 py-4 px-4 border-l border-slate-100 hidden md:block">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">PM</p>
                  <p className="text-xs text-slate-600 truncate">{p.project_manager_name ?? "—"}</p>
                </div>

                {/* health */}
                <div className="w-32 flex-shrink-0 py-4 px-4 border-l border-slate-100 hidden sm:flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${rag ? RAG_DOT_BG[rag] : "bg-slate-300"}`} />
                  <span className={`text-xs font-semibold ${rag ? "" : "text-slate-400"}`}
                    style={{ color: rag ? RAG_HEX[rag] : undefined }}>{rag ?? "—"}</span>
                </div>

                {/* status pill */}
                <div className="flex-shrink-0 py-4 px-4 border-l border-slate-100">
                  <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold border ${
                    isAtRisk
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : rag === "AMBER"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : rag === "GREEN"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}>
                    {isAtRisk ? "At risk" : rag === "GREEN" ? "On track" : rag === "AMBER" ? "Monitor" : "No data"}
                  </span>
                </div>

                {/* arrow */}
                <div className="px-4 py-4 flex-shrink-0">
                  <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
