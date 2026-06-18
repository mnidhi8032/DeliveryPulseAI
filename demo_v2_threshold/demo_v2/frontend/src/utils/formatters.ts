export function formatStatus(statusCode: string): string {
  switch (statusCode) {
    case "DRAFT":         return "Draft";
    case "SUBMITTED":     return "Submitted";
    case "UNDER_REVIEW":  return "Under Review";
    case "APPROVED":      return "Approved";
    case "REJECTED":      return "Rejected";
    case "REOPENED":      return "Reopened";
    case "LOCKED":        return "Locked";
    case "ACTIVE":        return "Active";
    case "ON_HOLD":       return "On Hold";
    case "COMPLETED":     return "Completed";
    case "CLOSED":        return "Closed";
    case "INACTIVE":      return "Inactive";
    default:              return statusCode.charAt(0) + statusCode.slice(1).toLowerCase().replace(/_/g, " ");
  }
}

export function getStatusBadgeClass(statusCode: string): string {
  switch (statusCode) {
    case "DRAFT":         return "bg-slate-100 text-slate-700 border border-slate-200";
    case "SUBMITTED":     return "bg-blue-50 text-blue-700 border border-blue-200";
    case "UNDER_REVIEW":  return "bg-amber-50 text-amber-700 border border-amber-200";
    case "APPROVED":
    case "ACTIVE":        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "REJECTED":      return "bg-rose-50 text-rose-700 border border-rose-200";
    case "REOPENED":      return "bg-violet-50 text-violet-700 border border-violet-200";
    case "LOCKED":        return "bg-purple-50 text-purple-700 border border-purple-200";
    case "ON_HOLD":       return "bg-orange-50 text-orange-700 border border-orange-200";
    case "COMPLETED":     return "bg-teal-50 text-teal-700 border border-teal-200";
    case "CLOSED":
    case "INACTIVE":      return "bg-slate-100 text-slate-500 border border-slate-200";
    default:              return "bg-slate-100 text-slate-700 border border-slate-200";
  }
}
