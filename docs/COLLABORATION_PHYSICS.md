# The Physics of AI Collaboration (Human & AI Standards)

This document serves as a permanent record of the underlying "Physics" of our collaboration. It identifies the built-in biases of the AI engine and provides established strategies for the Human Architect to avoid, remediate, or recoup from regressions.

## 1. The Built-in Biases (Root Causes)

### A. The Brevity (Summarization) Bias
*   **The Root:** LLMs are trained to be concise and efficient. The engine instinctively views long documentation or repetitive logic as "fluff" and attempts to "clean it up" to save tokens.
*   **The Result:** High-fidelity specifications (like the 18 Ingestion Scenarios) get reduced to a few bullets, losing the edge cases critical for engineering.
*   **Trigger Condition:** High volume of text in a single file or long sessions where the engine seeks to "summarize" the state.

### B. The "Optimization" (Fix-it) Bias
*   **The Root:** The AI is programmed to be "helpful." If it identifies code that violates standard (non-botanical) conventions—like camelCase vs. snake_case—it feels an internal probabilistic pressure to "fix" it.
*   **The Result:** Unsolicited refactors that break database mappings or UI state.
*   **Trigger Condition:** Active bug-fixing or troubleshooting where the priority shifts entirely to "solving the error" at the cost of the project's rigid protocols.

### C. The Recency (Context Drift) Bias
*   **The Root:** The "Attention Mechanism" of an LLM naturally weights the most recent messages higher than earlier context.
*   **The Result:** Foundational decisions (ADRs) or early rules (The Zero-Action Rule) are "forgotten" as they are pushed further back in the prompt history.
*   **Trigger Condition:** Long conversations with many turns or session timeouts.

---

## 2. Collaboration Strategies (The Counter-Weights)

### The "Audit & Restore" Command
When a bias causes a regression (e.g., a spec is summarized), the Human Architect should not just say "put it back."
*   **Command Pattern:** *"Compare your last output of [File] with the version from [Session Start]. List the specific sentences or items you removed. Then, provide the full, lossless restoration."*
*   **Effect:** Forces the AI to perform a direct diff rather than relying on its summarized "memory."

### The Checksum (Count) Rule
To prevent data loss in backlogs or lists, use explicit counts.
*   **Command Pattern:** *"Verify that your next XML block contains exactly 18 logic scenarios. State the count before emitting the code."*
*   **Effect:** Uses the AI's logical processing to verify its own output against the physical requirements.

### Protocol Re-Grounding
If the AI drifts into optimization or unsolicited refactors, the session must be paused.
*   **Command Pattern:** *"Stop. Re-read ADR-004 and the AI Development Protocol. Your solution must respect the literal nomenclature."*
*   **Effect:** Forces the engine to re-load early-context documents into its high-weight attention window.

### Anchoring
Periodically ask the AI to state its understanding of a specific sovereign document.
*   **Command Pattern:** *"Summarize the current state of the Ingestion Spec relative to the implementation."*
*   **Effect:** Synchronizes the "Mental Model" between the Human and the AI.

---

## 3. Human Guardrails (How to Avoid AI Drift)

1.  **Literal Preservation Clause:** Always remind the AI that documentation is "immutable" unless specifically being edited for content.
2.  **Guardrail Headers:** Start sensitive prompts with a "Guardrail Header" listing the active ADRs (e.g., *"Protocol Check: ADR-004 active"*).
3.  **The "Go" Protocol:** Never let the AI proceed with a plan that includes "Clean up" or "Refactor" without a specific list of what is being changed.

---

## 4. Recouping from Errors
If an "Internal Error" or timeout occurs, **immediate re-grounding is mandatory.** The AI must read the documentation folder and provide a state summary before any further code is written. This prevents the "Panic Loop" where the AI tries to fix an error using outdated or hallucinated context.