import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  gradient?: boolean;
  icon?: ReactNode;
}

export default function StatCard({ label, value, gradient, icon }: StatCardProps) {
  return (
    <div className="stat-card animate-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stat-label">{label}</div>
        {icon && <span style={{ opacity: 0.35 }}>{icon}</span>}
      </div>
      <div className={`stat-value ${gradient ? "gradient" : ""}`}>{value}</div>
    </div>
  );
}
