"use client";

import { useEffect, useRef } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useThemeSafe } from "@/components/theme-provider";
import { ChartBlock } from "./chart-block";
import { TableBlock } from "./table-block";
import { FormBlock } from "./form-block";
import { DashboardBlock } from "./dashboard-block";
import { KanbanBlock } from "./kanban-block";
import { ConfigBlock } from "./config-block";
import { CodeBlock } from "./code-block";
import { SelectorBlock } from "./selector-block";
import { SliderBlock } from "./slider-block";

function ActionApplier({ result, theme }: { result: Record<string, any>; theme: NonNullable<ReturnType<typeof useThemeSafe>> }) {
  const applied = useRef(false);
  const { setDark, setFontSize, setFontFamily, setAccentColor } = theme;

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    try {
      switch (result.action) {
        case "set_theme":
          setDark(result.mode === "dark");
          break;
        case "set_font_size":
          setFontSize(result.size);
          break;
        case "set_font":
          setFontFamily(result.family);
          break;
        case "set_accent_color":
          setAccentColor(result.color);
          break;
      }
    } catch {}
  }, [result, setDark, setFontSize, setFontFamily, setAccentColor]);

  const labels: Record<string, string> = {
    set_theme: result.mode === "dark" ? "Modo oscuro activado" : "Modo claro activado",
    set_font_size: `Tamaño de fuente: ${result.size}px`,
    set_font: `Fuente cambiada`,
    set_accent_color: `Color de acento cambiado`,
  };

  return (
    <div className="my-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
      <span className="text-primary">✓</span>
      <span>{labels[result.action] || "Acción ejecutada"}</span>
    </div>
  );
}

function LoadingIndicator({ toolName }: { toolName: string }) {
  const labels: Record<string, string> = {
    set_theme: "tema",
    set_font_size: "tamaño de fuente",
    set_font: "tipografía",
    set_accent_color: "color de acento",
    render_chart: "gráfico",
    render_table: "tabla",
    render_form: "formulario",
    render_dashboard: "dashboard",
    render_kanban: "tablero kanban",
    render_config: "panel de config",
    render_code: "bloque de código",
    render_selector: "selector",
    render_slider: "slider",
  };
  const label = labels[toolName] || toolName;

  return (
    <div className="my-3 flex items-center gap-2.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
      <span>
        {toolName.startsWith("set_") ? (
          <>Aplicando <span className="font-medium text-foreground">{label}</span>...</>
        ) : (
          <>Generando <span className="font-medium text-foreground">{label}</span>...</>
        )}
      </span>
    </div>
  );
}

interface ToolInvocation {
  toolName: string;
  args: Record<string, any>;
  state: "call" | "result" | "error";
  result?: any;
}

interface ToolRendererProps {
  toolInvocation: ToolInvocation;
}

export function ToolRenderer({ toolInvocation }: ToolRendererProps) {
  const { toolName, args, state, result } = toolInvocation;
  const theme = useThemeSafe();

  if (state === "call") {
    return <LoadingIndicator toolName={toolName} />;
  }

  if (state === "error") {
    return (
      <div className="my-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive flex items-center gap-2">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Error al ejecutar la herramienta. Intenta de nuevo.</span>
      </div>
    );
  }

  // Handle action tools - apply via useEffect, not during render
  if (state === "result" && result?.action) {
    if (!theme) return null;
    return <ActionApplier result={result} theme={theme} />;
  }

  // Action tools don't render UI components
  if (toolName.startsWith("set_")) return null;

  const data = args;

  switch (toolName) {
    case "render_chart":
      return <ChartBlock type={data.type} title={data.title} data={data.data} />;
    case "render_table":
      return (
        <TableBlock
          title={data.title}
          columns={data.columns}
          rows={data.rows}
          searchable={data.searchable}
          sortable={data.sortable}
        />
      );
    case "render_form":
      return (
        <FormBlock
          title={data.title}
          description={data.description}
          fields={data.fields}
          submitLabel={data.submitLabel}
        />
      );
    case "render_dashboard":
      return (
        <DashboardBlock
          title={data.title}
          kpis={data.kpis}
          charts={data.charts}
          tables={data.tables}
        />
      );
    case "render_kanban":
      return <KanbanBlock title={data.title} columns={data.columns} />;
    case "render_config":
      return (
        <ConfigBlock
          title={data.title}
          description={data.description}
          items={data.items}
        />
      );
    case "render_code":
      return (
        <CodeBlock
          language={data.language}
          filename={data.filename}
          code={data.code}
        />
      );
    case "render_selector":
      return (
        <SelectorBlock
          title={data.title}
          description={data.description}
          options={data.options}
          multiSelect={data.multiSelect}
        />
      );
    case "render_slider":
      return (
        <SliderBlock
          label={data.label}
          min={data.min}
          max={data.max}
          step={data.step}
          defaultValue={data.defaultValue}
          unit={data.unit}
        />
      );
    default:
      return null;
  }
}
