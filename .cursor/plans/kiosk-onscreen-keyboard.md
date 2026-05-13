# Kiosk – Teclado virtual en-app (DSI 5")

## Scope

El kiosko corre en una pantalla DSI de 5" (800×480 / 720×1280) sobre Raspberry Pi.
En modo `--kiosk` de Chromium, `wvkbd-mobintl` reserva una *exclusive zone* en Wayland
y termina cortando el contenido del navegador. La solución más portable es **renderizar
el teclado dentro de la propia web app**, así no depende del compositor y se respeta el
diseño del sistema Kite Hub.

Alcance:

- Aplica **únicamente** a la ruta `/kiosk` (`src/app/kiosk/page.tsx`).
- Se activa **solo** al tocar los inputs *manuales* (`data-kiosk-manual`) — el input
  invisible que captura al lector USB (wedge) sigue intacto.
- Sin dependencia externa: `react-simple-keyboard` resolvería el caso, pero es excesivo
  para un alfabeto limitado (A-Z, 0-9, `_`) y traería su propio CSS. Usamos un
  componente propio con `Button`/tokens del design system.

## Restricciones de hardware (DSI 5")

- Resolución típica: **800×480** horizontal (también soporta 720×1280 vertical).
- Sin scroll: la página ya está fijada a `h-dvh overflow-hidden`.
- Tap targets ≥ 44px (WCAG 2.5.5 AAA recomendado).
- El teclado debe ocupar ~55–60% de la altura, dejando el header con el valor en
  curso visible (la “echo bar”) por si el input del paso queda debajo del overlay.

## Diseño del overlay

```
┌──────────────────────────────────────────┐
│ scrim (tap = cerrar)                     │
├──────────────────────────────────────────┤
│ HERRAMIENTA  MAR_001       [X]           │  ← echo bar (label + valor + cerrar)
├──────────────────────────────────────────┤
│ 1 2 3 4 5 6 7 8 9 0                      │
│ Q W E R T Y U I O P                      │
│ A S D F G H J K L _                      │
│ Z X C V B N M  ⌫    OK                   │  ← ⌫ x1col, OK x2col
└──────────────────────────────────────────┘
```

- Layout: `grid grid-cols-10` con 4 filas. La última fila reparte `7 + 1 + 2 = 10`.
- Teclas con `onPointerDown` + `preventDefault` para evitar perder el “foco”
  (en realidad el input no necesita foco — el valor es controlado).
- Sin shift / minúsculas / símbolos: los IDs Kite son `MAR_001`, `KEY_000000` —
  todo mayúsculas + dígitos + `_`.

## Integración en `KioskScanner.tsx`

1. Nuevo estado `kbTarget: "tool" | "card" | null`.
2. En cada input `data-kiosk-manual`:
   - `onPointerDown` → `e.preventDefault()` + `setKbTarget(...)` (impide foco
     nativo → no aparece teclado del SO ni `wvkbd`).
   - `onFocus` → blur defensivo + `setKbTarget(...)`.
3. `canWedgeCapture` también condicionado a `kbTarget === null` → mientras el
   teclado esté abierto, no se reenfoca el wedge.
4. El “OK” del overlay reutiliza `handleToolManual` / `handleCardManual`
   existentes y luego cierra el overlay.
5. Sin cambios en la ruta `page.tsx` ni en el modal de cámara.

## File change summary

| Archivo                                                | Acción  | Estado |
| ------------------------------------------------------ | ------- | ------ |
| `.cursor/plans/kiosk-onscreen-keyboard.md`             | Create  | ✅     |
| `src/components/kiosk/OnScreenKeyboard.tsx`            | Create  | ✅     |
| `src/components/kiosk/KioskScanner.tsx`                | Modify  | ✅     |
