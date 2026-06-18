import React, { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext";
import {
  getSetupUsers,
  getSetupBusinessUnits,
  createBusinessUnit,
  updateBusinessUnit,
  getSetupAccounts,
  createAccount,
  updateAccount,
  getSetupProjects,
  createProjectShell,
  updateProjectShell,
} from "../../services/customerAdminSetupService";
import type { SetupUser, SetupBusinessUnit, SetupAccount, SetupProject } from "../../types/customerAdminSetup";

type Tab = "bus" | "accounts" | "projects" | "assignments";

export function CustomerAdminSetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>("bus");
  const [users, setUsers] = useState<SetupUser[]>([]);
  const [bus, setBus] = useState<SetupBusinessUnit[]>([]);
  const [accounts, setAccounts] = useState<SetupAccount[]>([]);
  const [projects, setProjects] = useState<SetupProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<"bu" | "account" | "project" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Form states
  const [buForm, setBuForm] = useState({ code: "", name: "", description: "", delivery_head_user_id: "", is_active: true });
  const [accountForm, setAccountForm] = useState({ business_unit_id: "", code: "", name: "", is_active: true });
  const [projectForm, setProjectForm] = useState({ account_id: "", project_code: "", project_name: "", project_manager_id: "", description: "", start_date: "", target_end_date: "", status: "ACTIVE" });

  const toast = useToast();

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [usersData, busData, accountsData, projectsData] = await Promise.all([
        getSetupUsers(),
        getSetupBusinessUnits(),
        getSetupAccounts(),
        getSetupProjects(),
      ]);
      setUsers(usersData);
      setBus(busData);
      setAccounts(accountsData);
      setProjects(projectsData);
    } catch (err) {
      toast.error("Failed to load organization data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [toast]);

  const dhs = users.filter((u) => u.role_code === "DELIVERY_HEAD");
  const pms = users.filter((u) => u.role_code === "PM");
  const assignedDhIds = bus
    .filter((b) => b.id !== editId && b.is_active)
    .map((b) => b.delivery_head_user_id)
    .filter(Boolean);
  const availableDhs = dhs.filter((d) => !assignedDhIds.includes(d.id));

  // BU submit
  const handleBuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateBusinessUnit(editId, {
          name: buForm.name,
          description: buForm.description,
          delivery_head_user_id: buForm.delivery_head_user_id || null,
          is_active: buForm.is_active,
        });
        toast.success("Business Unit updated successfully");
      } else {
        await createBusinessUnit({
          ...buForm,
          delivery_head_user_id: buForm.delivery_head_user_id || null,
        });
        toast.success("Business Unit created successfully");
      }
      setModalOpen(null);
      setEditId(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save Business Unit");
    }
  };

  // Account submit
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await updateAccount(editId, {
          name: accountForm.name,
          is_active: accountForm.is_active,
        });
        toast.success("Account updated successfully");
      } else {
        await createAccount(accountForm);
        toast.success("Account created successfully");
      }
      setModalOpen(null);
      setEditId(null);
      loadAllData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save Account");
    }
  };

  // Project submit
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend validation — catch common issues before hitting the API
    if (!projectForm.account_id) {
      toast.error("Please select an Account for the project.");
      return;
    }
    if (!projectForm.project_code.trim()) {
      toast.error("Project Code is required.");
      return;
    }
    if (!projectForm.project_name.trim()) {
      toast.error("Project Name is required.");
      return;
    }

    try {
      const payload = {
        ...projectForm,
        project_code: projectForm.project_code.trim().toUpperCase(),
        project_name: projectForm.project_name.trim(),
        project_manager_id: projectForm.project_manager_id || null,
        start_date: projectForm.start_date || null,
        target_end_date: projectForm.target_end_date || null,
      };
      if (editId) {
        await updateProjectShell(editId, {
          project_name: payload.project_name,
          project_manager_id: payload.project_manager_id,
          description: payload.description || null,
          start_date: payload.start_date,
          target_end_date: payload.target_end_date,
          status: payload.status,
        });
        toast.success("Project updated successfully");
      } else {
        await createProjectShell(payload);
        toast.success("Project created successfully");
      }
      setModalOpen(null);
      setEditId(null);
      loadAllData();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors come as an array
        toast.error(detail.map((d: any) => d.msg || JSON.stringify(d)).join("; "));
      } else if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error("Failed to save Project. Check all required fields.");
      }
      console.error("Project save error:", err.response?.data || err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-1/4 rounded bg-slate-200 animate-pulse" />
        <div className="h-12 w-full rounded bg-slate-200 animate-pulse" />
        <div className="h-64 rounded bg-slate-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Setup Workspace</h1>
          <p className="text-sm text-slate-500">Configure corporate structures, Business Units, Accounts, and Projects shells.</p>
        </div>
        
        {/* Quick Action Button */}
        {activeTab !== "assignments" && (
          <button
            onClick={() => {
              setEditId(null);
              if (activeTab === "bus") {
                setBuForm({ code: "", name: "", description: "", delivery_head_user_id: "", is_active: true });
                setModalOpen("bu");
              } else if (activeTab === "accounts") {
                setAccountForm({ business_unit_id: "", code: "", name: "", is_active: true });
                setModalOpen("account");
              } else if (activeTab === "projects") {
                setProjectForm({ account_id: "", project_code: "", project_name: "", project_manager_id: "", description: "", start_date: "", target_end_date: "", status: "ACTIVE" });
                setModalOpen("project");
              }
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow shrink-0 cursor-pointer"
          >
            {activeTab === "bus" ? "Create BU" : activeTab === "accounts" ? "Create Account" : "Create Project"}
          </button>
        )}
      </div>

      {/* Premium Light Tab Selector */}
      <div className="flex border border-slate-200 bg-slate-50 p-1.5 rounded-lg gap-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("bus")}
          className={`flex-1 rounded-md py-2 text-xs font-bold transition-all duration-200 ${
            activeTab === "bus"
              ? "bg-white text-slate-900 shadow border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          Business Units ({bus.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("accounts")}
          className={`flex-1 rounded-md py-2 text-xs font-bold transition-all duration-200 ${
            activeTab === "accounts"
              ? "bg-white text-slate-900 shadow border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          Accounts ({accounts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("projects")}
          className={`flex-1 rounded-md py-2 text-xs font-bold transition-all duration-200 ${
            activeTab === "projects"
              ? "bg-white text-slate-900 shadow border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          Project Shells ({projects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assignments")}
          className={`flex-1 rounded-md py-2 text-xs font-bold transition-all duration-200 ${
            activeTab === "assignments"
              ? "bg-white text-slate-900 shadow border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          Assignments Tree
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "bus" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Assigned Delivery Head</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bus.map((b) => {
                  const dh = dhs.find((d) => d.id === b.delivery_head_user_id);
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{b.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{b.name}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{dh ? dh.full_name : "Not Assigned"}</p>
                        <p className="text-[10px] text-slate-500">{dh ? dh.email : ""}</p>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-xs text-slate-500">{b.description || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          b.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {b.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setBuForm({ code: b.code, name: b.name, description: b.description || "", delivery_head_user_id: b.delivery_head_user_id || "", is_active: b.is_active });
                            setEditId(b.id);
                            setModalOpen("bu");
                          }}
                          className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "accounts" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Business Unit</th>
                  <th className="px-4 py-3">Delivery Head</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {accounts.map((a) => {
                  const bu = bus.find((b) => b.id === a.business_unit_id);
                  const dh = bu ? dhs.find((d) => d.id === bu.delivery_head_user_id) : null;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{a.code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{a.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{bu ? bu.name : "Unknown BU"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{dh ? dh.full_name : "Not Assigned"}</p>
                        <p className="text-[10px] text-slate-500">{dh ? dh.email : ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          a.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {a.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setAccountForm({
                              business_unit_id: a.business_unit_id,
                              code: a.code,
                              name: a.name,
                              is_active: a.is_active,
                            });
                            setEditId(a.id);
                            setModalOpen("account");
                          }}
                          className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "projects" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Project Name</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Project Manager</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Target End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {projects.map((p) => {
                  const pm = pms.find((u) => u.id === p.project_manager_id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-500">{p.project_code}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{p.project_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.account_name}</td>
                      <td className="px-4 py-3">
                        {pm ? (
                          <>
                            <p className="font-semibold text-slate-800 text-xs">{pm.full_name}</p>
                            <p className="text-[10px] text-slate-500">{pm.email}</p>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">⚠ Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.start_date || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.target_end_date || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setProjectForm({
                              account_id: p.account_id,
                              project_code: p.project_code,
                              project_name: p.project_name,
                              project_manager_id: p.project_manager_id || "",
                              description: p.description || "",
                              start_date: p.start_date || "",
                              target_end_date: p.target_end_date || "",
                              status: p.status,
                            });
                            setEditId(p.id);
                            setModalOpen("project");
                          }}
                          className="rounded px-2.5 py-1 text-xs font-bold bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 transition-colors shadow-sm cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No project shells created yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Assignments Tree Tab */}
      {activeTab === "assignments" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">Organizational Mapping</h2>
          <div className="space-y-6">
            {bus.map((bu) => {
              const buAccounts = accounts.filter((a) => a.business_unit_id === bu.id);
              const assignedDh = bu.delivery_head_user_id ? dhs.find((d) => d.id === bu.delivery_head_user_id) : null;
              
              return (
                <div key={bu.id} className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{bu.code}</span>
                      <h3 className="text-base font-bold text-slate-900">{bu.name}</h3>
                    </div>
                    {assignedDh ? (
                      <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                        Delivery Head: <span className="font-bold text-slate-800">{assignedDh.full_name}</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100/50 border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-400">
                        No Delivery Head assigned
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {buAccounts.map((a) => {
                      const accountProjects = projects.filter((p) => p.account_id === a.id);
                      return (
                        <div key={a.id} className="rounded-lg bg-white border border-slate-200 p-4 space-y-3 shadow-sm hover:border-slate-300 transition-all duration-200">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className="font-mono text-[10px] font-bold text-slate-400 uppercase">{a.code}</p>
                              <h4 className="text-sm font-bold text-slate-800">{a.name}</h4>
                            </div>
                            <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold border ${
                              a.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}>
                              {a.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="border-t border-slate-100 pt-2 space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Shells ({accountProjects.length})</p>
                            {accountProjects.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No project shells created</p>
                            ) : (
                              accountProjects.map((p) => (
                                <div key={p.id} className="flex justify-between items-center rounded bg-slate-50/50 border border-slate-200/50 p-2 text-xs hover:bg-slate-50 transition-colors">
                                  <div className="truncate pr-2">
                                    <p className="font-mono text-[9px] font-bold text-slate-400">{p.project_code}</p>
                                    <p className="font-semibold text-slate-800 truncate">{p.project_name}</p>
                                  </div>
                                  <span className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold border shrink-0 ${
                                    p.status === "ACTIVE"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}>
                                    {p.status}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {buAccounts.length === 0 && (
                      <p className="text-sm text-slate-400 italic py-4 col-span-3">No accounts created in this Business Unit yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editId ? "Update" : "Create"} {modalOpen === "bu" ? "Business Unit" : modalOpen === "account" ? "Account" : "Project"}
              </h3>
              <button
                onClick={() => {
                  setModalOpen(null);
                  setEditId(null);
                }}
                className="rounded p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* BU Form */}
            {modalOpen === "bu" && (
              <form onSubmit={handleBuSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">BU Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editId}
                    placeholder="E.g. BFSI"
                    value={buForm.code}
                    onChange={(e) => setBuForm({ ...buForm, code: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">BU Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Banking & Insurance Services"
                    value={buForm.name}
                    onChange={(e) => setBuForm({ ...buForm, name: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    placeholder="Optional details..."
                    value={buForm.description}
                    onChange={(e) => setBuForm({ ...buForm, description: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 h-20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Assigned Delivery Head</label>
                  <select
                    value={buForm.delivery_head_user_id || ""}
                    onChange={(e) => setBuForm({ ...buForm, delivery_head_user_id: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">Select Delivery Head...</option>
                    {availableDhs.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name} ({d.email})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="bu_is_active"
                    checked={buForm.is_active}
                    onChange={(e) => setBuForm({ ...buForm, is_active: e.target.checked })}
                    className="h-4 w-4 bg-white border-slate-300 rounded text-slate-800 focus:ring-slate-400 cursor-pointer"
                  />
                  <label htmlFor="bu_is_active" className="text-sm text-slate-700 select-none cursor-pointer">Business Unit Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(null);
                      setEditId(null);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {editId ? "Save Changes" : "Create BU"}
                  </button>
                </div>
              </form>
            )}

            {/* Account Form */}
            {modalOpen === "account" && (
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Business Unit</label>
                  <select
                    required
                    disabled={!!editId}
                    value={accountForm.business_unit_id}
                    onChange={(e) => setAccountForm({ ...accountForm, business_unit_id: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                  >
                    <option value="">Select Business Unit...</option>
                    {bus.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Account Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editId}
                    placeholder="E.g. CITIBANK"
                    value={accountForm.code}
                    onChange={(e) => setAccountForm({ ...accountForm, code: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Client Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Citibank Corp"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="acc_is_active"
                    checked={accountForm.is_active}
                    onChange={(e) => setAccountForm({ ...accountForm, is_active: e.target.checked })}
                    className="h-4 w-4 bg-white border-slate-300 rounded text-slate-800 focus:ring-slate-400 cursor-pointer"
                  />
                  <label htmlFor="acc_is_active" className="text-sm text-slate-700 select-none cursor-pointer">Account Active</label>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setModalOpen(null);
                      setEditId(null);
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {editId ? "Save Changes" : "Create Account"}
                  </button>
                </div>
              </form>
            )}

            {/* Project Form */}
            {modalOpen === "project" && (
              <form onSubmit={handleProjectSubmit} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Account <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    disabled={!!editId}
                    value={projectForm.account_id}
                    onChange={(e) => setProjectForm({ ...projectForm, account_id: e.target.value })}
                    className={`rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50 ${
                      !projectForm.account_id ? "border-red-300 bg-red-50" : "border-slate-300 bg-white"
                    }`}
                  >
                    <option value="">— Select an Account —</option>
                    {accounts.filter((a) => a.is_active).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {!projectForm.account_id && (
                    <p className="text-[10px] text-red-500">Account is required</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Project Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editId}
                    placeholder="E.g. PRJ003 (must be unique within the account)"
                    value={projectForm.project_code}
                    onChange={(e) => setProjectForm({ ...projectForm, project_code: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-400">Must be unique within the selected account. Will be converted to UPPERCASE.</p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="E.g. Nexus Core Payment System"
                    value={projectForm.project_name}
                    onChange={(e) => setProjectForm({ ...projectForm, project_name: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Assign Project Manager</label>
                  <select
                    value={projectForm.project_manager_id}
                    onChange={(e) => setProjectForm({ ...projectForm, project_manager_id: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="">Unassigned (Optional)</option>
                    {pms.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.full_name} ({pm.email})</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500">Assigned PM gains exclusive metric submission authority.</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-700">Target End Date</label>
                    <input
                      type="date"
                      value={projectForm.target_end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, target_end_date: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    placeholder="Scope, objectives, and deliverables..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 h-16"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-700">Project Status</label>
                  <select
                    value={projectForm.status}
                    onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => { setModalOpen(null); setEditId(null); }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!editId && (!projectForm.account_id || !projectForm.project_code.trim() || !projectForm.project_name.trim())}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editId ? "Save Changes" : "Create Project"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
