/**
 * Delivery Excellence -- QPM Metric Catalog Management
 * Two tabs: Metric Catalog (browse/edit/add) | Pending Requests (approve/reject PM custom metric requests)
 * Theme: Light purple (matches PM page)
 */
import React, { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import { getAllCatalog, createCatalogMetric, updateCatalogMetric } from "../../services/qpmService";
import { listMetricRequests, decideMetricRequest } from "../../services/metricApprovalService";
import type { MetricApprovalRequest } from "../../services/metricApprovalService";
import type { QPMCatalogMetric } from "../../types/qpm";
import { METRIC_CATEGORIES, FREQUENCIES, COMPLIANCE_LABEL } from "../../types/qpm";

// ─── Theme tokens (matches PM page) ─────────────────────────────────────────
const T = {
  bg: "#f0f2ff",
  cardBg: "#ffffff",
  cardBorder: "#e8e6ff",
  cardShadow: "0 2px 16px rgba(108,99,255,0.10)",
  accent: "#6c63ff",
  accentDark: "#5a52e0",
  accentText: "#6366F1",
  text: "#1a1a2e",
  textMuted: "#6b7280",
  inputBorder: "#e8e6ff",
  inputFocus: "#6c63ff",
  rowHover: "rgba(108,99,255,0.04)",
  divider: "#e8e6ff",
  tableBg: "#f8f7ff",
  badgeBg: "rgba(108,99,255,0.10)",
};

// ─── Shared helpers ───────────────────────────────────────────────────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.cardBorder}`,
      borderRadius: 16, boxShadow: T.cardShadow, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: T.accentText, textTransform: "uppercase", marginBottom: 4 }}>
      {children}
    </p>
  );
}

const INTENT_OPTIONS = ["Higher the better", "Lower the better", "Nominal the best", "Within Limits", "Not Applicable"];

