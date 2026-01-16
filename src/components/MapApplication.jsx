import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition, useLayoutEffect } from 'react';
import posthog from 'posthog-js';
import MapConfig from './MapConfig';
import ImageViewer from './ImageViewer';
import { Search, MapPin, X, Menu, Sun, Moon, ArrowLeft, Palette, Settings, Layers, Hash, Camera, CornerUpRight, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { takeScreenshot, generateScreenshotName } from '../utils/screenshot';
import SearchLegend from './SearchLegend';
import ThemeMenu from './ThemeMenu';
import { encodeMapState, decodeMapState } from '../mapUrlUtils';

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export const PRESET_THEMES = {
    classic: { name: 'Classic', bg: '#3b82f6', hl: '#ef4444' }, // Blue / Red
    forest: { name: 'Forest', bg: '#059669', hl: '#fbbf24' }, // Green / Amber
    ocean: { name: 'Ocean', bg: '#0ea5e9', hl: '#a855f7' }, // Sky / Purple
    nyc: { name: 'Taxi', bg: '#64748b', hl: '#eab308' }, // Slate / Yellow
    neon: { name: 'Neon', bg: '#2dd4bf', hl: '#f472b6' }, // Teal / Pink
    sunset: { name: 'Sunset', bg: '#f97316', hl: '#8b5cf6' }, // Orange / Violet
    minimal: { name: 'Mono', bg: '#171717', hl: '#e5e5e5' }, // Black / White
    nature: { name: 'Earth', bg: '#57534e', hl: '#84cc16' }, // Stone / Lime
};

// Custom dark background requested by user
const DARK_BG = '#272a2f';
const API_BASE = "http://127.0.0.1:5001";
const CDN_BASE = import.meta.env.VITE_CDN_URL || '';

function MapApplication() {
    const [locations, setLocations] = useState([]);
    const [matchedIds, setMatchedIds] = useState(new Set());
    const [pointColors, setPointColors] = useState(new Map()); // Added state for colors
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('q') || '';
    });
    const [loading, setLoading] = useState(true);
    const [isIndexReady, setIsIndexReady] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const inputRef = useRef(null);

    // Track loaded shards to avoid re-fetching
    const loadedShardsRef = useRef(new Set());
    const [fetchingShards, setFetchingShards] = useState(false);

    // Interruptible Search Transition
    const [isPending, startTransition] = useTransition();

    // Theme & Mode State
    const [appearance, setAppearance] = useState('dark');
    const [activeThemeId, setActiveThemeId] = useState('nyc');
    const [customColors, setCustomColors] = useState({ bg: '#000000', hl: '#ff0000' });
    const [hasModifiedCustom, setHasModifiedCustom] = useState(false);
    const [vizMode, setVizMode] = useState('heatmap'); // 'points', 'heatmap', 'clusters'
    const [showRegularPoints, setShowRegularPoints] = useState(false);
    const [showPointBorders, setShowPointBorders] = useState(false);
    const [showBloom, setShowBloom] = useState(true); // Default to TRUE

    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
    const [legendMenuIdx, setLegendMenuIdx] = useState(null);

    // Menu Toggles (Exclusive)
    const toggleThemeMenu = () => {
        const next = !isThemeMenuOpen;
        setIsThemeMenuOpen(next);
        if (next) {
            setIsModeMenuOpen(false);
            setLegendMenuIdx(null); // Close legend menu
        }
    };

    const toggleModeMenu = () => {
        const next = !isModeMenuOpen;
        setIsModeMenuOpen(next);
        if (next) {
            setIsThemeMenuOpen(false);
            setLegendMenuIdx(null); // Close legend menu
        }
    };

    const toggleLegendMenu = (idx) => {
        // Toggle specific index or close if null
        setLegendMenuIdx(prev => (prev === idx ? null : idx));
        // Always close top menus if opening legend
        if (idx !== null) {
            setIsThemeMenuOpen(false);
            setIsModeMenuOpen(false);
        }
    };



    // Suggestion Filters UI State
    const [isFiltersOpen, setIsFiltersOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Legend State
    const [searchSegments, setSearchSegments] = useState([]); // Array of { label, color, count, themeId }
    const [segmentThemeOverrides, setSegmentThemeOverrides] = useState({}); // Index -> themeId

    // URL State Hydration (On Mount)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tParam = params.get('t');
        if (tParam) {
            const decoded = decodeMapState(tParam);
            if (decoded) {
                if (decoded.vizMode) setVizMode(decoded.vizMode);
                if (decoded.appearance) setAppearance(decoded.appearance);
                if (decoded.showRegularPoints !== undefined) setShowRegularPoints(decoded.showRegularPoints);
                if (decoded.showPointBorders !== undefined) setShowPointBorders(decoded.showPointBorders);
                if (decoded.showBloom !== undefined) setShowBloom(decoded.showBloom); // Hydrate Bloom State
                if (decoded.activeThemeId) setActiveThemeId(decoded.activeThemeId);
                if (decoded.customColors && decoded.customColors.bg && decoded.customColors.hl) {
                    setCustomColors(decoded.customColors);
                    setHasModifiedCustom(true);
                }
                if (decoded.segmentThemeOverrides) {
                    setSegmentThemeOverrides(decoded.segmentThemeOverrides);
                }
            }
        }
    }, []);

    // URL State Update (On Change)
    useEffect(() => {
        const tStr = encodeMapState({
            vizMode,
            appearance,
            showRegularPoints,
            showPointBorders,
            showBloom, // Encode Bloom State
            activeThemeId,
            customColors: hasModifiedCustom ? customColors : { bg: '#000000', hl: '#ff0000' },
            segmentThemeOverrides
        });

        const url = new URL(window.location);
        if (tStr) {
            url.searchParams.set('t', tStr);
        } else {
            url.searchParams.delete('t');
        }

        window.history.replaceState({}, '', url);
    }, [vizMode, appearance, showRegularPoints, showPointBorders, showBloom, activeThemeId, customColors, segmentThemeOverrides, hasModifiedCustom]);

    // Derive current colors (Hoisted to avoid ReferenceError in search effect)
    const currentColors = useMemo(() => {
        if (activeThemeId === 'custom') return customColors;

        // Special handling for Mono theme in Light Mode (Invert)
        if (activeThemeId === 'minimal' && appearance === 'light') {
            return { name: 'Mono', bg: '#ffffff', hl: '#000000' };
        }

        return PRESET_THEMES[activeThemeId] || PRESET_THEMES['nyc'];
    }, [activeThemeId, customColors, appearance]);

    // Color Helpers
    // Analogous Palette Generation (Simple rotation)
    // Analogous Palette Generation (Relative to Primary Theme)
    const getSegmentColor = useCallback((index, baseHl) => {
        if (index === 0) return baseHl; // Primary

        // Find the index of the current base highlight color in our PRESET_THEMES
        // This ensures that "idx 1" is always "Next Theme" relative to "Current Theme"
        const themes = Object.values(PRESET_THEMES);
        const currentThemeIdx = themes.findIndex(t => t.hl === baseHl);
        const startIdx = currentThemeIdx !== -1 ? currentThemeIdx : 0; // Default to 0 if custom

        // Cycle through themes based on offset
        // offset = 1 means "Next Theme", etc.
        const targetTheme = themes[(startIdx + index) % themes.length];

        return targetTheme.hl;
    }, []);

    // Search State
    const [suggestions, setSuggestions] = useState([]);
    const [isFocused, setIsFocused] = useState(false);
    const [totalImageMatches, setTotalImageMatches] = useState(0);
    const [isExporting, setIsExporting] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [hasReadStory, setHasReadStory] = useState(false);

    // Bitmask Helpers
    const getBitCount = (mask) => {
        let count = 0;
        let m = mask;
        while (m > 0) {
            if (m & 1) count++;
            m >>= 1;
        }
        return count;
    };

    const getFirstBearing = (mask) => {
        const bearings = [0, 45, 90, 135, 180, 225, 270, 315];
        for (let i = 0; i < 8; i++) {
            if (mask & (1 << i)) return bearings[i];
        }
        return 0;
    };

    // DJB2 Hash for Sharding
    const hashDJB2 = (s) => {
        let h = 5381;
        for (let i = 0; i < s.length; i++) {
            h = ((h << 5) + h) + s.charCodeAt(i);
        }
        return h >>> 0;
    };

    // Screenshot State
    const [screenshotToast, setScreenshotToast] = useState(null); // { message: string, type: 'success'|'error' }

    // State for responsive tracking
    const [layoutTick, setLayoutTick] = useState(0);
    // Refs (Defined early to avoid ReferenceError)
    // Refs
    // tagCountsRef: NOW STORES THE SEARCH INDEX (Tag -> [IDs]) loaded from file
    const tagCountsRef = useRef(new Map());
    const allTags = useRef([]);
    const tagBearingMapRef = useRef(null); // Now stores a Cache of fetched shards
    const currentSearchMasksRef = useRef(new Map()); // id -> mask for current search
    const hoverTimeoutRef = useRef(null);
    const lastHoveredShardRef = useRef(null);

    // Load Data: Lean Locations + Search Index
    // Smart Tag Wrapping Logic
    const [riskyTags, setRiskyTags] = useState(new Set());
    const tagsContainerRef = useRef(null);
    const moreSpanRef = useRef(null);
    const tagRefs = useRef(new Map());
    const mapRef = useRef(null);

    // Cache valid location IDs for filtering search results
    const validLocationIds = useMemo(() => new Set(locations.map(l => String(l.i))), [locations]);

    const visibleTags = useMemo(() => {
        if (!selectedLocation) return [];
        if (!selectedLocation.t) return [];

        const filtered = selectedLocation.t.filter(t => {
            // Safety: If index is empty (failed load), show all tags
            if (tagCountsRef.current.size === 0) return true;

            // Relaxed filter: Show tags even with low counts, just filter blocklist
            // FIX: tagCountsRef stores Object values (lid -> mask), so we use Object.keys().length for unique locations
            const lidMasks = tagCountsRef.current.get(t);
            const count = lidMasks ? Object.keys(lidMasks).length : 0;
            return count >= 1; // Show anything that exists in index (or everything if we remove this check)
        }).filter(t => !['have', 'around', 'near', 'next', 'feature', 'structure', 'looking', 'standing', 'front', 'seen', 'view', 'time', 'urban', 'significant', 'visual', 'representation', 'style', 'indicates', 'suggesting', 'foreground', 'left', 'right', 'like', 'size', 'captures', 'background', 'indicated'].includes(t.toLowerCase()));

        const common = [];
        const rare = [];
        filtered.forEach(t => {
            // If index missing, treat all as common
            const lidMasks = tagCountsRef.current.get(t);
            const count = tagCountsRef.current.size > 0 ? (lidMasks ? Object.keys(lidMasks).length : 0) : 10000;
            if (count >= 1000) common.push(t); // Lowered threshold for "Common"
            else rare.push(t);
        });

        // Randomize pools
        common.sort(() => 0.5 - Math.random());
        rare.sort(() => 0.5 - Math.random());

        // Cap rare tags to 7 (half of 15 adjusted down)
        const selectedRare = rare.slice(0, 7);
        // Fill rest with common
        const selectedCommon = common.slice(0, 15 - selectedRare.length);

        // Combine and shuffle for display
        return [...selectedCommon, ...selectedRare].sort(() => 0.5 - Math.random()).slice(0, 15);
    }, [selectedLocation]);

    // Track container resize to update layout
    useLayoutEffect(() => {
        if (!tagsContainerRef.current) return;
        const ro = new ResizeObserver(() => setLayoutTick(t => t + 1));
        ro.observe(tagsContainerRef.current);
        return () => ro.disconnect();
    }, []);

    // Smart Tag Wrapping Logic: Detect "Edge" tags that shouldn't expand
    useLayoutEffect(() => {
        if (!tagsContainerRef.current) return;

        const nextRisky = new Set();
        const containerRect = tagsContainerRef.current.getBoundingClientRect();
        // Use a slightly safer buffer to account for scrollbars or inconsistencies
        const limit = containerRect.right - 12;
        const expansion = 28; // slightly larger than 26 to be safe

        visibleTags.forEach((t) => {
            const el = tagRefs.current.get(t);
            if (!el) return;

            const rect = el.getBoundingClientRect();

            // If the tag essentially fits but adding expansion would cross the limit,
            // we mark it as "Risky" (Edge).
            // Risky means: Disable hover detection to prevent layout shift.
            // We check rect.right because that is the physical position.
            if (rect.right + expansion > limit) {
                nextRisky.add(t);
            }
        });

        // Update if changed
        if (riskyTags.size !== nextRisky.size || [...riskyTags].some(x => !nextRisky.has(x))) {
            setRiskyTags(nextRisky);
        }
    }, [visibleTags, isSidebarOpen, riskyTags, layoutTick]);



    // URL Params

    // DEBOUNCE 500ms 
    const debouncedSearchQuery = useDebounce(searchQuery, 500);

    const [viewAngle, setViewAngle] = useState(0);

    const [viewState, setViewState] = useState({
        longitude: -73.985,
        latitude: 40.788,
        zoom: 11,
        pitch: 0,
        bearing: 0
    });

    // Toggle Dark Mode
    useEffect(() => {
        if (appearance === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [appearance]);

    // Sync Custom Colors with Preset (until modified)
    useEffect(() => {
        if (activeThemeId !== 'custom' && !hasModifiedCustom && PRESET_THEMES[activeThemeId]) {
            setCustomColors(PRESET_THEMES[activeThemeId]);
        }
    }, [activeThemeId, hasModifiedCustom]);

    // Load Data: Lean Locations (Blocking) + Search Index (Deferred/Background)
    useEffect(() => {
        async function loadLocations() {
            try {
                // 1. Load LEAN Locations (ID + Lat/Lng only)
                const mod = await import('../data/locations.json');
                const locs = mod.default;
                Object.freeze(locs);
                setLocations(locs);

                // Unblock UI immediately after locations are ready
                setLoading(false);

                // 2. Load Tags Manifest (Lightweight)
                loadManifest();
            } catch (e) {
                console.error("Failed to load map data:", e);
                setLoading(false);
            }
        }

        async function loadManifest() {
            try {
                // 2. Load Manifest
                const res = await fetch(`${CDN_BASE}/data/tags_manifest.json`);
                if (!res.ok) throw new Error("Failed to load tags manifest");
                const manifest = await res.json();

                // Manifest is [[tag, count], ...]
                // Populate allTags for autocomplete
                allTags.current = manifest.map(item => item[0]);

                // tagCountsRef is already initialized, we dont reset it here to preserve pre-fetched shards


                setIsIndexReady(true);
            } catch (e) {
                console.error("Failed to load manifest:", e);
            }
        }

        loadLocations();
    }, []);

    // ... (Suggestions and Debounced Search effects remain mostly same, logic relies on tagCountsRef)

    // Auto-Show Help on First Visit (unless query present)
    useEffect(() => {
        const hasSeenHelp = localStorage.getItem('searchable_city_seen_help');
        const hasQuery = window.location.search.includes('q='); // Direct check to catch URL params

        if (!hasSeenHelp && !hasQuery) {
            setIsHelpOpen(true);
        }
    }, []);

    // Update Suggestions when user types (immediate)
    useEffect(() => {
        if (!searchQuery || searchQuery.trim() === '') {
            setSuggestions([]);
            return;
        }
        if (searchQuery.startsWith('"')) {
            setSuggestions([]);
            return;
        }

        const lowerQ = searchQuery.toLowerCase().trim();
        const matches = [];
        // allTags.current is now just keys from the index
        for (const tag of allTags.current) {
            if (tag.includes(lowerQ)) {
                // Determine relevance by count (Unique Locations)
                const lidMasks = tagCountsRef.current.get(tag);
                const count = lidMasks ? Object.keys(lidMasks).length : 0;
                // Keep the threshold
                if (count >= 100) {
                    matches.push(tag);
                    if (matches.length >= 5) break;
                }
            }
        }
        setSuggestions(matches);
    }, [searchQuery]);

    // Execute Search (Debounced)
    const [rawSearchResults, setRawSearchResults] = useState([]);

    useEffect(() => {
        // Clear if empty
        if (!debouncedSearchQuery || debouncedSearchQuery.trim() === '') {
            setMatchedIds(new Set());
            setTotalImageMatches(0);
            setRawSearchResults([]); // Clear legend
            return;
        }

        const query = debouncedSearchQuery.trim();
        const segments = query.split(',').map(s => s.trim()).filter(s => s !== '');

        // ASYNC SHARD FETCHING WRAPPER
        async function runSearch() {
            setFetchingShards(true);
            try {
                // 1. Identify Needed Tags -> Shards
                const requiredShards = new Set();
                const processedSegments = [];

                segments.forEach(seg => {
                    // New Parsing Logic: Extract all quoted OR unquoted terms
                    // Matches: "exact phrase" OR word
                    const terms = [];
                    const segmentRegex = /"([^"]+)"|([^\s"]+)/g;
                    let match;
                    while ((match = segmentRegex.exec(seg)) !== null) {
                        if (match[1]) {
                            // Quoted Group: Split into individual EXACT terms (AND logic)
                            // "black cat" -> "black" (Exact) AND "cat" (Exact)
                            const subWords = match[1].trim().split(/\s+/).filter(w => w !== '');
                            subWords.forEach(sw => {
                                terms.push({ text: sw.toLowerCase(), isExact: true });
                            });
                        } else if (match[2]) {
                            // Unquoted Word (Fuzzy)
                            terms.push({ text: match[2].toLowerCase(), isExact: false });
                        }
                    }

                    if (terms.length > 0) {
                        // Pre-calculate hashes for fetching
                        terms.forEach(t => {
                            if (t.isExact) {
                                const h = hashDJB2(t.text);
                                requiredShards.add(h % 256);
                            } else {
                                if (allTags.current && allTags.current.length > 0) {
                                    for (const tag of allTags.current) {
                                        if (tag.includes(t.text)) {
                                            const h = hashDJB2(tag);
                                            requiredShards.add(h % 256);
                                        }
                                    }
                                }
                            }
                        });

                        processedSegments.push({ raw: seg, terms });
                    }
                });

                // 2. Fetch Missing Shards
                const missing = [...requiredShards].filter(id => !loadedShardsRef.current.has(id));
                if (missing.length > 0) {
                    await Promise.all(missing.map(async (id) => {
                        const hexId = id.toString(16).padStart(2, '0');
                        try {
                            const res = await fetch(`${CDN_BASE}/data/index_shards/${hexId}.json`);
                            if (res.ok) {
                                const data = await res.json();
                                for (const [tag, lidMasks] of Object.entries(data)) {
                                    tagCountsRef.current.set(tag, lidMasks);
                                }
                                loadedShardsRef.current.add(id);
                            }
                        } catch (e) {
                            console.error(`Failed to fetch shard ${hexId}`, e);
                        }
                    }));
                }

                setFetchingShards(false);

                // 3. Execute Search (Synchronous using Cache)
                startTransition(() => {
                    const results = processedSegments.map(segObj => {
                        let segmentMaskMap = null; // lid -> mask (Start null to indicate "Universe")

                        // Iterate terms and INTERSECT (AND) them
                        for (const term of segObj.terms) {
                            const termMatches = new Map(); // lid -> mask for THIS term

                            // Find all matching locations for this term
                            // Helper for regex escaping
                            const escapeRegExp = (string) => {
                                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            };

                            for (const [tag, lidMasks] of tagCountsRef.current.entries()) {
                                let isMatch = false;

                                if (term.isExact) {
                                    // EXACT MATCH: Use Word Boundaries (\b)
                                    // "east" matches "east", "north east"
                                    // "east" does NOT match "eastern"
                                    const regex = new RegExp(`\\b${escapeRegExp(term.text)}\\b`, 'i');
                                    isMatch = regex.test(tag);
                                } else {
                                    // FUZZY MATCH: Partial substring
                                    // "east" matches "east", "eastern", "north east"
                                    isMatch = tag.includes(term.text);
                                }

                                if (isMatch) {
                                    for (const [lid, mask] of Object.entries(lidMasks)) {
                                        termMatches.set(lid, (termMatches.get(lid) || 0) | mask);
                                    }
                                }
                            }

                            if (segmentMaskMap === null) {
                                // First term: Initialize universe
                                segmentMaskMap = termMatches;
                            } else {
                                // Subsequent terms: INTERSECT
                                for (const [lid, existingMask] of segmentMaskMap.entries()) {
                                    if (termMatches.has(lid)) {
                                        const newMask = existingMask & termMatches.get(lid);
                                        if (newMask > 0) segmentMaskMap.set(lid, newMask);
                                        else segmentMaskMap.delete(lid);
                                    } else {
                                        segmentMaskMap.delete(lid);
                                    }
                                }
                            }

                            // If intersection becomes empty, we can stop early
                            if (segmentMaskMap && segmentMaskMap.size === 0) break;
                        }

                        // Convert to ID Set
                        const ids = new Set();
                        if (segmentMaskMap) {
                            for (const lid of segmentMaskMap.keys()) {
                                if (validLocationIds.has(String(lid))) {
                                    ids.add(String(lid));
                                }
                            }
                        }

                        return { term: segObj.raw, ids };
                    });

                    // Compute Union
                    const unionIds = new Set();
                    results.forEach(r => {
                        r.ids.forEach(id => unionIds.add(id));
                    });

                    setRawSearchResults(results);
                    setMatchedIds(unionIds);
                    setTotalImageMatches(unionIds.size);
                    posthog.capture('search_executed', { query: query, result_count: unionIds.size });
                });

            } catch (e) {
                console.error("Search error:", e);
                setFetchingShards(false);
            }
        }

        runSearch();

    }, [debouncedSearchQuery, loading, isIndexReady]);

    // --- COLOR ASSIGNMENT (Derived Memo) ---
    const { pointColors: computedPointColors, legendSegments } = useMemo(() => {
        const pColors = new Map();
        const legends = [];

        rawSearchResults.forEach((res, idx) => {
            // Determine Color
            const overrideTheme = segmentThemeOverrides[idx];
            let segColor;

            if (overrideTheme) {
                if (overrideTheme === 'custom') {
                    segColor = customColors.hl;
                } else {
                    const theme = PRESET_THEMES[overrideTheme];
                    segColor = theme ? theme.hl : currentColors.hl; // Fallback to current if theme invalid
                }
            } else if (idx === 0) {
                segColor = currentColors?.hl || '#ff0000';
            } else {
                // Determine analogous/generated color?
                // We need 'getSegmentColor' or fallback
                // Assuming it's available in scope
                segColor = getSegmentColor(idx, currentColors?.hl || '#ff0000');
            }

            // Assign Priority Colors
            res.ids.forEach(idStr => {
                const id = idStr; // Keep as String
                // First Wins Priority
                if (!pColors.has(id)) {
                    pColors.set(id, segColor);
                }
            });

            legends.push({
                label: res.term,
                color: segColor,
                count: res.ids.size,
                themeId: overrideTheme || (idx === 0 ? activeThemeId : null)
            });
        });

        return { pointColors: pColors, legendSegments: legends };
    }, [rawSearchResults, segmentThemeOverrides, currentColors, activeThemeId, getSegmentColor]);

    useEffect(() => {
        // console.log('[App] rawSearchResults:', rawSearchResults);
        // console.log('[App] legendSegments:', legendSegments);
        setPointColors(computedPointColors);
        setSearchSegments(legendSegments);
    }, [computedPointColors, legendSegments]);



    const fetchShard = useCallback(async (shardId) => {
        if (!tagBearingMapRef.current) tagBearingMapRef.current = {};
        if (tagBearingMapRef.current[shardId]) return tagBearingMapRef.current[shardId];

        try {
            // console.log(`[Debug] Pre-fetching shard: /data/bearings/${shardId}.json`);
            const res = await fetch(`${CDN_BASE}/data/bearings/${shardId}.json?v=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                tagBearingMapRef.current[shardId] = data;
                return data;
            }
        } catch (e) {
            console.error("Error pre-fetching shard:", e);
        }
        return null;
    }, []);

    const handleHoverLocation = useCallback((loc) => {
        if (!loc) return;
        const locIdStr = String(loc.i);
        const shardId = locIdStr.length < 2 ? '0' + locIdStr : locIdStr.slice(-2);

        if (lastHoveredShardRef.current === shardId) return;
        lastHoveredShardRef.current = shardId;

        // Turbo Prefetch: 20ms delay (almost instant but prevents jitter)
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            fetchShard(shardId);
        }, 20);
    }, [fetchShard]);

    // Aggressive Background Prefetch for Search Results (Smart Shard Cap)
    useEffect(() => {
        if (matchedIds.size > 0 && matchedIds.size < 2000) {
            const neededShards = new Set();
            matchedIds.forEach(id => {
                const s = String(id);
                // Calculate Shard ID (Last 2 digits)
                const shard = s.length < 2 ? '0' + s : s.slice(-2);
                neededShards.add(shard);
            });

            const shardArray = [...neededShards];

            // SAFETY CAP: Only prefetch if we aren't downloading the entire internet.
            // Limit to 15 shards (approx 30MB max, usually less).
            // If it requires > 15 shards, it's too scattered (like "tree" or "museum"), 
            // so we fall back to the 20ms Hover Prefetch to save bandwidth.
            if (shardArray.length > 0 && shardArray.length <= 15) {
                // console.log(`[Turbo] Aggressively pre-fetching ${shardArray.length} shards for ${matchedIds.size} results`);
                shardArray.forEach(id => fetchShard(id));
            } else if (shardArray.length > 15) {
                // console.log(`[Turbo] Skipped aggressive prefetch. Too many shards (${shardArray.length}). Falling back to hover-load.`);
            }
        }
    }, [matchedIds, fetchShard]);

    const handleSelectLocation = useCallback(async (loc) => {
        setSelectedLocation(loc);
        setIsSidebarOpen(true);
        posthog.capture('location_selected', { location_id: loc.i });

        const locIdStr = String(loc.i);
        const shardId = locIdStr.length < 2 ? '0' + locIdStr : locIdStr.slice(-2);

        // INSTANT PATH: Use bitmask if available from search results
        const searchMask = currentSearchMasksRef.current.get(locIdStr);
        if (searchMask) {
            const instantBearing = getFirstBearing(searchMask);
            // console.log(`[Optimized] Instant Bearing from Bitmask: ${instantBearing}`);
            setViewAngle(instantBearing);
        }

        // BACKGROUND HYDRATION: Fetch shard for tags and potentially more precise bearing
        try {
            const shardData = await fetchShard(shardId);
            if (shardData) {
                const tagBearingDict = shardData[locIdStr];
                if (tagBearingDict) {
                    const hydratedTags = Object.keys(tagBearingDict).filter(k => k !== '_default');

                    // Update Angle with more precise tag match if search is active
                    let finalBearing = tagBearingDict['_default'] || 0;
                    if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
                        const q = debouncedSearchQuery.toLowerCase().trim().replace(/"/g, '');
                        // Find a tag that matches the query
                        const matchedTag = hydratedTags.find(t => t.toLowerCase().includes(q));
                        if (matchedTag) {
                            finalBearing = tagBearingDict[matchedTag];
                        }
                    } else if (searchMask) {
                        // Keep the instant one if no specific tag match found but mask exists
                        finalBearing = getFirstBearing(searchMask);
                    }

                    console.log(`[Optimized] Shard Loaded. Hydrating Tags (${hydratedTags.length}) and final bearing: ${finalBearing}`);
                    setViewAngle(finalBearing);

                    setSelectedLocation(prev => ({
                        ...prev,
                        t: hydratedTags
                    }));
                }
            }
        } catch (e) {
            console.error("Error in optimized handleSelect:", e);
        }
    }, [debouncedSearchQuery, fetchShard]);

    const clearSearch = () => {
        setSearchQuery('');
        setSuggestions([]);
        // Instant visual clear (don't wait for debounce)
        setRawSearchResults([]);
        setMatchedIds(new Set());
        setTotalImageMatches(0);
    };
    const closeDetail = () => {
        setSelectedLocation(null);
        // Auto-focus search input when returning from detail view
        setTimeout(() => {
            // Only auto-focus on desktop to avoid mobile keyboard pop-up
            if (window.matchMedia('(min-width: 768px)').matches) {
                inputRef.current?.focus();
            }
        }, 50);
    };

    const suggestedFilters = ['graffiti', 'hotel', 'streetlight', 'flower', 'gold', '"east"', 'tourist', 'theater, highway'];

    // Style overrides for Dark Mode specific color
    const darkBgStyle = appearance === 'dark' ? { backgroundColor: DARK_BG, color: 'white' } : {};
    const darkElementStyle = appearance === 'dark' ? { backgroundColor: DARK_BG, borderColor: '#3f4248' } : {};


    // URL params synchronization
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (searchQuery) params.set('q', searchQuery);
        else params.delete('q');

        // Update URL
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newUrl);

        // Update Document Title
        if (searchQuery) {
            const titleQuery = searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery;
            document.title = `${titleQuery} - Searchable.City`;
        } else {
            document.title = 'Searchable.City';
        }
    }, [searchQuery]);

    const handleShare = () => {
        const url = new URL(window.location.origin + window.location.pathname);
        if (searchQuery) {
            url.searchParams.set('q', searchQuery);
        }
        navigator.clipboard.writeText(url.toString());
        setScreenshotToast({ message: "Link Copied to Clipboard!", type: 'success' });
        setTimeout(() => setScreenshotToast(null), 3000);
    };


    // --- SCREENSHOT LOGIC ---
    const handleScreenshot = useCallback(async (mode) => {
        // mode: 'save' (keybind) or 'copy' (requested to be download)
        try {
            // Internal Mapbox Canvas
            const mapCanvas = mapRef.current?.getCanvas();
            if (!mapCanvas) {
                throw new Error("Map canvas not found");
            }

            // Generate Screenshot via Canvas Composition
            const dataUri = await takeScreenshot({
                mapCanvas,
                searchQuery
            });

            if (!dataUri) throw new Error("Capture failed");

            const filename = generateScreenshotName(searchQuery);

            if (mode === 'save') {
                // Post to backend
                const res = await fetch(`${API_BASE}/api/save_screenshot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: dataUri, filename })
                });
                if (!res.ok) throw new Error("Failed to save to disk");

                setScreenshotToast({ message: `Saved: ${filename}`, type: 'success' });
            } else {
                // DOWNLOAD as PNG
                const link = document.createElement('a');
                link.href = dataUri;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setScreenshotToast({ message: "Screenshot Downloaded!", type: 'success' });
            }
        } catch (e) {
            console.error(e);
            setScreenshotToast({ message: "Screenshot Failed", type: 'error' });
        }

        // Clear toast after 3s
        setTimeout(() => setScreenshotToast(null), 3000);
    }, [searchQuery]);


    return (
        <div
            // Add ID for capture if needed, though we use document.body
            className={`relative h-screen w-screen overflow-hidden font-sans selection:bg-blue-500 selection:text-white transition-colors duration-500 ${appearance === 'dark' ? 'dark' : 'bg-gray-100 text-slate-900'}`}
            style={{
                ...darkBgStyle,
            }}
        >
            <style>
                {`.mapboxgl-ctrl-bottom-left, .mapboxgl-ctrl-bottom-right { display: var(--mapbox-logo-display) !important; }`}
            </style>

            {/* Fullscreen Map */}
            <div className="absolute inset-0 z-0">
                <MapConfig
                    ref={mapRef}
                    locations={locations}
                    matchedIds={matchedIds}
                    viewState={viewState}
                    onViewStateChange={setViewState}
                    onSelect={handleSelectLocation}
                    onHover={handleHoverLocation}
                    selectedId={selectedLocation?.i}
                    appearance={appearance}
                    colors={currentColors}
                    vizMode={vizMode}
                    showRegularPoints={showRegularPoints}
                    showPointBorders={showPointBorders}
                    pointColors={pointColors}
                    showBloom={showBloom}
                />
            </div>

            {/* --- LEGEND OVERLAY (Modular Component) --- */}
            <SearchLegend
                segments={searchSegments}
                activeThemeId={activeThemeId}
                appearance={appearance}
                onThemeCycle={(idx, currentId) => {
                    const themeKeys = Object.keys(PRESET_THEMES);
                    const currentThemeId = currentId || activeThemeId;
                    const nextIdx = (themeKeys.indexOf(currentThemeId) + 1) % themeKeys.length;
                    const nextThemeId = themeKeys[nextIdx];

                    setSegmentThemeOverrides(prev => ({
                        ...prev,
                        [idx]: nextThemeId
                    }));
                }}
                // Pass props for the ThemeMenu dropdown in the Legend
                onThemeSelect={(idx, id) => {
                    setSegmentThemeOverrides(prev => ({
                        ...prev,
                        [idx]: id
                    }));
                }}
                customColors={customColors}
                setCustomColors={setCustomColors}
                setHasModifiedCustom={setHasModifiedCustom}
                vizMode={vizMode}
                showRegularPoints={showRegularPoints}
                setShowRegularPoints={setShowRegularPoints}
                showPointBorders={showPointBorders}
                setShowPointBorders={setShowPointBorders}
                openMenuIdx={legendMenuIdx}
                onToggleMenu={toggleLegendMenu}
                isMobileMenuOpen={isMobileMenuOpen}
            />

            {/* Top Right Controls (Desktop) / Bottom Right Menu (Mobile) */}
            <div className={`
                fixed bottom-6 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none md:pointer-events-auto
                md:absolute md:top-4 md:right-4 md:bottom-auto md:flex-row md:items-start md:gap-2
            `}>

                {/* Button List - Animates on Mobile */}
                <div className={`
                    flex flex-col gap-3 items-end pointer-events-auto transition-all duration-300 origin-bottom-right
                    md:flex-row md:gap-2 md:items-start md:opacity-100 md:translate-y-0 md:scale-100
                    ${isMobileMenuOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-90 pointer-events-none md:pointer-events-auto'}
                `}>

                    {/* Share Button */}
                    <button
                        onClick={handleShare}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                        style={appearance === 'dark' ? darkElementStyle : {}}
                        title="Share Link"
                    >
                        <CornerUpRight className="w-5 h-5" />
                    </button>

                    {/* Camera/Screenshot Button */}
                    <button
                        onClick={() => handleScreenshot('copy')}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                        style={appearance === 'dark' ? darkElementStyle : {}}
                        title="Save Screenshot"
                    >
                        <Camera className="w-5 h-5" />
                    </button>

                    {/* Mode Selector */}
                    <div className="relative">
                        <button
                            onClick={toggleModeMenu}
                            className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                            style={appearance === 'dark' ? darkElementStyle : {}}
                            title="Visualization Mode"
                        >
                            <Layers className="w-5 h-5" />
                        </button>

                        {isModeMenuOpen && (
                            <div
                                className={`absolute p-2 w-48 rounded-xl shadow-2xl backdrop-blur-xl border animate-in zoom-in-95 flex flex-col gap-1 z-50
                                    md:right-0 md:top-full md:mt-3 md:mr-0 md:bottom-auto
                                    right-full bottom-0 mr-3 top-auto
                                ${appearance !== 'dark' ? 'bg-white/95 border-gray-200' : ''}`}
                                style={appearance === 'dark' ? { backgroundColor: DARK_BG, borderColor: '#3f4248' } : {}}
                            >
                                {['points', 'heatmap', 'clusters'].map(mode => (
                                    <button
                                        key={mode}
                                        onClick={() => { setVizMode(mode); setIsModeMenuOpen(false); }}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg text-left capitalize transition-all hover:pl-4 cursor-pointer ${vizMode === mode
                                            ? 'bg-blue-500 text-white shadow-md'
                                            : appearance === 'dark' ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        {mode} Mode
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Theme Settings Popover */}
                    <div className="relative">
                        <button
                            onClick={toggleThemeMenu}
                            className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                            style={appearance === 'dark' ? darkElementStyle : {}}
                            title="Theme Settings"
                        >
                            <Palette className="w-5 h-5" />
                        </button>

                        {isThemeMenuOpen && (
                            <div
                                className={`absolute p-4 w-64 rounded-xl shadow-2xl backdrop-blur-xl border animate-in zoom-in-95 flex flex-col gap-4 z-50
                                    md:right-0 md:top-full md:mt-3 md:mr-0 md:bottom-auto
                                    right-full bottom-0 mr-3 top-auto
                                ${appearance !== 'dark' ? 'bg-white/95 border-gray-200' : ''}`}
                                style={appearance === 'dark' ? { backgroundColor: DARK_BG, borderColor: '#3f4248' } : {}}
                            >
                                <ThemeMenu
                                    activeThemeId={activeThemeId}
                                    setActiveThemeId={(id) => {
                                        setActiveThemeId(id);
                                        // Global change overrides all specific keyword colors
                                        setSegmentThemeOverrides({});
                                    }}
                                    customColors={customColors}
                                    setCustomColors={setCustomColors}
                                    setHasModifiedCustom={setHasModifiedCustom}
                                    vizMode={vizMode}
                                    showRegularPoints={showRegularPoints}
                                    setShowRegularPoints={setShowRegularPoints}
                                    showPointBorders={showPointBorders}
                                    setShowPointBorders={setShowPointBorders}
                                    showBloom={showBloom}
                                    setShowBloom={setShowBloom}
                                    appearance={appearance}
                                />
                            </div>
                        )}
                    </div>

                    {/* Help Toggle */}
                    <button
                        onClick={() => { setIsHelpOpen(true); setHasReadStory(false); }}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                        style={appearance === 'dark' ? darkElementStyle : {}}
                        title="Help & Tutorial"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>

                    {/* Light/Dark Toggle */}
                    <button
                        onClick={() => setAppearance(t => t === 'light' ? 'dark' : 'light')}
                        className={`w-10 h-10 flex items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all border hover:scale-110 active:scale-95 cursor-pointer ${appearance === 'dark' ? 'text-yellow-400 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}`}
                        style={appearance === 'dark' ? darkElementStyle : {}}
                        title="Toggle Dark Mode"
                    >
                        {appearance === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Menu Toggle Button (FAB) */}
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className={`md:hidden flex items-center justify-center pointer-events-auto rounded-full shadow-xl backdrop-blur-md transition-all duration-300 border active:scale-95 cursor-pointer 
                    ${isMobileMenuOpen ? 'w-10 h-10' : 'w-12 h-12'}
                    ${appearance === 'dark' ? 'text-gray-200 hover:brightness-110' : 'bg-white/90 text-slate-600 border-white/50 hover:bg-white'}
                    `}
                    style={appearance === 'dark' ? darkElementStyle : {}}
                    title="Menu"
                >
                    {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Floating Sidebar */}
            <div
                className={`fixed inset-x-2 top-2 ${selectedLocation ? 'z-[70]' : 'z-20'} md:absolute md:inset-auto md:top-4 md:left-4 md:w-96 w-auto flex flex-col gap-3 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] export-ignore ${isSidebarOpen ? 'translate-y-0 md:translate-x-0' : '-translate-y-[150%] md:-translate-y-0 md:-translate-x-[120%]'
                    }`}
            >
                {/* Main Card */}
                <div
                    className={`backdrop-blur-xl shadow-2xl rounded-2xl border transition-colors duration-300 ${appearance !== 'dark' ? 'bg-white/85 border-white/60 text-gray-900' : 'text-gray-100'}`}
                    style={appearance === 'dark' ? { backgroundColor: `${DARK_BG}E6`, borderColor: '#3f4248' } : {}}
                >

                    {/* Header & Search */}
                    {!selectedLocation ? (
                        <div className="p-5">
                            <header className="flex items-center justify-between mb-5">
                                <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                    <img src="/apple-touch-icon.png" alt="Logo" className="w-6 h-6 object-contain" />
                                    Searchable.City
                                </h1>
                                {searchQuery && (
                                    <div
                                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${appearance !== 'dark' ? 'bg-gray-100 border-gray-200 text-gray-500' : 'text-gray-400'}`}
                                        style={appearance === 'dark' ? darkElementStyle : {}}
                                    >
                                        {isPending ? 'Searching...' : (totalImageMatches > 0 ? totalImageMatches.toLocaleString() + ' matches' : 'No results')}
                                    </div>
                                )}
                            </header>

                            <div className="relative group">
                                <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${appearance === 'dark' ? 'text-gray-500 group-focus-within:text-gray-200' : 'text-gray-400 group-focus-within:text-gray-600'
                                    }`} />
                                <input
                                    type="text"
                                    placeholder={!isIndexReady ? 'Loading index...' : 'Try "coffee", "classical"...'}
                                    disabled={!isIndexReady}
                                    ref={inputRef}
                                    className={`w-full pl-10 pr-9 py-3 rounded-xl text-[15px] outline-none transition-all border shadow-sm ${appearance === 'dark'
                                        ? 'bg-gray-950/50 border-gray-700 focus:border-white/40 placeholder-gray-600 disabled:opacity-50'
                                        : 'bg-gray-50/80 border-gray-200 focus:border-gray-400 placeholder-gray-400 disabled:opacity-50'
                                        }`}
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setIsFocused(true); }}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                                    onKeyDown={(e) => e.key === 'Enter' && setIsFocused(false)}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-500/20 rounded-full text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {isFocused && suggestions.length > 0 && (
                                    <div
                                        className={`absolute top-full left-0 right-0 mt-2 p-1 rounded-xl shadow-xl border animate-in slide-in-from-top-2 z-50 ${appearance !== 'dark' ? 'bg-white border-gray-100' : ''}`}
                                        style={appearance === 'dark' ? { backgroundColor: DARK_BG, borderColor: '#3f4248' } : {}}
                                    >
                                        {suggestions.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSearchQuery(s)}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 hover:pl-4 transition-all ${appearance === 'dark' ? 'hover:bg-white/5 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                                                    }`}
                                            >
                                                <Search className="w-3 h-3 opacity-50" />
                                                <span>{s}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={`transition-all duration-300 ease-in-out ${isFiltersOpen ? 'mt-5' : 'mt-2'}`}>
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                        className="flex items-center gap-1 group w-full justify-between focus:outline-none"
                                    >
                                        {/* Title inside collapsing area */}

                                        <div className={`p-1 rounded-full transition-colors duration-200 cursor-pointer ${!isFiltersOpen ? 'ml-auto' : 'ml-auto'} ${appearance === 'dark' ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-black/5 text-gray-400'}`}>
                                            {isFiltersOpen ?
                                                <ChevronUp className="w-3.5 h-3.5" /> :
                                                <ChevronDown className="w-3.5 h-3.5" />
                                            }
                                        </div>
                                    </button>
                                </div>

                                <div
                                    className={`grid transition-all duration-300 ease-in-out ${isFiltersOpen ? 'grid-rows-[1fr] opacity-100 mb-2' : 'grid-rows-[0fr] opacity-0 mb-0'}`}
                                >
                                    <div className="overflow-hidden">
                                        <p className={`text-xs font-medium mb-3 ${appearance === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>SUGGESTED FILTERS</p>
                                        <div className="flex flex-col gap-2">
                                            {/* Row 1 */}
                                            <div className="flex gap-2">
                                                {suggestedFilters.slice(0, 4).map(k => (
                                                    <button
                                                        key={k}
                                                        onClick={() => setSearchQuery(k)}
                                                        className={`group relative text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-300 ease-out hover:pr-8 hover:scale-105 active:scale-95 cursor-pointer ${searchQuery === k
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                            : appearance === 'dark'
                                                                ? 'text-gray-300 hover:bg-white/5'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                                            }`}
                                                        style={appearance === 'dark' && searchQuery !== k ? darkElementStyle : {}}
                                                    >
                                                        {k}
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                            <Search className="w-3 h-3" />
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Row 2 */}
                                            <div className="flex gap-2">
                                                {suggestedFilters.slice(4, 8).map(k => (
                                                    <button
                                                        key={k}
                                                        onClick={() => setSearchQuery(k)}
                                                        className={`group relative text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-300 ease-out hover:pr-8 hover:scale-105 active:scale-95 cursor-pointer ${searchQuery === k
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                                            : appearance === 'dark'
                                                                ? 'text-gray-300 hover:bg-white/5'
                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                                            }`}
                                                        style={appearance === 'dark' && searchQuery !== k ? darkElementStyle : {}}
                                                    >
                                                        {k}
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                            <Search className="w-3 h-3" />
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Detail View (Popup) - Fluid Animation
                        <div className="animate-in slide-in-from-right-8 duration-500 ease-out max-h-[80vh] overflow-y-auto md:max-h-[calc(100vh-2rem)]">
                            <div
                                className={`relative p-4 border-b flex justify-between items-center ${appearance !== 'dark' ? 'border-gray-100 bg-gray-50/50' : 'bg-transparent'}`}
                                style={appearance === 'dark' ? { borderColor: '#3f4248' } : {}}
                            >
                                <button
                                    onClick={closeDetail}
                                    className={`flex items-center gap-2 text-sm font-medium transition-colors hover:gap-3 cursor-pointer ${appearance === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'
                                        }`}
                                >
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>

                                {searchQuery && (
                                    <div className={`absolute left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase opacity-50 px-2 pointer-events-none whitespace-nowrap ${appearance === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                                        {(() => {
                                            const locId = String(selectedLocation.i);
                                            // Find terms that match this specific ID
                                            const matched = rawSearchResults
                                                .filter(r => r.ids.has(locId))
                                                .map(r => r.term);

                                            // If specific matches found, we show them joined. Else show full query (fallback)
                                            // Current logic: show matched or query.
                                            const title = matched.length > 0 ? matched.join(', ') : searchQuery;
                                            return title.length > 25 ? title.slice(0, 25) + '...' : title;
                                        })()}
                                    </div>
                                )}

                                <button onClick={closeDetail} className="p-1 hover:bg-black/5 rounded-full hover:rotate-90 transition-transform cursor-pointer">
                                    <X className="w-5 h-5 opacity-50" />
                                </button>
                            </div>

                            <div className="p-0 relative group">
                                <ImageViewer id={selectedLocation.i} lat={selectedLocation.l[0]} lng={selectedLocation.l[1]} angle={viewAngle} setAngle={setViewAngle} appearance={appearance} />
                                <div className="absolute inset-0 ring-1 ring-inset ring-black/10 pointer-events-none"></div>
                            </div>

                            <div
                                className={`p-6 border-t ${appearance !== 'dark' ? 'border-gray-100' : ''}`}
                                style={appearance === 'dark' ? { borderColor: '#3f4248' } : {}}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-xs font-mono opacity-60 flex items-center gap-1.5 bg-gray-500/10 px-2 py-1 rounded">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {selectedLocation.l[0].toFixed(5)}, {selectedLocation.l[1].toFixed(5)}
                                    </span>
                                    <span className={`text-xs font-mono font-bold ${appearance === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {viewAngle}° {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][(Math.round(viewAngle / 45)) % 8] || ''}
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <div className={`text-xs font-bold tracking-wider uppercase flex items-center gap-2 ${appearance === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <Hash className="w-3 h-3" />
                                        Detected Concepts
                                    </div>
                                    <div ref={tagsContainerRef} className="flex flex-wrap gap-1">
                                        {!selectedLocation.t ? (
                                            /* Loading Skeleton */
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <div key={i} className={`h-6 rounded-md animate-pulse ${appearance === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`} style={{ width: 40 + Math.random() * 60 }}></div>
                                            ))
                                        ) : (
                                            <>
                                                {visibleTags.map(t => {
                                                    const isEdge = riskyTags.has(t);
                                                    return (
                                                        <React.Fragment key={t}>
                                                            <button
                                                                ref={el => {
                                                                    if (el) tagRefs.current.set(t, el);
                                                                    else tagRefs.current.delete(t);
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSearchQuery(t);
                                                                    setSelectedLocation(null);
                                                                }}
                                                                className={`shrink-0 group relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors duration-300 ease-out cursor-pointer ${isEdge ? '' : 'hover:pr-8'} ${appearance === 'dark'
                                                                    ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
                                                                    : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 hover:border-gray-300'
                                                                    }`}
                                                            >
                                                                {t}
                                                                {!isEdge && (
                                                                    <span className="absolute right-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                                        <Search className="w-3 h-3" />
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </React.Fragment>
                                                    );
                                                })}
                                                {selectedLocation.t && selectedLocation.t.length > 12 && (
                                                    <span ref={moreSpanRef} className={`px-2 py-1 rounded-md text-xs opacity-50 cursor-default ${appearance === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        +{selectedLocation.t.length - 12} more
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                    }
                </div >
            </div >

            {/* Floating Toggle Button */}
            {
                !isSidebarOpen && (
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className={`absolute top-4 left-4 z-20 p-3 rounded-full shadow-lg backdrop-blur transition-transform hover:scale-110 active:scale-95 export-ignore ${appearance === 'dark' ? 'text-white' : 'bg-white text-gray-800'}`}
                        style={appearance === 'dark' ? darkElementStyle : {}}
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )
            }

            {/* Loading Overlay */}
            {
                loading && (
                    <div
                        className={`absolute inset-0 z-[80] flex items-center justify-center transition-colors export-ignore ${appearance !== 'dark' ? 'bg-gray-100' : ''}`}
                        style={appearance === 'dark' ? { backgroundColor: DARK_BG } : {}}
                    >
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-500 rounded-full animate-spin"></div>
                            <div className={`text-sm font-medium animate-pulse ${appearance === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                                Initializing Searchable.City...
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Screenshot Toast */}
            {
                screenshotToast && (
                    <div className="screenshot-toast fixed z-[100] animate-in slide-in-from-bottom-4 fade-in duration-300 bottom-6 left-4 md:left-auto md:right-6">
                        <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${appearance === 'dark' ? 'bg-gray-900/90 border-gray-700 text-white' : 'bg-white/90 border-gray-200 text-gray-800'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${screenshotToast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className="text-sm font-medium">{screenshotToast.message}</span>
                        </div>
                    </div>
                )
            }
            {/* Help / Tutorial Modal */}
            {isHelpOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => {
                            setIsHelpOpen(false);
                            localStorage.setItem('geopatterns_seen_help', 'true');
                        }}
                    ></div>

                    {/* Modal Card */}
                    <div
                        className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-300 ${appearance === 'dark' ? 'bg-[#1a1d21] border-gray-700 text-gray-200' : 'bg-white border-white/50 text-gray-800'}`}
                        style={appearance === 'dark' ? { backgroundColor: '#1a1d21', borderColor: '#3f4248' } : {}}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => {
                                setIsHelpOpen(false);
                                localStorage.setItem('searchable_city_seen_help', 'true');
                            }}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors z-10 cursor-pointer"
                        >
                            <X className="w-5 h-5 opacity-50" />
                        </button>

                        <div className="flex flex-col items-center p-8 text-center">
                            {/* Branding */}
                            <img src="/apple-touch-icon.png" alt="Searchable.City" className="w-20 h-20 mb-4 drop-shadow-2xl" />
                            <h2 className="text-2xl font-black tracking-tight mb-1">Searchable.City</h2>

                            {/* Attribution */}
                            <div className="text-sm font-medium opacity-60 mb-6">
                                by <a
                                    href="https://seanhardestylewis.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white hover:underline transition-colors"
                                >
                                    Sean Hardesty Lewis
                                </a>
                            </div>

                            {/* Description */}
                            <p className={`text-sm leading-relaxed mb-8 ${appearance === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                A visual exploration of New York City through hundreds of thousands of street-level images.
                                Discover hidden patterns, architectural styles, and urban textures across Manhattan (with the rest of the boroughs coming soon) using AI-powered semantic search.
                            </p>

                            {/* Tutorial Grid */}
                            <div className={`w-full text-left rounded-2xl p-5 mb-8 ${appearance === 'dark' ? 'bg-black/20 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
                                <h3 className="text-xs font-bold uppercase tracking-wider opacity-50 mb-4">How to Search</h3>

                                <div className="space-y-4 text-sm">
                                    <div className="flex gap-3">
                                        <div className={`font-mono text-xs px-2 py-1 rounded border self-start w-16 text-center ${appearance === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>keyword</div>
                                        <div>
                                            <div className="font-semibold">Single Concept</div>
                                            <div className="text-xs opacity-70 mt-0.5">"coffee" finds images with coffee.</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className={`font-mono text-xs px-2 py-1 rounded border self-start w-16 text-center ${appearance === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>space</div>
                                        <div>
                                            <div className="font-semibold">Combine Concepts</div>
                                            <div className="text-xs opacity-70 mt-0.5">"taxi yellow" finds images with both.</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className={`font-mono text-xs px-2 py-1 rounded border self-start w-16 text-center ${appearance === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>comma</div>
                                        <div>
                                            <div className="font-semibold">List Alternatives</div>
                                            <div className="text-xs opacity-70 mt-0.5">"diner, restaurant" finds either.</div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <div className={`font-mono text-xs px-2 py-1 rounded border self-start w-16 text-center ${appearance === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'}`}>quotes</div>
                                        <div>
                                            <div className="font-semibold">Exact Phrase</div>
                                            <div className="text-xs opacity-70 mt-0.5">"coffee shop" matching exact order.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Link to About */}
                            {hasReadStory || new URLSearchParams(window.location.search).get('embed_source') === 'about' ? (
                                <button
                                    onClick={(e) => {
                                        setIsHelpOpen(false);
                                        localStorage.setItem('searchable_city_seen_help', 'true');
                                    }}
                                    className="block w-full text-center py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm cursor-pointer"
                                >
                                    {new URLSearchParams(window.location.search).get('embed_source') === 'about' ? "Start Exploring" : "Finished Reading? Start Exploring"}
                                </button>
                            ) : (
                                <a
                                    href="/about"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                        setHasReadStory(true);
                                        localStorage.setItem('searchable_city_seen_help', 'true');
                                        // Do NOT close modal
                                    }}
                                    className="block w-full text-center py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm cursor-pointer"
                                >
                                    Read Full Story
                                </a>
                            )}

                            <div className="mt-4 text-[10px] opacity-40">
                                Explore modes, themes, and click points to see details.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MapApplication;
