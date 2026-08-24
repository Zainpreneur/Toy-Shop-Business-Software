export default function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning" | "success";
  icon?: string;
}) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-card-top">
        {icon && <span className="stat-icon">{icon}</span>}
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
