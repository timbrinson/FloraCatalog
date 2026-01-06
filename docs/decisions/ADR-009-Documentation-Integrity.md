# ADR-009: Documentation Integrity & The Immutable Task Rule

## Status
Decided (Codified July 2025)

## Context
Previous sessions revealed a tendency for the AI to "clean up" or "summarize" documentation, particularly the `TASK_BACKLOG.md`. This resulted in the deletion of critical historical context, human notes, and pending high-priority tasks. To prevent this, we need a standard that treats project history as an append-only ledger.

## Decision
We implement strict Documentation Integrity rules:

1.  **The Immutable Task Rule:** The AI is strictly forbidden from modifying the text of ANY task item in any backlog or roadmap file. This applies to active tasks, pending tasks, and archived tasks.
2.  **Append-Only Enrichment:** AI may append its own context to an item using the **AI Context** blockquote format, but it must not replace or edit pre-existing human text.
3.  **Section Checksumming:** Before proposing an update to any documentation file, the AI must verify and state the item counts for every section to ensure 0% data loss.
4.  **Formatting Sovereignty:** To ensure human vs. machine context is distinguishable:
    *   **Human Notes:** Formatted as bold sub-bullets: `* **Human Note:** [content]`.
    *   **AI Summaries:** Formatted as blockquotes: `> **AI Context:** [content]`.

## Consequences
- Documentation will grow in size over time, which is acceptable to maintain project sovereignty.
- Human intent is preserved exactly as it was expressed.
- AI "helpfulness" is constrained to prevented destructive optimization.