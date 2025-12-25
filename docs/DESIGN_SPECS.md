# FloraCatalog - Design Specifications & Prompt Context

**Role:** Senior Frontend Engineer & UI/UX Designer.
**Goal:** Build a complex, single-page React application for cataloging botanical taxonomy.
**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, `@google/genai` (Gemini SDK).
**Persistence:** `localStorage` for UI state, Supabase/PostgreSQL for botanical data.

---

## 0. Rules of Engagement
**CRITICAL:** This project follows the protocol defined in `docs/AI_DEVELOPMENT_PROTOCOL.md`. The AI must never assume refactors or casing changes are desired unless explicitly stated in the current prompt.

---

## 1. Core Concept
The app is a "Smart Spreadsheet" for plants. It allows users to input natural language plant names (e.g., "Agave parryi var. truncata"). The app uses Gemini 3 Flash to parse this into a structured taxonomic hierarchy (Family -> Genus -> Species -> Infraspecies -> Cultivar), auto-populates botanical details, and displays them in a high-density, customizable Data Grid.

## 2. Data Model
The central data unit is a `Taxon`. It is recursive (has a `parentId`).
*   **Rank Hierarchy:** Family, Genus, Species, Subspecies, Variety, Form, Cultivar, Hybrid, Grex.
*   **Type Simplification:** `taxonRank` and `taxonStatus` are stored as native `string` types to allow for diverse botanical classification schemes without constant type refactoring.
*   **Casing Note:** While types are generic strings, the values in the database and code logic are **Capitalized** (e.g., "Genus", "Species", "Accepted"). 

## 3. AI Service Layer (`geminiService.ts`)
*   **Model:** `gemini-3-flash-preview` for core parsing; `gemini-3-pro-preview` for deep mining.
*   **Parsing Logic:** Standardizes 'x' to the literal botanical hybrid symbol `×`, identifies synonyms, and wraps cultivars in single quotes.

## 4. UI: The Advanced Data Grid (`DataGrid.tsx`)
A "Tree Grid" that renders a flat list but groups records visually using virtual headers.

### 4.1 Stability & State Persistence
*   **Input Retention:** Text filter inputs are debounced and synchronized. To prevent focus loss during infinite scroll or search updates, the grid component is carefully structured to avoid unnecessary unmounts.
*   **Load Status Display:** A dynamic status bar in the grid header shows the number of records currently held in the browser instance vs. the total count returned by the database filters.

### 4.2 Virtual Tree Logic
*   **Holistic Path Calculation:** The `expandTreeLevel` function performs a full recursive walk of all loaded `Taxon` records, even those hidden within collapsed nodes.
*   **Virtual Headers:** Generated in-memory for groups (Genus, Species) that don't have an explicit record representing the group itself.

### 4.3 Visual Rules
*   **Dimming/Bolding:** Applied to columns matching the row's specific rank. Higher-rank columns are dimmed on lower-rank rows.
*   **Hybrid Styling:** Uses CSS `saturate-50` and `opacity-80` to visually distinguish hybrids from standard species.

## 5. UI: Activity & Process Panel
*   **Async Management:** A cancellation system allows users to stop long-running AI processes immediately.
*   **Resolution UI:** Embedded workflows for "Did you mean?" corrections or duplicate name detection.

## 6. Visual Style
*   **Typography:** `Playfair Display` (Serif) for botanical names; `Inter` (Sans) for data.
*   **Theme:** "Leaf" (Emerald/Slate). High-density layout (p-2 padding).
