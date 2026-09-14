# URL State Sharing & Optimization

This application uses a Highly Optimized URL Schema to share map states concisely. The `?t=` query parameter encodes the entire visual configuration (Light/Dark mode, Visualization Mode, Toggles, Themes, and Custom Colors) using a compact, order-independent character set.

## Schema Overview

The `t` parameter consists of a **Global Config** string, optionally followed by **Keyword Override** segments.

Format: `?t=[GlobalFlagsAndTheme]~[Override1].[Override2]...`

### 1. Global Flags (Any Order)
These single letters allow "Human Readable" parsing (e.g., `l` for Light, `p` for Points).

| Character | Meaning | Default State |
|-----------|---------|---------------|
| `l` | **Light Mode** | Dark Mode |
| `p` | **Points Mode** | Heatmap |
| `c` | **Clusters Mode** | Heatmap |
| `r` | **Show Regular Points** | Hidden |
| `b` | **Show Borders** | Hidden (Default) |

### 2. Global Theme (Select One)
Only one global theme character is active. If multiple are present, the last one takes precedence.

| Character | Theme Name |
|-----------|------------|
| `t` | **Taxi** (Default) |
| `y` | **NYC** (Yellow/Blue) |
| `f` | **Forest** (Green/Orange) |
| `o` | **Ocean** (Blue/Teal) |
| `m` | **Minimal** (B&W) |
| `z` | **Custom** (See Custom Syntax) |

### 3. Custom Color Syntax
If `z` (Global) or `Z` (Override) is used, it must be immediately followed by the hex codes for Background and Highlight, separated by underscore or hyphen.
*   Format: `z<BG_HEX>-<HL_HEX>`
*   Example: `z000000-ff0000` (Black BG, Red HL)
*   Shorthand Hex keys (`f00`) are supported if 3 chars.

### 4. Keyword Overrides (`~`)
Specific colors for specific keywords (indices) are appended after a `~` tilde separator. Each override is separated by a `.` dot.

*   Format: `[Index][ThemeChar]`
*   Example: `0f` (Keyword 0 uses Forest)
*   Example: `1y` (Keyword 1 uses NYC)
*   Example: `2Zffffff-000000` (Keyword 2 uses Custom White/Black)

## Examples

*   **Dark Heatmap (Default)**: `?q=flower` (No `t` needed)
*   **Light Mode**: `?t=l`
*   **Points Mode + Forest Theme**: `?t=pf` (Order independent: `fp` works too)
*   **Light + Clusters + Ocean + No Borders**: `?t=lcon`
*   **Default Mode for Kw0, but Ocean for Kw1**: `?t=~1o`
*   **Complex**: Light Points, Minimal Global, Kw0 Custom Blue:
    *   `?t=lpm~0Zffffff-0000ff`

## Extensibility
*   **Infinite Keywords**: The override section supports any integer index (e.g., `100f`).
*   **New Themes**: Simply add a new character mapping in `urlUtils.js`.
*   **New Toggles**: Add a new Flag character.

This design ensures URLs remain short for common cases (1-3 chars) while scaling to support fully custom configurations without breaking.
