import React, { useRef, useMemo, memo, forwardRef, useEffect } from 'react';
import ReactMapGL, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

// User must provide a token.
const MAPBOX_TOKEN = "pk.eyJ1Ijoic2hsMjI1IiwiYSI6ImNtZmVza21rbjA3NjUybHE4OGZqa2cwbTQifQ.du4ZmGipK17OB2Em5FqwSA";

const MapConfig = memo(forwardRef(function MapConfig({ locations, matchedIds, viewState, onViewStateChange, onSelect, onHover, selectedId, appearance, colors, vizMode, showRegularPoints, showPointBorders, pointColors, showBloom }, ref) {
  // We use the forwarded ref if provided, otherwise internal (though internal serves no purpose if not exposed)
  // Actually, standard pattern is just pass ref to Map.
  const isDark = appearance === 'dark';
  const bgCol = colors?.bg || '#3b82f6';
  const hlCol = colors?.hl || '#ef4444';

  // 1. Static full dataset
  const fullGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: locations.map(loc => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.l[1], loc.l[0]] },
        properties: { id: loc.i, tags: loc.t }
      }))
    };
  }, [locations]);

  // 2. Dynamic Highlight dataset (for Points mode)
  const highlightGeoJSON = useMemo(() => {
    if (!matchedIds || matchedIds.size === 0) return null;

    const highlights = [];
    for (const loc of locations) {
      const idStr = String(loc.i);
      if (matchedIds.has(idStr)) {
        // Inject specific color if available
        const specificColor = pointColors?.get(idStr);
        highlights.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [loc.l[1], loc.l[0]] },
          properties: {
            id: loc.i,
            tags: loc.t,
            color: specificColor // Can be undefined
          }
        });
      }
    }
    return { type: 'FeatureCollection', features: highlights };
  }, [locations, matchedIds, pointColors]);

  // 3. Dynamic Aggregation Dataset (for Heatmap/Cluster mode)
  // Logic: If search active, use matches. If no search, use full.
  const aggGeoJSON = useMemo(() => {
    if (matchedIds && matchedIds.size > 0 && matchedIds.size < locations.length) {
      return highlightGeoJSON; // Heatmap of matches
    }
    // Changed per user request: Do NOT show full heatmap on load. Show nothing.
    return { type: 'FeatureCollection', features: [] };
  }, [highlightGeoJSON, matchedIds, locations.length]);

  const onMouseMove = (event) => {
    const layersToCheck = [];
    if (vizMode === 'points') {
      layersToCheck.push('points-highlight');
      if (showRegularPoints) layersToCheck.push('points-bg');
    }
    if (vizMode === 'clusters') layersToCheck.push('unclustered-point');
    if (vizMode === 'heatmap') layersToCheck.push('heatmap-interaction');

    if (layersToCheck.length === 0) return;

    // Use ref.current if available.
    // NOTE: ref might be a function ref or object ref. 
    // Ideally user passes a useRef object.
    const mapInstance = ref?.current;
    if (!mapInstance) return;

    // Filter layers to ensure they exist in the style to prevent errors
    // The ref is ReactMapGL ref, which exposes getMap()
    const map = mapInstance.getMap();
    if (!map) return;

    const existingLayers = layersToCheck.filter(id => map.getLayer(id));

    if (existingLayers.length === 0) return;

    const features = mapInstance.queryRenderedFeatures(event.point, {
      layers: existingLayers
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const id = feature.properties.id;
      const [lon, lat] = feature.geometry.coordinates;
      onHover({ i: id, l: [lat, lon] });
    } else {
      onHover(null);
    }
  };

  const onMapClick = (event) => {
    // Handling click is complex with clusters/heatmaps.
    const layersToCheck = [];
    if (vizMode === 'points') {
      layersToCheck.push('points-highlight');
      // Only clickable if visible!
      if (showRegularPoints) layersToCheck.push('points-bg');
    }
    if (vizMode === 'clusters') layersToCheck.push('unclustered-point');
    if (vizMode === 'heatmap') layersToCheck.push('heatmap-interaction');

    if (layersToCheck.length === 0) return;

    const mapInstance = ref?.current;
    if (!mapInstance) return;

    const map = mapInstance.getMap();
    if (!map) return;

    const existingLayers = layersToCheck.filter(id => map.getLayer(id));

    if (existingLayers.length === 0) return;

    const features = mapInstance.queryRenderedFeatures(event.point, {
      layers: existingLayers
    });

    if (features && features.length > 0) {
      const feature = features[0];
      const id = feature.properties.id;
      const [lon, lat] = feature.geometry.coordinates;
      let tags = [];
      try { tags = typeof feature.properties.tags === 'string' ? JSON.parse(feature.properties.tags) : feature.properties.tags; } catch (e) { }
      onSelect({ i: id, l: [lat, lon], t: tags || [] });
    }
  };

  // --- LAYERS ---

  // Points Mode Layers
  const backgroundLayer = useMemo(() => ({
    id: 'points-bg',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2, 13, 3, 16, 5],
      'circle-color': bgCol,
      'circle-opacity': showRegularPoints ? (isDark ? 0.6 : 0.5) : 0,
      'circle-stroke-width': 0
    }
  }), [bgCol, isDark, showRegularPoints]);

  const highlightLayer = useMemo(() => ({
    id: 'points-highlight',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4, 16, 6],
      // Use feature 'color' if present, else fallback to hlCol
      'circle-color': ['coalesce', ['get', 'color'], hlCol],
      'circle-opacity': 1,
      'circle-stroke-color': isDark ? '#000000' : '#ffffff',
      'circle-stroke-width': showPointBorders ? 1.5 : 0
    }

  }), [hlCol, isDark, showPointBorders]);

  // Selected Point Layer (Ring)
  const selectedPointLayer = useMemo(() => ({
    id: 'selected-point-ring',
    type: 'circle',
    filter: ['==', ['get', 'id'], selectedId || ''],
    paint: {
      'circle-radius': 8,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-width': 3,
      'circle-stroke-color': isDark ? '#ffffff' : '#000000', // High contrast ring
      'circle-opacity': 1
    }
  }), [selectedId, isDark]);

  // Heatmap Interaction Layer (Transparent points for clicking)
  const heatmapInteractionLayer = useMemo(() => ({
    id: 'heatmap-interaction',
    type: 'circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 4, 15, 12, 22, 40], // Match approx heatmap size
      'circle-color': 'rgba(0,0,0,0)',
      'circle-stroke-width': 0,
      // Must have some opacity to be queryable? Mapbox usually queries geometry regardless of opacity, 
      // but explicit opacity 0 works.
      'circle-opacity': 0
    }
  }), []);

  // Heatmap Grouping Logic
  const heatmapGroups = useMemo(() => {
    // If NO search is active (no matchedIds or empty), we show everything in one default group
    if (!matchedIds || matchedIds.size === 0) {
      return [{ color: hlCol, data: aggGeoJSON }];
    }

    // Search active: Only group MATCHED locations
    const groups = new Map();
    // No "defaultData" bucket for unmatched points - they should be hidden!

    for (const loc of locations) {
      const idStr = String(loc.i);

      // Strict Check: Must be in matchedIds
      if (!matchedIds.has(idStr)) continue;

      const color = pointColors?.get(idStr) || hlCol; // Fallback to highlight if found but no specific color

      const feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [loc.l[1], loc.l[0]] },
        properties: { id: loc.i, tags: loc.t }
      };

      if (!groups.has(color)) groups.set(color, []);
      groups.get(color).push(feature);
    }

    // Convert to array
    return Array.from(groups.entries()).map(([color, features]) => ({
      color,
      data: { type: 'FeatureCollection', features }
    }));
  }, [locations, matchedIds, pointColors, hlCol, aggGeoJSON]);

  /* 
   * BLOOM / HEATMAP LOGIC
   * If showBloom is TRUE: Render as blurred circles ("Firefly" style) that glow additively.
   * If showBloom is FALSE: Render as standard Mapbox Heatmap (density raster).
   */
  /* 
   * BLOOM / HEATMAP LOGIC
   * Bloom Mode: Returns array of layers [Glow, Core] for "Firefly" effect.
   * Heatmap Mode: Returns single Heatmap Layer.
   */
  const getLayersForGroup = (color, index) => {
    if (showBloom) {
      // BLOOM MODE: Dual-Layer Heatmap (Luma Glow Style)
      // Layer 1: The "Halo" - Large radius, soft blur, pure color.
      // Layer 2: The "Core" - Tight radius, white-hot structure.
      return [
        // 1. Halo Layer (Background Glow)
        {
          id: `bloom-halo-${index}`,
          type: 'heatmap',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 0.4, // Lower intensity for subtle ambience
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.3, 'rgba(0,0,0,0)', // CLAMP: Keep clear until 0.3
              1, color              // Continuous fade to color (0.3 -> 1.0)
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              9, 10,
              15, 30, // Large blur
              22, 60
            ],
            'heatmap-opacity': 0.4
          }
        },
        // 2. Core Layer (Foreground Structure)
        // STRICTLY MATCHES Standard Heatmap Radius & Ramp for consistency.
        {
          id: `bloom-core-${index}`,
          type: 'heatmap',
          paint: {
            'heatmap-weight': 1,
            'heatmap-intensity': 1, // Standard intensity
            'heatmap-color': [
              'interpolate', ['linear'], ['heatmap-density'],
              0, 'rgba(0,0,0,0)',
              0.4, color,       // Standard Onset
              1, '#ffffff'      // Continuous ramp from Color -> White (0.4 to 1.0). No plateaus!
            ],
            'heatmap-radius': [
              'interpolate', ['linear'], ['zoom'],
              9, 2,   // MATCH STANDARD
              15, 12, // MATCH STANDARD
              22, 40  // MATCH STANDARD
            ],
            'heatmap-opacity': 0.8 // MATCH STANDARD
          }
        }
      ];
    } else {
      // STANDARD HEATMAP MODE
      const lowDensityColor = showPointBorders ? bgCol : color;

      return [{
        id: `heatmap-layer-${index}`,
        type: 'heatmap',
        paint: {
          'heatmap-weight': 1,
          'heatmap-intensity': 1,
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0,0,0,0)',
            0.5, lowDensityColor,
            1, color
          ],
          'heatmap-radius': [
            'interpolate', ['linear'], ['zoom'],
            9, 2,
            15, 12,
            22, 40
          ],
          'heatmap-opacity': 0.8
        }
      }];
    }
  };

  // Cluster Layers
  const clusterLayer = useMemo(() => ({
    id: 'clusters',
    type: 'circle',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        bgCol, // Use BG color primarily
        100, hlCol, // Use HL color for dense clusters
        750, isDark ? '#f472b6' : '#f06292'
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        15,
        100, 25,
        750, 35
      ]
    }
  }), [bgCol, hlCol, isDark]);

  const clusterCountLayer = useMemo(() => ({
    id: 'cluster-count',
    type: 'symbol',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': 12
    },
    paint: {
      'text-color': isDark ? '#000000' : '#ffffff'
    }
  }), [isDark]);

  const unclusteredPointLayer = useMemo(() => ({
    id: 'unclustered-point',
    type: 'circle',
    filter: ['!', ['has', 'point_count']],
    paint: {
      // Use feature 'color' if present, else fallback to hlCol
      'circle-color': ['coalesce', ['get', 'color'], hlCol],
      'circle-radius': 5,
      'circle-stroke-width': showPointBorders ? 1 : 0,
      'circle-stroke-color': '#fff'
    }
  }), [hlCol, showPointBorders]);


  return (
    <ReactMapGL
      {...viewState}
      onMove={evt => onViewStateChange(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11"}
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={['points-highlight', 'points-bg', 'unclustered-point', 'heatmap-interaction']}
      onClick={onMapClick}
      onMouseMove={onMouseMove}
      ref={ref}
      testMode={true} // Forces preserveDrawingBuffer: true for screenshots/recording
      preserveDrawingBuffer={true}
    >
      {/* POINTS MODE */}
      {vizMode === 'points' && (
        <>
          <Source id="source-bg" type="geojson" data={fullGeoJSON}>
            <Layer {...backgroundLayer} />
            {selectedId && <Layer {...selectedPointLayer} />}
          </Source>
          {highlightGeoJSON && (
            <Source id="source-highlight" type="geojson" data={highlightGeoJSON}>
              <Layer {...highlightLayer} />
            </Source>
          )}
        </>
      )}

      {/* HEATMAP MODE */}
      {/* HEATMAP MODE */}
      {vizMode === 'heatmap' && (
        <>
          {heatmapGroups.map((group, idx) => {
            const layers = getLayersForGroup(group.color, idx);
            return (
              <Source key={idx} id={`source-heatmap-${idx}`} type="geojson" data={group.data}>
                {layers.map(layerProps => (
                  <Layer key={layerProps.id} {...layerProps} />
                ))}
              </Source>
            );
          })}

          {/* Interaction Layer (transparent points for clicking) - Use Aggregated Source */}
          <Source id="source-heatmap-interaction" type="geojson" data={aggGeoJSON}>
            <Layer {...heatmapInteractionLayer} />
            {selectedId && <Layer {...selectedPointLayer} />}
          </Source>
        </>
      )}

      {/* CLUSTER MODE */}
      {vizMode === 'clusters' && (
        <Source
          id="source-clusters"
          type="geojson"
          data={aggGeoJSON}
          cluster={true}
          clusterMaxZoom={16}
          clusterRadius={50}
        >
          <Layer {...clusterLayer} />
          <Layer {...clusterCountLayer} />
          <Layer {...unclusteredPointLayer} />
          {selectedId && <Layer {...selectedPointLayer} />}
        </Source>
      )}
    </ReactMapGL>
  );
}));

export default MapConfig;
