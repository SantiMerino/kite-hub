# KITE Lab System - Sistema de Gestión de Préstamos de Herramientas

## Descripción General

El **KITE Lab System** es una aplicación web completa para la gestión eficiente de préstamos de herramientas en laboratorios académicos. El sistema permite registrar, controlar y auditar todos los préstamos mediante escaneo QR, con autenticación por roles, alertas automáticas de atrasos y sanciones configurables.

## Características Principales

### 1. Autenticación y Control de Acceso
- **Roles diferenciados**: Estudiante y Encargado/Administrador
- **Autenticación JWT**: Sesiones seguras basadas en tokens
- **Rutas protegidas**: Acceso controlado según rol del usuario
- **Gestión de permisos**: Procedimientos específicos por rol

### 2. Gestión de Herramientas
- **CRUD completo**: Crear, leer, actualizar y eliminar herramientas
- **Identificadores únicos**: Formato estándar (ej: MAR_001, DES_002)
- **Categorización**: Herramientas Manuales, Equipos Electrónicos, Medición, Seguridad
- **Estados de condición**: Excelente, Buena, Regular, Mala
- **Ubicación en estantes**: Registro de localización física

### 3. Control de Inventario
- **Disponibilidad en tiempo real**: Cantidad disponible, prestada, en mantenimiento, extraviada
- **Estados de inventario**: Disponible, Prestado, Mantenimiento, Extraviado
- **Gestión de cantidades**: Control de múltiples unidades por herramienta
- **Actualizaciones automáticas**: Cambios de estado al prestar/devolver

### 4. Sistema de Préstamos
- **Escaneo QR**: Registro rápido mediante código QR de herramienta y carné
- **Entrada manual**: Opción de ingreso manual de datos
- **Registro automático**: Fecha, hora, responsable y condición
- **Detección inteligente**: Escaneo repetido = devolución automática
- **Interfaz optimizada**: Diseño pensado para uso en estantes

### 5. Sistema de Devoluciones
- **Detección automática**: Si herramienta está prestada → registra devolución
- **Registro de condición**: Estado de la herramienta al devolver
- **Actualización de estado**: Cambio automático a "disponible"
- **Auditoría completa**: Registro de quién devuelve y cuándo

### 6. Alertas y Sanciones
- **Cálculo automático**: Días de atraso calculados en tiempo real
- **Alertas por atraso**: Notificaciones cuando se vence la fecha de devolución
- **Alertas de proximidad**: Notificación 1 día antes del vencimiento
- **Sanciones configurables**: Reglas basadas en días de atraso
- **Restricción de préstamos**: Usuarios con atrasos severos no pueden prestar

### 7. Reportes y Auditoría
- **Bitácora completa**: Registro de todas las operaciones (BORROW, RETURN, CREATE, UPDATE, DELETE)
- **Filtros avanzados**: Por usuario, herramienta, fechas, tipo de acción
- **Reportes estadísticos**: Herramientas más solicitadas, usuarios más activos
- **Historial de auditoría**: Trazabilidad completa para compliance

### 8. Dashboard Administrativo
- **Estadísticas en tiempo real**: Préstamos activos, atrasos, usuarios
- **Gráficos de tendencias**: Herramientas más solicitadas
- **Alertas prioritarias**: Atrasos y eventos que requieren atención
- **Gestión centralizada**: Control total del laboratorio

## Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React 19 + TypeScript + Tailwind CSS 4
- **Backend**: Express.js + tRPC 11 + TypeScript
- **Base de Datos**: MySQL 8.0
- **Autenticación**: JWT + OAuth (Manus)
- **ORM**: Drizzle ORM
- **Validación**: Zod

### Estructura de Base de Datos

#### Tablas Principales
1. **users**: Usuarios del sistema (estudiantes y administradores)
2. **tools**: Catálogo de herramientas del laboratorio
3. **inventory**: Control de disponibilidad y cantidades
4. **loans**: Registro de todos los préstamos
5. **sanctions**: Sanciones activas por usuario
6. **alerts**: Alertas del sistema (atrasos, proximidad)
7. **auditLog**: Bitácora completa de operaciones
8. **loanRules**: Configuración de reglas de sanciones

