# KITE Lab System - TODO

## Fase 1: Base de Datos y Modelos
- [x] Diseñar esquema de base de datos completo
- [x] Crear tablas: herramientas, inventario, préstamos, usuarios, sanciones, bitácora
- [x] Generar y ejecutar migraciones SQL
- [x] Crear helpers de consulta en server/db.ts

## Fase 2: Autenticación y Autorización
- [x] Implementar roles (Estudiante/Encargado) en tabla de usuarios
- [x] Crear procedimiento protegido para Encargado
- [x] Implementar lógica de asignación de roles
- [x] Crear rutas protegidas por rol

## Fase 3: Módulo de Herramientas
- [x] CRUD de herramientas (crear, leer, actualizar, eliminar)
- [x] Generar identificadores únicos (MAR_001, etc)
- [x] Gestionar categorías, condición y ubicación
- [x] Crear UI para administración de herramientas

## Fase 4: Módulo de Inventario
- [x] Crear sistema de control de disponibilidad
- [x] Implementar estados (disponible, prestado, mantenimiento, extraviado)
- [x] Gestionar cantidades y ubicaciones
- [ ] Dashboard de inventario para encargados

## Fase 5: Módulo de Préstamos
- [x] Crear lógica de escaneo QR (herramienta + carné)
- [x] Registrar préstamos con fecha/hora
- [ ] Actualizar estado de herramienta a "prestado"
- [x] Crear UI de escaneo optimizada para estantes
- [x] Implementar feedback visual inmediato

## Fase 6: Módulo de Devoluciones
- [x] Implementar detección inteligente de devoluciones
- [x] Si herramienta está prestada → registrar devolución
- [x] Registrar condición al devolver
- [ ] Actualizar estado a "disponible"
- [x] Crear interfaz de devolución

## Fase 7: Sistema de Alertas y Sanciones
- [x] Crear tabla de sanciones configurables
- [x] Implementar cálculo automático de días de atraso
- [x] Generar alertas para encargados
- [x] Crear reglas de sanciones por historial
- [ ] Notificaciones automáticas

## Fase 8: Reportes y Bitácora
- [x] Crear tabla de auditoría completa
- [x] Implementar filtros por usuario, herramienta, fechas, estado
- [x] Generar reportes históricos
- [x] Crear UI de reportes para encargados

## Fase 9: Dashboard Administrativo
- [ ] Estadísticas de préstamos activos
- [ ] Herramientas más solicitadas
- [ ] Usuarios con atrasos
- [ ] Gráficos y visualizaciones
- [ ] Panel de control general

## Fase 10: Dashboard de Estudiante
- [ ] Mis préstamos activos
- [ ] Historial de préstamos
- [ ] Estado de mis sanciones
- [ ] Búsqueda de herramientas disponibles

## Fase 11: Diseño UI/UX Elegante
- [x] Definir paleta de colores profesional
- [ ] Crear componentes reutilizables
- [x] Diseñar interfaz de escaneo QR
- [x] Implementar responsive design
- [ ] Agregar animaciones suaves

## Fase 12: Testing y Validación
- [ ] Escribir tests para autenticación
- [ ] Tests para lógica de préstamos/devoluciones
- [ ] Tests para alertas y sanciones
- [ ] Validación de flujos de usuario

## Fase 13: Documentación y Entrega
- [ ] Documentar API y procedimientos
- [ ] Crear guía de usuario
- [ ] Preparar instrucciones de despliegue
- [ ] Entregar proyecto completo
