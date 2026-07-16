# Análisis de Posibles Crashes - ToolVox

## Estado actual

Se corrigieron los 3 problemas de mayor severidad en el commit `a101500`. Los 3 restantes son de severidad media/baja y no causan crashes directos.

---

## Problemas corregidos

### 1. ✅ `useTheme` crash en ToolRenderer — CORREGIDO

**Archivo:** `src/components/tools/tool-renderer.tsx`

Se agregó `useThemeSafe()` en `theme-provider.tsx:146-148` que retorna `null` en vez de throw. ToolRenderer lo usa con null check:

```tsx
const theme = useThemeSafe();
// ...
if (!theme) return null;  // línea 118
```

---

### 2. ✅ Key con `dark` remonta Recharts — CORREGIDO

**Archivo:** `src/components/tools/dashboard-block.tsx:86,91`

Keys cambiadas de `dark ? "d" : "l"` a `chart.title` / `table.title`:

```tsx
<ChartBlock key={`chart-${i}-${chart.title}`} ... />
<TableBlock key={`table-${i}-${table.title}`} ... />
```

---

### 3. ✅ Race condition en ActionApplier — CORREGIDO

**Archivo:** `src/components/tools/tool-renderer.tsx:16-39`

Ahora usa `useRef` para prevenir doble ejecución y `useEffect` para ejecutar fuera del render:

```tsx
const applied = useRef(false);
useEffect(() => {
  if (applied.current) return;
  applied.current = true;
  // ... apply theme changes
}, [result, setDark, setFontSize, setFontFamily, setAccentColor]);
```

---

## Problemas pendientes (severidad media/baja)

### 4. `persistMessages` guarda tool parts en IndexedDB (Severidad: Media)

**Archivo:** `src/components/chat/chat-panel.tsx:67-83` y `130-145`

Guarda `msg.parts` completas (tool invocations con input/output). Al cargar un chat viejo en `loadChat`, se pasan a `setMessages`:

```tsx
const uiMessages = storedMessages.map((m) => ({
  id: m.id,
  role: m.role,
  content: m.content,
  parts: m.parts,  // tool parts con datos potencialmente serializados incorrectamente
}));
setMessages(uiMessages as any);
```

Si las tool parts contienen datos que el AI SDK no puede deserializar, puede causar crash al reabrir un chat viejo.

**Fix sugerido:** No guardar `parts` en IndexedDB, o filtrar solo las partes de texto al cargar.

---

### 5. `normalizeMessages` descarta tool results (Severidad: Baja)

**Archivo:** `src/app/api/chat/route.ts:5-16`

Solo extrae texto de los messages, descartando tool results:

```tsx
const text = m.parts
  .filter((p: any) => p.type === "text")
  .map((p: any) => p.text)
  .join("");
```

En conversaciones largas, la IA puede perder contexto sobre qué tools ya ejecutó. No causa crash, pero afecta la calidad de la IA.

**Fix sugerido:** Mantener un resumen de tool results en el message content.

---

### 6. `useChat` con `id` dinámico (Severidad: Baja)

**Archivo:** `src/components/chat/chat-panel.tsx:39-41`

```tsx
const { messages, sendMessage, status, setMessages } = useChat({
  id: activeChatId || chatId,
});
```

Cuando se carga un chat viejo, `activeChatId` cambia y `useChat` recibe un nuevo `id`. Si hay un stream en progreso, puede causar conflicto de estado. En la práctica es difícil de triggerear.

---

## Resumen

| # | Problema | Severidad | Estado |
|---|---------|-----------|:------:|
| 1 | `useTheme` crash en ToolRenderer | **Alta** | ✅ |
| 2 | Key con `dark` remonta Recharts | **Alta** | ✅ |
| 3 | Race condition en ActionApplier | **Media** | ✅ |
| 4 | Tool parts en IndexedDB | **Media** | ❌ |
| 5 | normalizeMessages pierde contexto | **Baja** | ❌ |
| 6 | Race condition en useChat | **Baja** | ❌ |
