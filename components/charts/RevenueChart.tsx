"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatRupiah } from "@/lib/format";

type DataPoint = {
  name: string;
  pendapatan: number;
};

export default function RevenueChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="h-[310px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${Number(value) / 1000000}jt`} />
          <Tooltip formatter={(value) => formatRupiah(Number(value))} />
          <Bar dataKey="pendapatan" fill="#2563eb" radius={[12, 12, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
