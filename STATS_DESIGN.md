# Diseño del Módulo de Estadísticas y Analítica de Entrenamiento

**Estado**: Implementado (iterativo)
**Autor**: Copilot (Entrenador de Algoritmos)
**Fecha**: 15 Marzo 2026

## 1. Introducción y Filosofía de Entrenamiento

Como en cualquier disciplina de alto rendimiento, en la programación competitiva **lo que no se mide, no se mejora**. Un sistema de estadísticas robusto no es solo para ver gráficos bonitos; es una herramienta de diagnóstico para detectar cuellos de botella en tu aprendizaje.

El objetivo de este módulo es transformar los datos crudos de `problems` en *insights* accionables. Evitaremos el "código espagueti" mediante una arquitectura por capas estricta, desacoplando la obtención de datos (SQL) de la lógica de negocio (procesamiento de arrays/fechas) y de la presentación (Gráficos).

### Principios de Diseño
1.  **Read-Optimized**: Las estadísticas se leen mucho más de lo que se escriben. Las consultas deben ser eficientes.
2.  **Modularidad**: Un archivo `StatsRepository.js` para SQL, `StatsService.js` para lógica, y componentes UI aislados.
3.  **Composabilidad**: Los filtros deben ser mixins reutilizables, no funciones monolíticas gigantes.
4.  **Agnosticismo de Librería**: La lógica de datos no debe saber qué librería de gráficos se usa (Chart.js, Recharts, Apache ECharts).

---

## 2. Arquitectura del Backend (`src/lib/`)

Para evitar consultas masivas y lógica dispersa en los componentes `.astro`, crearemos una capa dedicada.

### 2.1. `src/lib/statsRepository.js`
Este archivo manejará exclusivamente SQL raw. Usaremos `better-sqlite3` para agregaciones rápidas.

**Funciones Clave:**

*   `getDailySubmissionStats(startDate, endDate)`:
    *   *Propósito*: Heatmap y Gráfico de Línea.
    *   *SQL*: `SELECT DATE(solved_at) as date, COUNT(*) as count FROM problems WHERE estado IN ('resuelto', 'finalizado') GROUP BY date`.
    
*   `getDistributionByField(field, filter = {})`:
    *   *Propósito*: Pasteles y Barras (Status, Juez, Dificultad).
    *   *SQL*: `SELECT ${field}, COUNT(*) as count FROM problems WHERE ... GROUP BY ${field}`.

*   `getCompletionTimeStats(filter = {})`:
    *   *Propósito*: Histograma de tiempos.
    *   *SQL*: `SELECT completion_time_minutes FROM problems WHERE completion_time_minutes IS NOT NULL ...`.

*   `getTagUsageStats(filter = {})`:
    *   *Propósito*: Radar Chart (Fortalezas/Debilidades).
    *   *Nota*: Dado que los tags están en JSON/Texto, esto podría requerir procesado en JS o una extensión de SQLite JSON si está habilitada. Por compatibilidad, mejor traer los tags de los problemas filtrados y contar en el Service.

### 2.2. `src/lib/statsService.js`
Aquí transformamos los datos crudos en estructuras que las librerías de gráficos entienden.

**Transformaciones:**
*   Relleno de fechas vacías (para que el gráfico de línea no tenga huecos).
*   Cálculo de medias móviles (para suavizar la varianza diaria).
*   Normalización de etiquetas (tags).
*   Cálculo de percentiles (para tiempos de resolución).

---

## 3. Catálogo de Gráficos Propuestos

A continuación, detallamos los gráficos específicos que implementaremos, su utilidad pedagógica y la estructura de datos necesaria.

### 3.1. "El Pulso del Atleta": Actividad Diaria y Acumulada

**Tipo**: Gráfico Combinado (Barras + Línea)
**Pregunta que responde**: "¿Estoy manteniendo la constancia o estoy teniendo picos de esfuerzo insostenibles?"

*   **Eje X**: Tiempo (Días/Semanas).
*   **Eje Y (Izq)**: Problemas Resueltos (Barras).
*   **Eje Y (Der)**: Acumulado Total (Línea).
*   **Filtros**: Rango de fechas (Última semana, mes, año, custom).

