# Upsolving System

## Descripción
**Upsolving System** es una aplicación web local diseñada para ayudar a programadores competitivos a gestionar su entrenamiento. Permite llevar un registro de problemas de jueces online (como Codeforces, AtCoder, etc.), organizar sesiones de práctica mediante "Sets de Entrenamiento" y mantener un seguimiento del estado de cada problema (Nuevo, Pendiente, Resuelto, Baúl).

La aplicación está construida con **Astro**, **SQLite** y **TailwindCSS**, ofreciendo una interfaz rápida y ligera.

## Características Principales

### 1. Gestión de Problemas
- **CRUD Completo:** Añadir, editar, ver detalles y eliminar problemas.
- **Metadatos:** Almacena nombre, URL, juez de origen, dificultad, etiquetas (tags) y notas personales.
- **Estados:** Clasifica los problemas en:
  - 🟣 **Nuevo:** Problemas descubiertos recientemente.
  - 🟠 **Pendiente:** Problemas en cola para resolver.
  - 🟢 **Resuelto:** Problemas ya completados.
  - ⚫ **Baúl:** Problemas descartados o archivados.
- **Buscador y Filtros:** Busca problemas por texto (nombre, tags) y fíltralos por juez o estado.

### 2. Sets de Entrenamiento
- **Organización:** Agrupa problemas en listas personalizadas (e.g., "DP Semana 1", "Grafos Avanzados").
- **Gestión:** Crea nuevos sets, edita sus descripciones y elimina sets completos.
- **Asignación:** Añade problemas existentes a tus sets desde la página del problema o desde el propio set.
- **Seguimiento:** Visualiza qué problemas de un set ya han sido resueltos.

### 3. Recomendaciones Inteligentes
- El sistema sugiere qué problema resolver a continuación basándose en una metodología FIFO (First-In, First-Out) para limpiar la cola de pendientes, o explorando nuevos problemas al azar si estás al día.

### 4. Estadísticas (`/stats`)
- **Pulso de Entrenamiento (Barra + Acumulado):** usa `solved_at` como fecha de evento real.
- **Filtros avanzados del Pulso:**
  - Búsqueda por nombre de problema.
  - Filtro por juez.
  - Filtro por tag.
  - Ventana temporal configurable (`7/14/30/60/90/180` días).
  - Rango personalizado (`desde` / `hasta`).
  - Multi-selección de estados (si no seleccionas ninguno, se usa `resuelto + finalizado` por defecto).
  - Operadores para dificultad y tiempo (`=`, `>`, `<`, `>=`, `<=`).
- **Consistencia temporal:** para estados `finalizado`, se considera `solved_at` como referencia canónica para gráficos y seguimiento.

## Instalación y Uso

### Prerrequisitos
- **Node.js** (v18 o superior recomendado)
- **NPM** (incluido con Node.js)

### Pasos
1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Inicializar la base de datos:**
   ```bash
   npm run init-db
   ```
   Esto creará el archivo `upsolving.db` con las tablas necesarias y datos iniciales.

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:4321`.

## Estructura del Proyecto

- `src/pages/`: Rutas y vistas de la aplicación.
  - `index.astro`: Página principal (listado de problemas).
  - `sets/`: Gestión de sets de entrenamiento.
  - `problems/[id]/`: Detalles y edición de problemas individuales.
- `src/lib/`: Lógica de negocio y acceso a datos.
  - `db.js`: Configuración de SQLite y funciones para Sets.
  - `problemsRepository.js`: Consultas SQL para problemas.
  - `problemService.js`: Capa de servicios y lógica de negocio.
- `src/db/`: Scripts de inicialización de base de datos.

## Tecnologías
- **Framework:** Astro 4.0
- **Base de Datos:** SQLite (via `better-sqlite3`)
- **Estilos:** CSS nativo (con utilidades inspiradas en Tailwind)

---
*Creado para la comunidad de Programación Competitiva.*
