import { useState, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { samples } from "../samples";
import { GlassDistortionFilter } from "../components/GlassDistortionFilter";
import { LinkStateIcon } from "../components/LinkStateIcon";

function labelFromFilename(filename: string) {
  return filename
    .replace(/\.\w+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(str: string, max = 60) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

const PRESETS = [
  { label: "1080p", w: 1920, h: 1080 },
  { label: "4K", w: 3840, h: 2160 },
  { label: "iPhone", w: 1290, h: 2796 },
  { label: "iPad", w: 2048, h: 2732 },
  { label: "Square", w: 2048, h: 2048 },
  { label: "Instagram", w: 1080, h: 1350 },
  { label: "Twitter", w: 1500, h: 500 },
];
const MIN_EXPORT_DIMENSION = 1;
const MAX_EXPORT_DIMENSION = 7680;

export const Route = createFileRoute("/")({
  component: TileBuddy,
});

function TileBuddy() {
  const firstSample = samples[0] ?? "";
  const [bg, setBg] = useState(`/samples/${firstSample}`);
  const [bgName, setBgName] = useState(labelFromFilename(firstSample));
  const [size, setSize] = useState(1000);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exportW, setExportW] = useState(1920);
  const [exportH, setExportH] = useState(1080);
  const [linked, setLinked] = useState(false);
  const [maintainTile, setMaintainTile] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const aspectRef = useRef(1920 / 1080);
  const previewRef = useRef<HTMLDivElement>(null);

  const allTiles = samples.map((file) => ({
    src: `/samples/${file}`,
    alt: labelFromFilename(file),
    title: labelFromFilename(file),
  }));

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!dragging) setDragging(true);
    },
    [dragging]
  );

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const items = e.dataTransfer.items;
    const item = Array.from(items).find(
      (i) => i.type === "text/uri-list" || i.type.startsWith("image/")
    );
    if (!item) return;

    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        setBg(URL.createObjectURL(file));
        setBgName(file.name.replace(/\.\w+$/, ""));
        setActiveIndex(-1);
      }
    } else if (item.kind === "string") {
      const url = await new Promise<string>((resolve) =>
        item.getAsString(resolve)
      );
      setBg(url);
      setBgName("custom");
      setActiveIndex(-1);
    }
  }, []);

  function snapToTile(v: number) {
    if (!maintainTile || size <= 0) return v;
    return Math.max(size, Math.round(v / size) * size);
  }

  function setWidth(w: number) {
    setExportW(w);
    if (linked) setExportH(Math.round(w / aspectRef.current));
  }

  function setHeight(h: number) {
    setExportH(h);
    if (linked) setExportW(Math.round(h * aspectRef.current));
  }

  function applyPreset(w: number, h: number) {
    setExportW(w);
    setExportH(h);
    aspectRef.current = w / h;
  }

  function toggleLinked() {
    if (!linked) aspectRef.current = exportW / exportH;
    setLinked(!linked);
  }

  function nudgeDimension(
    value: number,
    setter: (dimension: number) => void,
    delta: number
  ) {
    setter(
      Math.max(
        MIN_EXPORT_DIMENSION,
        Math.min(MAX_EXPORT_DIMENSION, value + delta)
      )
    );
  }

  const effectiveW = snapToTile(exportW);
  const effectiveH = snapToTile(exportH);

  const handleExport = async () => {
    setExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = effectiveW;
      canvas.height = effectiveH;
      const ctx = canvas.getContext("2d")!;

      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = bg;
      });

      const tileSize = size;
      for (let y = 0; y < effectiveH; y += tileSize) {
        for (let x = 0; x < effectiveW; x += tileSize) {
          ctx.drawImage(img, x, y, tileSize, tileSize);
        }
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1)
      );
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      setSnapshots((prev) => [...prev, url]);

      const link = document.createElement("a");
      link.href = url;
      const safeName = bgName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      link.download = `${safeName}-${effectiveW}x${effectiveH}.png`;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="app"
      style={
        {
          "--bg": `url(${bg})`,
          "--size": String(size),
        } as React.CSSProperties
      }
    >
      <GlassDistortionFilter />
      <aside className="sidebar" aria-label="Controls sidebar">
        <section className="glass-card tile-card">
          <section>
            <h2>Tile Scale</h2>
            <div className="control-row">
              <input
                type="range"
                min={20}
                max={1500}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <span className="size-value">{size}px</span>
            </div>
          </section>

          <section>
            <h2>Export Size</h2>
            <div className="export-controls">
              <div className="size-inputs">
                <div className="size-input-group">
                  <label>Width</label>
                  <div className="number-input-wrap">
                    <input
                      type="number"
                      value={exportW}
                      min={MIN_EXPORT_DIMENSION}
                      max={MAX_EXPORT_DIMENSION}
                      onChange={(e) => setWidth(Number(e.target.value))}
                    />
                    <div className="number-stepper">
                      <button
                        type="button"
                        aria-label="Increase width"
                        onClick={() => nudgeDimension(exportW, setWidth, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease width"
                        onClick={() => nudgeDimension(exportW, setWidth, -1)}
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  className={`size-link${linked ? " linked" : ""}`}
                  onClick={toggleLinked}
                  title={linked ? "Unlink dimensions" : "Link dimensions"}
                >
                  <LinkStateIcon linked={linked} />
                </button>
                <div className="size-input-group">
                  <label>Height</label>
                  <div className="number-input-wrap">
                    <input
                      type="number"
                      value={exportH}
                      min={MIN_EXPORT_DIMENSION}
                      max={MAX_EXPORT_DIMENSION}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                    <div className="number-stepper">
                      <button
                        type="button"
                        aria-label="Increase height"
                        onClick={() => nudgeDimension(exportH, setHeight, 1)}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label="Decrease height"
                        onClick={() => nudgeDimension(exportH, setHeight, -1)}
                        className="decrement-btn"
                      >
                        −
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="size-presets">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.w, p.h)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={maintainTile}
                  onChange={(e) => setMaintainTile(e.target.checked)}
                />
                <span>Maintain tile</span>
                {maintainTile && (effectiveW !== exportW || effectiveH !== exportH) && (
                  <span className="snap-hint">
                    → {effectiveW} × {effectiveH}
                  </span>
                )}
              </label>
              <button
                className="export-btn"
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? "Exporting…" : `Export PNG (${effectiveW} × ${effectiveH})`}
              </button>
            </div>
          </section>

          {snapshots.length > 0 && (
            <section>
              <h2>Exports</h2>
              <div className="reel">
                {snapshots.map((url, i) => (
                  <a key={i} href={url} download="tile-buddy.png">
                    <img src={url} alt={`Export ${i + 1}`} />
                  </a>
                ))}
              </div>
            </section>
          )}
        </section>

        <section className="glass-card patterns-card">
          <div className="patterns-card-scroll">
            <section>
              <h2>Patterns</h2>
              <div
                className={`drop-hint${dragging ? " dragging" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                Drop an image here
              </div>
              <div className="gallery" style={{ marginTop: 12 }}>
                {allTiles.map((tile, i) => (
                  <button
                    key={i}
                    className={`gallery-item${i === activeIndex ? " active" : ""}`}
                    onClick={() => {
                      setBg(tile.src);
                      setBgName(tile.alt);
                      setActiveIndex(i);
                    }}
                  >
                    <img src={tile.src} alt={tile.alt} title={tile.title} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>
      </aside>

      <div
        className="preview-area"
        ref={previewRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="preview-surface"
          style={{
            width: effectiveW,
            height: effectiveH,
          }}
        >
          <span className="preview-frame-label">
            {effectiveW} × {effectiveH}
          </span>
        </div>
      </div>
    </div>
  );
}
