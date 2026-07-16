# Análisis de Posibles Crashes - ToolVox

## Estado actual

Se modificaron los prompts para agregar una "REGLA DE CONCISIÓN" que limita las respuestas de la IA a máximo 1-2 oraciones antes de ejecutar tools. Esto reduce la frecuencia de crashes porque hay menos tool invocations por mensaje, pero **los bugs de código no se arreglaron**.

Archivos modificados:
- `src/app/api/chat/route.ts` — prompt del sistema agregado con regla de concisión
- `src/lib/constants.ts` — prompts de cada demo con regla de concisión

---

## Problemas identificados (sin corregir)

### 1. `useTheme` llamado incondicionalmente en `ToolRenderer` (Crash directo)

**Archivo:** `src/components/tools/tool-renderer.tsx:100`

`useTheme()` se llama sin importar el `state` del tool:

```tsx
export function ToolRenderer({ toolInvocation }: ToolRendererProps) {
  const { toolName, args, state, result } = toolInvocation;
  const theme = useTheme();  // <-- SIEMPRE se ejecuta
```

Si el `ThemeContext` no está disponible (por ejemplo, si un componente se renderiza fuera del `<ThemeProvider>`), esto lanza `throw new Error("useTheme must be used within ThemeProvider")` en `theme-provider.tsx:142`. Cualquier tool invocation que se renderice antes de que el provider monte causará crash.

---

### 2. `DashboardBlock` usa `dark` como key, causando remounts de Recharts (Performance freeze)

**Archivo:** `src/components/tools/dashboard-block.tsx:88-93`

```tsx
<ChartBlock key={`chart-${i}-${dark ? "d" : "l"}`} ... />
<TableBlock key={`table-${i}-${dark ? "d" : "l"}`} ... />
```

Cuando cambia el tema, **cada Chart y Table se desmonta y remonta**. Recharts usa `ResizeObserver` internamente. Si hay varios charts/tablas y el usuario cambia el tema rápidamente, se acumulan observers y re-renders pesados, lo que puede colgar el navegador.

---

### 3. Race condition en `ActionApplier` (Crash potencial)

**Archivo:** `src/components/tools/tool-renderer.tsx:16-38`

Cuando la IA ejecuta múltiples action tools simultáneamente (ej: `set_theme` + `set_accent_color`), el `ActionApplier` usa un `ref` para evitar doble ejecución, pero **no hay garantía de que `theme` (el objeto de contexto) sea estable**. Si el contexto se re-renderiza entre ejecuciones, `theme` puede apuntar a valores stale, causando comportamiento impredecible.

---

### 4. `persistMessages` guarda tool parts completas en IndexedDB (Crash al cargar chat antiguo)

**Archivo:** `src/components/chat/chat-panel.tsx:67-83` y `123-138`

Guarda `msg.parts` completas (que incluyen tool invocations con input/output). Al cargar un chat viejo en `loadChat`, se pasan estas partes a `setMessages`:

```tsx
const uiMessages = storedMessages.map((m) => ({
  id: m.id,
  role: m.role,
  content: m.content,
  parts: m.parts,  // <-- tool parts con datos potencialmente corruptos o circulares
}));
setMessages(uiMessages as any);
```

Si las tool parts contienen objetos con referencias circulares o datos que el AI SDK no puede deserializar correctamente, `setMessages` puede causar un crash silencioso o un loop de re-renders.

---

### 5. `normalizeMessages` descarta tool results, causando pérdida de contexto (Comportamiento errático)

**Archivo:** `src/app/api/chat/route.ts:5-16`

Solo extrae texto de los messages, descartando tool results:

```tsx
const text = m.parts
  .filter((p: any) => p.type === "text")
  .map((p: any) => p.text)
  .join("");
return { role: m.role, content: text };
```

Pero el AI SDK **envía todas las partes de los mensajes** al modelo (incluyendo tool invocations). Esto significa que en conversaciones largas, la IA puede perder contexto sobre qué tools ya ejecutó, intentar ejecutar la misma tool muchas veces, y crear un loop que sature el stream.

---

### 6. `useChat` con `id` dinámico + `setMessages` (Posible conflicto de estado)

**Archivo:** `src/components/chat/chat-panel.tsx:39-41`

```tsx
const { messages, sendMessage, status, setMessages } = useChat({
  id: activeChatId || chatId,
});
```

Cuando se carga un chat viejo (`loadChat`), se cambia `activeChatId` y se llama `setMessages`. Pero `useChat` mantiene su propio estado interno. Si el hook recibe un nuevo `id` mientras procesa un stream anterior, puede causar un **race condition** donde ambos streams intentan modificar el mismo estado.

---

## Resumen de prioridad

| # | Problema | Severidad | ¿Corregido? |
|---|---------|-----------|:-----------:|
| 1 | `useTheme` incondicional en ToolRenderer | **Alta** (crash directo) | ❌ |
| 2 | Key basada en `dark` remonta Recharts | **Alta** (freeze) | ❌ |
| 4 | Tool parts en IndexedDB causan crash al cargar | **Alta** (crash al reabrir chat) | ❌ |
| 6 | Race condition en `useChat` con `setMessages` | **Media** (estado corrupto) | ❌ |
| 3 | Race condition en ActionApplier | **Media** (comportamiento errático) | ❌ |
| 5 | normalizeMessages pierde contexto | **Baja** (IA se confunde) | ❌ |
