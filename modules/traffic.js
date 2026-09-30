/**
 * Traffic & Hazard Alerts Module
 *
 * Integrates with National Weather Service (NWS) Active Hazards API and
 * local incident feeds. Implements severity tagging, area matching,
 * and resilient fallbacks.
 */

import { ICONS } from "./icons.js";

export class TrafficAlertsModule {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById("alerts-content");
    this.badgeEl = document.getElementById("alerts-count-badge");
    this.timerId = null;
    this.lastAlerts = [];
  }

  async start() {
    await this.fetchAlerts();
    const intervalMs = this.config.intervals.trafficMin * 60 * 1000;
    this.timerId = setInterval(() => this.fetchAlerts(), intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async fetchAlerts() {
    const { latitude, longitude } = this.config.location;
    const url = `${this.config.feeds.nwsAlertsApi}?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/geo+json",
          "User-Agent": "RaspberryPiHomeDashboard/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(`NWS HTTP ${response.status}`);
      }

      const data = await response.json();
      const features = data.features || [];

      if (features.length > 0) {
        const parsedAlerts = features.map((f, i) => {
          const props = f.properties || {};
          return {
            id: props.id || `nws-${i}`,
            severity: this.normalizeSeverity(props.severity, props.urgency),
            category: props.category || "Hazard",
            headline: props.headline || props.event || "Active Weather/Travel Hazard",
            description: props.description || props.instruction || "Hazard advisory in effect for this region.",
            area: props.areaDesc || "Local Area",
            effective: this.formatTime(props.effective),
            expires: this.formatTime(props.expires)
          };
        });
        this.lastAlerts = parsedAlerts;
        this.render(parsedAlerts);
      } else {
        // Zero alerts returned from NWS - check if local fallback has custom alerts or show All Clear
        this.lastAlerts = [];
        this.render([]);
      }
    } catch (err) {
      console.warn("[Traffic/Alerts] NWS fetch error, trying local fallback:", err.message);
      await this.loadLocalFallback();
    }
  }

  async loadLocalFallback() {
    try {
      const res = await fetch(this.config.feeds.localAlertsPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`Local alerts HTTP ${res.status}`);
      const data = await res.json();
      const alerts = data.alerts || [];
      this.lastAlerts = alerts;
      this.render(alerts);
    } catch (fallbackErr) {
      console.warn("[Traffic/Alerts] Local fallback failed:", fallbackErr.message);
      if (this.lastAlerts.length > 0) {
        this.render(this.lastAlerts);
      } else {
        this.render([]); // Graceful all clear
      }
    }
  }

  normalizeSeverity(severity = "", urgency = "") {
    const s = severity.toLowerCase();
    const u = urgency.toLowerCase();

    if (s === "extreme" || s === "severe" || u === "immediate") {
      return "Warning";
    }
    if (s === "moderate" || u === "expected") {
      return "Advisory";
    }
    return "Minor";
  }

  formatTime(isoString) {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch {
      return isoString;
    }
  }

  render(alerts) {
    if (!this.container) return;

    if (this.badgeEl) {
      if (alerts.length > 0) {
        this.badgeEl.textContent = `${alerts.length} Active`;
        this.badgeEl.className = "card-badge badge-warning";
      } else {
        this.badgeEl.textContent = "All Clear";
        this.badgeEl.className = "card-badge badge-success";
      }
    }

    if (alerts.length === 0) {
      this.container.innerHTML = `
        <div class="card-empty-state alerts-all-clear">
          <div class="all-clear-icon-glow">
            ${ICONS.checkCircle}
          </div>
          <h4 class="all-clear-title">All Clear</h4>
          <p class="all-clear-desc">No active road hazards or severe weather alerts reported for your area.</p>
          <span class="subtext">Traffic and transit conditions flowing normally</span>
        </div>
      `;
      return;
    }

    const htmlCards = alerts.slice(0, 3).map((alert) => {
      const severityClass = `severity-${alert.severity.toLowerCase()}`;
      return `
        <article class="alert-item ${severityClass}">
          <div class="alert-header">
            <span class="severity-pill ${severityClass}">${alert.severity}</span>
            <span class="alert-category">${alert.category}</span>
            ${alert.expires ? `<span class="alert-time">Expires ${alert.expires}</span>` : ""}
          </div>
          <h4 class="alert-title">${alert.headline}</h4>
          <p class="alert-desc">${alert.description}</p>
          ${alert.area ? `<div class="alert-area"><span class="area-pin">📍</span> ${alert.area}</div>` : ""}
        </article>
      `;
    });

    this.container.innerHTML = `<div class="alerts-list">${htmlCards.join("")}</div>`;
  }
}
