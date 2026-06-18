import React, { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getSystemSettings,
  updateSystemSettings,
  getMetricCatalog,
  updateMetricCatalogItem,
  getGlobalAuditLogs,
} from "../../services/platformSettingsService";
import {
  getManagedUsers,
  createManagedUser,
  updateManagedUser,
  deleteManagedUser,
} from "../../services/platformUsersService";
import {
  listGovernancePeriods,
  createGovernancePeriod,
} from "../../services/governanceService";
import {
  getSetupBusinessUnits,
  createBusinessUnit,
  updateBusinessUnit,
} from "../../services/customerAdminSetupService";
import type { SetupBusinessUnit } from "../../types/customerAdminSetup";
import type { SystemSettings, MetricCatalogItem, SettingsAuditLog } from "../../types/platformSettings";
import type { ManagedUser } from "../../types/platformUsers";
import type { GovernancePeriod } from "../../types/governance";

type Tab = "general" | "health" | "notifications" | "metrics" | "users" | "audit" | "periods" | "setup";

export function PlatformAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("setup");
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [metrics, setMetrics] = useState<MetricCatalogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<SettingsAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  // User Management State
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userForm, setUserForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role_code: "PM",
    is_active: true,
  });

  // Governance Periods State
  const [govPeriods, setGovPeriods] = useState<GovernancePeriod[]>([]);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    period_type: "MONTHLY",
    period_start: "",
    period_end: "",
    is_active: true,
  });

  // Business Unit State (Platform Admin creates BUs)
  const [bus, setBus] = useState<SetupBusinessUnit[]>([]);
  const [buHeadUsers, setBuHeadUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [buModalOpen, setBuModalOpen] = useState(false);
  const [editBuId, setEditBuId] = useState<string | null>(null);
  const [buForm, setBuForm] = useState({ code: "", name: "", description: "", is_active: true, bu_head_user_id: "" });

  const toast = useToast();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [settingsData, metricsData] = await Promise.all([
          getSystemSettings(),
          getMetricCatalog(),
        ]);
        setSettings(settingsData);
        setMetrics(metricsData);
      } catch (err) {
        toast.error("Failed to load settings data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  useEffect(() => {
    if (activeTab === "audit") {
      async function loadAudits() {
        try {
          const audits = await getGlobalAuditLogs(auditPage, 10);
          setAuditLogs(audits);
        } catch (err) {
          toast.error("Failed to load audit logs");
        }
      }
      loadAudits();
    }
  }, [activeTab, auditPage, toast]);

  useEffect(() => {
    if (activeTab === "users") {
      async function loadUsers() {
        try {
          const data = await getManagedUsers();
          setUsers(data);
        } catch (err) {
          toast.error("Failed to load users directory");
        }
      }
      loadUsers();
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (activeTab === "periods") {
      async function loadPeriods() {
        try {
          const data = await listGovernancePeriods();
          setGovPeriods(data.sort((a, b) => b.period_start.localeCompare(a.period_start)));
        } catch {
          toast.error("Failed to load governance periods");
        }
      }
      loadPeriods();
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (activeTab === "setup") {
      getSetupBusinessUnits().then(setBus).catch(() => toast.error("Failed to load business units"));
      // Load BU Head users for the assignment dropdown
      getManagedUsers()
        .then(all => setBuHeadUsers(all.filter(u => u.role_code === "BU_HEAD")))
        .catch(() => {});
    }
  }, [activeTab, toast]);

  const handleBuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editBuId) {
        const updated = await updateBusinessUnit(editBuId, {
          name: buForm.name,
          description: buForm.description || null,
          is_active: buForm.is_active,
        });
        setBus(prev => prev.map(b => b.id === editBuId ? updated : b));
        // Also update bu_head_user_id via backend patch if changed
        if (buForm.bu_head_user_id !== undefined) {
          await fetch(`/api/v1/business-units/${editBuId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("deliverypulse_access_token")}` },
            body: JSON.stringify({ bu_head_user_id: buForm.bu_head_user_id || null }),
          });
        }
        toast.success("Business Unit updated");
      } else {
        const created = await createBusinessUnit({
          code: buForm.code,
          name: buForm.name,
          description: buForm.description || undefined,
          is_active: buForm.is_active,
        });
        // Assign BU Head if selected
        if (buForm.bu_head_user_id) {
          await fetch(`/api/v1/business-units/${created.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("deliverypulse_access_token")}` },
            body: JSON.stringify({ bu_head_user_id: buForm.bu_head_user_id }),
          });
        }
        setBus(prev => [created, ...prev]);
        toast.success("Business Unit created");
      }
      setBuModalOpen(false);
      setEditBuId(null);
      setBuForm({ code: "", name: "", description: "", is_active: true, bu_head_user_id: "" });
      // Reload
      getSetupBusinessUnits().then(setBus).catch(() => {});
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save Business Unit");
    }
  };

  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createGovernancePeriod({
        ...periodForm,
        is_active: periodForm.is_active,
      });
      setGovPeriods((prev) => [created, ...prev]);
      toast.success("Governance period created successfully");
      setPeriodModalOpen(false);
      setPeriodForm({ name: "", period_type: "MONTHLY", period_start: "", period_end: "", is_active: true });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to create governance period");
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await updateSystemSettings(settings);
      setSettings(updated);
      toast.success("System configurations updated successfully");
    } catch (err) {
      toast.error("Failed to save configurations");
    } finally {
      setSaving(false);
    }
  };

  const handleMetricToggle = async (metricId: string, currentStatus: boolean) => {
    try {
      const updated = await updateMetricCatalogItem(metricId, { is_active: !currentStatus });
      setMetrics((prev) => prev.map((m) => (m.id === metricId ? updated : m)));
      toast.success(`Metric status ${!currentStatus ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Failed to update metric status");
    }
  };

  const handleMetricWeightChange = async (metricId: string, weight: number) => {
    try {
      const updated = await updateMetricCatalogItem(metricId, { weight });
      setMetrics((prev) => prev.map((m) => (m.id === metricId ? updated : m)));
      toast.success(`Metric weight updated to ${weight}`);
    } catch (err) {
      toast.error("Failed to update metric weight");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editUser) {
        // Update user
        const updated = await updateManagedUser(editUser.id, {
          email: userForm.email,
          full_name: userForm.full_name,
          role_code: userForm.role_code,
          is_active: userForm.is_active,
        });
        setUsers((prev) => prev.map((u) => (u.id === editUser.id ? updated : u)));
        toast.success("User updated successfully");
      } else {
        // Create user
        if (!userForm.password) {
          toast.error("Password is required for new users");
          return;
        }
        const created = await createManagedUser({
          email: userForm.email,
          full_name: userForm.full_name,
          password: userForm.password,
          role_code: userForm.role_code,
          is_active: userForm.is_active,
        });
        setUsers((prev) => [created, ...prev]);
        toast.success("User provisioned successfully");
      }
      setUserModalOpen(false);
      setEditUser(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save user");
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user account?")) return;
    try {
      await deleteManagedUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("User account deleted successfully");
    } catch (err) {
      toast.error("Failed to delete user account");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/4 rounded bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 rounded bg-slate-200 animate-pulse" />
          <div className="h-64 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "setup",       label: "Org Setup" },
    { id: "general",     label: "General" },
    { id: "health",      label: "Health Thresholds" },
    { id: "notifications", label: "Notifications" },
    { id: "metrics",     label: "Metric Catalog" },
    { id: "periods",     label: "Gov. Periods" },
    { id: "users",       label: "User Directory" },
    { id: "audit",       label: "System Audits" },
  ];

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Platform Configuration</h1>
        <p className="text-sm text-slate-500">Manage global governance periods, health score boundaries, and notification reminders.</p>
      </div>

      {/* Premium Light Tab Selector */}
      <div className="flex border border-slate-200 bg-slate-50 p-1.5 rounded-lg gap-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition-all duration-205 ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow border border-slate-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settings && (
        <form onSubmit={handleSettingsSubmit} className="space-y-6">
          {/* General Tab */}
          {activeTab === "general" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Governance Framework</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700">Reporting Frequency</label>
                  <select
                    value={settings.reporting_frequency}
                    onChange={(e) => setSettings({ ...settings, reporting_frequency: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="MONTHLY">Monthly governance cycle</option>
                    <option value="WEEKLY">Weekly governance cycle</option>
                  </select>
                  <span className="text-[11px] text-slate-500">Dictates how often governance reports are seeded and expected.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700">Approval SLA Days</label>
                  <input
                    type="number"
                    min={1}
                    value={settings.approval_sla_days}
                    onChange={(e) => setSettings({ ...settings, approval_sla_days: parseInt(e.target.value) || 1 })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[11px] text-slate-500">Days allowed for Delivery Heads to review and action submissions.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700">Auto-lock Period Days</label>
                  <input
                    type="number"
                    min={0}
                    value={settings.auto_lock_days}
                    onChange={(e) => setSettings({ ...settings, auto_lock_days: parseInt(e.target.value) || 0 })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[11px] text-slate-500">Days after approval before submissions lock and become immutable.</span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700">Reopen Policy</label>
                  <select
                    value={settings.reopen_policy}
                    onChange={(e) => setSettings({ ...settings, reopen_policy: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="DH_AND_PLATFORM_ADMIN">DH or Platform Admin</option>
                    <option value="PLATFORM_ADMIN_ONLY">Platform Admin only</option>
                  </select>
                  <span className="text-[11px] text-slate-500">Specifies who can unlock approved submissions for PM correction.</span>
                </div>
              </div>
            </div>
          )}

          {/* Health Thresholds Tab */}
          {activeTab === "health" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">RAG Score Bands & Escalations</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
                  <label className="text-xs font-bold text-emerald-800">Green Threshold Minimum</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.green_threshold_min}
                    onChange={(e) => setSettings({ ...settings, green_threshold_min: parseFloat(e.target.value) || 0 })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[10px] text-emerald-700">Green represents healthy, standard execution. Default is 80.</span>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                  <label className="text-xs font-bold text-amber-800">Amber Threshold Minimum</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.amber_threshold_min}
                    onChange={(e) => setSettings({ ...settings, amber_threshold_min: parseFloat(e.target.value) || 0 })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[10px] text-amber-700">Amber represents minor risks or deviations. Default is 50.</span>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-rose-200 bg-rose-50/30 p-4">
                  <label className="text-xs font-bold text-rose-800">Red Threshold Minimum</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={settings.red_threshold_min}
                    onChange={(e) => setSettings({ ...settings, red_threshold_min: parseFloat(e.target.value) || 0 })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-[10px] text-rose-700">Red represents critical exceptions. Default is 0.</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">Escalation RED Cap Rule</p>
                  <p className="text-[11px] text-slate-500">If any single dimension scores Red (&lt; 50), cap overall health to a maximum of 79 (Amber) to prevent masking critical flaws.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.escalation_rules_enabled}
                    onChange={(e) => setSettings({ ...settings, escalation_rules_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                </label>
              </div>
            </div>
          )}

          {/* Notification Rules Tab */}
          {activeTab === "notifications" && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Notification Rules & Warnings</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Project RED Alerts</p>
                    <p className="text-[11px] text-slate-500">Trigger in-app notification drawer alerts when a project transitions into the Red health band.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.project_red_alerts_enabled}
                      onChange={(e) => setSettings({ ...settings, project_red_alerts_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Business Unit Risk Alerts</p>
                    <p className="text-[11px] text-slate-500">Trigger notifications to Delivery Heads if the average BU health score drops by over 10 points.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.bu_risk_alerts_enabled}
                      onChange={(e) => setSettings({ ...settings, bu_risk_alerts_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800">Approval Reminders</p>
                    <p className="text-[11px] text-slate-500">Send automatic visual warnings to Delivery Heads when submissions approach the review SLA boundary.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.approval_reminders_enabled}
                      onChange={(e) => setSettings({ ...settings, approval_reminders_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-800"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          {activeTab !== "metrics" && activeTab !== "audit" && (
            <div className="flex justify-end p-4 bg-slate-50 rounded-lg border border-slate-200">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? "Saving Changes..." : "Save Configuration"}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Metric Catalog Tab */}
      {activeTab === "metrics" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Metric Catalog & Weight Parameters</h2>
            <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 border border-slate-200">
              Total Catalog Items: {metrics.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.id}
                className={`flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-xl border transition-all duration-300 ${
                  metric.is_active
                    ? "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                    : "border-slate-100 bg-slate-50/50 opacity-60"
                }`}
              >
                <div className="space-y-1 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">{metric.code}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600 font-bold uppercase tracking-wide border border-slate-200">{metric.dimension}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">{metric.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{metric.description || "No description provided."}</p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6 shrink-0 w-full md:w-auto">
                  {/* Weight Slider */}
                  <div className="flex flex-col gap-1 w-full md:w-44">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">Governance Weight</span>
                      <span className="text-xs font-extrabold text-slate-800">{parseFloat(metric.weight.toString()).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      disabled={!metric.is_active}
                      value={metric.weight}
                      onChange={(e) => handleMetricWeightChange(metric.id, parseFloat(e.target.value))}
                      className="h-1.5 w-full bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Active Switch */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 md:hidden">Metric Active Status</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={metric.is_active}
                        onChange={() => handleMetricToggle(metric.id, metric.is_active)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-slate-800 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Org Setup Tab — BU Creation */}
      {activeTab === "setup" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Business Units</h2>
              <p className="text-xs text-slate-500 mt-0.5">Platform Admin creates and manages all Business Units.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBuForm({ code: "", name: "", description: "", is_active: true });
                setEditBuId(null);
                setBuModalOpen(true);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              + Create BU
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bus.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No business units yet. Click "Create BU" to add one.</td></tr>
                ) : bus.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{b.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{b.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{b.description || "--"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${b.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setBuForm({ code: b.code, name: b.name, description: b.description || "", is_active: b.is_active });
                          setEditBuId(b.id);
                          setBuModalOpen(true);
                        }}
                        className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BU Modal */}
      {buModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">{editBuId ? "Edit" : "Create"} Business Unit</h3>
              <button type="button" onClick={() => { setBuModalOpen(false); setEditBuId(null); }}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 cursor-pointer">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleBuSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">BU Code *</label>
                <input type="text" required disabled={!!editBuId}
                  placeholder="E.g. BFSI"
                  value={buForm.code}
                  onChange={e => setBuForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">BU Name *</label>
                <input type="text" required
                  placeholder="E.g. Banking & Financial Services"
                  value={buForm.name}
                  onChange={e => setBuForm(f => ({ ...f, name: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  placeholder="Optional..."
                  value={buForm.description}
                  onChange={e => setBuForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Assign BU Head</label>
                <select
                  value={buForm.bu_head_user_id}
                  onChange={e => setBuForm(f => ({ ...f, bu_head_user_id: e.target.value }))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="">-- No BU Head assigned --</option>
                  {buHeadUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                  ))}
                </select>
                {buHeadUsers.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-0.5">
                    No BU Head users found. Create a user with role BU_HEAD in User Directory first.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="bu_active" checked={buForm.is_active}
                  onChange={e => setBuForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300" />
                <label htmlFor="bu_active" className="text-xs font-semibold text-slate-700">Active</label>
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="submit"
                  className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer">
                  {editBuId ? "Update BU" : "Create BU"}
                </button>
                <button type="button" onClick={() => { setBuModalOpen(false); setEditBuId(null); }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Governance Periods Tab */}
      {activeTab === "periods" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">Governance Periods</h2>
              <p className="text-xs text-slate-500">Create and manage weekly or monthly reporting cycles. PMs select a period when creating a submission.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPeriodForm({ name: "", period_type: "MONTHLY", period_start: "", period_end: "", is_active: true });
                setPeriodModalOpen(true);
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow cursor-pointer shrink-0"
            >
              + New Period
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Period Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {govPeriods.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        p.period_type === "WEEKLY"
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}>
                        {p.period_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.period_start}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.period_end}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        p.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {govPeriods.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No governance periods yet. Create one to allow PMs to submit reports.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Governance Period Modal */}
      {periodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Governance Period</h3>
              <button
                type="button"
                onClick={() => setPeriodModalOpen(false)}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePeriodSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Period Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Monthly June 2026"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Period Type</label>
                <select
                  value={periodForm.period_type}
                  onChange={(e) => setPeriodForm({ ...periodForm, period_type: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Start Date</label>
                  <input
                    type="date"
                    required
                    value={periodForm.period_start}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_start: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">End Date</label>
                  <input
                    type="date"
                    required
                    value={periodForm.period_end}
                    onChange={(e) => setPeriodForm({ ...periodForm, period_end: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="period_is_active"
                  checked={periodForm.is_active}
                  onChange={(e) => setPeriodForm({ ...periodForm, is_active: e.target.checked })}
                  className="h-4 w-4 bg-white border-slate-300 rounded text-slate-800 focus:ring-slate-400 cursor-pointer"
                />
                <label htmlFor="period_is_active" className="text-sm text-slate-700 select-none cursor-pointer">
                  Active (visible to PMs when creating submissions)
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPeriodModalOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Create Period
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Directory Tab */}
      {activeTab === "users" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">User Accounts Directory</h2>
              <p className="text-xs text-slate-500">Manage central IT credentials, system roles, and login statuses.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <input
                type="text"
                placeholder="Search name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-44 md:w-60"
              />
              <button
                type="button"
                onClick={() => {
                  setEditUser(null);
                  setUserForm({ email: "", full_name: "", password: "", role_code: "PM", is_active: true });
                  setUserModalOpen(true);
                }}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow cursor-pointer"
              >
                Provision User
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Role Designation</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Login</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users
                  .filter(
                    (u) =>
                      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(userSearch.toLowerCase())
                  )
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{u.full_name}</p>
                        <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                            u.role_code === "PLATFORM_ADMIN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : u.role_code === "CEO"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : u.role_code === "BU_HEAD"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {u.role_code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${
                            u.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditUser(u);
                            setUserForm({
                              email: u.email,
                              full_name: u.full_name,
                              password: "",
                              role_code: u.role_code,
                              is_active: u.is_active,
                            });
                            setUserModalOpen(true);
                          }}
                          className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUserDelete(u.id)}
                          className="rounded px-2.5 py-1 text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100/75 border border-rose-200 transition-colors shadow-sm cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No user accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provision / Edit User Modal */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editUser ? "Edit User Profile" : "Provision New Account"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setUserModalOpen(false);
                  setEditUser(null);
                }}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Sarah Jenkins"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="E.g. sarah@deliverypulse.ai"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {!editUser && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Account Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-700">System Role Code</label>
                <select
                  value={userForm.role_code}
                  onChange={(e) => setUserForm({ ...userForm, role_code: e.target.value })}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value="CEO">CEO (Organisation-wide read-only)</option>
                  <option value="BU_HEAD">BU_HEAD (Business Unit Head)</option>
                  <option value="PM">PM (Project Manager)</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="user_is_active"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                  className="h-4 w-4 bg-white border-slate-300 rounded text-slate-800 focus:ring-slate-400 cursor-pointer"
                />
                <label htmlFor="user_is_active" className="text-sm text-slate-700 select-none cursor-pointer">
                  Account Active / Enabled
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setUserModalOpen(false);
                    setEditUser(null);
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {editUser ? "Save Profile" : "Provision Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* System Audits Tab */}
      {activeTab === "audit" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Security & Change Audit Timeline</h2>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Performed By</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Event Action</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No audit events logged yet.</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800">{log.performer?.full_name || "System"}</p>
                          <p className="text-xs text-slate-500">{log.performer?.email || "automated"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 border border-slate-200 uppercase font-semibold">
                            {log.entity_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {log.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            {expandedLog === log.id ? "Hide Delta" : "View Delta"}
                          </button>
                        </td>
                      </tr>
                      {expandedLog === log.id && (
                        <tr>
                          <td colSpan={5} className="bg-slate-50/70 p-4 border-t border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Before Change</p>
                                <pre className="rounded-lg bg-white p-3 text-xs font-mono text-slate-700 border border-slate-200 overflow-auto max-h-40 shadow-inner">
                                  {JSON.stringify(log.old_value, null, 2)}
                                </pre>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">After Change (Delta)</p>
                                <pre className="rounded-lg bg-white p-3 text-xs font-mono text-slate-700 border border-slate-200 overflow-auto max-h-40 shadow-inner">
                                  {JSON.stringify(log.new_value, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {auditLogs.length > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Showing page {auditPage}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="rounded px-3 py-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-200 disabled:opacity-40 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={auditLogs.length < 10}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="rounded px-3 py-1.5 text-xs font-bold bg-white text-slate-800 border border-slate-200 disabled:opacity-40 transition-all hover:bg-slate-50 cursor-pointer"
                >
                  Next Page
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
