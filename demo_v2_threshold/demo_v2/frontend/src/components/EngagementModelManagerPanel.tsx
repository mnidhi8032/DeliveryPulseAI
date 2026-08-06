/**
 * EngagementModelManagerPanel — Spec 18.2 + 18.3
 *
 * Shared component used in:
 *   - DECatalogPage    (/delivery-excellence/catalog → Engagement Model tab)
 *   - PlatformAdminSettingsPage (/platform/settings → Engagement Model tab)
 *
 * Allows DE / Platform Admin to:
 *   - Browse all 5 item types (Project Type, Delivery Model, Project Category,
 *     Work Size Unit, Dimension)
 *   - Add new items to any type
 *   - Toggle active/inactive
 *   - Manage metric mappings per item (add / remove / toggle mandatory)
 *   - Set min_mandatory_count on DIMENSION rows (18.3)
 */
import { useEffect, useState } from "react";
import {
  listEngagementItems,
  createEngagementItem,
  updateEngagementItem,
  listMetricMappings,
  addMetricMapping,
  updateMetricMapping,
  removeMetricMapping,
} from "../services/engagementModelService";
import type { EngagementModelItem, MetricMapping, EngagementItemType } from "../services/engagementModelService";
import type { QPMCatalogMetric } from "../types/qpm";

const ITEM_TYPE_LABELS: Record<EngagementItemType, string> = {
  PROJECT_TYPE:     "Project Types",
  DELIVERY_MODEL:   "Delivery Models",
  PROJECT_CATEGORY: "Project Categories",
  WORK_SIZE_UNIT:   "Work Size Units",
  DIMENSION:        "Dimensions (Metric Categories)",
};

const ALL_TYPES: EngagementItemType[] = [
  "PROJECT_TYPE", "DELIVERY_MODEL", "PROJECT_CATEGORY", "WORK_SIZE_UNIT", "DIMENSION",
];

const T = {
  accent: "#6c63ff",
  card: "var(--surface)",
  border: "var(--border)",
  shadow: "var(--shadow)",
  text: "var(--text)",
  muted: "var(--muted)",
};

interface Props {
  catalogMetrics: QPMCatalogMetric[];
  toast: { success: (m: string) => void; error: (m: string) => void };
}

