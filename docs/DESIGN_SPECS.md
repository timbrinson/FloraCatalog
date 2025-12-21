# FloraCatalog - Design Specifications & Prompt Context

**Role:** Senior Frontend Engineer & UI/UX Designer.
**Goal:** Build a complex, single-page React application for cataloging botanical taxonomy.
**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, `@google/genai` (Gemini SDK).
**Persistence:** `localStorage` for UI state, Supabase/PostgreSQL for botanical data.

---

## 1. Core Concept
The app is a "Smart Spreadsheet" for plants. It allows users to input natural language plant names (e.g., "Agave parryi var. truncata"). The app uses Gemini 2.5 Flash to parse this into a strict taxonomic hierarchy (Family -> Genus -> Species -> Infraspecies -> Cultivar), auto-populates botanical details, and displays them in a high-density, customizable Data Grid.

## 2. Data Model
The central data unit is a `Taxon`. It is recursive (has a `parentId`).
*   **Rank Hierarchy:** Family, Genus, Species, Subspecies, Variety, Form, Cultivar, Hybrid, Grex.
*   **WCVP Alignment:** The schema is strictly aligned with the *World Checklist of Vascular Plants*. 
*   **Hybrid Handling:** Store "Hybrid Status" separately from "Rank". Use '×' for `genusHybrid` or `speciesHybrid`.

### 2.1 Data Governance & Lineage
*   **Source of Truth:** WCVP (Official) > Societies > AI Enrichment.
*   **Audit Logging:** Every modification captures Timestamp, Process, Application Version, and User ID.

## 3. AI Service Layer (`geminiService.ts`)
*   **Model:** `gemini-3-flash-preview` for core parsing; `gemini-3-pro-preview` for deep mining.
*   **Cost Optimization:** Avoid `googleSearch` tool for standard tasks.
*   **Parsing Logic:** Standardizes 'x' to '×', identifies synonyms, and wraps cultivars in single quotes.

## 4. UI: The Advanced Data Grid (`DataGrid.tsx`)
A "Tree Grid" that renders a flat list but groups records visually using virtual headers.

### 4.1 Stability & State Persistence
*   **Input Retention:** Text filter inputs are debounced and synchronized with parent props. The grid remains mounted during "Loading" or "Empty" states if filtering is active, preventing the loss of focus or input clearing.
*   **Zero-Result Handling:** When filters return no records, the grid structure (headers and filter row) remains visible, but the body shows a "No matching records" message instead of unmounting the entire component.

### 4.2 Virtual Tree Logic
*   **Holistic Path Calculation:** The `expandTreeLevel` function performs a full recursive walk of all loaded `Taxon` records, even those hidden within collapsed nodes. This ensures that level-based expansion buttons (1, 2, 3, etc.) work globally across the current dataset.
*   **Dynamic Levels:** Numeric buttons are mapped dynamically to the `groupBy` state. If "Family" is hidden, level 1 targets "Genus". If visible, level 1 targets "Family".
*   **Virtual Headers:** Generated in-memory for groups (Genus, Species) that don't have an explicit "Accepted" record representing the group itself.

### 4.3 Visual Rules
*   **Dimming/Bolding:** 
    *   **Bolding:** Applied to columns matching the row's specific rank.
    *   **Dimming:** Applied to higher-rank columns on lower-rank rows (e.g., Genus column is dimmed on a Species row).
*   **Hybrid Styling:** Uses CSS `saturate-50` and `opacity-80` to visually distinguish hybrids from standard species while maintaining consistent lightness.
*   **Column Auto-Fitting:** 
    *   *Fit Screen:* Distributes available space proportionally to flexible columns while respecting `lockWidth` on utility columns.
    *   *Auto Fit:* Measures the current 100-row sample to calculate ideal pixel widths.

## 5. UI: Activity & Process Panel
*   **Async Management:** A `useRef` based cancellation system allows users to stop long-running AI processes (Mining) immediately.
*   **Resolution UI:** Embedded workflows for "Did you mean?" corrections or duplicate name detection without blocking the main grid navigation.

## 6. Visual Style
*   **Typography:** `Playfair Display` (Serif) for botanical names; `Inter` (Sans) for data and controls.
*   **Theme:** "Leaf" (Emerald/Slate). High-density layout (p-2 padding) to maximize information visibility.
