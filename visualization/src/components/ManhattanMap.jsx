import React, { useMemo, useState, useEffect } from 'react';
import MANHATTAN_COORDS from '../data/manhattan_polygon.json';

// Real Manhattan Bounds (Approximate padding)
const BOUNDS = {
    minLat: 40.68, // South (Battery is ~40.70)
    maxLat: 40.88, // North (Inwood is ~40.87)
    minLon: -74.05, // West
    maxLon: -73.90  // East
};

const latRange = BOUNDS.maxLat - BOUNDS.minLat;
const lonRange = BOUNDS.maxLon - BOUNDS.minLon;

const ManhattanMap = ({ className, visible, data, transformOverride, category, hoveredIndex, showBorder }) => {
    // --- MOBILE REPAIR V13: Responsive Aspect Ratio ---
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const project = (lon, lat) => {
        const x = ((lon - BOUNDS.minLon) / lonRange) * 100;
        const y = 100 - ((lat - BOUNDS.minLat) / latRange) * 100;
        return [x, y];
    };

    const pathData = useMemo(() => {
        return MANHATTAN_COORDS.map((coord, i) => {
            const [x, y] = project(coord[0], coord[1]);
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' ') + " Z";
    }, []);

    const MAP_CONFIG = {
        baseX: 45, // %
        baseY: 50, // %
        baseRot: 0, // deg (Updated to 0)
        baseWidth: 25, // %
    };

    // --- [PROPORTIONAL SCALING SYSTEM V3] ---
    // Ground Truth: Screenshots are 2370 x 1080 (Aspect Ratio: 2.1944)
    const SCREENSHOT_AR = 2370 / 1080;

    const active = useMemo(() => {
        // We now use a single 'scale' factor that applies uniformly to X and Y
        // relative to the background height. This prevents all distortion.
        const baseScale = isMobile ? 1.0 : 1.0;

        let merged = {
            x: isMobile ? 40 : 45,
            y: 40,
            scale: baseScale,
            rotate: 0,
            ...(transformOverride || {})
        };

        // --- NEW: Mobile Split-View Dampening ---
        // Prevents the map from disappearing off-screen on phones when using large desktop offsets.
        if (isMobile && transformOverride && Math.abs(transformOverride.x || 0) > 100) {
            // Apply different dampening for West (negative) vs East (positive) to perfectly align borders
            if (transformOverride.x < 0) {
                merged.x = transformOverride.x * 0.2; // Moves West Map RIGHT (Significantly Less Negative)
            } else {
                merged.x = transformOverride.x * 0.36; // Preserves East Map (compensates for larger desktop input)
            }
        }

        return merged;
    }, [transformOverride, isMobile]);

    // Card positions (Matched to CSS)
    const LAYOUTS = {
        CHINESE: [{ x: 68, y: 15 }, { x: 88, y: 50 }, { x: 68, y: 65 }],
        GOTHIC: [{ x: 68, y: 10 }, { x: 88, y: 40 }, { x: 68, y: 85 }],
        SCAFFOLDING: [{ x: 88, y: 15 }, { x: 68, y: 40 }, { x: 88, y: 81 }],
        MACHINE_EYE: [{ x: 72, y: 50 }],
        COMPASS: [{ x: 18, y: 15 }, { x: 82, y: 65 }],
        COMPASS_WEST: [{ x: 18, y: 15 }], // Matches Desktop Top-Left
        COMPASS_EAST: [{ x: 82, y: 65 }]  // Matches Desktop Bottom-Right
    };

    // Mobile Specific Origin Points (X/Y scaled to viewport center-points)
    const MOBILE_LAYOUTS = {
        CHINESE: [
            { x: 42, y: 12 }, // Signs (Top Left)
            { x: 58, y: 88 }, // Funeral (Bottom Right)
            { x: 42, y: 44 }  // Res/Com (Left)
        ],
        GOTHIC: [
            { x: 42, y: 12 }, // Spire (Top Left)
            { x: 58, y: 88 }, // Facade (Bottom Right)
            { x: 42, y: 44 }  // Arches (Left)
        ],
        SCAFFOLDING: [
            { x: 58, y: 55 }, // Green Netting (Right)
            { x: 42, y: 12 }, // Pedestrian (Top Left)
            { x: 58, y: 88 }  // Financial (Bottom Right)
        ],
        MACHINE_EYE: [
            { x: 55, y: 65 }  // Carousel (Bottom Right Area)
        ],
        COMPASS: [
            { x: 42, y: 22 }, // West (Top Left Area)
            { x: 58, y: 88 }  // East (Bottom Right)
        ],
        COMPASS_WEST: [
            { x: 42, y: 22 }
        ],
        COMPASS_EAST: [
            { x: 58, y: 88 }
        ]
    };

    const layoutKey = category ? category.trim().toUpperCase().replace(/\s+/g, '_') : 'CHINESE';
    const CARDS = isMobile ? (MOBILE_LAYOUTS[layoutKey] || MOBILE_LAYOUTS['CHINESE']) : (LAYOUTS[layoutKey] || LAYOUTS['CHINESE']);

    // --- [NEW PROPORTIONAL PROJECTION SYSTEM V4] ---
    const getTransformedPoint = (lon, lat) => {
        const [px, py] = project(lon, lat);
        let x = px - 50;
        let y = py - 50;

        // These multipliers are calibrated to the 2.1944 background container
        // to produce a perfectly proportioned Manhattan that locks to the pixels.
        const scaleFactor = active.scale || 1.0;

        // Calibrated against Desktop Ground Truth (0.253 / 1.125)
        const sx = 0.253 * scaleFactor;
        const sy = 1.125 * scaleFactor;

        x = x * sx;
        y = y * sy;

        const tx = (active.x || 0) * 0.05;
        const ty = (active.y || 0) * 0.1;

        x = x + tx;
        y = y + ty;

        x = x + MAP_CONFIG.baseX;
        y = y + MAP_CONFIG.baseY;

        return [x, y];
    };

    const gridLines = useMemo(() => {
        const lines = [];
        for (let lon = -74.04; lon <= -73.90; lon += 0.02) {
            const [x1, y1] = project(lon, BOUNDS.minLat);
            const [x2, y2] = project(lon, BOUNDS.maxLat);
            lines.push({ x1, y1, x2, y2, label: `${Math.abs(lon).toFixed(2)}°W`, type: 'lon', val: lon });
        }
        for (let lat = 40.70; lat <= 40.88; lat += 0.02) {
            const [x1, y1] = project(BOUNDS.minLon, lat);
            const [x2, y2] = project(BOUNDS.maxLon, lat);
            lines.push({ x1, y1, x2, y2, label: `${lat.toFixed(2)}°N`, type: 'lat', val: lat });
        }
        return lines;
    }, []);

    return (
        <div className={`manhattan-map-overlay ${visible ? 'visible' : ''} ${className || ''}`} style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0, overflow: 'hidden' }}>
            <div className="pins-sync-container" style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                height: '100%',
                width: 'auto',
                aspectRatio: `${SCREENSHOT_AR}`,
                pointerEvents: 'none',
                overflow: 'visible'
            }}>
                <svg
                    key={category}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    style={{ width: '100%', height: '100%', overflow: 'visible', position: 'absolute', top: 0, left: 0 }}
                >
                    <defs>
                        {data && data.map((item, i) => {
                            const [startX, startY] = getTransformedPoint(item.lon, item.lat);
                            const target = CARDS[i] || CARDS[0];
                            return (
                                <mask id={`mask-${layoutKey}-${i}`} key={`mask-${i}`}>
                                    <line
                                        className="map-line-mask"
                                        style={{ animationDelay: (hoveredIndex === i) ? '0s' : '0.5s' }}
                                        x1={target.x}
                                        y1={target.y}
                                        x2={startX}
                                        y2={startY}
                                        stroke="white"
                                        strokeWidth="2"
                                    />
                                </mask>
                            );
                        })}
                    </defs>
                    <g transform={`
                        translate(${MAP_CONFIG.baseX} ${MAP_CONFIG.baseY}) 
                        rotate(${MAP_CONFIG.baseRot + (active.rotate || 0)})
                        translate(${(active.x || 0) * 0.05} ${(active.y || 0) * 0.1}) 
                        scale(${0.253 * (active.scale || 1.0)} ${1.125 * (active.scale || 1.0)}) 
                        translate(-50 -50)
                    `}>
                        <g className="map-grid" opacity="0.3">
                            {gridLines.map((line, i) => (
                                <React.Fragment key={i}>
                                    <line
                                        x1={line.x1} y1={line.y1}
                                        x2={line.x2} y2={line.y2}
                                        stroke="var(--accent)"
                                        strokeWidth="0.2"
                                        strokeDasharray="1 1"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                </React.Fragment>
                            ))}
                        </g>
                        <path
                            d={pathData}
                            fill="rgba(0,0,0,0.5)"
                            stroke="var(--accent)"
                            strokeWidth={showBorder ? "0.8" : "0.5"}
                            vectorEffect="non-scaling-stroke"
                            opacity={showBorder ? "1" : "0"}
                        />
                    </g>

                    {data && data.map((item, i) => {
                        const [startX, startY] = getTransformedPoint(item.lon, item.lat);
                        const target = CARDS[i] || CARDS[0];
                        const isHovered = i === hoveredIndex;

                        return (
                            <line
                                key={`line-${i}`}
                                className={`map-line-animated ${isHovered ? 'hovered' : ''}`}
                                mask={`url(#mask-${layoutKey}-${i})`}
                                x1={target.x}
                                y1={target.y}
                                x2={startX}
                                y2={startY}
                                stroke={isHovered ? "#fff" : "var(--accent)"}
                                strokeWidth={isHovered ? "0.3" : "0.1"}
                                strokeDasharray="1 1"
                                opacity={isHovered ? "1" : "0.5"}
                            />
                        );
                    })}
                </svg>

                {data && data.map((item, i) => {
                    const [centerX, centerY] = getTransformedPoint(item.lon, item.lat);
                    const isHovered = i === hoveredIndex;

                    return (
                        <div key={`dot-${i}`} className="map-pin-animated" style={{
                            position: 'absolute',
                            left: `${centerX}%`,
                            top: `${centerY}%`,
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            animationDelay: '1s'
                        }}>
                            <div className="pin-halo" style={{
                                position: 'absolute',
                                width: '20px',
                                height: '20px',
                                border: `1px solid ${isHovered ? '#fff' : 'var(--accent)'}`,
                                borderRadius: '50%',
                                opacity: isHovered ? 0.8 : 0.3,
                                transition: 'all 0.3s ease'
                            }} />
                            <div className="pin-dot" style={{
                                width: '4px',
                                height: '4px',
                                backgroundColor: isHovered ? '#fff' : 'var(--accent)',
                                borderRadius: '50%',
                                transition: 'all 0.3s ease'
                            }} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ManhattanMap;
