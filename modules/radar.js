/**
 * Looping Weather Radar Module
 *
 * Implements a zero-DOM-churn, hardware-accelerated 2D canvas tile compositor
 * supporting multiple high-quality basemap providers (100% Free / Zero API Key defaults,
 * plus optional Mapbox support) and RainViewer radar precipitation frames.
 * Designed specifically for Raspberry Pi 3B+ memory (<150MB) and CPU stability.
 */

export class RadarModule {
  constructor(config) {
    this.config = config;
    this.canvas = document.getElementById("radar-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;

    // UI elements
    this.timestampEl = document.getElementById("radar-timestamp");
    this.scrubberEl = document.getElementById("radar-scrubber");
    this.statusBadgeEl = document.getElementById("radar-status-badge");
    this.playPauseBtn = document.getElementById("radar-play-pause");
    this.styleToggleBtn = document.getElementById("radar-style-toggle");

    // Current basemap provider
    this.currentProvider = (this.config.map && this.config.map.provider) || "esri-dark";

    this.frames = []; // Array of { time: timestamp, canvas: offscreenCanvas }
    this.currentFrameIdx = 0;
    this.isPlaying = true;
    this.cycleTimer = null;
    this.refreshTimer = null;
    this.basemapCanvas = null;

    // Canvas dimensions (Retina/HiDPI friendly, crisp 1080p rendering)
    this.width = 640;
    this.height = 380;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.initControls();
  }

  async start() {
    if (!this.canvas || !this.ctx) return;

    // Render loading indicator
    this.drawLoading("Initializing Map & Radar...");

    // 1. Build and cache base map once
    await this.buildBasemap();
    this.renderCurrentFrame(); // Display basemap immediately while radar frames download

    // 2. Fetch and build radar frames
    await this.fetchRadarData();

    // 3. Start animation loop
    this.startAnimationLoop();

    // 4. Schedule periodic metadata refresh
    const refreshMs = (this.config.intervals.radarFramesFetchMin || 5) * 60 * 1000;
    this.refreshTimer = setInterval(() => this.fetchRadarData(), refreshMs);
  }

  stop() {
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  initControls() {
    // Play / Pause animation toggle
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener("click", () => {
        this.isPlaying = !this.isPlaying;
        this.playPauseBtn.textContent = this.isPlaying ? "Pause" : "Play";
        if (this.isPlaying) {
          this.startAnimationLoop();
        } else {
          if (this.cycleTimer) clearInterval(this.cycleTimer);
        }
      });
    }

    // Basemap style switcher toggle
    if (this.styleToggleBtn) {
      this.updateStyleButtonText();
      this.styleToggleBtn.addEventListener("click", async () => {
        const availableProviders = ["esri-dark", "carto-dark", "carto-voyager"];
        if (this.config.map && this.config.map.mapboxToken) {
          availableProviders.push("mapbox");
        }

        const currentIdx = availableProviders.indexOf(this.currentProvider);
        const nextIdx = (currentIdx + 1) % availableProviders.length;
        this.currentProvider = availableProviders[nextIdx];
        this.updateStyleButtonText();

        await this.buildBasemap();
        this.renderCurrentFrame();
      });
    }
  }

  updateStyleButtonText() {
    if (!this.styleToggleBtn) return;
    const names = {
      "esri-dark": "Map: Esri Dark",
      "carto-dark": "Map: Carto Dark",
      "carto-voyager": "Map: Voyager",
      "mapbox": "Map: Mapbox"
    };
    this.styleToggleBtn.textContent = names[this.currentProvider] || "Map: Style";
  }

  startAnimationLoop() {
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    const speedMs = this.config.intervals.radarCycleMs || 500;
    this.cycleTimer = setInterval(() => {
      if (this.isPlaying && this.frames.length > 0) {
        this.currentFrameIdx = (this.currentFrameIdx + 1) % this.frames.length;
        this.renderCurrentFrame();
      }
    }, speedMs);
  }

  /**
   * Projects WGS84 lat/lon to global pixel coordinates at a given zoom level
   */
  projectLatLon(lat, lon, zoom) {
    const n = Math.pow(2, zoom);
    const worldX = ((lon + 180) / 360) * n * 256;
    const latRad = (lat * Math.PI) / 180;
    const worldY =
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      n *
      256;
    return { worldX, worldY };
  }

  /**
   * Resolves tile layer URLs for a given tile position and provider.
   * Providers that require no API key include Esri Dark Canvas, Carto Dark Matter, and Carto Voyager.
   */
  getTileLayerUrls(tx, ty, zoom, provider) {
    const sub = ["a", "b", "c", "d"][Math.abs(tx + ty) % 4];

    switch (provider) {
      case "esri-dark":
        // Layer 1: Dark gray land & water base
        // Layer 2: High-contrast state boundaries, county borders, major highways & city labels
        return [
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`,
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/${zoom}/${ty}/${tx}`
        ];

      case "carto-dark":
        return [
          `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/${zoom}/${tx}/${ty}.png`
        ];

      case "carto-voyager":
        return [
          `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${tx}/${ty}.png`
        ];

      case "mapbox":
        if (this.config.map && this.config.map.mapboxToken) {
          return [
            `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/${zoom}/${tx}/${ty}@2x?access_token=${this.config.map.mapboxToken}`
          ];
        }
        // Fallback to Esri Dark if token is omitted
        return [
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`,
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/${zoom}/${ty}/${tx}`
        ];

      default:
        return [
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${zoom}/${ty}/${tx}`,
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/${zoom}/${ty}/${tx}`
        ];
    }
  }

  /**
   * Pre-renders basemap tiles into a reusable offscreen canvas.
   * Dynamically calculates full canvas coverage to prevent blank sidebars.
   */
  async buildBasemap() {
    const { latitude, longitude, zoom } = this.config.location;
    const { worldX, worldY } = this.projectLatLon(latitude, longitude, zoom);

    const centerTileX = Math.floor(worldX / 256);
    const centerTileY = Math.floor(worldY / 256);
    const offsetX = worldX % 256;
    const offsetY = worldY % 256;

    this.basemapCanvas = document.createElement("canvas");
    this.basemapCanvas.width = this.width;
    this.basemapCanvas.height = this.height;
    const bCtx = this.basemapCanvas.getContext("2d");

    // Fill dark kiosk background
    bCtx.fillStyle = "#0c1017";
    bCtx.fillRect(0, 0, this.width, this.height);

    // Dynamic tile boundary calculation to guarantee 100% canvas coverage
    const minDx = Math.floor((-this.width / 2 + offsetX) / 256);
    const maxDx = Math.ceil((this.width / 2 + offsetX) / 256);
    const minDy = Math.floor((-this.height / 2 + offsetY) / 256);
    const maxDy = Math.ceil((this.height / 2 + offsetY) / 256);

    const tileLoadPromises = [];

    for (let dx = minDx; dx <= maxDx; dx++) {
      const posX = Math.round(this.width / 2 - offsetX + dx * 256);
      if (posX + 256 <= 0 || posX >= this.width) continue;

      for (let dy = minDy; dy <= maxDy; dy++) {
        const posY = Math.round(this.height / 2 - offsetY + dy * 256);
        if (posY + 256 <= 0 || posY >= this.height) continue;

        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const layerUrls = this.getTileLayerUrls(tx, ty, zoom, this.currentProvider);

        for (const url of layerUrls) {
          tileLoadPromises.push(
            this.loadImage(url)
              .then((img) => {
                bCtx.drawImage(img, posX, posY, 256, 256);
              })
              .catch(() => {
                console.warn(`[Basemap] Failed to load tile (${tx}, ${ty}) from ${this.currentProvider}`);
              })
          );
        }
      }
    }

    await Promise.all(tileLoadPromises);
  }

  /**
   * Fetches latest RainViewer radar frames and builds offscreen transparent radar layers.
   */
  async fetchRadarData() {
    try {
      if (this.statusBadgeEl) this.statusBadgeEl.textContent = "Updating...";

      const response = await fetch(this.config.feeds.rainViewerApi, { cache: "no-store" });
      if (!response.ok) throw new Error(`RainViewer HTTP ${response.status}`);
      const data = await response.json();

      const host = data.host;
      const pastFrames = data.radar && data.radar.past ? data.radar.past : [];

      if (pastFrames.length === 0) {
        throw new Error("No past radar frames available");
      }

      // Use up to the last 10 frames (~1.5 hours of loop history)
      const selectedFrames = pastFrames.slice(-10);

      const { latitude, longitude, zoom } = this.config.location;
      const { worldX, worldY } = this.projectLatLon(latitude, longitude, zoom);
      const centerTileX = Math.floor(worldX / 256);
      const centerTileY = Math.floor(worldY / 256);
      const offsetX = worldX % 256;
      const offsetY = worldY % 256;

      const minDx = Math.floor((-this.width / 2 + offsetX) / 256);
      const maxDx = Math.ceil((this.width / 2 + offsetX) / 256);
      const minDy = Math.floor((-this.height / 2 + offsetY) / 256);
      const maxDy = Math.ceil((this.height / 2 + offsetY) / 256);

      const newFrames = [];

      for (const item of selectedFrames) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = this.width;
        offCanvas.height = this.height;
        const oCtx = offCanvas.getContext("2d");

        // Load and composite the radar overlay tiles
        const radarTilePromises = [];
        for (let dx = minDx; dx <= maxDx; dx++) {
          const posX = Math.round(this.width / 2 - offsetX + dx * 256);
          if (posX + 256 <= 0 || posX >= this.width) continue;

          for (let dy = minDy; dy <= maxDy; dy++) {
            const posY = Math.round(this.height / 2 - offsetY + dy * 256);
            if (posY + 256 <= 0 || posY >= this.height) continue;

            const tx = centerTileX + dx;
            const ty = centerTileY + dy;

            // Universal Blue radar overlay tile (color scheme 2, smoothed 1_1)
            const tileUrl = `${host}${item.path}/256/${zoom}/${tx}/${ty}/2/1_1.png`;

            radarTilePromises.push(
              this.loadImage(tileUrl)
                .then((img) => {
                  oCtx.drawImage(img, posX, posY, 256, 256);
                })
                .catch(() => {
                  // Transparent empty tile or area outside precipitation is expected
                })
            );
          }
        }

        await Promise.all(radarTilePromises);
        newFrames.push({
          time: item.time,
          canvas: offCanvas
        });
      }

      if (newFrames.length > 0) {
        this.frames = newFrames;
        this.currentFrameIdx = this.frames.length - 1; // Start on latest frame
        this.renderScrubber();
        this.renderCurrentFrame();
      }

      if (this.statusBadgeEl) this.statusBadgeEl.textContent = "Live";
    } catch (err) {
      console.warn("[Radar] Update error:", err.message);
      if (this.statusBadgeEl) this.statusBadgeEl.textContent = "Stale (Offline)";
      if (this.frames.length === 0) {
        this.drawLoading("Radar temporarily unavailable");
      }
    }
  }

