# Documentation Strategy & Context Preservation

This document tracks the plan and progress for building a robust documentation layer. The goal is to ensure the project's vision, technical reasoning, and behavioral standards persist across conversation resets and are clear to any developer (human or AI).

## The Core Problem
1.  **Contextual Drift:** After a conversation reset, the AI loses the "Human Intent" and "Architectural Reasoning," often leading to unsolicited refactors or implementing backlog items without permission.
2.  **Vaporware Reasoning:** Analysis of technical options (pros/cons) provided during chat is lost, making it difficult to understand *why* a specific path was chosen.
3.  **Missing Functional Specs:** Code describes *what* is built, but not the *intended behavior* (e.g., specific UI/UX rules), making it hard to rebuild from scratch.

## 5-Point Documentation Framework

### 1. The "Project Atlas" (README.md)
- **Status:** [Done]
- **Goal:** Transform the root README into an entry point.
- **Content:** Project philosophy, high-level architecture, and a "Documentation Map" linking to all files in `docs/`.

### 2. AI Onboarding & Behavior Manifesto (`docs/AI_ONBOARDING.md`)
- **Status:** [Done]
- **Goal:** The mandatory "Read First" file for any AI assistant.
- **Content:** Defines the Human-as-Architect/AI-as-Lead-Dev hierarchy, documents past behavioral anti-patterns, and defines communication signals (e.g., "Strong feedback means STOP and re-ground").

### 3. Architectural Decision Records (`docs/decisions/`)
- **Status:** [Pending]
- **Goal:** An archive of technical choices.
- **Format:** Context -> Options -> Choice -> Consequences.
- **First ADRs to write:** Search Engine logic (B-Tree vs GIN), Ltree vs Adjacency List for hierarchy.

### 4. Functional Specifications (`docs/features/`)
- **Status:** [Pending]
- **Goal:** Describe the "Unwritten Rules" of the UI/UX.
- **Content:** Expected behaviors for the DataGrid, Activity Panel, and Details view that are not self-evident from the code.

### 5. Session Handover Protocol
- **Status:** [Done - Updated `AI_DEVELOPMENT_PROTOCOL.md`]
- **Goal:** Formalize the start of a new session.
- **Requirement:** AI must provide a "Project State Summary" and "Active Objective" based on documentation before emitting any code.

## Implementation Roadmap

- [x] Update `docs/AI_DEVELOPMENT_PROTOCOL.md` with Handover rules.
- [x] Create `docs/AI_ONBOARDING.md`.
- [x] Refactor `README.md` into the Project Atlas.
- [x] Create `docs/VISION_STATEMENT.md`.
- [ ] Backfill ADR-001: Hybrid Search Strategy.
- [ ] Backfill ADR-002: Hierarchical Data Persistence (Ltree).
- [ ] Create Spec: DataGrid Visual Behavior.
