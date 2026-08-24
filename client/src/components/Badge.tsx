export default function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}