### Procedimientos tRPC

#### Autenticación
- `auth.me`: Obtener usuario actual
- `auth.logout`: Cerrar sesión

#### Herramientas
- `tools.list`: Listar todas las herramientas
- `tools.getById`: Obtener herramienta por ID
- `tools.getByToolId`: Obtener herramienta por identificador único
- `tools.create`: Crear nueva herramienta (Admin)
- `tools.update`: Actualizar herramienta (Admin)
- `tools.delete`: Eliminar herramienta (Admin)

#### Inventario
- `inventory.getByToolId`: Obtener inventario de herramienta
- `inventory.create`: Crear registro de inventario (Admin)

#### Préstamos
- `loans.getByStudent`: Obtener préstamos del estudiante
- `loans.create`: Registrar nuevo préstamo
- `loans.return`: Registrar devolución

## Flujos de Uso

### Flujo de Préstamo (Estudiante)
1. Estudiante se acerca al estante con lector QR
2. Escanea código QR de la herramienta
3. Escanea o ingresa su carné de estudiante
4. Sistema registra préstamo automáticamente
5. Feedback visual confirma operación

### Flujo de Devolución (Estudiante)
1. Estudiante se acerca al estante con lector QR
2. Escanea código QR de la herramienta (misma que prestó)
3. Sistema detecta que está prestada
4. Registra automáticamente como devolución
5. Solicita confirmación de condición
6. Actualiza estado a disponible

### Flujo de Gestión (Administrador)
1. Accede a panel de control
2. Visualiza estadísticas en tiempo real
3. Gestiona herramientas (CRUD)
4. Revisa alertas de atrasos
5. Gestiona sanciones y reglas
6. Genera reportes y auditoría

## Reglas de Sanciones (Configurables)

| Rango de Atraso | Descripción | Puede Prestar |
|---|---|---|
| 1-2 días | Atraso leve | Sí |
| 3-5 días | Atraso moderado | No |
| 6-10 días | Atraso severo | No |
| +11 días | Atraso crítico | No |

## Seguridad

- **Autenticación JWT**: Tokens seguros con expiración
- **Control de roles**: Acceso granular según rol de usuario
- **Validación de entrada**: Zod para validación de datos
- **Auditoría completa**: Registro de todas las operaciones
- **Protección de rutas**: Middleware de autenticación en tRPC

## Instalación y Configuración

### Requisitos Previos
- Node.js 22+
- MySQL 8.0+
- pnpm 10+

### Pasos de Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd kite-lab-system

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Generar migraciones
pnpm drizzle-kit generate

# Ejecutar migraciones
pnpm drizzle-kit migrate

# Iniciar servidor de desarrollo
pnpm dev
```

### Variables de Entorno Requeridas
- `DATABASE_URL`: Conexión a MySQL
- `JWT_SECRET`: Clave para firmar tokens JWT
- `VITE_APP_ID`: ID de aplicación OAuth
- `OAUTH_SERVER_URL`: URL del servidor OAuth

## Testing

```bash
# Ejecutar tests
pnpm test

# Tests con cobertura
pnpm test:coverage
```

## Despliegue

El sistema está optimizado para despliegue en Manus con soporte para:
- Hosting automático
- Dominios personalizados
- SSL/TLS automático
- Base de datos gestionada
- Backups automáticos

## Roadmap Futuro

- [ ] Integración con Arduino para lectores QR automáticos
- [ ] Notificaciones por email/SMS
- [ ] Aplicación móvil nativa (React Native)
- [ ] Integración con sistemas de identificación biométrica
- [ ] Análisis predictivo de atrasos
- [ ] Integración con sistemas de inventario externos
- [ ] Exportación de reportes en PDF/Excel
- [ ] Dashboard en tiempo real con WebSockets

## Soporte y Contribuciones

Para reportar bugs, sugerencias o contribuciones, por favor contactar al equipo de desarrollo.

## Licencia

Este proyecto es parte del curso de Programación Orientada a Objetos y está sujeto a los términos de la institución académica.

---

**Versión**: 1.0.0  
**Última actualización**: Abril 2024  
**Desarrollado para**: Laboratorio KITE
