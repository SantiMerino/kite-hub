# Raspberry Pi — Configuración Kiosko Kite Hub

## Scope

Configuración completa de la Raspberry Pi (`kite`, IP `10.74.11.168`) como terminal
kiosko para Kite Hub. Incluye: taskbar con teclado virtual, autostart de Chromium en
modo fullscreen, y atajos de teclado para mantenimiento con teclado físico.

---

## Información del sistema

| Campo | Valor |
|-------|-------|
| Host | `kite` |
| IP | `10.74.11.168` |
| Usuario | `testuser` |
| OS | Debian GNU/Linux (RPi aarch64) |
| Kernel | `6.18.29+rpt-rpi-v8` |
| Compositor Wayland | `labwc` |
| Panel | `wf-panel-pi 1.13` |
| Teclado virtual | `squeekboard 1.43.1` |
| Display | `DSI-1` |
| UID testuser | `1001` |

---

## Archivos de configuración

| Archivo | Propósito |
|---------|-----------|
| `~/.config/wf-panel-pi/wf-panel-pi.ini` | Configuración del panel (taskbar) |
| `~/.config/labwc/autostart` | Procesos que arrancan al iniciar sesión Wayland |
| `~/.config/labwc/rc.xml` | Atajos de teclado de labwc |

---

## 1. Panel (taskbar) — `wf-panel-pi`

### Contenido actual de `~/.config/wf-panel-pi/wf-panel-pi.ini`

```ini
[panel]
position=bottom
icon_size=32
window-list_max_width=200
monitor=DSI-1
launchers=x-www-browser pcmanfm x-terminal-emulator

widgets_right=tray power ejecter updater spacing2 connect spacing2 bluetooth spacing2 netman spacing2 volumepulse spacing2 clock spacing2 batt spacing2 squeek
```

> `squeek` al final de `widgets_right` es el icono del teclado virtual en la barra.
> Este valor proviene del default del sistema (`/usr/share/wf-panel-pi/metadata/panel-pi.xml`).

### Restaurar taskbar si desaparece

```bash
# Recuperar desde backup
cp ~/.config/wf-panel-pi/wf-panel-pi.ini.bak ~/.config/wf-panel-pi/wf-panel-pi.ini

# Reiniciar el panel
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) pkill -f wf-panel-pi
sleep 1
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) wf-panel-pi &
```

### Restaurar icono de teclado si desaparece de la taskbar

```bash
# Verificar que widgets_right tiene 'squeek'
grep widgets_right ~/.config/wf-panel-pi/wf-panel-pi.ini

# Si no está, agregarlo
echo "widgets_right=tray power ejecter updater spacing2 connect spacing2 bluetooth spacing2 netman spacing2 volumepulse spacing2 clock spacing2 batt spacing2 squeek" >> ~/.config/wf-panel-pi/wf-panel-pi.ini

# Reiniciar el panel
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) pkill -f wf-panel-pi
sleep 1
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) wf-panel-pi &
```

---

## 2. Autostart — `~/.config/labwc/autostart`

### Contenido completo

```bash
wf-panel-pi &
pcmanfm --desktop &
squeekboard &
sleep 3 && WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1001 chromium \
  --ozone-platform=wayland \
  --enable-features=VirtualKeyboard \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --start-fullscreen \
  --touch-events=enabled \
  "https://unscotched-kenley-nonvituperatively.ngrok-free.dev/kiosk/dsi" &
```

> Se usa `--start-fullscreen` (no `--kiosk`) para permitir salir con `F11`.
> `sleep 3` da tiempo al compositor y al panel de inicializarse antes de abrir Chromium.

### Modificar el autostart

```bash
# Backup antes de editar
cp ~/.config/labwc/autostart ~/.config/labwc/autostart.bak

# Editar con nano
nano ~/.config/labwc/autostart

# Restaurar backup si algo sale mal
cp ~/.config/labwc/autostart.bak ~/.config/labwc/autostart
```

### Reescribir el autostart completo desde cero

```bash
cp ~/.config/labwc/autostart ~/.config/labwc/autostart.bak
cat > ~/.config/labwc/autostart << 'EOF'
wf-panel-pi &
pcmanfm --desktop &
squeekboard &
sleep 3 && WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/1001 chromium \
  --ozone-platform=wayland \
  --enable-features=VirtualKeyboard \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --start-fullscreen \
  --touch-events=enabled \
  "https://unscotched-kenley-nonvituperatively.ngrok-free.dev/kiosk/dsi" &
EOF
cat ~/.config/labwc/autostart
```

### Cambiar la URL del kiosko

```bash
nano ~/.config/labwc/autostart
# Buscar la línea con la URL y reemplazarla
# Guardar: Ctrl+O, Enter, Ctrl+X
```

---

## 3. Atajos de teclado — `~/.config/labwc/rc.xml`

### Contenido de `rc.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<labwc_config>
  <keyboard>
    <keybind key="Super-q">
      <action name="Execute">
        <command>pkill -f chromium</command>
      </action>
    </keybind>
    <keybind key="Super-t">
      <action name="Execute">
        <command>x-terminal-emulator</command>
      </action>
    </keybind>
  </keyboard>
</labwc_config>
```

### Atajos disponibles con teclado físico conectado

| Atajo | Acción |
|-------|--------|
| `F11` | Salir / entrar pantalla completa en Chromium |
| `Super + Q` | Matar Chromium → queda visible la taskbar |
| `Super + T` | Abrir terminal para mantenimiento |

---

## 4. Diagnóstico rápido

### Ver si los procesos clave están corriendo

```bash
ps aux | grep -E 'wf-panel|squeek|chromium' | grep -v grep
```

### Ver errores del panel en tiempo real

```bash
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) wf-panel-pi 2>&1 | head -30
```

### Verificar que squeekboard está activo

```bash
ps aux | grep squeekboard | grep -v grep
```

### Lanzar squeekboard manualmente si no está corriendo

```bash
WAYLAND_DISPLAY=wayland-0 XDG_RUNTIME_DIR=/run/user/$(id -u) squeekboard &
```

### Matar Chromium manualmente (sin atajo de teclado)

```bash
pkill -f chromium
```

### Recargar labwc sin reboot (aplica cambios de rc.xml y autostart)

```bash
labwc --reconfigure
```

---

## 5. Recuperación de emergencia (reboot)

Si después de un reboot la Pi no muestra panel ni kiosko:

```bash
# Conectar por SSH
ssh testuser@10.74.11.168

# Restaurar autostart desde backup
cp ~/.config/labwc/autostart.bak ~/.config/labwc/autostart

# Restaurar panel desde backup
cp ~/.config/wf-panel-pi/wf-panel-pi.ini.bak ~/.config/wf-panel-pi/wf-panel-pi.ini

# Reiniciar la sesión gráfica
sudo reboot
```

---

## File change summary

| Archivo | Acción |
|---------|--------|
| `~/.config/wf-panel-pi/wf-panel-pi.ini` | Modify — agregar `widgets_right` con `squeek` |
| `~/.config/labwc/autostart` | Modify — agregar `squeekboard`, `wf-panel-pi`, Chromium |
| `~/.config/labwc/rc.xml` | Create — atajos `Super+Q` y `Super+T` |