  /**
   * Renders composite scene: Cached Basemap -> Active Radar Overlay -> Home Beacon
   */
  renderCurrentFrame() {
    if (!this.ctx) return;

    // 1. Draw cached basemap
    if (this.basemapCanvas) {
      this.ctx.drawImage(this.basemapCanvas, 0, 0);
    } else {
      this.ctx.fillStyle = "#0c1017";
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw radar overlay frame
    if (this.frames.length > 0) {
      const frame = this.frames[this.currentFrameIdx];
      if (frame && frame.canvas) {
        this.ctx.drawImage(frame.canvas, 0, 0);
      }
    }

    // 3. Draw Home Marker Pin & Pulsing Beacon
    this.drawHomeBeacon();

    // 4. Update scrubber highlight
    this.updateScrubberHighlight();

    // 5. Update timestamp display
    if (this.timestampEl && this.frames.length > 0) {
      const frame = this.frames[this.currentFrameIdx];
      if (frame) {
        const date = new Date(frame.time * 1000);
        const isLatest = this.currentFrameIdx === this.frames.length - 1;
        const timeStr = date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit"
        });
        const relativeMin = Math.round((Date.now() / 1000 - frame.time) / 60);
        const relStr = isLatest ? "Now" : `-${relativeMin}m`;

        this.timestampEl.innerHTML = `<strong>${timeStr}</strong> <span class="radar-rel-time">(${relStr})</span>`;
      }
    }
  }

  drawHomeBeacon() {
    const cx = Math.round(this.width / 2);
    const cy = Math.round(this.height / 2);

    // Outer glow / range ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    this.ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 4]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Middle radar ping ring
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    this.ctx.fillStyle = "rgba(14, 165, 233, 0.2)";
    this.ctx.fill();
    this.ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    // Center solid beacon
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    this.ctx.fillStyle = "#38bdf8";
    this.ctx.shadowColor = "#0284c7";
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0; // Reset shadow

    // City / Home Label pill
    this.ctx.font = "bold 11px Inter, system-ui, sans-serif";
    const label = (this.config.location.name || "Home").split(",")[0];
    const textWidth = this.ctx.measureText(label).width;

    this.ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    this.ctx.fillRect(cx - textWidth / 2 - 6, cy + 10, textWidth + 12, 18);
    this.ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(cx - textWidth / 2 - 6, cy + 10, textWidth + 12, 18);

    this.ctx.fillStyle = "#e2e8f0";
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, cx, cy + 23);
    this.ctx.textAlign = "start";
  }

  renderScrubber() {
    if (!this.scrubberEl) return;
    this.scrubberEl.innerHTML = "";

    this.frames.forEach((frame, idx) => {
      const dot = document.createElement("button");
      dot.className = `scrubber-dot ${idx === this.currentFrameIdx ? "active" : ""}`;
      dot.setAttribute("aria-label", `Frame ${idx + 1}`);
      dot.addEventListener("click", () => {
        this.currentFrameIdx = idx;
        this.renderCurrentFrame();
      });
      this.scrubberEl.appendChild(dot);
    });
  }

  updateScrubberHighlight() {
    if (!this.scrubberEl) return;
    const dots = this.scrubberEl.children;
    for (let i = 0; i < dots.length; i++) {
      if (i === this.currentFrameIdx) {
        dots[i].classList.add("active");
      } else {
        dots[i].classList.remove("active");
      }
    }
  }

  drawLoading(message) {
    if (!this.ctx) return;
    this.ctx.fillStyle = "#0c1017";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "14px Inter, system-ui, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(message, this.width / 2, this.height / 2);
    this.ctx.textAlign = "start";
  }

  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${url}`));
      img.src = url;
    });
  }
}
