
// Minimal Utils for URL Encoding
// import { PRESET_THEMES } from './components/MapApplication'; // Avoid circular dependency

// Mappings
const THEME_CHAR_MAP = {
    'nyc': 'y',
    'classic': 'k',
    'forest': 'f',
    'ocean': 'o',
    'minimal': 'm',
    'custom': 'z',
    'neon': 'j', // Just assigning chars securely
    'sunset': 's',
    'nature': 'e'
};

const CHAR_THEME_MAP = Object.entries(THEME_CHAR_MAP).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});

export function encodeMapState({
    vizMode,
    appearance,
    showRegularPoints,
    showPointBorders,
    showBloom,
    activeThemeId,
    customColors,
    segmentThemeOverrides
}) {
    let flags = '';

    // Flags
    if (appearance === 'light') flags += 'l';
    if (vizMode === 'points') flags += 'p';
    if (vizMode === 'clusters') flags += 'c';
    if (showRegularPoints) flags += 'r';
    if (showPointBorders) flags += 'b';
    if (showBloom === false) flags += 'n'; // 'n' = No Bloom (Default is on)

    // Global Theme
    let themeStr = '';
    if (activeThemeId === 'custom') {
        themeStr += 'z';
        // Append Hex: zBG-HL (remove #)
        const bg = customColors.bg.replace('#', '');
        const hl = customColors.hl.replace('#', '');
        themeStr += `${bg}-${hl}`;
    } else {
        // If theme is 'nyc' (Default), we OMIT the char.
        // Otherwise append it.
        const char = THEME_CHAR_MAP[activeThemeId];
        if (char && activeThemeId !== 'nyc') themeStr += char;
    }

    // Overrides
    let overridesStr = '';
    if (segmentThemeOverrides && Object.keys(segmentThemeOverrides).length > 0) {
        const parts = [];
        Object.entries(segmentThemeOverrides).forEach(([idx, themeId]) => {
            if (themeId === 'custom') {
                // If we support per-segment custom colors, we need that data.
                // Assuming segmentCustomColors[idx] exists
                // For now, simpler implementation: just global custom colors for overrides? 
                // "If I have multiple keywords and formatted them... specific colors"
                // The current App structure assumes Global Custom Colors. 
                // Does 'segmentThemeOverrides' allow 'custom'? 
                // The current logic passes 'id' to setSegmentThemeOverrides.
                // If id is 'custom', it uses GLOBAL custom colors.
                // So valid check:
                const bg = customColors.bg.replace('#', '');
                const hl = customColors.hl.replace('#', '');
                parts.push(`${idx}Z${bg}-${hl}`);
            } else {
                const char = THEME_CHAR_MAP[themeId];
                if (char) parts.push(`${idx}${char}`);
            }
        });
        if (parts.length > 0) overridesStr = '~' + parts.join('.');
    }

    return flags + themeStr + overridesStr;
}

export function decodeMapState(tStr) {
    if (!tStr) return null;

    const state = {
        appearance: 'dark', // Default
        vizMode: 'heatmap',
        showBloom: true,   // Default: Bloom Enabled
        showRegularPoints: false,
        showPointBorders: false,
        activeThemeId: 'nyc', // Default
        customColors: { bg: '#000000', hl: '#ff0000' }, // Defaults
        segmentThemeOverrides: {}
    };

    // Split Overrides
    const [mainPart, overridePart] = tStr.split('~');

    // Parse Flags & Main Theme
    // We scan mainPart.
    // Known flags: l, p, c, r, n
    // Theme chars: t, y, f, o, m, z
    // z is special (followed by hex)

    let i = 0;
    while (i < mainPart.length) {
        const char = mainPart[i];

        if (char === 'l') state.appearance = 'light';
        else if (char === 'p') state.vizMode = 'points';
        else if (char === 'c') state.vizMode = 'clusters';
        else if (char === 'r') state.showRegularPoints = true;
        else if (char === 'b') state.showPointBorders = true;
        else if (char === 'n') state.showBloom = false; // 'n' = No Bloom

        // Themes
        else if (CHAR_THEME_MAP[char]) {
            state.activeThemeId = CHAR_THEME_MAP[char];
        }
        else if (char === 'z') {
            state.activeThemeId = 'custom';
            // Parse Hex: zRRGGBB-RRGGBB
            // Advance i
            const rest = mainPart.slice(i + 1);
            // Match hex pattern: ([0-9a-fA-F]{3,6})-([0-9a-fA-F]{3,6})
            // Simple approach: take next 13 chars? (6+1+6)
            // Or Regex match from this point
            const match = rest.match(/^([0-9a-fA-F]{3,6})[-_]([0-9a-fA-F]{3,6})/);
            if (match) {
                state.customColors = {
                    bg: '#' + match[1],
                    hl: '#' + match[2]
                };
                i += match[0].length; // Skip the hex part
            }
        }

        i++;
    }

    // Parse Overrides
    if (overridePart) {
        const segments = overridePart.split('.');
        segments.forEach(seg => {
            // Format: [Index][Char] or [Index]Z[Hex]
            // Extract index (integers)
            const idxMatch = seg.match(/^(\d+)(.*)/);
            if (idxMatch) {
                const idx = parseInt(idxMatch[1]);
                const content = idxMatch[2];

                if (content.startsWith('Z')) {
                    // Custom Color Override
                    // Currently app only supports Global Custom Colors, so 'custom' usually means use Global Custom.
                    // But if protocol supports specific custom colors, we'd need to extend app state.
                    // For now, map to 'custom' theme ID.
                    state.segmentThemeOverrides[idx] = 'custom';

                    // Note: If we really wanted unique Custom Colors per segment, we'd need to store them in a dictionary
                    // e.g. segmentCustomColors[idx] = { ... }
                    // The App does not currently seem to contain 'segmentCustomColors' state in MapApplication.
                    // It uses 'customColors' (global). 
                    // So we just set ID to 'custom'. 
                } else {
                    const themeId = CHAR_THEME_MAP[content];
                    if (themeId) state.segmentThemeOverrides[idx] = themeId;
                }
            }
        });
    }

    return state;
}