IMPORTANTE: este gráfico también permitirá filtrar con más atributos de los problemas, como si son de cierto jurado, o tiene >, =, < difitultad, también por su estado y tiempo de resolución

**Estructura de Datos (Service Output):**
```json
{
  "labels": ["2023-10-01", "2023-10-02", ...],
  "datasets": [
    { "type": "bar", "label": "Resueltos Diarios", "data": [2, 5, 0, ...] },
    { "type": "line", "label": "Total Acumulado", "data": [100, 105, 105, ...] }
  ]
}
```

### 3.2. "Radar de Habilidades": Distribución por Tags

**Tipo**: Radar Chart (Araña)
**Pregunta que responde**: "¿Soy un 'one-trick pony' de Grafos o tengo un perfil equilibrado?"

*   **Ejes**: Categorías de tags (DP, Grafos, Geometría, Strings, Math, Greedy).
*   **Métrica**: Cantidad de problemas resueltos O Dificultad promedio en esa categoría.
*   **Lógica**: Requiere normalizar los tags (e.g., 'dp' == 'dynamic programming').

**Estructura de Datos:**
```json
{
  "labels": ["DP", "Grafos", "Math", "Strings", "Greedy"],
  "datasets": [{ "label": "Problemas Resueltos", "data": [15, 8, 20, 4, 12] }]
}
```

### 3.3. "Zona de Flujo": Tiempo de Resolución vs. Dificultad

**Tipo**: Scatter Plot (Dispersión)
**Pregunta que responde**: "¿Estoy tardando demasiado en problemas fáciles (falta de fundamentos) o resolviendo rápido problemas difíciles (buena señal)?"

*   **Eje X**: Dificultad (Rating).
*   **Eje Y**: Tiempo de Resolución (Minutos).
*   **Color**: Juez (Codeforces = Rojo, AtCoder = Negro, etc.).
*   **Tooltip**: Nombre del problema + Link.

**Estructura de Datos:**
```json
[
  { "x": 1200, "y": 45, "problem": "A. Watermelon", "judge": "Codeforces" },
  { "x": 800, "y": 5, "problem": "B. Easy Math", "judge": "AtCoder" }
]
```

### 3.4. "Embudo de Estados": Distribución Actual

**Tipo**: Doughnut Chart (Donut) con número total en el centro.
**Pregunta que responde**: "¿Se me está acumulando la basura en 'Pendiente' o estoy cerrando ciclos ('Finalizado')?"

*   **Segmentos**: Nuevo, Pendiente, Resuelto, Finalizado, Baúl.
*   **Interactividad**: Al hacer clic en un segmento, filtrar la lista de abajo (drill-down).

### 3.5. "Curva de Aprendizaje": Dificultad Promedio en el Tiempo

**Tipo**: Line Chart (Suavizada)
**Pregunta que responde**: "¿Estoy subiendo mi nivel de dificultad o me he estancado en mi zona de confort?"

*   **Eje X**: Semanas/Meses.
*   **Eje Y**: Promedio de dificultad de problemas *Resueltos/Finalizados* en ese periodo.

---

## 4. Implementación Técnica Detallada

### 4.1. Esquema de Base de Datos (Revisión)
El esquema actual soporta todo esto, pero asegurémonos de tener índices para velocidad:
```sql
-- Recomendado agregar índices si la tabla crece > 10k filas
CREATE INDEX IF NOT EXISTS idx_problems_solved_at ON problems(solved_at);
CREATE INDEX IF NOT EXISTS idx_problems_estado ON problems(estado);
CREATE INDEX IF NOT EXISTS idx_problems_origen ON problems(origen);
```

### 4.2. Ejemplo de Query Dinámica (Anti-Spaghetti)

En lugar de concatenar strings infinitos, usaremos un patrón de "Query Builder" simple en `statsRepository.js`.

```javascript
// src/lib/statsRepository.js

export function getFilteredStats(filters) {
  let query = "SELECT ... FROM problems WHERE 1=1";
  const params = [];

  if (filters.dateRange) {
    query += " AND solved_at BETWEEN ? AND ?";
    params.push(filters.dateRange.start, filters.dateRange.end);
  }

  if (filters.judges && filters.judges.length > 0) {
    const placeholders = filters.judges.map(() => '?').join(',');
    query += ` AND origen IN (${placeholders})`;
    params.push(...filters.judges);
  }
  
  // ... más filtros modulares
  
  return db.prepare(query).all(...params);
}
```