export function EngagementModelManagerPanel({ catalogMetrics, toast }: Props) {
  const [activeType, setActiveType] = useState<EngagementItemType>("PROJECT_TYPE");
  const [items, setItems] = useState<EngagementModelItem[]>([]);
  const [loading, setLoading] = useState(false);

  // New item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMinCount, setNewMinCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // Metric mappings panel
  const [selectedItem, setSelectedItem] = useState<EngagementModelItem | null>(null);
  const [mappings, setMappings] = useState<MetricMapping[]>([]);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [mappingSubTab, setMappingSubTab] = useState<"mapped" | "catalog">("mapped");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCatFilter, setCatalogCatFilter] = useState("");
  const [mandatoryFilter, setMandatoryFilter] = useState<"all" | "mandatory" | "optional">("all");
  const [addingMetricId, setAddingMetricId] = useState<string | null>(null);

  // Derived: unique categories from catalog for the filter dropdown
  const catalogCategories = Array.from(new Set(catalogMetrics.map(m => m.category).filter(Boolean))).sort();

  const loadItems = async () => {
    setLoading(true);
    try {
      const data = await listEngagementItems(activeType, false); // include inactive
      setItems(data);
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setSelectedItem(null);
    setShowAddForm(false);
    loadItems();
  }, [activeType]);

  const loadMappings = async (item: EngagementModelItem) => {
    setSelectedItem(item);
    setMappingsLoading(true);
    setCatalogSearch("");
    setCatalogCatFilter("");
    setMandatoryFilter("all");
    setMappingSubTab("mapped");
    try {
      setMappings(await listMetricMappings(item.id));
    } catch { toast.error("Failed to load metric mappings"); }
    finally { setMappingsLoading(false); }
  };

  const handleAddItem = async () => {
    if (!newValue.trim()) return;
    setSaving(true);
    try {
      const created = await createEngagementItem({
        item_type: activeType,
        value: newValue.trim(),
        description: newDesc.trim() || undefined,
        min_mandatory_count: activeType === "DIMENSION" ? newMinCount : 0,
      });
      setItems(prev => [...prev, created]);
      setNewValue(""); setNewDesc(""); setNewMinCount(0); setShowAddForm(false);
      toast.success(`"${created.value}" added`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add item");
    } finally { setSaving(false); }
  };

  const handleToggleActive = async (item: EngagementModelItem) => {
    try {
      const updated = await updateEngagementItem(item.id, { is_active: !item.is_active });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      if (selectedItem?.id === item.id) setSelectedItem(updated);
      toast.success(`${updated.value} ${updated.is_active ? "activated" : "deactivated"}`);
    } catch { toast.error("Failed to update item"); }
  };

  const handleUpdateMinCount = async (item: EngagementModelItem, count: number) => {
    try {
      const updated = await updateEngagementItem(item.id, { min_mandatory_count: count });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      if (selectedItem?.id === item.id) setSelectedItem(updated);
    } catch { toast.error("Failed to update minimum count"); }
  };

  const handleAddMapping = async (catalogMetric: QPMCatalogMetric) => {
    if (!selectedItem) return;
    setAddingMetricId(catalogMetric.id);
    try {
      const m = await addMetricMapping(selectedItem.id, catalogMetric.id, false);
      setMappings(prev => [...prev, m]);
      toast.success(`"${catalogMetric.name}" mapped`);
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to add mapping");
    } finally { setAddingMetricId(null); }
  };

  const handleToggleMandatory = async (mapping: MetricMapping) => {
    if (!selectedItem) return;
    try {
      const updated = await updateMetricMapping(selectedItem.id, mapping.catalog_metric_id, !mapping.is_mandatory);
      setMappings(prev => prev.map(m => m.id === mapping.id ? updated : m));
    } catch { toast.error("Failed to update mandatory flag"); }
  };

  const handleRemoveMapping = async (mapping: MetricMapping) => {
    if (!selectedItem) return;
    if (!window.confirm(`Remove "${mapping.metric_name}" from this mapping?`)) return;
    try {
      await removeMetricMapping(selectedItem.id, mapping.catalog_metric_id);
      setMappings(prev => prev.filter(m => m.id !== mapping.id));
      toast.success("Mapping removed");
    } catch { toast.error("Failed to remove mapping"); }
  };

  const mappedIds = new Set(mappings.map(m => m.catalog_metric_id));
  const availableCatalog = catalogMetrics.filter(m => {
    if (mappedIds.has(m.id)) return false;
    if (catalogSearch && !m.name.toLowerCase().includes(catalogSearch.toLowerCase())) return false;
    if (catalogCatFilter && m.category !== catalogCatFilter) return false;
    if (mandatoryFilter === "mandatory" && m.compliance !== "M") return false;
    if (mandatoryFilter === "optional" && m.compliance === "M") return false;
    return true;
  });

  const inp: React.CSSProperties = {
    borderRadius: 10, border: `1.5px solid ${T.border}`, padding: "8px 12px",
    fontSize: 13, color: T.text, background: T.card, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Header */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: T.accent, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
          Engagement Model & Dimensions
        </p>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          Manage the dropdown options for project creation and metric categorisation. Select any item to manage its metric mappings.
        </p>
      </div>

      {/* Type tabs */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {ALL_TYPES.map(type => (
          <button key={type} type="button" onClick={() => setActiveType(type)} style={{
            borderRadius: 10, padding: "7px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: activeType === type ? T.accent : "transparent",
            color: activeType === type ? "#fff" : T.muted,
            border: `1.5px solid ${activeType === type ? T.accent : T.border}`,
            transition: "all 0.15s",
          }}>
            {ITEM_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Main content — two-column when a mapping panel is open */}
      <div style={{ display: "grid", gridTemplateColumns: selectedItem ? "1fr 1fr" : "1fr", gap: 16 }}>

        {/* Left — items list */}
        <div style={{ background: T.card, borderRadius: 16, border: `1.5px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", background: "rgba(108,99,255,0.04)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: 0 }}>{ITEM_TYPE_LABELS[activeType]}</p>
            <button type="button" onClick={() => setShowAddForm(v => !v)} style={{
              borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: showAddForm ? "transparent" : T.accent,
              color: showAddForm ? T.muted : "#fff",
              border: showAddForm ? `1.5px solid ${T.border}` : "none",
              boxShadow: showAddForm ? "none" : `0 2px 8px rgba(108,99,255,0.30)`,
            }}>
              {showAddForm ? "Cancel" : "+ Add New"}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" placeholder={`${ITEM_TYPE_LABELS[activeType]} name *`}
                value={newValue} onChange={e => setNewValue(e.target.value)} style={inp} />
              <input type="text" placeholder="Description (optional)"
                value={newDesc} onChange={e => setNewDesc(e.target.value)} style={inp} />
              {activeType === "DIMENSION" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: T.muted, whiteSpace: "nowrap" }}>
                    Min mandatory metrics:
                  </label>
                  <input type="number" min={0} max={20} value={newMinCount}
                    onChange={e => setNewMinCount(Number(e.target.value))}
                    style={{ ...inp, width: 80 }} />
                </div>
              )}
              <button type="button" disabled={saving || !newValue.trim()} onClick={handleAddItem} style={{
                borderRadius: 10, background: T.accent, color: "#fff", border: "none",
                padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", alignSelf: "flex-start",
                opacity: (saving || !newValue.trim()) ? 0.5 : 1,
              }}>
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          )}

          {/* Items */}
          {loading ? (
            <p style={{ padding: "32px 18px", fontSize: 13, color: T.muted, textAlign: "center" }}>Loading…</p>
          ) : items.length === 0 ? (
            <p style={{ padding: "32px 18px", fontSize: 13, color: T.muted, textAlign: "center" }}>No items yet.</p>
          ) : (
            <div>
              {items.map((item, idx) => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 18px",
                  borderBottom: idx < items.length - 1 ? `1px solid ${T.border}` : "none",
                  background: selectedItem?.id === item.id ? "rgba(108,99,255,0.06)" : "transparent",
                  opacity: item.is_active ? 1 : 0.5,
                  cursor: "pointer",
                }}
                  onClick={() => loadMappings(item)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.value}
                    </p>
                    {item.description && (
                      <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>{item.description}</p>
                    )}
                    {activeType === "DIMENSION" && item.min_mandatory_count > 0 && (
                      <p style={{ fontSize: 10, color: T.accent, fontWeight: 700, margin: "2px 0 0" }}>
                        Min: {item.min_mandatory_count} metric{item.min_mandatory_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  {/* min count editor for DIMENSION */}
                  {activeType === "DIMENSION" && (
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: T.muted, fontWeight: 700 }}>Min:</span>
                      <input type="number" min={0} max={20} value={item.min_mandatory_count}
                        onChange={e => handleUpdateMinCount(item, Number(e.target.value))}
                        style={{ width: 48, borderRadius: 8, border: `1.5px solid ${T.border}`, padding: "3px 6px", fontSize: 12, color: T.text, background: T.card, outline: "none", textAlign: "center" }} />
                    </div>
                  )}
                  <button type="button" onClick={e => { e.stopPropagation(); handleToggleActive(item); }} style={{
                    borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                    background: item.is_active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                    color: item.is_active ? "#dc2626" : "#16a34a",
                    border: `1px solid ${item.is_active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
                  }}>
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <span style={{ fontSize: 10, color: T.accent, fontWeight: 700 }}>Metrics →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — metric mappings */}
        {selectedItem && (
          <div style={{ background: T.card, borderRadius: 16, border: `1.5px solid ${T.border}`, boxShadow: T.shadow, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 520 }}>
            <div style={{ padding: "14px 18px", background: "rgba(108,99,255,0.04)", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: T.text, margin: 0 }}>Metrics for: <span style={{ color: T.accent }}>{selectedItem.value}</span></p>
                <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0" }}>{mappings.length} mapped</p>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} style={{
                borderRadius: 8, border: `1.5px solid ${T.border}`, background: "transparent",
                color: T.muted, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              }}>✕ Close</button>
            </div>

            {/* Sub-tabs: Mapped | Add from Catalog */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: "rgba(108,99,255,0.02)" }}>
              {(["mapped", "catalog"] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setMappingSubTab(t)}
                  style={{
                    flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: "transparent", border: "none",
                    borderBottom: `2.5px solid ${mappingSubTab === t ? T.accent : "transparent"}`,
                    color: mappingSubTab === t ? T.accent : T.muted,
                    transition: "all 0.15s",
                  }}>
                  {t === "mapped"
                    ? `Mapped Metrics (${mappings.length})`
                    : `Add from Catalog (${availableCatalog.length})`}
                </button>
              ))}
            </div>

            {/* ── MAPPED tab ── */}
            {mappingSubTab === "mapped" && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {mappingsLoading ? (
                  <p style={{ padding: "32px", fontSize: 12, color: T.muted, textAlign: "center" }}>Loading…</p>
                ) : mappings.length === 0 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>No metrics mapped yet.</p>
                    <p style={{ fontSize: 11, color: T.muted, margin: "6px 0 0" }}>Switch to "Add from Catalog" to start mapping metrics.</p>
                  </div>
                ) : mappings.map((m, idx) => (
                  <div key={m.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "11px 16px",
                    borderBottom: idx < mappings.length - 1 ? `1px solid ${T.border}` : "none",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {m.metric_name}
                      </p>
                      {m.metric_category && (
                        <p style={{ fontSize: 10, color: T.muted, margin: "1px 0 0" }}>{m.metric_category}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => handleToggleMandatory(m)} style={{
                      borderRadius: 8, padding: "3px 10px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      background: m.is_mandatory ? "rgba(239,68,68,0.08)" : "rgba(108,99,255,0.08)",
                      color: m.is_mandatory ? "#dc2626" : T.accent,
                      border: `1px solid ${m.is_mandatory ? "rgba(239,68,68,0.25)" : "rgba(108,99,255,0.25)"}`,
                      whiteSpace: "nowrap", flexShrink: 0,
                    }}>
                      {m.is_mandatory ? "● Mandatory" : "○ Optional"}
                    </button>
                    <button type="button" onClick={() => handleRemoveMapping(m)} style={{
                      borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700, cursor: "pointer",
                      background: "none", color: "#dc2626", border: "1px solid rgba(239,68,68,0.25)", flexShrink: 0,
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── ADD FROM CATALOG tab ── */}
            {mappingSubTab === "catalog" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Search + category filter */}
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      placeholder="Search all 83+ catalog metrics…"
                      value={catalogSearch}
                      onChange={e => setCatalogSearch(e.target.value)}
                      style={{ ...inp, fontSize: 12, paddingLeft: 32 }}
                    />
                    <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                      width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={T.muted} strokeWidth={2.5}>
                      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <select
                      value={catalogCatFilter}
                      onChange={e => setCatalogCatFilter(e.target.value)}
                      style={{ ...inp, fontSize: 12, width: "auto", flex: 1, cursor: "pointer" }}>
                      <option value="">All Categories</option>
                      {catalogCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={mandatoryFilter}
                      onChange={e => setMandatoryFilter(e.target.value as "all" | "mandatory" | "optional")}
                      style={{ ...inp, fontSize: 12, width: "auto", flex: 1, cursor: "pointer" }}>
                      <option value="all">All compliance</option>
                      <option value="mandatory">Mandatory (M)</option>
                      <option value="optional">Optional (O/C/R)</option>
                    </select>
                    <span style={{ fontSize: 11, color: T.muted, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {availableCatalog.length} available
                    </span>
                  </div>
                </div>

                {/* Catalog list */}
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {availableCatalog.length === 0 ? (
                    <p style={{ padding: "32px", fontSize: 12, color: T.muted, textAlign: "center" }}>
                      {catalogSearch || catalogCatFilter
                        ? "No metrics match your search."
                        : "All catalog metrics are already mapped."}
                    </p>
                  ) : availableCatalog.map((m, idx) => (
                    <div key={m.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                      borderBottom: idx < availableCatalog.length - 1 ? `1px solid ${T.border}` : "none",
                      transition: "background 0.12s",
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,99,255,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.name}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 2, alignItems: "center" }}>
                          <span style={{ fontSize: 9, color: T.accent, fontWeight: 700 }}>{m.category}</span>
                          {m.compliance && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, borderRadius: 4, padding: "1px 5px",
                              background: m.compliance === "M" ? "rgba(239,68,68,0.10)" : "rgba(108,99,255,0.08)",
                              color: m.compliance === "M" ? "#dc2626" : T.accent,
                              border: `1px solid ${m.compliance === "M" ? "rgba(239,68,68,0.25)" : "rgba(108,99,255,0.20)"}`,
                            }}>{m.compliance === "M" ? "Mandatory" : m.compliance === "O" ? "Optional" : m.compliance}</span>
                          )}
                          {m.uom && <span style={{ fontSize: 9, color: T.muted }}>{m.uom}</span>}
                        </div>
                      </div>
                      <button type="button"
                        disabled={addingMetricId === m.id}
                        onClick={() => handleAddMapping(m)}
                        style={{
                          borderRadius: 8, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                          background: T.accent, color: "#fff", border: "none", flexShrink: 0,
                          opacity: addingMetricId === m.id ? 0.5 : 1,
                          boxShadow: `0 2px 6px rgba(108,99,255,0.25)`,
                        }}>
                        {addingMetricId === m.id ? "…" : "+ Map"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
