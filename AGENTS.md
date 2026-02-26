# Upsolving System - Documentation for AI Agents

## Overview

The **Upsolving System** is a personalized competitive programming tracker built to help users manage their training, track problems, and set performance goals. It is designed to be lightweight, fast, and easily extensible.

This document serves as a comprehensive guide for AI agents interacting with this codebase, detailing the architecture, technologies, file structure, and business logic.

## Technology Stack

*   **Framework**: [Astro](https://astro.build/) (v4.x)
    *   Used for server-side rendering (SSR) and static site generation.
    *   Provides a component-based architecture (`.astro` files).
*   **Database**: SQLite
    *   Accessed via `better-sqlite3`.
    *   File-based database: `upsolving.db`.
*   **Language**: JavaScript (ES Modules) / Node.js
*   **Styling**: Inline CSS and scoped styles within Astro components.
*   **Deployment target**: Node.js environment (SSR).

## Project Structure

The project follows a standard Astro project structure with a focus on separation of concerns between the UI (pages), data access (repositories), and business logic (services).

### Root Directory
*   `astro.config.mjs`: Astro configuration file.
*   `package.json`: Dependencies and scripts.
*   `upsolving.db`: The SQLite database file (ignored in git).
*   `start.sh`: Shell script to start the application.

### Source Directory (`src/`)

#### 1. Data Access Layer (`src/lib/`)

This directory contains the core logic for interacting with the database and processing data.

*   **`db.js`**:
    *   Initializes the SQLite database connection using `better-sqlite3`.
    *   Exports the `db` instance.
    *   Contains legacy helper functions for `judges` and `training_sets` (refactoring in progress to move these to specific repositories).

*   **`problemsRepository.js`**:
    *   **Purpose**: Direct database operations for the `problems` table.
    *   **Key Functions**:
        *   `getProblemsDAO(filter)`: Retrieves problems based on filters (judge, status, search, tags).
        *   `createProblemDAO(problem)`: Inserts a new problem.
        *   `updateProblemDAO(id, data)`: Updates problem details (including dynamic field updates).
        *   `deleteProblemDAO(id)`: Deletes a problem and its references in sets.
        *   `findOldestPendingDAO()`, `findRandomNewDAO()`: Helper queries for recommendation logic.

*   **`goalsRepository.js`**:
    *   **Purpose**: Direct database operations for `goals` and `metrics`.
    *   **Key Functions**:
        *   `getGoals()`, `getGoalById(id)`: CRUD for goals.
        *   `createMetric()`, `deleteMetric()`: CRUD for metrics associated with goals.
        *   `getMetricsByGoalId(goalId)`: Retrieves all metrics for a specific goal.

*   **`problemService.js`**:
    *   **Purpose**: Business logic layer for problems. It acts as a bridge between the UI and the DAO.
    *   **Key Logic**:
        *   `addNewProblem(data)`: Validates and formats data before calling the DAO.
        *   `getSmartRecommendation()`: Implements the "Upsolving" methodology (prioritizing pending problems, then new ones).
        *   Handles tag formatting and data normalization.

*   **`goalsService.js`**:
    *   **Purpose**: Business logic for calculating goal progress.
    *   **Key Logic**:
        *   `getGoalWithStatus(goalId)`: This is a complex function that aggregates data.
        *   It fetches the goal and its metrics.
        *   It retrieves relevant problems from the database.
        *   It calculates a **14-day moving window** for each metric.
        *   For each day in the window, it calculates the ratio of problems that meet the "Target Filter" (C) vs. the "Base Filter" (B).
        *   Determines if the goal is "Met" based on the daily performance.

*   **`utils.js`**:
    *   Helper functions for parsing tags (comma-separated strings to arrays) and other utilities.

#### 2. Database Scripts (`src/db/`)

*   **`init.js`**:
    *   Script to initialize the database schema.
    *   Creates tables: `problems`, `judges`, `training_sets`, `training_set_items`.
    *   Inserts default judges.

*   **Migrations**:
    *   Use migration scripts (e.g., `migrate_goals.js`) to apply schema changes to existing databases.

#### 3. Pages & Routing (`src/pages/`)

Astro uses file-based routing.

*   **`index.astro` (Home)**:
    *   **Route**: `/`
    *   **Features**:
        *   Dashboard view.
        *   "Add Problem" form (supports Name, URL, Judge, Status, Difficulty, Tags, Notes, Solved Date, Time).
        *   List of problems with filtering (Status, Judge, Search).
        *   Smart Recommendation display.
        *   Quick actions (Edit, Delete, Change Status).
    *   **State Management**: Handles POST requests for adding/updating problems directly in the frontmatter.

*   **`problems/`**:
    *   `[id]/index.astro`: View details of a specific problem.
    *   `[id]/edit.astro`:
        *   **Route**: `/problems/:id/edit`
        *   **Features**: Form to edit all problem attributes.
        *   Includes specific logic to handle `datetime-local` inputs and converting minutes to hours/minutes format.

*   **`sets/`**:
    *   `index.astro`: List of training sets.
    *   `[id].astro`: Details of a specific training set, allowing users to add/remove problems.

*   **`goals/`**:
    *   `index.astro`:
        *   **Route**: `/goals`
        *   **Features**:
            *   Goal management dashboard.
            *   Create/Delete goals.
            *   Add/Delete metrics for a goal.
            *   **Visualization**: Renders the 14-day progress squares using CSS.
            *   Logic to process the `getGoalWithStatus` data and display "Met/Not Met" status.

## Database Schema

### `problems`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | Auto-increment ID |
| `nombre` | TEXT | Problem name |
| `url` | TEXT | Link to the problem |
| `origen` | TEXT | Judge name (e.g., Codeforces, AtCoder) |
| `tags` | TEXT | JSON string or comma-separated tags |
| `estado` | TEXT | 'nuevo', 'pendiente', 'resuelto', 'finalizado', 'baul' |
| `notas` | TEXT | User notes |
| `dificultad` | INTEGER | Difficulty rating |
| `solved_at` | DATETIME | When the problem was solved |
| `completion_time_minutes` | INTEGER | Time taken to solve in minutes |
| `created_at` | DATETIME | Creation timestamp |

### `judges`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | |
| `name` | TEXT | Judge name |

### `training_sets`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | |
| `title` | TEXT | Set title |
| `description` | TEXT | |
| `status` | TEXT | 'active' |

### `training_set_items`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | |
| `set_id` | INTEGER FK | References `training_sets` |
| `problem_id` | INTEGER FK | References `problems` |

### `goals`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | |
| `name` | TEXT | Goal name |
| `description` | TEXT | |
| `created_at` | DATETIME | |

### `metrics`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | INTEGER PK | |
| `goal_id` | INTEGER FK | References `goals` |
| `base_filter_json` | TEXT | JSON defining the "Base" set of problems (B) |
| `target_filter_json` | TEXT | JSON defining the "Target" condition (C) |
| `target_ratio` | REAL | The required ratio (C/B) to meet the metric (0.0 - 1.0) |

## Business Logic Details

### Goal Tracking Algorithm
The core of the new feature is in `goalsService.js`.
1.  **Filters**:
    *   `base_filter`: Defines the universe of problems we care about for a specific metric (e.g., "All AtCoder problems with Difficulty > 1200").
    *   `target_filter`: Defines success within that universe (e.g., "Solved in < 30 minutes").
2.  **Time Window**:
    *   The system analyzes the last **14 days** (inclusive of today).
    *   For each day `D`, it looks at problems solved in the range `[D - 14 days, D]`.
3.  **Calculation**:
    *   `CountB`: Number of problems solved in that window matching `base_filter`.
    *   `CountC`: Number of problems from `CountB` that also match `target_filter`.
    *   `Ratio`: `CountC / CountB`.
    *   **Status**: If `Ratio >= target_ratio`, the day is marked as "Met" (Green).
4.  **Goal Completion**:
    *   A goal is considered "Met" today if **ALL** its metrics are "Met" for the current day (Day 0).

### Problem Statuses
*   **Nuevo**: Added but not looked at.
*   **Pendiente**: In the queue to be solved.
*   **Resuelto**: Solved (classic status).
*   **Finalizado**: Solved and processed (e.g., notes added, reflection done). This is a new status added for the metrics feature.
*   **Baul**: Archived/Ignored.

## UI Components & Design

*   **Styling**: The project uses a utility-friendly approach (similar to Tailwind but written in standard CSS classes or inline styles) to keep dependencies low.
*   **Icons**: Uses emoji icons for simplicity (e.g., 🎯, ✏️, 🎉).
*   **Animations**: Simple CSS animations for celebrations (e.g., `.happy-animation`).

## AI Agent Guidelines

When modifying this codebase, please adhere to the following:

1.  **Database Integrity**:
    *   Always ensure foreign keys are respected.
    *   When adding columns, use `try-catch` blocks in migration scripts to handle "column already exists" errors gracefully.
    *   Use parameterized queries (`?`) in `better-sqlite3` to prevent SQL injection.

2.  **Performance**:
    *   The `goalsService` processes arrays in memory. If the number of problems grows significantly (>10k), consider moving the aggregation logic to SQL queries (using `COUNT` and `CASE WHEN`).
    *   Avoid N+1 queries in loops where possible.

3.  **Code Style**:
    *   Use ES Modules (`import`/`export`).
    *   Keep logic in `src/lib` and presentation in `src/pages`.
    *   Use descriptive variable names.

4.  **Extensibility**:
    *   To add a new filter to metrics (e.g., by Tag), update:
        *   `goalsService.js` -> `matchesFilter` function.
        *   `goals/index.astro` -> Form UI.
        *   `goalsRepository.js` -> Migration (if column needed, though currently using JSON).

5.  **Testing**:
    *   Currently, manual testing is performed.
    *   Verify "Add Problem", "Edit Problem", and "Goal Visualization" after changes.

## Future Roadmap

*   [ ] Add "Tags" support to Goal Metrics.
*   [ ] Pagination for the problem list in `index.astro`.
*   [ ] Graphical charts for long-term progress (e.g., using a library like Chart.js).
*   [ ] Import/Export data functionality.
