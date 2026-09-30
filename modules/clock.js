/**
 * Clock & System Status Module
 *
 * Drives the high-precision 1-second digital clock, date formatting,
 * and network/refresh status indicators without memory accumulation.
 */

export class ClockModule {
  constructor(config) {
    this.config = config;
    this.timerId = null;
    this.lastSyncTime = new Date();
    
    // DOM Element references
    this.timeEl = document.getElementById("clock-time");
    this.secondsEl = document.getElementById("clock-seconds");
    this.ampmEl = document.getElementById("clock-ampm");
    this.dateEl = document.getElementById("clock-date");
    this.networkStatusEl = document.getElementById("network-status");
    this.networkTextEl = document.getElementById("network-status-text");
    this.syncStatusEl = document.getElementById("sync-status-text");

    this.initNetworkListeners();
  }

  start() {
    this.update();
    // Update every second, synchronized to the next second boundary
    const now = new Date();
    const delay = 1000 - now.getMilliseconds();
    setTimeout(() => {
      this.update();
      this.timerId = setInterval(() => this.update(), 1000);
    }, delay);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  update() {
    const now = new Date();

    // Time formatting
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    let ampm = "";

    if (!this.config.units.clock24h) {
      ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
    }
    const hoursStr = String(hours);

    if (this.timeEl) {
      this.timeEl.innerHTML = `${hoursStr}<span class="clock-colon">:</span>${minutes}`;
    }

    if (this.secondsEl) {
      this.secondsEl.textContent = this.config.units.showSeconds ? `:${seconds}` : "";
    }

    if (this.ampmEl) {
      this.ampmEl.textContent = ampm;
    }

    // Date formatting (e.g. Tuesday, September 29, 2026)
    if (this.dateEl) {
      const options = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
      this.dateEl.textContent = now.toLocaleDateString("en-US", options);
    }

    // Sync status relative time update (every minute or so)
    if (this.syncStatusEl && this.lastSyncTime) {
      const diffSec = Math.floor((now.getTime() - this.lastSyncTime.getTime()) / 1000);
      if (diffSec < 60) {
        this.syncStatusEl.textContent = "Synced just now";
      } else {
        const mins = Math.floor(diffSec / 60);
        this.syncStatusEl.textContent = `Synced ${mins}m ago`;
      }
    }
  }

  markSync() {
    this.lastSyncTime = new Date();
    if (this.syncStatusEl) {
      this.syncStatusEl.textContent = "Synced just now";
    }
  }

  initNetworkListeners() {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      if (this.networkStatusEl) {
        this.networkStatusEl.className = `status-pill ${isOnline ? "status-online" : "status-offline"}`;
      }
      if (this.networkTextEl) {
        this.networkTextEl.textContent = isOnline ? "Online" : "Offline";
      }
    };

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    updateStatus();
  }
}
