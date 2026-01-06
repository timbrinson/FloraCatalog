# ADR-008: Dynamic Rank Pallet Engine (Tailwind Mapping)

## Status
Decided (Implemented in v2.30.0)

## Context
Early versions of the Data Grid used a small set of "Optionpresest" (1a, 1b, etc.) to manage row background washes and text colors. As the application matured, it became clear that users needed granular aesthetic control to distinguish complex taxonomic levels (e.g., distinguishing between a Species Virtual Root and a real Infraspecies record).

## Options
1.  **Expanded Presets:** Create 10+ hardcoded themes.
    *   *Result:* High maintenance; never quite satisfying for all users.
2.  **Raw Hex Customization:** Allow users to pick any color via hex codes.
    *   *Result:* Risks "ugly" grids where colors don't harmonize or contrast properly.
3.  **Tailwind Weight Engine (Selected):** Allow users to select a base Tailwind color (e.g., 'rose', 'emerald') and specific weights for Cell BG, Text, Badge BG, and Badge Border.

## Decision
We implemented a **Dynamic Pallet Engine** based on the **Tailwind CSS v3 Color Palette**.
- **The Preference Schema:** Each rank (Family, Genus, Species, Infraspecies, Cultivar) has its own configuration object containing a `base_color` and four specific numeric weights.
- **Deterministic Rendering:** The grid calculates CSS classes in real-time (e.g., `bg-${color}-${weight}`) based on these preferences.
- **Integrated Legend:** The legend UI was updated to dynamically render using the active pallet, providing a "live" key to the grid's visual language.

## Consequences
- **User Agency:** Users can now tune the grid density and contrast to their specific monitor or visual preference.
- **Theme Obsolescence:** The `ColorTheme` type and its preset logic are removed from the codebase.
- **Performance:** Using Tailwind class interpolation requires that all possible color/weight combinations remain valid in the build (handled by the JIT compiler).
- **Aesthetic Consistency:** By restricting users to the Tailwind palette, we ensure that even custom colors maintain a professional, cohesive look and feel.