# Searchable.City visualization

The React/Vite application contains the public atlas, its project story, and a local caption-result viewer.

## Setup

From the repository root:

```sh
npm --prefix visualization ci
npm run dev
```

Open `/dataset` at the address Vite prints. Export results using the Python `searchablecity search --geojson` command, then select that GeoJSON file in the viewer. It shows camera locations, captions and source metadata. Files stay in the browser. The viewer accepts up to 10,000 points and 20 MB; the table shows the first 500 results. Use GIS tools for larger exports.

## Main atlas

Copy `.env.example` to `.env.local` inside this folder and supply your Mapbox token and hosted index URLs. `/` opens the atlas and `/about` opens the project story. See [deployment settings](../docs/DEPLOYMENT.md) for the locations/tag/bearing asset contract and host configuration.

Screenshots download as PNG files through the browser. Analytics are optional; the local `/dataset` viewer does not initialize PostHog.

## Structure

| Path | Purpose |
|---|---|
| `src/App.jsx` | Routes |
| `src/components/MapApplication.jsx` | Atlas search and interaction |
| `src/components/MapConfig.jsx` | Map layers and rendering |
| `src/pages/DatasetPage.jsx` | Local GeoJSON inspection |
| `src/pages/AboutPage.jsx` | Project story |
| `src/themes.js` | Shared map themes |
| `src/utils/screenshot.js` | PNG composition |

## Development

Run `npm --prefix visualization run lint` and `npm --prefix visualization run build` from the repository root before contributing. Both checks also run in CI.

See [asset attribution](ATTRIBUTION.md) for the existing website imagery and [the root README](../README.md) for the captioning pipeline.
