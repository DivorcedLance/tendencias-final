import { streamText, isStepCount } from "ai";
import { DEFAULT_MODEL } from "@/lib/ai/models";
import { tools } from "@/lib/ai/tools";

function normalizeMessages(msgs: any[]) {
  return msgs.map((m) => {
    if (m.parts && Array.isArray(m.parts)) {
      const text = m.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("");
      return { role: m.role, content: text };
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
