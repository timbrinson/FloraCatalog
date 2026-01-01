# ADR-004: Universal Naming Standardization (Database Literal Sovereignty)

## Status
Decided (Codified in Development Protocol)

## Context: The "Mapping Tax"
Traditionally, full-stack applications maintain separate naming conventions for different technologies:
*   **Database (PostgreSQL):** `snake_case` (e.g., `infraspecific_rank`)
*   **Frontend (TypeScript/React):** `camelCase` (e.g., `infraspecificRank`)

This requires a "Translation Layer" (mappers) to convert data format in real-time as it moves between tiers. In an AI-driven development environment, this translation layer is a primary source of technical debt and silent failures.

## The Problem
1.  **Translation Hallucination:** The AI assistant frequently assumes a mapping exists when it doesn't, or uses the "natural" camelCase name while the mapping layer expects the raw literal, leading to data loss or UI rendering bugs.
2.  **Runtime vs. Compile-Time Errors:** Mapping errors are often silent runtime bugs (blank values in the grid) rather than hard syntax errors.
3.  **Efficiency Drain:** Adding a single field requires updates in the SQL schema, the TypeScript interface, and both directions of the mapping logic (`mapFromDB` and `mapToDB`).

## Decision: Identity Over Convention
For this project, **Database Literals are the sovereign naming standard.** 

The application will use `snake_case` property names (e.g., `taxon.infraspecific_rank`) in all tiers:
1.  **Database:** Table columns.
2.  **API Service:** Query results and payload keys.
3.  **TypeScript:** Interface definitions.
4.  **React:** Component props, state, and rendering logic.

## Rationale & Deep Analysis

### 1. Identity > Convention
Human conventions like camelCase in JavaScript are relics of manual coding styles designed for human readability. In a system where the AI is the primary engineer, **Identity (Name A = Name B)** is infinitely more valuable than **Convention.** 

### 2. Elimination of "Translation Hallucination"
By removing the translation layer, we eliminate the AI's need to "guess" how a field has been mapped. If I see a column name in the database schema, I use that exact string in the UI. There is no middle-man logic to misinterpret.

### 3. Shift to Compile-Time Safety
Standardizing the TypeScript interfaces to match the DB schema literals turns naming mismatches into hard syntax errors. If an AI (or human) accidentally uses a camelCase variant, TypeScript will flag it immediately during development, preventing runtime data-loading bugs from ever reaching the user.

### 4. Saliency & Auditability
Contextual saliency is improved. When looking at a bug in the UI, the property name matches the database column name character-for-character. This makes the system "Transparent" from the storage engine to the screen.

## Consequences
*   **Aesthetic Cost:** The code will violate "standard" JavaScript style guides.
*   **Refactor Requirement:** Existing camelCase properties in the `Taxon` interface and all React components must be systematically refactored to `snake_case`.
*   **Mapper Simplification:** The `dataService` mappers can be significantly reduced or eliminated, as database rows can be cast directly to TypeScript interfaces without transformation.
