import React, { memo, useState } from 'react';
import { PRESET_THEMES } from './MapApplication';
import ThemeMenu from './ThemeMenu';

const SearchLegend = memo(function SearchLegend({
    segments,
    onThemeCycle,
    onThemeSelect,
    activeThemeId,
    appearance,
    customColors,
    setCustomColors,
    setHasModifiedCustom,
    vizMode,
    showRegularPoints,
    setShowRegularPoints,
    showPointBorders,
    setShowPointBorders,
    openMenuIdx,
    onToggleMenu,
    isMobileMenuOpen // New Prop
}) {
    // Removed local state

    // Close menu when clicking outside (simple ref handling or backdrop)
    // For simplicity, we can use a transparent fixed backdrop

    if (!segments || segments.length <= 1) return null;

    // Mobile Visibility Check
    // On desktop (md:block), always show.
    // On mobile, show ONLY if isMobileMenuOpen is true.
    const containerClasses = `
        absolute p-3 rounded-xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 max-w-xs transition-all duration-300
        z-50
        ${appearance === 'dark' ? 'bg-[#272a2f] border-[#3f4248] text-gray-200' : 'bg-white/95 border-gray-200 text-slate-800'}
        
        /* Desktop Positioning */
        md:block md:top-20 md:right-4 md:bottom-auto md:left-auto
        
        /* Mobile Positioning */
        ${isMobileMenuOpen ? 'block fixed bottom-6 left-4 right-auto top-auto' : 'hidden'}
    `;

    return (
        <div className={containerClasses}>
            <h4 className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2 border-b border-gray-500/20 pb-1">
                Query Legend
            </h4>
            <div className="flex flex-col gap-2 relative">
                {segments.map((seg, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-3 text-sm relative">
                        <div className="flex items-center gap-2 overflow-visible">
                            <div className="relative">
                                <button
                                    className="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0 hover:scale-110 transition-transform cursor-pointer"
                                    style={{ backgroundColor: seg.color }}
                                    onClick={() => onToggleMenu(openMenuIdx === idx ? null : idx)}
                                    title="Click to change color theme"
                                />

                                {/* Theme Picker Dropdown */}
                                {openMenuIdx === idx && (
                                    <div
                                        className={`absolute z-50 p-4 rounded-xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 flex flex-col gap-2 w-64 ${appearance === 'dark' ? 'bg-[#272a2f] border-[#3f4248]' : 'bg-white/95 border-gray-200'}
                                            /* Desktop: Left of Legend */
                                            md:right-full md:top-0 md:mr-4 md:bottom-auto md:left-auto md:mb-0
                                            
                                            /* Mobile: Above Legend */
                                            bottom-full left-0 mb-4 right-auto top-auto mr-0
                                        `}
                                    >
                                        <ThemeMenu
                                            activeThemeId={seg.themeId} // Bind to segment's current theme
                                            setActiveThemeId={(id) => {
                                                onThemeSelect && onThemeSelect(idx, id);
                                            }}
                                            customColors={customColors}
                                            setCustomColors={setCustomColors}
                                            setHasModifiedCustom={setHasModifiedCustom}
                                            vizMode={vizMode}
                                            showRegularPoints={showRegularPoints}
                                            setShowRegularPoints={setShowRegularPoints}
                                            showPointBorders={showPointBorders}
                                            setShowPointBorders={setShowPointBorders}
                                            appearance={appearance}
                                            showToggles={false}
                                        />
                                    </div>
                                )}
                            </div>
                            <span className="truncate font-medium text-xs">{seg.label || "Query"}</span>
                        </div>
                        <span className="text-[10px] opacity-50 font-mono">{seg.count}</span>
                    </div>
                ))}
            </div>

            {/* Backdrop to close menu */}
            {openMenuIdx !== null && (
                <div
                    className="fixed inset-0 z-0 bg-transparent"
                    onClick={() => onToggleMenu(null)}
                    style={{ zIndex: -1 }}
                />
            )}
        </div>
    );
});

export default SearchLegend;
