import { useState } from "react";

export default function DatasetPage() {
  const [features, setFeatures] = useState([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null);
  async function load(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 20_000_000)
        throw new Error("Export a smaller result file (maximum 20 MB).");
      const data = JSON.parse(await file.text());
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features))
        throw new Error("Choose a GeoJSON FeatureCollection.");
      if (data.features.length > 10000)
        throw new Error("Export at most 10,000 results.");
      for (const f of data.features) {
        const c = f.geometry?.coordinates;
        if (
          f.geometry?.type !== "Point" ||
          !Array.isArray(c) ||
          !Number.isFinite(c[0]) ||
          !Number.isFinite(c[1]) ||
          Math.abs(c[0]) > 180 ||
          Math.abs(c[1]) > 90
        )
          throw new Error("Every result must have valid point coordinates.");
      }
      setFeatures(data.features);
      setSelected(null);
      setError("");
    } catch (e) {
      setError(e.message);
      setFeatures([]);
      setSelected(null);
    }
  }
  const lng = features.map((f) => f.geometry.coordinates[0]),
    lat = features.map((f) => f.geometry.coordinates[1]);
  const minX = Math.min(...lng),
    maxX = Math.max(...lng),
    minY = Math.min(...lat),
    maxY = Math.max(...lat);
  const x = (v) => 20 + (760 * (v - minX)) / (maxX - minX || 1),
    y = (v) => 380 - (360 * (v - minY)) / (maxY - minY || 1);
  return (
    <main
      style={{
        background: "#f5f7fa",
        color: "#172c39",
        minHeight: "100vh",
        padding: "2rem",
        fontFamily: "sans-serif",
      }}
    >
      <a href="/">Searchable.City atlas</a>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "20px 0 12px" }}>
        Explore your dataset
      </h1>
      <p>
        Open a search-result GeoJSON to inspect captions and camera locations.
        Your file stays in this browser.
      </p>
      <label
        style={{
          display: "block",
          margin: "24px 0",
          padding: 20,
          background: "white",
          borderRadius: 10,
        }}
      >
        Search results{" "}
        <input type="file" accept=".geojson,.json" onChange={load} />
      </label>
      {error && <p role="alert">{error}</p>}
      <p>
        {features.length.toLocaleString()} results. Coordinates below show
        relative locations, without a street basemap.
      </p>
      {features.length > 0 && (
        <svg
          viewBox="0 0 800 400"
          role="img"
          aria-label="Caption camera locations, longitude horizontally and latitude vertically"
          style={{ width: "100%", maxHeight: 400, background: "#e1eaf0" }}
        >
          {features.map((f, i) => (
            <circle
              key={i}
              cx={x(f.geometry.coordinates[0])}
              cy={y(f.geometry.coordinates[1])}
              r={selected === i ? 6 : 3}
              fill={selected === i ? "#d66b20" : "#195f7a"}
              onClick={() => setSelected(i)}
            >
              <title>
                {String(f.properties?.caption || f.properties?.image_id || i)}
              </title>
            </circle>
          ))}
        </svg>
      )}
      {selected !== null && (
        <section aria-label="Selected record">
          <h2>Selected record</h2>
          <p>{features[selected].properties?.caption}</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {JSON.stringify(features[selected].properties, null, 2)}
          </pre>
        </section>
      )}
      <table style={{ width: "100%", textAlign: "left", marginTop: 24 }}>
        <caption>
          First 500 results; select a row to inspect its metadata
        </caption>
        <thead>
          <tr>
            <th>Source image</th>
            <th>Direction</th>
            <th>Caption</th>
          </tr>
        </thead>
        <tbody>
          {features.slice(0, 500).map((f, i) => (
            <tr key={i}>
              <td>
                <button onClick={() => setSelected(i)}>
                  {f.properties?.image_id || i + 1}
                </button>
              </td>
              <td>{f.properties?.direction || "Unknown"}</td>
              <td>{f.properties?.caption}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
