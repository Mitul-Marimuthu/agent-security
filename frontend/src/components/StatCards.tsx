interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: "default" | "green" | "red" | "blue";
}

const colorMap = {
  default: "text-gray-900",
  green:   "text-green-600",
  red:     "text-red-600",
  blue:    "text-blue-600",
};

export function StatCard({ label, value, sub, color = "default" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">{children}</div>;
}