export function DECatalogPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"catalog" | "requests">("catalog");

  // -- Catalog state
  const [metrics, setMetrics] = useState<QPMCatalogMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMetric, setEditMetric] = useState<QPMCatalogMetric | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    category: "", name: "", formula: "", uom: "", metrics_type: "Result",
    intent: "Higher the better", project_type: "", delivery_model: "",
    project_category: "", frequency: "Monthly", compliance: "O",
    default_target: "", default_lsl: "", default_usl: "",
  };
  const [form, setForm] = useState(emptyForm);

  // -- Requests state
  const [requests, setRequests] = useState<MetricApprovalRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  // -- Load catalog
  const loadCatalog = () => {
    getAllCatalog().then(setMetrics).catch(() => toast.error("Failed to load catalog")).finally(() => setLoading(false));
  };

  // -- Load requests
  const loadRequests = () => {
    setRequestsLoading(true);
    listMetricRequests().then(setRequests).catch(() => toast.error("Failed to load requests")).finally(() => setRequestsLoading(false));
  };

  useEffect(() => { loadCatalog(); }, []);
  useEffect(() => { if (activeTab === "requests") loadRequests(); }, [activeTab]);

  // -- Catalog handlers
  const openCreate = () => { setEditMetric(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (m: QPMCatalogMetric) => {
    setEditMetric(m);
    setForm({
      category: m.category || "", name: m.name || "", formula: m.formula || "",
      uom: m.uom || "", metrics_type: m.metrics_type || "Result",
      intent: m.intent || "Higher the better", project_type: m.project_type || "",
      delivery_model: m.delivery_model || "", project_category: m.project_category || "",
      frequency: m.frequency || "Monthly", compliance: m.compliance || "O",
      default_target: m.default_target != null ? String(m.default_target) : "",
      default_lsl: m.default_lsl != null ? String(m.default_lsl) : "",
      default_usl: m.default_usl != null ? String(m.default_usl) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      default_target: form.default_target !== "" ? parseFloat(form.default_target) : null,
      default_lsl: form.default_lsl !== "" ? parseFloat(form.default_lsl) : null,
      default_usl: form.default_usl !== "" ? parseFloat(form.default_usl) : null,
    };
    try {
      if (editMetric) {
        const updated = await updateCatalogMetric(editMetric.id, payload);
        setMetrics(prev => prev.map(m => m.id === editMetric.id ? updated : m));
        toast.success("Metric updated");
      } else {
        const created = await createCatalogMetric(payload);
        setMetrics(prev => [created, ...prev]);
        toast.success(`"${created.name}" added to catalog`);
      }
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save metric");
    } finally { setSaving(false); }
  };

  const handleToggle = async (m: QPMCatalogMetric) => {
    try {
      const updated = await updateCatalogMetric(m.id, { is_active: !m.is_active });
      setMetrics(prev => prev.map(x => x.id === m.id ? updated : x));
      toast.success(`${m.name} ${updated.is_active ? "activated" : "deactivated"}`);
    } catch { toast.error("Failed to update status"); }
  };

  // -- Request handlers
  const handleApprove = async (id: string) => {
    setDecidingId(id);
    try {
      const updated = await decideMetricRequest(id, "APPROVE");
      setRequests(prev => prev.map(r => r.id === id ? updated : r));
      toast.success(`Approved: "${updated.metric_name}" added to the project's KPI plan.`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to approve");
    } finally { setDecidingId(null); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setDecidingId(rejectModal.id);
    try {
      const updated = await decideMetricRequest(rejectModal.id, "REJECT", rejectComment);
      setRequests(prev => prev.map(r => r.id === rejectModal.id ? updated : r));
      toast.success(`Rejected: "${updated.metric_name}"`);
      setRejectModal(null);
      setRejectComment("");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to reject");
    } finally { setDecidingId(null); }
  };

  // -- Derived
  const categories = [...new Set(metrics.map(m => m.category).filter(Boolean))].sort();
  const filtered = metrics.filter(m => {
    const matchCat = !catFilter || m.category === catFilter;
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  const pendingCount = requests.filter(r => r.status === "PENDING").length;

  // ── Shared input style ────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    borderRadius: 10, border: `1px solid ${T.inputBorder}`,
    padding: "8px 12px", fontSize: 12, color: T.text,
    background: T.cardBg, outline: "none", width: "100%",
    fontFamily: "inherit",
  };

  if (loading) return (
    <div style={{
      height: 240, borderRadius: 16,
      background: "linear-gradient(90deg,#ede9ff 25%,#f3f0ff 50%,#ede9ff 75%)",
      backgroundSize: "200% 100%",
      animation: "kpi-shimmer 1.5s ease-in-out infinite",
    }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, color: T.text, fontFamily: "'Inter','Poppins',system-ui,sans-serif" }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <SectionLabel>Delivery Excellence · Catalog</SectionLabel>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.02em" }}>
            QPM Metric Catalog
          </h1>
          <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>{metrics.length} metrics total</p>
        </div>
        {activeTab === "catalog" && (
          <button
            onClick={openCreate}
            style={{
              background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              color: "#ffffff", border: "none", borderRadius: 12,
              padding: "10px 20px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", boxShadow: `0 4px 14px ${T.accent}40`,
              letterSpacing: "0.02em",
            }}
          >
            + Add Metric
          </button>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────── */}
      <div style={{
        display: "inline-flex", gap: 4, padding: 4,
        background: "#f0f2ff", border: `1px solid ${T.cardBorder}`,
        borderRadius: 12,
      }}>
        {(["catalog", "requests"] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              position: "relative", padding: "8px 20px",
              fontSize: 11, fontWeight: 700, borderRadius: 9, border: "none",
              cursor: "pointer", transition: "all 0.2s",
              background: activeTab === tab
                ? (tab === "requests" ? T.accent : T.cardBg)
                : "transparent",
              color: activeTab === tab
                ? (tab === "requests" ? "#fff" : T.text)
                : T.textMuted,
              boxShadow: activeTab === tab ? T.cardShadow : "none",
            }}
          >
            {tab === "catalog" ? "Metric Catalog" : "Pending Requests"}
            {tab === "requests" && pendingCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 16, height: 16, borderRadius: "50%",
                background: "#ef4444", color: "#fff",
                fontSize: 9, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PENDING REQUESTS TAB ── */}
      {activeTab === "requests" && (
        <GlassCard>
          <div style={{ padding: "12px 20px", background: T.tableBg, borderBottom: `1px solid ${T.divider}`, borderRadius: "16px 16px 0 0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: T.accentText, textTransform: "uppercase", letterSpacing: "0.12em", margin: 0 }}>
              Custom Metric Requests from Project Managers
            </p>
          </div>
          {requestsLoading ? (
            <p style={{ padding: "32px 20px", fontSize: 13, color: T.textMuted, textAlign: "center" }}>Loading...</p>
          ) : requests.length === 0 ? (
            <p style={{ padding: "48px 20px", fontSize: 13, color: T.textMuted, textAlign: "center" }}>No requests yet.</p>
          ) : (
            <div>
              {requests.map((r, idx) => (
                <div key={r.id} style={{
                  padding: "20px", display: "flex", flexDirection: "column", gap: 12,
                  borderBottom: idx < requests.length - 1 ? `1px solid ${T.divider}` : "none",
                  background: r.status === "PENDING" ? "rgba(245,158,11,0.04)" : "transparent",
                }}>
                  <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{r.metric_name}</span>
                    {r.metric_category && (
                      <span style={{
                        borderRadius: 6, background: T.badgeBg, border: `1px solid ${T.cardBorder}`,
                        padding: "1px 8px", fontSize: 9, fontWeight: 700, color: T.accentText,
                      }}>{r.metric_category}</span>
                    )}
                    <span style={{
                      borderRadius: 999, padding: "2px 9px", fontSize: 9, fontWeight: 700,
                      border: `1px solid ${r.status === "APPROVED" ? "rgba(34,197,94,0.3)" : r.status === "REJECTED" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.4)"}`,
                      color: r.status === "APPROVED" ? "#16a34a" : r.status === "REJECTED" ? "#dc2626" : "#b45309",
                      background: r.status === "APPROVED" ? "rgba(34,197,94,0.08)" : r.status === "REJECTED" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.10)",
                    }}>{r.status}</span>
                  </div>
                  <p style={{ fontSize: 11, color: T.textMuted, margin: 0 }}>
                    Requested by <strong style={{ color: T.text }}>{r.requested_by_name}</strong>
                    {r.project_name && <> for <strong style={{ color: T.text }}>{r.project_name}</strong></>}
                    <span style={{ marginLeft: 8, color: "#9ca3af" }}>{new Date(r.created_at).toLocaleDateString()}</span>
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 6, fontSize: 10, color: T.textMuted }}>
                    {r.uom && <div><span style={{ fontWeight: 700 }}>UOM:</span> {r.uom}</div>}
                    {r.intent && <div><span style={{ fontWeight: 700 }}>Intent:</span> {r.intent}</div>}
                    {r.frequency && <div><span style={{ fontWeight: 700 }}>Frequency:</span> {r.frequency}</div>}
                    {r.formula && <div style={{ gridColumn: "span 2" }}><span style={{ fontWeight: 700 }}>Formula:</span> {r.formula}</div>}
                  </div>
                  <div style={{ borderRadius: 10, border: "1px solid rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.06)", padding: "10px 14px" }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: "#b45309", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>PM Justification</p>
                    <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>{r.justification}</p>
                  </div>
                  {r.review_comments && (
                    <div style={{ borderRadius: 10, border: `1px solid ${T.cardBorder}`, background: T.tableBg, padding: "10px 14px" }}>
                      <p style={{ fontSize: 9, fontWeight: 800, color: T.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.08em" }}>Review Comment</p>
                      <p style={{ fontSize: 11, color: T.text, margin: 0 }}>{r.review_comments}</p>
                    </div>
                  )}
                  {r.status === "PENDING" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={decidingId === r.id}
                        style={{
                          background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff",
                          border: "none", borderRadius: 10, padding: "8px 18px",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          opacity: decidingId === r.id ? 0.5 : 1,
                          boxShadow: "0 2px 10px rgba(34,197,94,0.25)",
                        }}
                      >
                        {decidingId === r.id ? "Approving..." : "Approve"}
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: r.id, name: r.metric_name }); setRejectComment(""); }}
                        disabled={decidingId === r.id}
                        style={{
                          background: T.cardBg, color: "#dc2626",
                          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "8px 18px",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          opacity: decidingId === r.id ? 0.5 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ── CATALOG TAB ── */}
      {activeTab === "catalog" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search metric name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, width: 200, paddingLeft: 32 }}
              />
              <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={T.textMuted} strokeWidth={2.5}>
                <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
              </svg>
            </div>
            <select
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <span style={{ fontSize: 11, color: T.textMuted }}>{filtered.length} metrics</span>
          </div>

          {/* Table */}
          <GlassCard style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: T.tableBg, borderBottom: `1px solid ${T.divider}` }}>
                    {["Category","Name","Formula","UOM","Intent","Compliance","Target","LSL","USL","Freq","Status",""].map(h => (
                      <th key={h} style={{
                        padding: "10px 12px", textAlign: "left", whiteSpace: "nowrap",
                        fontSize: 9, fontWeight: 700, color: T.accentText,
                        textTransform: "uppercase", letterSpacing: "0.08em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ padding: "48px 16px", textAlign: "center", color: T.textMuted, fontSize: 13 }}>
                        No metrics found.
                      </td>
                    </tr>
                  ) : filtered.map((m, idx) => (
                    <tr key={m.id} style={{
                      borderBottom: idx < filtered.length - 1 ? `1px solid ${T.divider}` : "none",
                      opacity: m.is_active ? 1 : 0.45,
                      transition: "background 0.15s",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.rowHover)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{
                          borderRadius: 6, background: T.badgeBg, border: `1px solid ${T.cardBorder}`,
                          padding: "2px 8px", fontSize: 9, fontWeight: 700, color: T.accentText, whiteSpace: "nowrap",
                        }}>{m.category}</span>
                      </td>
                      <td style={{ padding: "9px 12px", fontWeight: 600, color: T.text, maxWidth: 160 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={m.name}>{m.name}</div>
                      </td>
                      <td style={{ padding: "9px 12px", color: T.textMuted, maxWidth: 180 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }} title={m.formula || ""}>{m.formula || "--"}</div>
                      </td>
                      <td style={{ padding: "9px 12px", color: T.textMuted, whiteSpace: "nowrap" }}>{m.uom || "--"}</td>
                      <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                        <span style={{
                          borderRadius: 6, fontSize: 9, fontWeight: 600, padding: "2px 7px",
                          background: (m.intent||"").toLowerCase().includes("higher") ? "rgba(34,197,94,0.08)"
                            : (m.intent||"").toLowerCase().includes("lower") ? "rgba(239,68,68,0.08)"
                            : T.badgeBg,
                          border: `1px solid ${(m.intent||"").toLowerCase().includes("higher") ? "rgba(34,197,94,0.25)"
                            : (m.intent||"").toLowerCase().includes("lower") ? "rgba(239,68,68,0.25)"
                            : T.cardBorder}`,
                          color: (m.intent||"").toLowerCase().includes("higher") ? "#16a34a"
                            : (m.intent||"").toLowerCase().includes("lower") ? "#dc2626"
                            : T.accentText,
                        }}>{m.intent || "--"}</span>
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        {m.compliance ? (
                          <span style={{
                            borderRadius: 999, padding: "2px 8px", fontSize: 9, fontWeight: 700,
                            background: m.compliance === "M" ? "rgba(239,68,68,0.08)"
                              : m.compliance === "C" ? "rgba(245,158,11,0.08)"
                              : T.badgeBg,
                            border: `1px solid ${m.compliance === "M" ? "rgba(239,68,68,0.25)"
                              : m.compliance === "C" ? "rgba(245,158,11,0.25)"
                              : T.cardBorder}`,
                            color: m.compliance === "M" ? "#dc2626"
                              : m.compliance === "C" ? "#b45309"
                              : T.accentText,
                          }}>{COMPLIANCE_LABEL[m.compliance] || m.compliance}</span>
                        ) : "--"}
                      </td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: T.text }}>{m.default_target ?? 0}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#f59e0b" }}>{m.default_lsl ?? 0}</td>
                      <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#ef4444" }}>{m.default_usl ?? 0}</td>
                      <td style={{ padding: "9px 12px", color: T.textMuted, fontSize: 10, whiteSpace: "nowrap" }}>
                        {m.frequency ? m.frequency.substring(0, 20) : "--"}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={{
                          borderRadius: 999, padding: "2px 9px", fontSize: 9, fontWeight: 700,
                          background: m.is_active ? "rgba(34,197,94,0.08)" : T.badgeBg,
                          border: `1px solid ${m.is_active ? "rgba(34,197,94,0.25)" : T.cardBorder}`,
                          color: m.is_active ? "#16a34a" : T.textMuted,
                        }}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => openEdit(m)}
                            style={{
                              borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                              background: T.cardBg, color: T.text,
                              border: `1px solid ${T.cardBorder}`,
                            }}
                          >Edit</button>
                          <button
                            onClick={() => handleToggle(m)}
                            style={{
                              borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                              background: m.is_active ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                              color: m.is_active ? "#dc2626" : "#16a34a",
                              border: `1px solid ${m.is_active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                            }}
                          >
                            {m.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── Reject confirmation modal ── */}
      {rejectModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,10,40,0.35)", backdropFilter: "blur(6px)",
          padding: 16,
        }}>
          <GlassCard style={{ width: "100%", maxWidth: 420, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>Reject Request</h3>
            <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Rejecting: <strong style={{ color: T.text }}>{rejectModal.name}</strong></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Reason (optional)</label>
              <textarea
                value={rejectComment}
                onChange={e => setRejectComment(e.target.value)}
                rows={3}
                placeholder="Explain why this request is rejected..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  borderRadius: 10, border: `1px solid ${T.cardBorder}`, background: T.cardBg,
                  padding: "9px 18px", fontSize: 11, fontWeight: 700, color: T.text, cursor: "pointer",
                }}
              >Cancel</button>
              <button
                onClick={handleReject}
                disabled={!!decidingId}
                style={{
                  borderRadius: 10, border: "none",
                  background: "linear-gradient(135deg,#ef4444,#dc2626)",
                  padding: "9px 18px", fontSize: 11, fontWeight: 700, color: "#fff",
                  cursor: "pointer", opacity: decidingId ? 0.5 : 1,
                  boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                }}
              >
                {decidingId ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Add/Edit metric modal ── */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(15,10,40,0.35)", backdropFilter: "blur(6px)",
          padding: 16,
        }}>
          <GlassCard style={{
            width: "100%", maxWidth: 640, maxHeight: "90vh",
            overflowY: "auto", padding: 24,
            display: "flex", flexDirection: "column", gap: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${T.divider}`, paddingBottom: 12 }}>
              <div>
                <SectionLabel>{editMetric ? "Edit" : "New"} Metric</SectionLabel>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: T.text, margin: 0 }}>
                  {editMetric ? "Edit Metric" : "Add New Metric"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent", border: `1px solid ${T.cardBorder}`, borderRadius: 8,
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: T.textMuted, fontSize: 14, fontWeight: 700,
                }}
              >×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {([
                  { label: "Category *", key: "category", type: "select", options: METRIC_CATEGORIES },
                  { label: "Metric Name *", key: "name", type: "text", placeholder: "E.g. Effort Variance" },
                  { label: "UOM", key: "uom", type: "text", placeholder: "E.g. %" },
                  { label: "Intent", key: "intent", type: "select", options: INTENT_OPTIONS },
                  { label: "Compliance", key: "compliance", type: "select", options: [["M","Mandatory"],["O","Optional"],["C","Conditional"]] },
                  { label: "Frequency", key: "frequency", type: "select", options: FREQUENCIES },
                  { label: "Default Target", key: "default_target", type: "number" },
                  { label: "Default LSL", key: "default_lsl", type: "number" },
                  { label: "Default USL", key: "default_usl", type: "number" },
                  { label: "Metrics Type", key: "metrics_type", type: "select", options: ["Result","Enabler","Insight"] },
                ] as any[]).map(({ label, key, type, placeholder, options }) => (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{label}</label>
                    {type === "select" ? (
                      <select
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ ...inputStyle, cursor: "pointer" }}
                      >
                        <option value="">Select...</option>
                        {(options as any[]).map(o => Array.isArray(o)
                          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
                          : <option key={o} value={o}>{o}</option>
                        )}
                      </select>
                    ) : (
                      <input
                        type={type}
                        placeholder={placeholder || ""}
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Formula</label>
                <textarea
                  value={form.formula}
                  onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                  rows={2}
                  placeholder="E.g. (Actual / Planned) * 100"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Applicable Project Types (comma-separated)</label>
                <input
                  type="text"
                  value={form.project_type}
                  onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                  placeholder="E.g. Fresh Development,Testing,Migration"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Applicable Delivery Models (comma-separated)</label>
                <input
                  type="text"
                  value={form.delivery_model}
                  onChange={e => setForm(f => ({ ...f, delivery_model: e.target.value }))}
                  placeholder="E.g. Agile-Scrum,Waterfall,Iterative"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: "flex", gap: 10, borderTop: `1px solid ${T.divider}`, paddingTop: 14 }}>
                <button
                  type="submit"
                  disabled={saving || !form.name || !form.category}
                  style={{
                    flex: 1, background: `linear-gradient(135deg,${T.accent},${T.accentDark})`,
                    color: "#fff", border: "none", borderRadius: 12,
                    padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    boxShadow: `0 4px 14px ${T.accent}40`,
                    opacity: saving || !form.name || !form.category ? 0.5 : 1,
                  }}
                >
                  {saving ? "Saving..." : editMetric ? "Update Metric" : "Add to Catalog"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    borderRadius: 12, border: `1px solid ${T.cardBorder}`, background: T.cardBg,
                    padding: "10px 20px", fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer",
                  }}
                >Cancel</button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
