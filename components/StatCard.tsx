import type { ElementType } from "react";
import clsx from "clsx";

const variants = {
  green: {
    line: "from-emerald-500 to-teal-400",
    icon: "bg-emerald-50 text-emerald-700"
  },
  blue: {
    line: "from-blue-500 to-cyan-400",
    icon: "bg-blue-50 text-blue-700"
  },
  purple: {
    line: "from-violet-500 to-fuchsia-400",
    icon: "bg-violet-50 text-violet-700"
  },
  orange: {
    line: "from-orange-500 to-rose-400",
    icon: "bg-orange-50 text-orange-700"
  },
  red: {
    line: "from-red-500 to-pink-400",
    icon: "bg-red-50 text-red-700"
  }
};

type Props = {
  title: string;
  value: string | number;
  caption?: string;
  trend?: string;
  icon: ElementType;
  color?: keyof typeof variants;
};

export default function StatCard({ title, value, caption, trend, icon: Icon, color = "blue" }: Props) {
  const variant = variants[color];
  const trendClass = trend?.startsWith("-")
    ? "bg-red-50 text-red-700"
    : trend === "0%"
      ? "bg-slate-100 text-slate-600"
      : "bg-emerald-50 text-emerald-700";

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className={clsx("absolute left-0 top-0 h-1 w-full bg-gradient-to-r", variant.line)} />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={clsx("flex h-12 w-12 items-center justify-center rounded-2xl", variant.icon)}>
          <Icon size={24} />
        </div>
        {trend && (
          <span className={clsx("rounded-xl px-2.5 py-1 text-xs font-bold", trendClass)}>{trend}</span>
        )}
      </div>
      <h3 className="break-words text-2xl font-extrabold text-slate-900">{value}</h3>
      <p className="mt-1 text-sm font-medium text-slate-500">{title}</p>
      {caption && <p className="mt-3 text-xs text-slate-400">{caption}</p>}
    </div>
  );
}
