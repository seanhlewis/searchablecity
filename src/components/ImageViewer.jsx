
import React, { useState } from 'react';

function ImageViewer({ id, lat, lng, angle, setAngle, appearance }) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
            <div className="aspect-square relative isolate">
                <iframe
                    key={`${id}-${angle}`} // Re-render when ID or angle changes
                    title={`Street View ${angle}°`}
                    className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    style={{ border: 0 }}
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    onLoad={() => setIsLoading(false)}
                    src={`https://maps.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=12,${angle},,0,0&source=embed&output=svembed`}
                />

                {/* Loading State */}
                {isLoading && (
                    <div
                        className={`absolute inset-0 flex items-center justify-center transition-colors duration-300 ${appearance === 'dark' ? 'bg-[#1a1d21]' : 'bg-gray-100'}`}
                    >
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImageViewer;
