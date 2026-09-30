/**
 * Looping Weather Radar Module
 *
 * Implements a zero-DOM-churn, hardware-accelerated 2D canvas tile compositor
 * for RainViewer radar frames and CartoDB Dark Matter basemap.
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
    this.drawLoading("Initializing Radar...");

    // 1. Build and cache base map once
    await this.buildBasemap();

    // 2. Fetch and build radar frames
    await this.fetchRadarData();

    // 3. Start 800ms animation loop
    this.startAnimationLoop();

    // 4. Schedule 15-minute metadata refresh
    const refreshMs = this.config.intervals.radarFramesFetchMin * 60 * 1000;
    this.refreshTimer = setInterval(() => this.fetchRadarData(), refreshMs);
  }

  stop() {
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  initControls() {
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
  }

  startAnimationLoop() {
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    this.cycleTimer = setInterval(() => {
      if (this.isPlaying && this.frames.length > 0) {
        this.currentFrameIdx = (this.currentFrameIdx + 1) % this.frames.length;
        this.renderCurrentFrame();
      }
    }, this.config.intervals.radarCycleMs);
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
   * Pre-renders CartoDB Dark Matter basemap tiles into a reusable offscreen canvas
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

    // Fill dark background in case tiles take time
    bCtx.fillStyle = "#0c1017";
    bCtx.fillRect(0, 0, this.width, this.height);

    // Compute 3x3 tile bounds around center
    const tileLoadPromises = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tx = centerTileX + dx;
        const ty = centerTileY + dy;
        const posX = Math.round(this.width / 2 - offsetX + dx * 256);
        const posY = Math.round(this.height / 2 - offsetY + dy * 256);

        const sub = ["a", "b", "c", "d"][Math.abs(tx + ty) % 4];
        const url = `https://${sub}.basemaps.cartocdn.com/dark_all/${zoom}/${tx}/${ty}.png`;

        tileLoadPromises.push(
          this.loadImage(url)
            .then((img) => {
              bCtx.drawImage(img, posX, posY, 256, 256);
            })
            .catch((err) => {
              console.warn(`[Basemap] Failed to load tile ${tx},${ty}`);
            })
        );
      }
    }

    await Promise.all(tileLoadPromises);
  }

  /**
   * Fetches latest RainViewer radar frames and builds offscreen composite buffers
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

      const newFrames = [];

      for (const item of selectedFrames) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = this.width;
        offCanvas.height = this.height;
        const oCtx = offCanvas.getContext("2d");

        // 1. Draw cached basemap
        if (this.basemapCanvas) {
          oCtx.drawImage(this.basemapCanvas, 0, 0);
        }

        // 2. Load and composite the 3x3 radar overlay tiles
        const radarTilePromises = [];
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const tx = centerTileX + dx;
            const ty = centerTileY + dy;
            const posX = Math.round(this.width / 2 - offsetX + dx * 256);
            const posY = Math.round(this.height / 2 - offsetY + dy * 256);

            // Universal Blue radar overlay tile (color scheme 2, smoothed 1_1)
            const tileUrl = `${host}${item.path}/256/${zoom}/${tx}/${ty}/2/1_1.png`;

            radarTilePromises.push(
              this.loadImage(tileUrl)
                .then((img) => {
                  oCtx.drawImage(img, posX, posY, 256, 256);
                })
                .catch(() => {
                  // Transparent empty tile or area outside coverage is normal
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
        // Swap buffers cleanly - garbage collection will automatically reclaim old canvas elements
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

  renderCurrentFrame() {
    if (!this.ctx || this.frames.length === 0) return;

    const frame = this.frames[this.currentFrameIdx];
    if (!frame) return;

    // 1. Draw pre-rendered frame
    this.ctx.drawImage(frame.canvas, 0, 0);

    // 2. Draw Home Marker Pin & Pulsing Rings
    this.drawHomeBeacon();

    // 3. Update scrubber highlight
    this.updateScrubberHighlight();

    // 4. Update timestamp display
    if (this.timestampEl) {
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
    const label = this.config.location.name.split(",")[0];
    const textWidth = this.ctx.measureText(label).width;

    this.ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
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
