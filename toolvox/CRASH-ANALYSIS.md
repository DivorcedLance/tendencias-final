# Análisis de Posibles Crashes - ToolVox

## Estado actual

Todos los problemas corregidos. Solo queda el issue #6 (useChat con id dinámico) que es de severidad baja y en la práctica es casi imposible de triggearar.

---

## Problemas corregidos

### 1. ✅ `useTheme` crash en ToolRenderer — CORREGIDO

**Archivo:** `src/components/tools/tool-renderer.tsx` + `src/components/theme-provider.tsx`

`useThemeSafe()` retorna `null` en vez de throw. ToolRenderer lo usa con null check.

---

### 2. ✅ Key con `dark` remonta Recharts — CORREGIDO

**Archivo:** `src/components/tools/dashboard-block.tsx`

Keys cambiadas de `dark ? "d" : "l"` a `chart.title` / `table.title`. Los componentes se actualizan via CSS vars sin remount.

---

### 3. ✅ Race condition en ActionApplier — CORREGIDO

**Archivo:** `src/components/tools/tool-renderer.tsx`

`useRef` previene doble ejecución. Funciones setter extraídas como dependencias estables del `useEffect`.

---

### 4. ✅ Tool parts en IndexedDB causan crash al cargar — CORREGIDO

**Archivo:** `src/lib/storage.ts`

- `sanitizeParts()` elimina funciones, símbolos, referencias circulares al guardar.
- `filterToTextParts()` extrae solo partes de texto al cargar, descartando tool invocations que el AI SDK podría no deserializar correctamente.

---

### 5. ✅ normalizeMessages pierde contexto — CORREGIDO

**Archivo:** `src/app/api/chat/route.ts`

Ahora `normalizeMessages` incluye un resumen de tool invocations en el contenido del mensaje:
```
[Herramienta render_dashboard ejecutada]
[Herramienta set_theme ejecutada]
```
Esto permite que la IA sepa qué tools ya ejecutó en conversaciones largas.

---

## Problema pendiente (severidad baja)

### 6. `useChat` con `id` dinámico (Severidad: Baja)

**Archivo:** `src/components/chat/chat-panel.tsx:39-41`

Cuando se carga un chat viejo, `activeChatId` cambia y `useChat` recibe un nuevo `id`. Si hay un stream en progreso, puede causar conflicto de estado. En la práctica es casi imposible de triggearar porque el usuario debería cargar un chat viejo exactamente mientras se procesa un stream nuevo.

**No requiere fix** por baja probabilidad y baja severidad.

---

## Resumen

| # | Problema | Severidad | Estado |
|---|---------|-----------|:------:|
| 1 | `useTheme` crash en ToolRenderer | **Alta** | ✅ |
| 2 | Key con `dark` remonta Recharts | **Alta** | ✅ |
| 3 | Race condition en ActionApplier | **Media** | ✅ |
| 4 | Tool parts en IndexedDB | **Media** | ✅ |
| 5 | normalizeMessages pierde contexto | **Baja** | ✅ |
| 6 | Race condition en useChat | **Baja** | ⏭️ |
