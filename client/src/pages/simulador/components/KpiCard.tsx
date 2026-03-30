import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function KpiCard({
  title, value, icon: Icon, borderColor, subtitle,
}: {
  title: string; value: number; icon: React.ElementType;
  borderColor: string; subtitle?: string;
}) {
  return (
    <Card className="bg-white shadow-sm rounded-xl border-0 border-l-4 flex-1 min-w-[160px]"
          style={{ borderLeftColor: borderColor }}>
      <CardContent className="p-4 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[#045ba3] uppercase tracking-wide truncate">{title}</p>
          <p className="text-2xl font-extrabold text-[#033e66] mt-0.5 leading-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#045ba3]/70 mt-0.5">{subtitle}</p>}
        </div>
        <div className="ml-3 p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${borderColor}18` }}>
          <Icon className="h-5 w-5" style={{ color: borderColor }} />
        </div>
      </CardContent>
    </Card>
  );
}
