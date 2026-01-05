# ADR-007: Startup Synchronization Lifecycle (The Render Guard)

## Status
Decided (Implemented in v2.28.3)

## Context
The application allows users to persist their custom grid layouts (column ordering, visibility, widths) and active filters to the database. These settings are fetched asynchronously on boot. 

**The Problem:** If the application UI mounts immediately, it initializes the `DataGrid` using hardcoded "System Defaults." When the database settings arrive 1-2 seconds later, the grid performs a massive re-render, causing a visible "Default Column Flash." This is visually jarring and can disrupt focus if the user begins interacting with filters during the split-second window.

## Options
1.  **Late Sync (Reactive):** Mount the app with defaults, then update when data arrives.
    *   *Result:* Visible flicker.
2.  **LocalStorage Mirror:** Use `localStorage` as a cache to mount immediately with the "last known" state.
    *   *Result:* Zero flicker, but risks state-drift if the user clears local storage or switches computers.
3.  **Render Guard (Blocking):** Delay the mounting of the `DataGrid` until a definitive signal is received from the settings service.

## Decision
We implemented a **Blocking Render Guard** combined with **Prop-to-State Reconciliation**:
1.  **State Blocking:** The `initialLayout` state in `App.tsx` starts as `null`. The `DataGrid` is strictly prevented from mounting while this is null.
2.  **Definitive Initialization:** `App.init` performs the DB fetch and updates `initialLayout`. Only after this update is `isInitialized` set to `true`.
3.  **Hard Guard Timeout:** A 2.5-3.0s "Fail-Safe" timer ensures that if the database is unreachable, the app proceeds with defaults rather than staying on an infinite spinner.
4.  **DataGrid Sovereignty:** The `DataGrid` implements `useEffect` listeners to "Force Sync" its internal layout state to incoming props, ensuring that the database always remains the sovereign source of truth.

## Consequences
- **Improved AESTHETICS:** The app remains on a clean loading spinner until it is ready to display the *correct* personalized layout.
- **Boot Latency:** Initial load time is increased by the duration of the Supabase handshake (typically 400-900ms).
- **Complexity:** Maintenance of the `DataGrid` requires understanding the "Prop-Reconciliation" logic to prevent state-fighting during interactive layout changes (dragging/resizing).