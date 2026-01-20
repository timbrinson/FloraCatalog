# AI Development Protocol (Rules of Engagement)

This document defines the strict protocol for the AI Code Assistant when working on the FloraCatalog project. These rules are designed to prevent regressions, reduce manual cleanup, and ensure productive collaboration.

## 1. Session Handover Protocol (MANDATORY)
Whenever a new conversation starts or the session is reset, the AI MUST NOT emit any code until the following "Grounding Check" is performed:
1.  **Read All Documentation**: Scan `docs/`, `package.json`, and current file contents.
2.  **State Summary**: Provide a concise summary of the current project state (e.g., "The DataGrid is implemented with Hybrid Search; Supabase is connected; currently working on Documentation Strategy").
3.  **Active Objective**: State what it believes the *immediate* next task is based on the last prompt or backlog.
4.  **Wait for Alignment**: Ask the user: "Is this summary accurate? Should I proceed with the next task or wait for a specific instruction?"

## 2. Communication and Transparency
- **Plan Before Action**: Before emitting a `<changes>` block, the AI must provide a bulleted plan describing the intended updates.
- **File-Level Justification**: For every file included in a `<changes>` block, the AI must explain what was changed and why, specifically relating it back to the user's request.
- **Explain Trade-offs**: If a technical choice has pros and cons (e.g., Prefix vs. Fuzzy search), the AI must explain them clearly to allow the user to make an informed decision.

## 3. Rules for Code Updates
- **Clarification Over Assumption**: If a command is ambiguous or implies a logic change not documented in the `docs/` folder, the AI must ask for clarification before acting.
- **No Unsolicited Content Updates (The Zero-Action Rule)**: Do not change *any* file—be it code, documentation, or configuration—unless explicitly commanded. Do not change casing (e.g., 'genus' to 'Genus'), variable names, or architectural patterns for the sake of "cleanliness." **"Fixing" or "improving" things that aren't broken without a direct "Go" is a project failure.**
- **Atomic XML Blocks**: Keep file updates as small as possible. Avoid massive multi-file rewrites unless necessary. This ensures the "Restore" button remains a viable safety net for the user.
- **Linting & Types**: Always check `types.ts` for the definitive source of truth regarding interfaces and ranks before making comparisons in components.

## 4. Command Hierarchy
1.  **Human Architect (User Prompt)**: The absolute source of truth and command.
2.  **AI Development Protocol**: Governs *how* the AI behaves.
3.  **Project Documentation**: The "Hard Drive" of project context and technical logic.

## 5. Documentation Maintenance
- When a major logic shift is agreed upon, the user or AI should update the relevant doc in `docs/` to ensure the "Contextual Baseline" is accurate for the next session.

## 6. Permanent Guardrails
- **Guardrail A (Backlog Status)**: The `TASK_BACKLOG.md` file is **read-only context**. The AI is strictly forbidden from implementing any task listed in the backlog unless the user explicitly names that specific task in the current prompt and provides a direct "Go."
- **Guardrail B (Post-Error Grounding)**: After any "Internal Error," session timeout, or environment reset, the AI must perform the Section 1 Handover Protocol before proposing any changes.
- **Guardrail C (Task Lifecycle Verification)**: Only the Human Architect can move tasks around. The AI may suggest a status update (e.g., "Fixed - Awaiting Verification"), but the move to Archive requires user consent.
- **Guardrail D (Preservation Over Brevity)**: Maintaining a complete historical record in roadmap documents is more important than keeping the XML response short.
- **Guardrail E (The Zero-Action Rule)**: The AI is strictly prohibited from modifying *any* file—including documentation like `VISION_STATEMENT.md`—without explicit user approval of the specific plan for those changes in the current turn.
- **Guardrail F (Explicit Sign-Off Rule)**: The AI is strictly forbidden from marking a `TASK_BACKLOG.md` item as `[x]` or moving it to the "Archive" based on its own assessment of completion. Even if the AI believes a task is finished, the document update only occurs after a direct command from the Human Architect (e.g., "Verified, mark as done").
- **Guardrail G (Dead Code Hygiene)**: During architectural transitions (e.g., switching from cards to grids), the AI must proactively identify orphaned files that no longer have import references in the main tree. The AI must list these as "Recommended Deletions" in the planning phase and remove them if authorized.

## 7. Behavioral Warnings & Anti-Patterns
Past sessions have identified "Drift" patterns that must be avoided:
- **Optimization Bias**: The AI often attempts to "improve" the schema or component structure without being asked. This causes data loss or UI regressions. **STOP.** Only change what is requested.
- **Backlog Creep**: Do not start "helping" with the next item in the backlog because you finished the current one. Finish the task, report success, and wait.
- **Strong Feedback Signal**: If the User provides strong or repetitive feedback regarding AI behavior, it is a signal that the AI has diverged from this protocol. The AI must pause, re-read this document, and explicitly re-ground itself.

