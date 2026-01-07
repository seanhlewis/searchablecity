import React from 'react';
import { Palette, Settings } from 'lucide-react';
import { PRESET_THEMES } from './MapApplication';

// Custom dark background
const DARK_BG = '#272a2f';

export default function ThemeMenu({
    activeThemeId,
    setActiveThemeId,
    customColors,
    setCustomColors,
    setHasModifiedCustom,
    vizMode,
    showRegularPoints,
    setShowRegularPoints,
    showPointBorders,
    setShowPointBorders,
    showBloom,
    setShowBloom,
    appearance,
    showToggles = true // Option to hide global toggles if needed
}) {
    return (
        <div
            className={`flex flex-col gap-4 animate-in zoom-in-95 w-full`}
        >
            <div>
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-2">Color Theme</div>
                <div className="grid grid-cols-3 gap-2">
                    {Object.entries(PRESET_THEMES).map(([id, theme]) => (
                        <button
                            key={id}
                            onClick={() => setActiveThemeId(id)}
                            className={`flex flex-col items-center gap-1 p-1 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${activeThemeId === id ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-black/5'
                                }`}
                        >
                            <div className="flex -space-x-1">
                                <div className="w-3 h-3 rounded-full border border-black/10" style={{ background: id === 'minimal' && appearance === 'light' ? '#ffffff' : theme.bg }}></div>
                                <div className="w-3 h-3 rounded-full border border-black/10" style={{ background: id === 'minimal' && appearance === 'light' ? '#000000' : theme.hl }}></div>
                            </div>
                            <div className="text-[10px] font-medium opacity-80">{theme.name}</div>
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveThemeId('custom')}
                        className={`flex flex-col items-center gap-1 p-1 rounded-lg border transition-all hover:scale-105 active:scale-95 cursor-pointer ${activeThemeId === 'custom' ? 'border-blue-500 bg-blue-500/10' : 'border-transparent hover:bg-black/5'
                            }`}
                    >
                        <Settings className="w-4 h-4 opacity-70" />
                        <div className="text-[10px] font-medium">Custom</div>
                    </button>
                </div>
            </div>

            {activeThemeId === 'custom' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-500/20">
                    <div>
                        <label className="text-[10px] font-bold opacity-50 block mb-1">Regular</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={customColors.bg}
                                onChange={e => {
                                    setCustomColors(c => ({ ...c, bg: e.target.value }));
                                    setHasModifiedCustom && setHasModifiedCustom(true);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border-none p-0 overflow-hidden hover:scale-110 transition-transform"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold opacity-50 block mb-1">Found</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={customColors.hl}
                                onChange={e => {
                                    setCustomColors(c => ({ ...c, hl: e.target.value }));
                                    setHasModifiedCustom && setHasModifiedCustom(true);
                                }}
                                className="w-8 h-8 rounded cursor-pointer border-none p-0 overflow-hidden hover:scale-110 transition-transform"
                            />
                        </div>
                    </div>
                </div>
            )}

            {showToggles && vizMode !== 'clusters' && (
                <div className="pt-3 border-t border-gray-500/10 space-y-3">
                    {vizMode !== 'heatmap' && (
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Show Regular Points</span>
                            <button
                                onClick={() => setShowRegularPoints(!showRegularPoints)}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none hover:opacity-90 cursor-pointer ${showRegularPoints ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${showRegularPoints ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">{vizMode === 'heatmap' ? 'Show Borders' : 'Show Point Borders'}</span>
                        <button
                            onClick={() => setShowPointBorders(!showPointBorders)}
                            className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none hover:opacity-90 cursor-pointer ${showPointBorders ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${showPointBorders ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                            />
                        </button>
                    </div>

                    {vizMode === 'heatmap' && (
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">Bloom Effect</span>
                            <button
                                onClick={() => setShowBloom(!showBloom)}
                                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none hover:opacity-90 cursor-pointer ${showBloom ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            >
                                <span
                                    className={`absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out ${showBloom ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
