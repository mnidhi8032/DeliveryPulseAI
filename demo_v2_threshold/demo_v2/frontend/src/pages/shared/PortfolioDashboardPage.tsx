/**
 * Portfolio Dashboard - Delivery Excellence
 * Visual style matches PM Summary (purple glass theme)
 */
import { useEffect, useMemo, useState } from "react";
import { listProjects } from "../../services/projectService";
import { getKpiPlan, getKpiSummary } from "../../services/qpmService";
import { PortfolioFilterBar } from "./portfolio/PortfolioFilterBar";
import type { Project } from "../../types/project";
import type { KpiPlan, KpiSummary } from "../../types/qpm";
import { PROJECT_TYPES, PROJECT_CATEGORIES } from "../../types/qpm";

const RAG_COLOR: Record<string, string> = {
  GREEN: "#22c55e", AMBER: "#f59e0b", RED: "#ef4444",
};

function RagPill({ rag, size = "sm" }: { rag: string; size?: "xs" | "sm" }) {
  const color = RAG_COLOR[rag] ?? "var(--muted)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "xs" ? "2px 7px" : "3px 9px",
      borderRadius: 999, fontSize: size === "xs" ? 9 : 10,
      fontWeight: 700, color,
      background: `${color}18`, border: `1px solid ${color}40`,
      boxShadow: `0 0 8px ${color}25`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, boxShadow: `0 0 5px ${color}` }} />
      {rag}
    </span>
  );
}

function GlassCard({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{
      background: "var(--surface)", border: "1px solid #e8e6ff",
      borderRadius: 20, boxShadow: "0 2px 16px rgba(108,99,255,0.10)", ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "#6366F1", textTransform: "uppercase" as const, marginBottom: 4 }}>
      {children}
    </p>
  );
}

