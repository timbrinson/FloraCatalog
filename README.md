# FloraCatalog: Project Atlas

FloraCatalog is a high-performance botanical database application designed to bridge the gap between static scientific checklists (Kew Gardens WCVP), horticultural registration standards (ICRA), and living garden collections. It serves as a Multi-Dimensional Data Dashboard for botanical precision, utilizing AI to anchor diverse records to authoritative designations and curate a shared Holistic Plant Archive.

## 🌿 Project Philosophy
- **Authoritative Anchoring:** We anchor garden collections to scientific standards (WCVP) and horticultural registration standards (ICRA) to ensure nomenclature remains precise and traceable.
- **Unified Knowledge:** We consolidate botanical information fragmented across specialized plant communities, specialist nurseries, universities, scientific organizations, online catalogs, and commercial sales sites.
- **UX Stability:** The application is a high-density professional tool. UI state preservation (filters, scroll, focus) is as critical as data accuracy.
- **AI as Curator:** Generative AI is used to parse, standardize, and mine data, always operating within the constraints of authoritative botanical rules.

## 🧠 Project Continuity & Knowledge Sovereignty
Documentation in this project is not merely "notes"—it is a primary deliverable. Our goal is to maintain a high-fidelity **Shared Mental Model** that allows any contributor, whether human or AI, to immediately grasp the architectural "Why" behind the technical "How." We treat our documentation as a living asset that must be improved in every session to ensure project longevity and synchronization clarity.

## 🗺️ Documentation Map
This project maintains a robust documentation layer in the `docs/` directory to preserve context across development sessions.

### Core Governance
- [**Vision & Context**](./docs/VISION_STATEMENT.md): **[Read Second]** Deep dive into the global state of botanical data and the mission to bridge scientific and horticultural records.
- [**AI Onboarding & Behavior**](./docs/AI_ONBOARDING.md): **[Read First]** The manifesto defining the Human-as-Architect / AI-as-Lead-Dev relationship.
- [**AI Development Protocol**](./docs/AI_DEVELOPMENT_PROTOCOL.md): Strict "Rules of Engagement" for code updates and session handovers.
- [**Documentation Strategy**](./docs/DOCUMENTATION_STRATEGY.md): The long-term plan for project context preservation.

### Technical Architecture
- [**Design Specifications**](./docs/DESIGN_SPECS.md): Deep dive into the React architecture, Grid visual rules, and UX logic.
- [**Data Model & Management**](./docs/DATA_MODEL.md): Schema design, Ltree hierarchy strategy, and data lineage philosophy.
- [**Data Mapping Table**](./docs/DATA_MAPPING.md): Field-level mapping between WCVP source data and the application database.
- [**Filter Strategies**](./docs/FILTER_STRATEGIES.md): Definitive logic for search engines (B-Tree vs GIN) and botanical filter values.

### Guides & Operations
- [**Setup Guide**](./docs/SETUP_GUIDE.md): Infrastructure configuration for Supabase and Gemini API.
- [**Automation & Build Plan**](./docs/AUTOMATION_PLAN.md): Documentation for the interactive CLI tool used to rebuild the database.
- [**Data Import Guide**](./docs/DATA_IMPORT_GUIDE.md): Step-by-step instructions for loading 1.4 million WCVP records.

### Roadmap & History
- [**Task Backlog**](./docs/TASK_BACKLOG.md): Active roadmap, pending features, and technical debt.
- [**Version History**](./docs/VERSION_HISTORY.md): Detailed release notes and bug fix logs.

## 🛠️ Tech Stack
- **Frontend:** React 19 (Strict Mode), TypeScript, Tailwind CSS.
- **Icons:** Lucide React.
- **Intelligence:** Google Gemini API (`@google/genai`).
- **Backend:** Supabase (PostgreSQL with `ltree` and `pg_trgm` extensions).

## 🚀 Quick Start
1. **Connect Database:** Click the **Settings (Gear Icon)** in the app header and enter your Supabase credentials.
2. **Build Database:** Run `npm run db:build` to initialize the schema and stream the WCVP dataset.
3. **Analyze:** Use the Multi-Dimensional Data Dashboard to filter by Rank, Status, or Name using the hybrid search engine.

---
*For botanical test cases and sample nomenclature, see [Test Data.md](./docs/Test%20Data.md).*