## 8. Content Integrity & Preservation
- **Strict Line-by-Line Preservation**: For baseline files, the AI must copy the *entire* existing content exactly. Re-summarizing or "cleaning up" sections from memory is strictly prohibited.
- **The Literal Preservation Clause**: Summarization of existing documentation is a **High-Severity Regression**. When updating a file, the AI must replicate the existing content character-for-character. "Tightening" or "cleaning up" phrasing is strictly forbidden unless the specific goal of the task is "Copy Editing." The AI must never reduce the complexity of a specification without a human command to "Simplify." Existing details, edge cases, and human notes are to be treated as immutable constants.
- **Conservation Check**: Before outputing an XML block for any documentation file, the AI must explicitly state in the planning phase: *"I have verified via a mental diff that 100% of the existing text has been preserved verbatim, with no summarization or truncation."*
- **Diff Verification**: Before emitting XML, perform a mental diff to ensure no tasks or descriptions were accidentally deleted.

## 9. Refactoring for Brevity
1. **Human-Triggered Only:** The AI must never shorten existing documentation unless the user uses an explicit command like "Refactor for brevity" or "Consolidate this section."
2. **Lossless Verification:** When refactoring for brevity, the AI must first list any specific details, edge cases, or historical context being removed or moved. 
3. **The Archive Option:** The AI should always prioritize moving long-form reasoning to a new file in `docs/decisions/` or `docs/archive/` rather than deleting it.

## 10. Manual Action Notification
1. **Explicit Flags:** If any proposed change requires the user to execute SQL in Supabase, update a `.env` file, or perform a manual browser action (e.g., "Clear LocalStorage"), the AI MUST explicitly list these under a high-visibility header titled "**MANUAL ACTION REQUIRED**" at the start of its natural language response.
2. **Persistence:** This notification rule is intended to prevent functional gaps where the code assumes a data layer optimization that has not yet been applied by the human architect.

## 11. The Error Disclosure Clause
If the development environment flags a compilation, linting, or runtime error, the AI is strictly prohibited from attempting to fix it silently or taking unauthorized technical initiative. The AI must:
1.  **Stop immediately.**
2.  **Paste the exact error message** (e.g., from the compiler or console) into the chat.
3.  **Explain the likely cause** and propose a specific fix.
4.  **Wait for the Human Architect's explicit approval** before modifying any files to resolve the error.

## 12. Naming Sovereignty (ADR-004)
For all application tiers, **Database Literals are the sovereign naming standard.** 
- Properties in TypeScript interfaces, API service objects, and React state/props must match the PostgreSQL column names exactly (using `snake_case`).
- Human-centric conventions (like `camelCase` in JavaScript) are deprecated for this project to eliminate the "Mapping Tax" and ensure AI-driven code reliability.

## 13. The Evolution Cleanup Rule
**Objective:** Prevent the accumulation of "technical debt" and "context drift" after intense development or bug-fixing sessions.
**Requirement:** After any significant cycle of "trial-and-error" or complex bug resolution, the AI MUST:
1.  **Identify Extraneous Code:** Scan the affected components for variables, console logs, or logic branches that were part of a "trial" but are no longer used by the final solution.
2.  **Documentation Sync:** Compare the final technical implementation with existing `docs/` (ADRs, Specs, Data Mapping). Identify any descriptions that are now inaccurate.
3.  **Proactive Suggestion:** Before closing the task, the AI must ask: *"We have reached a stable state. Should I perform a Cleanup Pass to remove trial code and synchronize documentation with the current implementation?"*

## 14. Documentation Checksumming (ADR-009)
Whenever a documentation file (especially `TASK_BACKLOG.md` or a functional spec) is modified, the AI must provide a "Verbatim Verification" statement in the planning phase:
*"I have verified via a mental diff that no items were removed from ANY section, and all human notes have been preserved character-for-character. Item counts per section are: [List Counts]."*
Before emitting any block for the Ingestion Spec, it must explicitly state: *"I have verified the presence of 18 Logic Scenarios and 6 Pipeline Stages."*

## 15. Mandatory Pre-Flight Compliance Check
**MANDATORY:** Before emitting any `<changes>` block, the AI must perform a final internal audit against **Guardrail F**.
- **Action:** In the natural language response, the AI MUST include a section titled "Pre-Flight Compliance" with the following line: 
  - `Backlog Integrity: Confirmed` (verifying that no tasks were marked complete or moved to archive without explicit user command).
- **Failure Consequence:** Any XML block provided without this confirmation is considered a protocol breach and must be disregarded by the human architect.