"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBlock } from "./chart-block";
import { TableBlock } from "./table-block";

interface KPI {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
}

interface DashboardChart {
  type: "bar" | "line" | "pie" | "area";
  title: string;
  data: { name: string; value: number }[];
}

interface DashboardTable {
  title: string;
  columns: { key: string; label: string; type: "text" | "number" | "badge" | "date" }[];
  rows: Record<string, any>[];
  searchable?: boolean;
  sortable?: boolean;
}

interface DashboardBlockProps {
  title: string;
  kpis?: KPI[];
  charts?: DashboardChart[];
  tables?: DashboardTable[];
}

export function DashboardBlock({ title, kpis, charts, tables }: DashboardBlockProps) {

  const trendColor = (trend?: string) => {
    switch (trend) {
      case "up": return "text-emerald-500";
      case "down": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const trendIcon = (trend?: string) => {
    switch (trend) {
      case "up": return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="my-3 space-y-3">
      {kpis && kpis.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {kpis.map((kpi, i) => (
                <div
                  key={i}
                  className="space-y-1 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <div className="flex items-baseline justify-between">
                    <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                    {kpi.trend && (
                      <div className={`flex items-center gap-1 text-xs ${trendColor(kpi.trend)}`}>
                        {trendIcon(kpi.trend)}
                        <span>{kpi.change}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {charts && charts.map((chart, i) => (
        <ChartBlock key={`chart-${i}-${chart.title}`} type={chart.type} title={chart.title} data={chart.data} />
      ))}

      {tables && tables.map((table, i) => (
        <TableBlock
          key={`table-${i}-${table.title}`}
          title={table.title}
          columns={table.columns}
          rows={table.rows}
          searchable={table.searchable}
          sortable={table.sortable}
        />
      ))}
    </div>
  );
}
