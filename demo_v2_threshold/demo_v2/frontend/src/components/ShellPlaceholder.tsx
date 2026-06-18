interface ShellPlaceholderProps {
  title: string;
  section?: string;
}

export function ShellPlaceholder({ title, section }: ShellPlaceholderProps) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {section && (
        <p className="mt-2 text-sm text-slate-600">
          {section} — content will be added in a later phase.
        </p>
      )}
      {!section && (
        <p className="mt-2 text-sm text-slate-600">
          Dashboard widgets will be added in a later phase.
        </p>
      )}
    </div>
  );
}
