# Specification: Operations Hub (Activity Panel)

## 1. Overview
The Operations Hub is a centralized monitoring and debugging suite for background tasks. It transforms asynchronous operations from opaque processes into transparent, auditable ledgers.

## 2. Display Orientations
To accommodate different workflows, the hub supports three UI modes:

### 2.1 Side Drawer (The Monitor)
- **Visuals:** Locked to the right side of the screen (`w-[450px]`).
- **Use Case:** Monitoring background mining or enrichment tasks while interacting with the main Data Grid.
- **Behavior:** Pushes the main content area (if responsive) or overlays on top of the grid.

### 2.2 Floating Hub (The Controller)
- **Visuals:** A centered, modal-like overlay with high contrast shadows.
- **Use Case:** Focused task resolution (e.g., resolving a "Did you mean?" correction).
- **Behavior:** Centered on screen, darkens background.

### 2.3 Full Suite (The Dashboard)
- **Visuals:** Expands to nearly 100% of the viewport (`inset-8`).
- **Use Case:** Analyzing high-volume operations like bulk ingestion or database hierarchy construction.
- **Layout:** Utilizes a multi-column CSS layout for the process history to maximize visibility.

---

## 3. The Process Ledger (Data Hierarchy)
Activities are no longer flat messages; they follow a structured audit hierarchy:

1.  **Task Identifiers:**
    - `id`: UUID for the specific run.
    - `name`: Human-readable label (e.g., "Analyze Intent: Agave").
    - `type`: Category (Mining, Enrichment, Import, Search).
    
2.  **Origin Context (`inputs`):**
    - Stores the raw user input string or the specific Taxon ID being processed.
    - Essential for identifying *why* an error occurred.

3.  **Step Ledger (`steps`):**
    - A chronological array of micro-steps.
    - Each step tracks its own `status` (Running, Completed, Error).
    - Each step captures a `data` snapshot (e.g., the JSON returned from an AI call).

4.  **Resolution UI:**
    - Specific tasks (like Ingestion) can enter a `needs_input` state.
    - The ledger renders interactive buttons (Accept, Redirect, Select) to continue the process.

---

## 4. Stability & Persistence Rules

### 4.1 LocalStorage Sovereignty
The Activity Hub synchronizes its entire state to `localStorage` on every change. 
- **Rationale:** If a complex AI enrichment process takes 10 seconds and the user accidentally refreshes the page, the "Process Trace" must be there to confirm whether the DB commit actually succeeded.

### 4.2 Auto-Open Guard
A User Preference (`auto_open_activity_on_task`) controls whether the panel launches automatically.
- **Default:** OFF.
- **Behavior:** When ON, the panel slides open the moment an asynchronous AI process is initiated in a modal or via the grid actions.

### 4.3 Post-Interaction State Transitions
- **The Flow Rule:** Any activity in a `needs_input` state MUST transition to a non-input state (`running`, `completed`, or `error`) immediately upon user interaction.
- **Implementation:** Handlers for resolution buttons (e.g., `onResolve`) are responsible for updating the activity status. This ensures that resolved items automatically "fall" out of the **Interaction Required** section into the history ledger.

### 4.4 Cleanup Logic
- **Dismiss:** Removes a single task from history.
- **Wipe History:** Clears all completed or failed tasks from memory and storage.
- **Active Protection:** The system prevents wiping or dismissing tasks in a `running` state.