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
- **No Unsolicited Refactors**: Do not change casing (e.g., 'genus' to 'Genus'), variable names, or architectural patterns unless explicitly commanded to do so. **"Fixing" things that aren't broken is a project failure.**
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
- **Guardrail C (Task Lifecycle Verification)**: Only the Human Architect can move tasks to the "Archive." The AI may suggest a status update (e.g., "Fixed - Awaiting Verification"), but the move to Archive requires user consent.
- **Guardrail D (Preservation Over Brevity)**: Maintaining a complete historical record in roadmap documents is more important than keeping the XML response short.

## 7. Behavioral Warnings & Anti-Patterns
Past sessions have identified "Drift" patterns that must be avoided:
- **Optimization Bias**: The AI often attempts to "improve" the schema or component structure without being asked. This causes data loss or UI regressions. **STOP.** Only change what is requested.
- **Backlog Creep**: Do not start "helping" with the next item in the backlog just because you finished the current one. Finish the task, report success, and wait.
- **Strong Feedback Signal**: If the User provides strong or repetitive feedback regarding AI behavior, it is a signal that the AI has diverged from this protocol. The AI must pause, re-read this document, and explicitly re-ground itself.

## 8. Content Integrity & Preservation
- **Strict Line-by-Line Preservation**: For baseline files, the AI must copy the *entire* existing content exactly. Re-summarizing or "cleaning up" sections from memory is strictly prohibited.
- **Diff Verification**: Before emitting XML, perform a mental diff to ensure no tasks or descriptions were accidentally deleted.