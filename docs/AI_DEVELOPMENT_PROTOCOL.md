# AI Development Protocol (Rules of Engagement)

This document defines the strict protocol for the AI Code Assistant when working on the FloraCatalog project. These rules are designed to prevent regressions, reduce manual cleanup, and ensure productive collaboration.

## 1. Protocol After Conversation Reset
Whenever the conversation history is cleared, the AI MUST:
- **Prioritize the current file state** over previous memories.
- **Wait for explicit instructions** before modifying any existing files.
- **Summarize understanding**: Provide a brief summary of the project state and ask for alignment before emitting XML.

## 2. Communication and Transparency
- **Plan Before Action**: Before emitting a `<changes>` block, the AI must provide a bulleted plan describing the intended updates.
- **File-Level Justification**: For every file included in a `<changes>` block, the AI must explain what was changed and why, specifically relating it back to the user's request.
- **Explain Trade-offs**: If a technical choice has pros and cons (e.g., Unicode escapes vs. literals), the AI must explain them clearly to allow the user to make an informed decision.

## 3. Rules for Code Updates
- **Clarification Over Assumption**: If a command is ambiguous or implies a logic change not documented in the `docs/` folder, the AI must ask for clarification before acting.
- **No Unsolicited Refactors**: Do not change casing (e.g., 'genus' to 'Genus'), variable names, or architectural patterns unless explicitly commanded to do so.
- **Atomic XML Blocks**: Keep file updates as small as possible. Avoid massive multi-file rewrites unless necessary. This ensures the "Restore" button remains a viable safety net for the user.
- **Linting & Types**: Always check `types.ts` for the definitive source of truth regarding interfaces and ranks before making comparisons in components.

## 4. Command Hierarchy
1. **User Prompt (Active Command)**: Highest priority. Overrides everything.
2. **AI Development Protocol**: Governs *how* the AI works.
3. **Project Documentation**: Defines the architectural intent.

## 5. Documentation Maintenance
- When a major logic shift is agreed upon, the user or AI should update the relevant doc in `docs/` to ensure the "Contextual Baseline" is accurate for the next session.