### 4.3. Librería de Gráficos Recomendada: Apache ECharts o Chart.js
Para un entorno Astro (SSR), recomiendo librerías que puedan renderizar en cliente pero hidratarse con datos del servidor fácilmente.
*   **Chart.js**: Muy estándar, fácil de usar, bundle pequeño si se hace tree-shaking.
*   **Apache ECharts**: Más potente, mejor para volúmenes grandes de datos, pero más pesada.

**Decisión**: Usaremos **Chart.js** (vía `chart.js` y wrappers simples o vanilla JS en scripts de cliente) por su simplicidad y documentación extensiva.

---

## 5. Mockup de Interfaz (`src/pages/stats.astro`)

La página de estadísticas no debe ser un dashboard abrumador. Debe contar una historia.

```
+-------------------------------------------------------+
|  [H1] Centro de Alto Rendimiento                      |
|  [Date Picker Range] [Filter: Juez] [Filter: Tags]    |
+-------------------------------------------------------+
|                                                       |
|  [ KPI Cards ]                                        |
|  +------------+  +------------+  +-------------+      |
|  | Prob. Hoy  |  | Total Mes  |  | Avg Diff    |      |
|  |     5      |  |    42      |  |   1450      |      |
|  +------------+  +------------+  +-------------+      |
|                                                       |
+-------------------------------------------------------+
|                                                       |
|  [ Gráfico Principal: Actividad (Bar+Line) ]          |
|  (Ancho completo para ver tendencias)                 |
|                                                       |
+-------------------------------------------------------+
|                                                       |
|  [ Col Izq: Donut Estados ] [ Col Der: Radar Tags ]   |
|  (Gestión de cola)          (Balance de skills)       |
|                                                       |
+-------------------------------------------------------+
|                                                       |
|  [ Scatter: Tiempos vs Dificultad ]                   |
|  (Detectar outliers y zonas de mejora)                |
|                                                       |
+-------------------------------------------------------+
```

## 6. Plan de Desarrollo (Fases)

### Fase 1: Cimientos (Backend)
1.  Crear `src/lib/statsRepository.js`.
2.  Crear `src/lib/statsService.js`.
3.  Implementar endpoints API básicos o funciones de servidor en Astro para probar los datos JSON.

### Fase 2: Visualización Básica
1.  Instalar `chart.js`.
2.  Crear componente `<ChartWrapper client:load />`.
3.  Implementar "Embudo de Estados" (Donut) y "Actividad Diaria" (Barras).

### Fase 3: Analítica Avanzada
1.  Implementar Scatter Plot (Tiempos).
2.  Implementar Radar Chart (Tags) - *Requiere normalización de tags*.
3.  Añadir filtros dinámicos en la UI (reactividad).

## 7. Conclusión

Este diseño evita el acoplamiento fuerte. Si mañana quieres cambiar SQLite por PostgreSQL, solo tocas el Repository. Si quieres cambiar Chart.js por D3.js, solo tocas los componentes de frontend. La lógica de negocio ("¿Qué define un buen día de entrenamiento?") vive aislada en el Service.

Esto te permitirá no solo "ver datos", sino **tomar decisiones** sobre tu entrenamiento basándote en evidencia sólida.

---

## 8. Estado actual implementado (Pulso de Entrenamiento)

Actualmente el gráfico "Pulso de Entrenamiento" en `/stats` soporta filtros combinables:

- Búsqueda por nombre del problema (`q`).
- Juez (`judge`).
- Tag (`tag`).
- Ventana temporal (`days`: 7/14/30/60/90/180).
- Rango personalizado (`from` y `to`) con prioridad sobre ventana.
- Estados en modo multiselección (`status` repetible en querystring).  
  Si no se envía ninguno, el comportamiento por defecto es `resuelto + finalizado`.
- Filtros de dificultad y tiempo con operadores seguros (`=`, `>`, `<`, `>=`, `<=`).

El agregado diario del Pulso se calcula sobre `DATE(solved_at)`, manteniendo a `solved_at` como fecha canónica de finalización/solución para evitar desalineaciones en el eje temporal.
