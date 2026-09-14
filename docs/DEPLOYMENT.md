# Deploying after the monorepo move

The existing Vite application and assets now live in visualization/. Its lockfile is preserved. No production deployment is performed by reorganizing this clone.

Preferred host settings:
- Root directory: visualization
- Install: npm ci
- Build: npm run build
- Output: dist

Alternatively build from repository root with `npm --prefix visualization ci && npm run build`, and publish `visualization/dist`. Copy the existing deployment environment variables into the visualization build environment. Preserve SPA fallback to index.html for /about and /dataset. Existing CDN/API services and Mapbox configuration still serve the main atlas.

The /dataset route opens local result GeoJSON. It does not upload datasets, start a server, or replace the main atlas's specialized index. Use it for inspection; use GIS tooling for larger exports. No raw city data or model weights belong in git.

### Contributing to the atlas

We are working toward making the Searchable.City atlas contributable by anyone in the near future. Contributions to the code and documentation are welcome now through GitHub issues and pull requests.

Screenshots download directly in the browser, including the save keyboard shortcut. No local screenshot backend is required.

Before merging: review the diff, build the visualization, run CPU tests, and run a model-specific GPU smoke in a compute allocation. Coordinate the hosting root/output change with deployment to avoid publishing the wrong directory.

The public upstream clone referred to a missing src/data/locations.json, which prevented a clean build. The monorepo fetches this at runtime from VITE_LOCATIONS_URL or the CDN /data/locations.json endpoint. Supply a locations array with i (ID) and l ([lat,lng]) fields matching the hosted tag/bearing index. Configure VITE_MAPBOX_TOKEN with your own public Mapbox token. PostHog is optional and is disabled on /dataset so local uploaded captions are not session-recorded.
