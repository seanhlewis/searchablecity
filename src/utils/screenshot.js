// Helper to take screenshot via Canvas Composition
export async function takeScreenshot({ mapCanvas, logoUrl = '/apple-touch-icon.png', searchQuery = '' }) {
    if (!mapCanvas) {
        console.error("No map canvas provided");
        return null;
    }

    try {
        const width = mapCanvas.width;
        const height = mapCanvas.height;

        // Create off-screen canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // 1. Draw Map Snapshot
        // We draw the WebGL canvas directly. Note: The Mapbox canvas must be configured with preserveDrawingBuffer: true 
        // OR we must catch it immediately after a render. However, for a simple snapshot, drawing the current state usually works
        // if the context isn't cleared. If it is blank, we might need `map.getCanvas().toDataURL()` or preserveDrawingBuffer.
        // Let's assume standard drawImage works first.
        ctx.drawImage(mapCanvas, 0, 0);

        // 2. Load Logo
        const logoPromise = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Important for local/CDN images
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = logoUrl;
        });

        const logo = await logoPromise;

        // 3. Draw Branding Overlay
        // Top-Left Position
        const padding = 48; // pl-12 equivalent approx
        const topPadding = 48; // pt-12 equivalent approx

        if (logo) {
            // Draw Logo: 64x64 (w-16 h-16 approx)
            // Actually mapCanvas.width is likely physical pixels (Retina).
            // So we should scale our UI elements relative to canvas width or just assume high-res?
            // Let's use a base scale factor.
            // Base scale factor based on resolution
            let scale = width > 2000 ? 2 : 1;
            if (width < 800) scale = 0.5;

            // Draw Logo: 48x48 (was 64, reduced to 3/4)
            const logoSize = 48 * scale;
            const logoX = padding * scale;
            const logoY = topPadding * scale;

            // Drop Shadow for Logo
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 6 * scale;
            ctx.shadowOffsetY = 3 * scale;
            ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

            // 4. Draw Title "Searchable City"
            const titleX = logoX + logoSize + (12 * scale); // gap reduced slightly
            const titleY = logoY + (logoSize / 2) + (4 * scale); // Vertically centered + a few pixels down

            ctx.font = `bold ${30 * scale}px sans-serif`; // Reduced to 3/4
            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Text Shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx.shadowBlur = 8 * scale;
            ctx.shadowOffsetY = 3 * scale;

            ctx.fillText("Searchable.City", titleX, titleY);

            // 5. Draw Search Keywords
            if (searchQuery) {
                let q = searchQuery.replace(/"/g, '').toUpperCase();
                // Logic directly from existing UI
                if (q.length > 25) q = q.slice(0, 22) + '...';

                const words = q.split(' ');
                let line1 = q;
                let line2 = '';

                if (q.length > 10 && words.length > 1) {
                    const mid = Math.floor(words.length / 2);
                    line1 = words.slice(0, mid).join(' ');
                    line2 = words.slice(mid).join(' ');
                } else if (q.length > 10) {
                    line1 = q.slice(0, 10);
                    line2 = q.slice(10);
                }

                const keywordFontSize = 75 * scale; // Reduced to 3/4
                const keywordYStart = logoY + logoSize + (8 * scale); // spacing halved again (15 -> ~8)

                ctx.font = `900 ${keywordFontSize}px sans-serif`; // Black weight
                ctx.fillStyle = 'white';

                // Stronger shadow for big text
                ctx.shadowColor = 'rgba(0, 0, 0, 1)';
                ctx.shadowBlur = 15 * scale;
                ctx.shadowOffsetY = 8 * scale;

                ctx.fillText(line1, logoX, keywordYStart + keywordFontSize);
                if (line2) {
                    ctx.fillText(line2, logoX, keywordYStart + (keywordFontSize * 1.85)); // Line height approx
                }
            }
        }

        return canvas.toDataURL('image/png');
    } catch (e) {
        console.error("Canvas Screenshot failed:", e);
        return null;
    }
}

export function generateScreenshotName(searchQuery) {
    let topic = 'searchable_city';

    if (searchQuery && searchQuery.trim()) {
        const raw = searchQuery.trim();
        let safe = raw.replace(/["<>:"/\\|?*,]/g, '');
        safe = safe.replace(/\s+/g, '_');
        if (safe.length > 0) {
            topic = `${safe}_searchable_city`;
        }
    }

    return `${topic}.png`;
}
