import { useEffect, useState } from "react";
import { getAuditTrail, AuditEvent } from "../services/auditService";

interface AuditTimelineSectionProps {
  submissionId: string;
}

export function AuditTimelineSection({ submissionId }: AuditTimelineSectionProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuditTrail() {
      if (!submissionId) return;
      try {
        setIsLoading(true);
        setError(null);
        const trail = await getAuditTrail("SUBMISSION", submissionId);
        // Sort newest events first for timeline view
        setEvents(trail.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err: any) {
        console.error("Failed to load audit trail:", err);
        setError("Unable to load audit history for this submission.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadAuditTrail();
  }, [submissionId]);

  // Helper to format metric and field keys to human-readable strings
  const formatFieldKey = (key: string): string => {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getEventBadgeClass = (eventType: string): string => {
    switch (eventType.toUpperCase()) {
      case "DRAFT_CREATED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "SUBMITTED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "APPROVED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "REOPENED":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOCKED":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "METRICS_UPDATED":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-sm text-slate-500 font-medium">Fetching audit trail...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-rose-50/50 border border-rose-100 text-rose-600 rounded-2xl text-sm">
        <p className="font-semibold mb-1">Audit Log Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <section className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Governance Audit Trail</h3>
          <p className="text-xs text-slate-500 mt-0.5">Immutable record of activity and metrics modifications</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-50 border border-slate-100 text-slate-600 rounded-full">
          {events.length} event{events.length !== 1 ? "s" : ""} logged
        </span>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">No audit history recorded for this submission yet.</p>
        </div>
      ) : (
        <div className="relative pl-6 border-l border-slate-100 ml-3 space-y-6">
          {events.map((event) => {
            const hasOldVal = event.old_value && Object.keys(event.old_value).length > 0;
            const hasNewVal = event.new_value && Object.keys(event.new_value).length > 0;

            return (
              <div key={event.id} className="relative group transition-all">
                {/* Timeline Dot Indicator */}
                <span className="absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white border-2 border-slate-200 group-hover:border-indigo-400 transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors" />
                </span>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full ${getEventBadgeClass(
                        event.event_type
                      )}`}
                    >
                      {event.event_type.replace("_", " ")}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      by {event.performed_by_name || "System"}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(event.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                {/* Event Delta Details */}
                {(hasOldVal || hasNewVal) && (
                  <div className="mt-2.5 p-3.5 bg-slate-50/55 rounded-xl border border-slate-100/50 space-y-2 text-xs">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Changed State Deltas</p>
                    <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                      {Object.keys(event.new_value || {}).map((key) => {
                        const oldVal = event.old_value ? event.old_value[key] : null;
                        const newVal = event.new_value ? event.new_value[key] : null;

                        return (
                          <div
                            key={key}
                            className="flex items-center gap-2 flex-wrap bg-white border border-slate-100 p-2 rounded-lg"
                          >
                            <span className="font-semibold text-slate-600">{formatFieldKey(key)}:</span>
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-500">
                              {oldVal !== null && oldVal !== undefined ? (
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded line-through text-[11px]">
                                  {typeof oldVal === "object" ? JSON.stringify(oldVal) : String(oldVal)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[11px] italic">none</span>
                              )}
                              <span className="text-slate-400">→</span>
                              <span className="bg-indigo-50 text-indigo-700 font-medium px-1.5 py-0.5 rounded text-[11px]">
                                {typeof newVal === "object" ? JSON.stringify(newVal) : String(newVal)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
