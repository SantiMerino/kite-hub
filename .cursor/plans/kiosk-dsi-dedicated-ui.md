# Kiosk DSI — UI dedicada (clon focused-mode)

## Overview

Nueva ruta **`/kiosk/dsi`** exclusiva para la Raspberry Pi con 5" DSI display.
La ruta original **`/kiosk`** queda intacta (no se rompe nada).

Cambios respecto al original:

- Sin **enlace "Staff"** ni `ThemeToggle` en el header (kiosk físico bloqueado).
- Sin **botón de cámara** ni `QRCameraModal` (el hardware no tiene módulo de cámara).
- Tipografía **claramente más grande** (`clamp` 1.6–3rem en títulos).
- **Focused mode**: se muestra sólo el paso activo, no los dos apilados. El paso
  completado se promueve al header como pill informativo (`✓ MAR_001`).
- Reusa **`OnScreenKeyboard`** y los endpoints `/api/kiosk/tool-preview` /
  `/api/kiosk/loan-or-return` exactamente igual que el componente original.
- Misma máquina de estados: `idle → tool_scanned → loading → result`.

## Layout objetivo (800×480 landscape)

```
┌──────────────────────────────────────────────────────────┐
│ 🧪 Kite Hub                              ✓ MAR_001        │  header 40-44px
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Listo para préstamo                                   │  status pill 48px (sólo step 2)
│                                                          │
│  💳  Paso 2 · Carné                                       │  título 56-64px
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Esperando lector USB…                             │ │  wedge 84-96px (dashed violet)
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ─── o escribe manualmente ───                           │
│                                                          │
│  [KEY_000000              ] [OK]   [Cancelar]            │  56px row
└──────────────────────────────────────────────────────────┘
```

Resultados y loading: tarjeta grande full-area, icono 80px+, botón `Nueva operación`
ancho de 64px de alto.

## Decisiones

- **Por qué clon y no responsive**: la UX cambia de "dos pasos apilados con
  detalles colapsables" a "un paso a la vez con todo grande". Reescribir
  condicionales dentro de `KioskScanner.tsx` lo convierte en un componente con
  dos vidas que se pelean. Un archivo separado deja al original 100% intocable.
- **Por qué reusar `OnScreenKeyboard`**: ya es genérico y agnóstico de layout.
- **Sin theme toggle**: el kiosko corre headless; el tema se fija a nivel SO.
- **Sin cambios en API ni middleware**: la ruta `/kiosk/dsi` queda pública igual
  que `/kiosk` (no hay middleware que filtre paths de kiosk).
- **Wedge USB sigue siendo el input primario**: se renderiza grande y centrado;
  los inputs manuales son fallback compacto con el teclado en pantalla.

## File change summary

| Archivo                                                    | Acción  | Estado |
| ---------------------------------------------------------- | ------- | ------ |
| `.cursor/plans/kiosk-dsi-dedicated-ui.md`                  | Create  | ✅     |
| `src/components/kiosk/KioskScannerDSI.tsx`                 | Create  | ✅     |
| `src/app/kiosk/dsi/page.tsx`                               | Create  | ✅     |

Sin modificaciones en:
- `src/components/kiosk/KioskScanner.tsx`
- `src/components/kiosk/OnScreenKeyboard.tsx`
- `src/components/kiosk/QRCameraModal.tsx`
- `src/app/kiosk/page.tsx`
- `src/app/globals.css`
