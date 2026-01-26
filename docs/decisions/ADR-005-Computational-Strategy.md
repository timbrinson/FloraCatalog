# ADR-005: Principles of Computational Strategy (Hybrid Intelligence)

## Status
Decided (Codified June 2025; Updated January 2026)

## Context
FloraCatalog operates at the intersection of unstructured natural language (User search intent) and rigid international standards (ICN, ICNCP, WCVP). Over-reliance on AI for standardized tasks leads to "hallucinated" nomenclature (e.g., wrong quote marks for cultivars), high latency, and unnecessary API costs. Conversely, purely algorithmic systems fail to understand messy user inputs.

## Decision: The Hybrid Strategy
We adopt a **Hybrid Validation Pipeline** based on the following principles:

### 1. The Rule of Codified Standards (Deterministic Sovereignty)
*   **Principle:** Any process governed by established international standards (ICN, ICNCP) **must** be implemented via algorithms (Regex, string manipulation, logic gates).
*   **Why:** Algorithms provide 100% precision and predictability. A local formatting function will never "forget" a single quote or add a hallucinated space once the rule is codified.
*   **Application:** Scientific name assembly, rank-specific capitalization, and hybrid symbol (`×`) placement.

### 2. Identity Sovereignty (Atomic Token Standard)
*   **Principle:** Database interrogation must prioritize **Atomic Token Sets** (column-level equality) over literal name searches. 
*   **Protocol:** Follow **ADR-011**. Use atomic columns as the primary identity check, with the `taxon_name` string acting only as a secondary discovery fallback.
*   **Application:** Local discovery (Stage 0), Identity verification (Stage 3), and Lineage auditing (Stage 4).

### 3. The Rule of Ambiguity (AI as the Bridge)
*   **Principle:** AI is strictly reserved for the **boundaries of the system** where inputs are unstructured, natural, or non-deterministic.
*   **Why:** LLMs excel at mapping human intent ("that gold-leaved maple") to technical identifiers (*Acer palmatum* 'Katsura').
*   **Application:** Mapping common names to scientific baselines, extracting traits from narrative nursery descriptions, or parsing "messy" clipboard data from nursery websites.

### 4. The Scalability & Affordability Constraint
*   **Principle:** Favor **Client-Side (Browser) Logic** over **Server-Side (AI) Processing**.
*   **Why:** JavaScript running in the user's browser costs $0.00 and scales infinitely. AI API calls add cost, increase latency, and create a dependency on external service uptime.

### 5. The "Design-Time" vs. "Runtime" Distinction
*   **Principle:** Use the **Senior Lead Engineer (Design-Time AI)** to write robust, tested code that handles complex botanical rules, rather than asking a **Flash Model (Runtime AI)** to attempt those rules repeatedly for every user interaction.

### 6. The Latency Hierarchy
*   **Principle:** Deterministic code is executed in microseconds; AI inference is measured in seconds. 
*   **Strategy:** Any UI interaction requiring "Immediate Feedback" (Typing, Sorting, Formatting) must use Algorithms. AI is strictly reserved for "Asynchronous Discovery" where the user initiates a request and expects a processing delay.

## Consequences
*   **Consistency:** Plant name formatting will follow strict, repeatable patterns regardless of the AI model's "mood" or temperature settings.
*   **Performance:** The app will feel faster as fewer operations require a round-trip to the Gemini servers.
*   **Development Cost:** This requires more intentional engineering during design-time (writing the regex and logic) but results in a lower technical debt and a more professional-grade tool.