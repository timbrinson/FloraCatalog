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
- **Status:** [Done]
- **Goal:** An archive of technical choices.
- **Format:** Context -> Options -> Choice -> Consequences.
- **Completed ADRs:** 
    - ADR-001: Hybrid Search Strategy.
    - ADR-002: Hierarchical Data Persistence (Ltree).
    - ADR-003: Maintenance Strategy (Split-Control Purge).
    - ADR-004: Universal Naming Standardization (Database Literal Sovereignty).
    - ADR-005: Principles of Computational Strategy (Hybrid Intelligence).

### 4. Functional Specifications (`docs/features/`)
- **Status:** [Pending]
- **Goal:** Describe the "Unwritten Rules" of the UI/UX.
- **Content:** Expected behaviors for the DataGrid, Activity Panel, and Details view that are not self-evident from the code.

### 5. Session Handover Protocol
- **Status:** [Done - Updated `AI_DEVELOPMENT_PROTOCOL.md`]
- **Goal:** Formalize the start of a new session.
- **Requirement:** AI must provide a "Project State Summary" and "Active Objective" based on documentation before emitting any code.

## The Shared Mental Model
The ultimate goal of every development cycle is to leave the documentation in a better state than it was found. This ensures that the "sync" achieved between the human architect and the AI is codified for future sessions. Documentation is the permanent bridge across session resets, preventing "contextual drift" and ensuring that the project's logic remains sovereign and accessible to both humans and machines. Every interaction should leave a record of the "Why" to maintain continuity.

## Documentation Maintenance Strategy
To balance high-fidelity detail with readability, the project employs a three-tiered approach to document volume control:

### Tier 1: The "Propose-First" Trimming Rule
The AI is prohibited from unilaterally shortening documentation. If a section becomes unwieldy, the AI must explicitly flag it as a "Maintenance Suggestion" in its response, asking the user whether to consolidate the text or move details to an archive.

### Tier 2: The "Side-Car Archive" Pattern
Instead of deleting detailed technical reasoning or historical context, "Side-Car" files are created. The main documentation remains focused on current rules/specs, while the "Why" and specific edge cases are moved to `docs/decisions/` or `docs/archive/`.

### Tier 3: The "Refactor for Brevity" Command
Brevity updates are only performed via explicit user commands (e.g., "Refactor this section for brevity"). During such an update, the AI must provide a "Lossless Check" in its plan, identifying exactly what context is being archived or removed before emitting code.

## Implementation Roadmap

- [x] Update `docs/AI_DEVELOPMENT_PROTOCOL.md` with Handover rules.
- [x] Create `docs/AI_ONBOARDING.md`.
- [x] Refactor `README.md` into the Project Atlas.
- [x] Create `docs/VISION_STATEMENT.md`.
- [x] Backfill ADR-001: Hybrid Search Strategy.
- [x] Backfill ADR-002: Hierarchical Data Persistence (Ltree).
- [x] Create ADR-003: Maintenance Strategy.
- [x] Create ADR-005: Computational Strategy.
- [ ] Create Spec: DataGrid Visual Behavior.