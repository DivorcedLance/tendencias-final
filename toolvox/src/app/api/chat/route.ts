import { streamText, isStepCount } from "ai";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { tools } from "@/lib/ai/tools";

function normalizeMessages(msgs: any[]) {
  return msgs.map((m) => {
    if (m.parts && Array.isArray(m.parts)) {
      const textParts = m.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");

      const toolParts = m.parts
        .filter((p: any) => p.type?.startsWith("tool-") && p.type !== "text")
        .map((p: any) => {
          const toolName = p.toolName || p.type?.replace("tool-", "") || "";
          if (p.state === "result" || p.state === "output-available") {
            return `[Herramienta ${toolName} ejecutada]`;
          }
          return `[Herramienta ${toolName} llamada]`;
        })
        .join(" ");

      const content = [textParts, toolParts].filter(Boolean).join(" ");
      return { role: m.role, content: content || "" };
    }
    return { role: m.role, content: m.content ?? "" };
  });
}

export async function POST(req: Request) {
  const { messages: incomingMessages, systemPrompt, model } = await req.json();

  const messages = normalizeMessages(incomingMessages);

  const result = streamText({
    model: DEFAULT_MODEL,
    system:
      systemPrompt ||
      "Eres un asistente inteligente que genera interfaces interactivas. Sé breve: máximo 1-2 oraciones antes de ejecutar una tool, nunca expliques con tablas o markdown extenso. Solo di qué vas a hacer y hazlo. Cuando el usuario pida algo que pueda representarse visualmente, usa las tools disponibles para renderizar componentes interactivos como charts, tablas, formularios, dashboards, kanban boards, configuraciones, o código. Responde siempre en español.",
    messages,
    tools,
    stopWhen: isStepCount(10),
  });

  return result.toUIMessageStreamResponse();
}
