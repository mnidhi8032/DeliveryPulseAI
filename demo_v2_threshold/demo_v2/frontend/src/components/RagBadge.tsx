interface RagBadgeProps {
  rag: string;
  className?: string;
  showDot?: boolean;
}

const styles: Record<string, string> = {
  GREEN:    "bg-emerald-100 text-emerald-800 border-emerald-200",
  AMBER:    "bg-amber-100 text-amber-900 border-amber-200",
  RED:      "bg-red-100 text-red-800 border-red-200",
  CRITICAL: "bg-rose-200 text-rose-900 border-rose-400 font-bold",
};

const dotColors: Record<string, string> = {
  GREEN:    "bg-emerald-500",
  AMBER:    "bg-amber-500",
  RED:      "bg-red-500",
  CRITICAL: "bg-rose-700",
};

export function RagBadge({ rag, className = "", showDot = false }: RagBadgeProps) {
  const label = rag.charAt(0) + rag.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${
        styles[rag] ?? "bg-slate-100 text-slate-700 border-slate-200"
      } ${className}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[rag] ?? "bg-slate-400"}`} />
      )}
      {label}
    </span>
  );
}
