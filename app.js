/**
 * Raspberry Pi Kiosk Wall Dashboard - Main Application Controller
 *
 * Coordinates modular lifecycle, network reconnects, and the daily 3:00 AM
 * silent browser memory flush.
 */

import { CONFIG } from "./config.js";
import { ClockModule } from "./modules/clock.js";
import { WeatherModule } from "./modules/weather.js";
import { RadarModule } from "./modules/radar.js";
import { TrafficAlertsModule } from "./modules/traffic.js";
import { AgendaModule } from "./modules/agenda.js";

class DashboardApp {
  constructor() {
    this.config = CONFIG;
    this.clock = null;
    this.weather = null;
    this.radar = null;
    this.traffic = null;
    this.agenda = null;
  }

  async init() {
    console.log("[Dashboard] Initializing Wall Dashboard on Raspberry Pi...");

    // 1. Initialize Clock & System status immediately
    this.clock = new ClockModule(this.config);
    this.clock.start();

    // 2. Initialize Panels in parallel
    this.weather = new WeatherModule(this.config);
    this.radar = new RadarModule(this.config);
    this.traffic = new TrafficAlertsModule(this.config);
    this.agenda = new AgendaModule(this.config);

    try {
      await Promise.allSettled([
        this.weather.start(),
        this.radar.start(),
        this.traffic.start(),
        this.agenda.start()
      ]);
      this.clock.markSync();
      console.log("[Dashboard] All modules successfully loaded.");
    } catch (err) {
      console.error("[Dashboard] Error during startup:", err);
    }

    // 3. Register Network Recovery Listener
    window.addEventListener("online", () => {
      console.log("[Dashboard] Network connection restored. Syncing feeds...");
      this.syncAll();
    });

    // 4. Register Manual Refresh Button
    const refreshBtn = document.getElementById("manual-refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        refreshBtn.classList.add("spinning");
        this.syncAll().finally(() => {
          setTimeout(() => refreshBtn.classList.remove("spinning"), 600);
        });
      });
    }

    // 5. Schedule 24-hour silent reload at target hour (e.g., 3:00 AM)
    this.scheduleDailyReload(this.config.intervals.dailyReloadHour);
  }

  async syncAll() {
    try {
      await Promise.allSettled([
        this.weather.fetchWeather(),
        this.radar.fetchRadarData(),
        this.traffic.fetchAlerts(),
        this.agenda.fetchEvents()
      ]);
      this.clock.markSync();
    } catch (e) {
      console.warn("[Dashboard] Sync warning:", e);
    }
  }

  scheduleDailyReload(targetHour = 3) {
    const now = new Date();
    const reloadTime = new Date();
    reloadTime.setHours(targetHour, 0, 0, 0);

    // If target hour has passed today, schedule for tomorrow
    if (reloadTime <= now) {
      reloadTime.setDate(reloadTime.getDate() + 1);
    }

    const msUntilReload = reloadTime.getTime() - now.getTime();
    const hoursRemaining = (msUntilReload / (1000 * 60 * 60)).toFixed(1);
    console.log(`[Dashboard] Daily memory flush scheduled in ${hoursRemaining} hours (at ${targetHour}:00).`);

    setTimeout(() => {
      console.log("[Dashboard] Executing scheduled daily silent reload...");
      window.location.reload(true);
    }, msUntilReload);
  }
}

// Bootstrap application once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new DashboardApp();
  app.init();
});