function RagDonut({ green, amber, red, noData }: { green: number; amber: number; red: number; noData: number }) {
  const total = green + amber + red + noData || 1;
  const R = 52; const cx = 64; const cy = 64; const circ = 2 * Math.PI * R;
  const slices = [
    { label: "GREEN", value: green,  color: "#22c55e" },
    { label: "AMBER", value: amber,  color: "#f59e0b" },
    { label: "RED",   value: red,    color: "#ef4444" },
    { label: "NONE",  value: noData, color: "#e5e7eb" },
  ];
  let offset = 0;
  const arcs = slices.map(s => {
    const dash = (s.value / total) * circ;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 16 }}>
      <svg viewBox="0 0 128 128" style={{ width: 160, height: 160, filter: "drop-shadow(0 2px 8px rgba(108,99,255,0.15))" }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#e5e7eb" strokeWidth={16} opacity={0.15} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none" stroke={a.color}
            strokeWidth={hovered === a.label ? 22 : 16} strokeLinecap="round"
            strokeDasharray={`${Math.max(a.dash - 2, 0)} ${circ - Math.max(a.dash - 2, 0)}`}
            strokeDashoffset={-a.offset + circ / 4}
            style={{ transition: "stroke-width 0.2s", filter: hovered === a.label ? `drop-shadow(0 0 8px ${a.color})` : "none", cursor: a.value > 0 ? "pointer" : "default" }}
            onMouseEnter={() => a.value > 0 && setHovered(a.label)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={24} fontWeight="800" fill="var(--text)">{total - noData}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="var(--muted)" fontWeight="600">of {total}</text>
        <text x={cx} y={cy + 24} textAnchor="middle" fontSize={7} fill="#6c63ff" fontWeight="700" letterSpacing="0.1em">PROJECTS</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "10px 16px", justifyContent: "center" }}>
        {([["GREEN", green, "#22c55e"], ["AMBER", amber, "#f59e0b"], ["RED", red, "#ef4444"], ["No Data", noData, "#e5e7eb"]] as [string, number, string][]).map(([l, v, c]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c, boxShadow: c !== "#e5e7eb" ? `0 0 6px ${c}` : "none" }} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{l}: <b style={{ color: "var(--text)" }}>{v}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ProjectWithPlan extends Project {
  kpiPlan?: KpiPlan;
  summary?: KpiSummary;
}

function StatCard({ label, count, bg, icon }: { label: string; count: number; bg: string; icon: React.ReactNode }) {
  return (
    <div style={{
      flex: "1 1 140px", minWidth: 140, borderRadius: 20, padding: "20px 20px 16px",
      background: bg, boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
      position: "relative" as const, overflow: "hidden",
      transition: "transform 0.2s",
    }}
    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"}
    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"}>
      <div style={{ position: "absolute" as const, top: 12, right: 12, width: 32, height: 32, borderRadius: 10, background: "rgba(255,255,255,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <p style={{ fontSize: 36, fontWeight: 900, color: "var(--surface)", lineHeight: 1, marginTop: 20 }}>{count}</p>
      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.80)", marginTop: 4, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

export function PortfolioDashboardPage() {
  const [allProjects, setAllProjects] = useState<ProjectWithPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedSummary, setSelectedSummary] = useState<KpiSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [expandedDimension, setExpandedDimension] = useState<string | null>(null);

  // Filters
  const [buFilter, setBuFilter] = useState("All");
  const [accountFilter, setAccountFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  useEffect(() => {
    listProjects()
      .then(async (list) => {
        const withPlans = await Promise.all(list.map(async (p) => {
          try { const plan = await getKpiPlan(p.id); return { ...p, kpiPlan: plan }; }
          catch { return { ...p }; }
        }));
        const sorted = withPlans.sort((a, b) => a.project_name.localeCompare(b.project_name));
        setAllProjects(sorted);
        if (sorted.length > 0) setSelectedId(sorted[0].id);
      })
      .catch(() => setError("Failed to load projects"))
      .finally(() => setLoading(false));
  }, []);

  // Load summary when selected project changes
  useEffect(() => {
    if (!selectedId) return;
    setLoadingSummary(true);
    setSelectedSummary(null);
    setExpandedDimension(null);
    const project = allProjects.find(p => p.id === selectedId);
    if (!project) { setLoadingSummary(false); return; }
    const planId = project.kpiPlan?.id;
    if (!planId) { setLoadingSummary(false); return; }
    getKpiSummary(planId)
      .then(setSelectedSummary)
      .catch(() => setSelectedSummary(null))
      .finally(() => setLoadingSummary(false));
  }, [selectedId]);

  // Filter options
  const businessUnits = useMemo(
    () => ["All", ...Array.from(new Set(allProjects.map(p => p.business_unit_name).filter(Boolean))).sort()],
    [allProjects]
  );
  const accounts = useMemo(() => {
    const src = buFilter === "All" ? allProjects : allProjects.filter(p => p.business_unit_name === buFilter);
    return ["All", ...Array.from(new Set(src.map(p => p.account_name).filter(Boolean))).sort()];
  }, [allProjects, buFilter]);
  const projectTypes = ["All", ...PROJECT_TYPES];
  const projectCategories = ["All", ...PROJECT_CATEGORIES];

  const handleBuChange = (v: string) => { setBuFilter(v); setAccountFilter("All"); };

  const filteredProjects = useMemo(() =>
    allProjects.filter(p => {
      const mBu  = buFilter === "All"       || p.business_unit_name === buFilter;
      const mAcc = accountFilter === "All"  || p.account_name === accountFilter;
      const mTyp = typeFilter === "All"     || p.kpiPlan?.project_type === typeFilter;
      const mCat = categoryFilter === "All" || p.kpiPlan?.project_category === categoryFilter;
      return mBu && mAcc && mTyp && mCat;
    }),
    [allProjects, buFilter, accountFilter, typeFilter, categoryFilter]
  );

  const ragCounts = useMemo(() => ({
    total:  filteredProjects.length,
    green:  filteredProjects.filter(p => p.current_rag === "GREEN").length,
    amber:  filteredProjects.filter(p => p.current_rag === "AMBER").length,
    red:    filteredProjects.filter(p => p.current_rag === "RED").length,
    noData: filteredProjects.filter(p => !p.current_rag).length,
  }), [filteredProjects]);

  const selectedProject = allProjects.find(p => p.id === selectedId);

  // Metric categories for selected project summary
  const metricsByCategory = useMemo(() => {
    const metrics = selectedSummary?.metrics ?? [];
    return metrics.reduce<Record<string, typeof metrics>>((acc, m) => {
      const cat = m.metric_category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {});
  }, [selectedSummary]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 20, padding: "4px 0" }}>
      {[80, 130, 260, 200].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 16, background: "linear-gradient(90deg, #ede9ff 25%, #f3f0ff 50%, #ede9ff 75%)", backgroundSize: "400px 100%", animation: "kpi-shimmer 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (error) return (
    <GlassCard style={{ padding: "32px 24px", textAlign: "center", borderColor: "#fecaca" }}>
      <p style={{ color: "#ef4444", fontWeight: 600 }}>{error}</p>
    </GlassCard>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: 24, fontFamily: "'Inter','Poppins',system-ui,sans-serif" }}>

      {/* -- Header -- */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <SectionLabel>Delivery Excellence · Portfolio</SectionLabel>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>Portfolio Dashboard</h1>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{filteredProjects.length} of {allProjects.length} projects</p>
        </div>
      </div>

      {/* -- Stat cards -- */}
      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 16 }}>
        <StatCard label="Total Projects" count={ragCounts.total}  bg="linear-gradient(135deg,#7c3aed,#6d28d9)" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--surface)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>} />
        <StatCard label="Green Health"   count={ragCounts.green}  bg="linear-gradient(135deg,#16a34a,#15803d)" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--surface)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard label="Needs Attention" count={ragCounts.amber} bg="linear-gradient(135deg,#d97706,#b45309)" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--surface)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard label="At Risk"         count={ragCounts.red}   bg="linear-gradient(135deg,#dc2626,#b91c1c)" icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--surface)" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>} />
      </div>

      {/* -- Filter bar -- */}
      <PortfolioFilterBar
        businessUnits={businessUnits} accounts={accounts}
        projectTypes={projectTypes} projectCategories={projectCategories}
        selectedBu={buFilter} selectedAccount={accountFilter}
        selectedType={typeFilter} selectedCategory={categoryFilter}
        onBuChange={handleBuChange} onAccountChange={setAccountFilter}
        onTypeChange={setTypeFilter} onCategoryChange={setCategoryFilter}
      />

      {/* -- Main two-column layout -- */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>

        {/* Left: project list */}
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e8e6ff" }}>
            <SectionLabel>Projects</SectionLabel>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: 0 }}>{filteredProjects.length} projects</p>
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column" as const, gap: 6 }}>
            {filteredProjects.length === 0 && (
              <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>No projects match filters</p>
            )}
            {filteredProjects.map(p => {
              const rag = p.current_rag;
              const color = rag ? (RAG_COLOR[rag] ?? "var(--muted)") : "var(--border)";
              const isSelected = p.id === selectedId;
              return (
                <div key={p.id} onClick={() => setSelectedId(p.id)} style={{
                  borderRadius: 12, padding: "12px 14px", cursor: "pointer",
                  background: isSelected ? "#f0f0ff" : "var(--surface)",
                  border: isSelected ? "1.5px solid #6366f1" : `1px solid ${color}30`,
                  borderLeft: `4px solid ${color}`,
                  boxShadow: isSelected ? "0 2px 12px rgba(99,102,241,0.15)" : "0 1px 4px rgba(0,0,0,0.04)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "#f8f7ff"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = "var(--surface)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1 }}>
                      {p.project_name}
                    </p>
                    {rag ? <RagPill rag={rag} size="xs" /> : <span style={{ fontSize: 9, color: "#9ca3af" }}>No data</span>}
                  </div>
                  <p style={{ fontSize: 10, color: "var(--muted)", margin: "3px 0 0" }}>{p.business_unit_name || "—"} · {p.account_name || "—"}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Right: selected project detail */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 18 }}>

          {!selectedId && (
            <GlassCard style={{ padding: "56px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 36, marginBottom: 12 }}>??</p>
              <p style={{ color: "var(--muted)" }}>Select a project to view its KPI summary</p>
            </GlassCard>
          )}

          {selectedId && loadingSummary && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
              {[80, 260, 200].map((h, i) => (
                <div key={i} style={{ height: h, borderRadius: 16, background: "linear-gradient(90deg,#ede9ff 25%,#f3f0ff 50%,#ede9ff 75%)", backgroundSize: "400px 100%", animation: "kpi-shimmer 1.5s ease-in-out infinite" }} />
              ))}
            </div>
          )}

          {selectedId && !loadingSummary && (
            <>
              {/* Overall RAG banner */}
              {selectedSummary?.overall_rag && (() => {
                const rag = selectedSummary.overall_rag;
                const color = RAG_COLOR[rag] ?? "var(--muted)";
                const bannerBg: Record<string, string> = {
                  GREEN: "linear-gradient(135deg,#e2f3ea,#7af375)",
                  AMBER: "linear-gradient(135deg,#fef3c7,#fde68a)",
                  RED:   "linear-gradient(135deg,#fee2e2,#fca5a5)",
                };
                return (
                  <div style={{
                    borderRadius: 20, padding: "20px 24px",
                    background: bannerBg[rag] ?? "linear-gradient(135deg,#f3f0ff,#e8e6ff)",
                    border: `1px solid ${color}40`,
                    display: "flex", alignItems: "center", gap: 20,
                    boxShadow: `0 4px 24px ${color}25`,
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 16,
                      background: `linear-gradient(135deg,${color}50,${color}25)`,
                      border: `1px solid ${color}60`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, fontWeight: 900, color: "var(--text)", flexShrink: 0,
                      boxShadow: `0 0 20px ${color}40`,
                    }}>
                      {rag[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(26,26,46,0.5)", textTransform: "uppercase" as const, letterSpacing: "0.12em", marginBottom: 4 }}>Overall Health</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", margin: 0 }}>{rag}</p>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{selectedProject?.project_name}</p>
                      <RagPill rag={rag} />
                    </div>
                  </div>
                );
              })()}

              {/* Charts row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>

                {/* Donut */}
                <GlassCard style={{ padding: 24 }} className="kpi-card-hover">
                  <SectionLabel>Distribution</SectionLabel>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 16px" }}>KPI Health</h2>
                  {selectedSummary ? (
                    <RagDonut
                      green={selectedSummary.green_count}
                      amber={selectedSummary.amber_count}
                      red={selectedSummary.red_count}
                      noData={selectedSummary.no_data_count}
                    />
                  ) : <p style={{ color: "var(--muted)", fontSize: 12 }}>No KPI data yet</p>}
                </GlassCard>

                {/* Dimensions */}
                <GlassCard style={{ padding: 24 }} className="kpi-card-hover">
                  <SectionLabel>Breakdown</SectionLabel>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "0 0 4px" }}>Dimension Status</h2>
                  <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 14 }}>Click to expand</p>
                  {!selectedSummary || Object.keys(selectedSummary.category_rag).length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>No data yet — enter KPI measurements first.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
                      {Object.entries(selectedSummary.category_rag).map(([cat, rag]) => {
                        const isOpen = expandedDimension === cat;
                        const color = RAG_COLOR[rag as string] ?? "var(--muted)";
                        const dimMetrics = metricsByCategory[cat] ?? [];
                        return (
                          <div key={cat} style={{ borderRadius: 12, overflow: "hidden", background: `${color}08`, border: `1px solid ${color}22` }}>
                            <button type="button" onClick={() => setExpandedDimension(isOpen ? null : cat)}
                              className="kpi-dim-row"
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", background: "transparent", border: "none", textAlign: "left" as const }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <RagPill rag={rag as string} size="xs" />
                                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{cat}</span>
                                <span style={{ fontSize: 10, color: "var(--muted)" }}>{dimMetrics.length} metric{dimMetrics.length !== 1 ? "s" : ""}</span>
                              </div>
                              <svg style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            {isOpen && (
                              <div style={{ borderTop: "1px solid #e8e6ff", background: "#faf9ff" }}>
                                {dimMetrics.filter(m => m.rag_status).length === 0
                                  ? <p style={{ padding: "12px 16px", fontSize: 11, color: "var(--muted)" }}>No data entered yet.</p>
                                  : dimMetrics.filter(m => m.rag_status).map(m => (
                                    <div key={m.plan_metric_id} style={{ padding: "9px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #e8e6ff" }}>
                                      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{m.metric_name}</p>
                                      {m.rag_status && <RagPill rag={m.rag_status} size="xs" />}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GlassCard>
              </div>

              {/* Metric cards */}
              {selectedSummary && selectedSummary.metrics.length > 0 && (
                <div>
                  <div style={{ marginBottom: 14 }}>
                    <SectionLabel>All KPIs</SectionLabel>
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: 0 }}>All Metrics</h2>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 14 }}>
                    {selectedSummary.metrics.map(m => {
                      const rag = m.rag_status;
                      const color = rag ? (RAG_COLOR[rag] ?? "#e5e7eb") : "#e5e7eb";
                      return (
                        <div key={m.plan_metric_id} className="kpi-card-hover" style={{
                          borderRadius: 16, padding: 16, position: "relative" as const, overflow: "hidden",
                          background: "var(--surface)", border: `1px solid ${color}28`,
                          boxShadow: "0 2px 12px rgba(108,99,255,0.06)",
                        }}>
                          <div style={{ position: "absolute" as const, top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${color},transparent)`, borderRadius: "16px 16px 0 0" }} />
                          <p style={{ fontSize: 9, fontWeight: 700, color: "#6c63ff", textTransform: "uppercase" as const, letterSpacing: "0.1em", marginBottom: 4 }}>
                            {m.metric_category || "—"}
                          </p>
                          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", lineHeight: 1.3, marginBottom: 10,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>
                            {m.metric_name}
                          </p>
                          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                            <div>
                              <p style={{ fontSize: 9, color: "var(--muted)", fontWeight: 600, marginBottom: 2 }}>LATEST</p>
                              <p style={{ fontSize: 20, fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>
                                {m.latest_value != null ? Number(m.latest_value).toFixed(2) : "--"}
                                {m.uom && <span style={{ fontSize: 10, fontWeight: 400, color: "var(--muted)", marginLeft: 3 }}>{m.uom}</span>}
                              </p>
                            </div>
                            {rag && <RagPill rag={rag} size="xs" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!selectedSummary && !loadingSummary && (
                <GlassCard style={{ padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 32, marginBottom: 12 }}>???</p>
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>No KPI plan found for {selectedProject?.project_name}.</p>
                </GlassCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
