/**
 * Daily Agenda & Events Module
 *
 * Implements an RFC 5545 iCal/ICS parser with a resilient local events.json fallback.
 * Sorts events chronologically and tracks real-time status (Active Now, Upcoming, Past).
 */

import { ICONS } from "./icons.js";

export class AgendaModule {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById("agenda-content");
    this.countBadgeEl = document.getElementById("agenda-count-badge");
    this.timerId = null;
    this.events = [];
  }

  async start() {
    await this.fetchEvents();
    const intervalMs = this.config.intervals.agendaMin * 60 * 1000;
    this.timerId = setInterval(() => this.fetchEvents(), intervalMs);

    // Also re-evaluate active/upcoming statuses every minute
    setInterval(() => {
      if (this.events.length > 0) {
        this.render(this.events);
      }
    }, 60 * 1000);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async fetchEvents() {
    let urls = [];
    const feeds = this.config.feeds || {};

    if (Array.isArray(feeds.calendarIcsUrls)) {
      urls = feeds.calendarIcsUrls.filter((u) => typeof u === "string" && u.trim() !== "");
    } else if (typeof feeds.calendarIcsUrl === "string" && feeds.calendarIcsUrl.trim() !== "") {
      urls = [feeds.calendarIcsUrl.trim()];
    }

    if (urls.length > 0) {
      const allEvents = [];
      for (const rawUrl of urls) {
        // Automatically convert webcal:// to https://
        const normalizedUrl = rawUrl.replace(/^webcal:\/\//i, "https://");
        let icsText = null;

        // 1. Direct fetch (native Raspberry Pi kiosk with --disable-web-security)
        try {
          const response = await fetch(normalizedUrl, { cache: "no-store" });
          if (response.ok) {
            icsText = await response.text();
          }
        } catch (directErr) {
          // 2. Direct fetch blocked by CORS (e.g. desktop browser review) - try local server proxy
          try {
            const localProxyUrl = `/api/calendar?url=${encodeURIComponent(normalizedUrl)}`;
            const proxyRes = await fetch(localProxyUrl, { cache: "no-store" });
            if (proxyRes.ok) {
              icsText = await proxyRes.text();
            }
          } catch (proxyErr) {
            console.warn(`[Agenda] Failed to fetch calendar feed: ${normalizedUrl}`, proxyErr.message);
          }
        }

        if (icsText) {
          const parsed = this.parseICS(icsText);
          allEvents.push(...parsed);
        }
      }

      if (allEvents.length > 0) {
        allEvents.sort((a, b) => a.startDate - b.startDate);
        this.events = allEvents;
        this.render(allEvents);
        return;
      }
    }

    // Fallback to local events.json if no remote feeds or all feeds returned empty
    await this.loadLocalEvents();
  }

  async loadLocalEvents() {
    try {
      const res = await fetch(this.config.feeds.localEventsPath, { cache: "no-store" });
      if (!res.ok) throw new Error(`Local events HTTP ${res.status}`);
      const data = await res.json();
      const rawEvents = data.events || [];

      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const day = today.getDate();

      // Normalize local events to today's Date objects
      const normalized = rawEvents.map((evt, idx) => {
        let startObj = null;
        let endObj = null;

        if (evt.time) {
          const [startH, startM] = evt.time.split(":").map(Number);
          startObj = new Date(year, month, day, startH, startM);
        }

        if (evt.endTime) {
          const [endH, endM] = evt.endTime.split(":").map(Number);
          endObj = new Date(year, month, day, endH, endM);
        } else if (startObj) {
          // Default 1 hour duration
          endObj = new Date(startObj.getTime() + 60 * 60 * 1000);
        }

        return {
          id: evt.id || `local-${idx}`,
          title: evt.title || "Scheduled Event",
          location: evt.location || "",
          category: evt.category || "general",
          description: evt.description || "",
          startDate: startObj,
          endDate: endObj
        };
      });

      // Sort chronologically
      normalized.sort((a, b) => (a.startDate || 0) - (b.startDate || 0));
      this.events = normalized;
      this.render(normalized);
    } catch (fallbackErr) {
      console.warn("[Agenda] Local events load failed:", fallbackErr.message);
      this.render([]);
    }
  }

  /**
   * Pure lightweight RFC 5545 iCal/ICS Parser
   */
  parseICS(icsData) {
    const lines = icsData.replace(/\r\n /g, "").replace(/\r/g, "").split("\n");
    const events = [];
    let inEvent = false;
    let current = {};

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    for (let rawLine of lines) {
      const line = rawLine.trim();
      if (line === "BEGIN:VEVENT") {
        inEvent = true;
        current = {};
      } else if (line === "END:VEVENT") {
        inEvent = false;
        if (current.summary && current.startDate) {
          events.push(current);
        }
        if (line.startsWith("SUMMARY:")) {
          current.summary = line.substring(8).replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
        } else if (line.startsWith("LOCATION:")) {
          current.location = line.substring(9).replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
        } else if (line.startsWith("DESCRIPTION:")) {
          current.description = line.substring(12).replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/g, " ");
        } else if (line.startsWith("DTSTART")) {
          current.startDate = this.parseIcsDate(line);
        } else if (line.startsWith("DTEND")) {
          current.endDate = this.parseIcsDate(line);
        }
      }
    }

    // Filter events occurring today (including multi-day or ongoing events)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const todaysEvents = events
      .filter((e) => {
        if (!e.startDate) return false;
        const eventEnd = e.endDate || new Date(e.startDate.getTime() + 60 * 60 * 1000);
        return e.startDate <= endOfDay && eventEnd >= startOfDay;
      })
      .map((e, idx) => ({
        id: `ics-${idx}`,
        title: e.summary,
        location: e.location || "",
        description: e.description || "",
        category: "calendar",
        startDate: e.startDate,
        endDate: e.endDate || new Date(e.startDate.getTime() + 60 * 60 * 1000)
      }));

    todaysEvents.sort((a, b) => a.startDate - b.startDate);
    return todaysEvents;
  }

  parseIcsDate(line) {
    const value = line.split(":").pop();
    if (!value) return null;

    // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
    if (value.includes("T")) {
      const year = parseInt(value.substr(0, 4), 10);
      const month = parseInt(value.substr(4, 2), 10) - 1;
      const day = parseInt(value.substr(6, 2), 10);
      const hour = parseInt(value.substr(9, 2), 10);
      const min = parseInt(value.substr(11, 2), 10);
      const sec = parseInt(value.substr(13, 2), 10) || 0;

      if (value.endsWith("Z")) {
        return new Date(Date.UTC(year, month, day, hour, min, sec));
      }
      return new Date(year, month, day, hour, min, sec);
    }

    // Date only: YYYYMMDD
    const year = parseInt(value.substr(0, 4), 10);
    const month = parseInt(value.substr(4, 2), 10) - 1;
    const day = parseInt(value.substr(6, 2), 10);
    return new Date(year, month, day, 0, 0, 0);
  }

  formatTime(date) {
    if (!date) return "";
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  render(events) {
    if (!this.container) return;

    const now = new Date();

    if (this.countBadgeEl) {
      this.countBadgeEl.textContent = `${events.length} Events`;
    }

    if (events.length === 0) {
      this.container.innerHTML = `
        <div class="card-empty-state">
          <span class="empty-icon">${ICONS.calendar}</span>
          <p>No remaining events scheduled for today</p>
          <span class="subtext">Enjoy a restful day</span>
        </div>
      `;
      return;
    }

    const itemsHtml = events.map((event) => {
      let status = "upcoming";
      let statusLabel = "Upcoming";

      if (event.startDate && event.endDate) {
        if (now >= event.startDate && now <= event.endDate) {
          status = "active";
          statusLabel = "In Progress";
        } else if (now > event.endDate) {
          status = "past";
          statusLabel = "Completed";
        }
      }

      const timeRange = `${this.formatTime(event.startDate)} - ${this.formatTime(event.endDate)}`;

      return `
        <div class="agenda-item status-${status}">
          <div class="agenda-time-column">
            <span class="agenda-time-text">${this.formatTime(event.startDate)}</span>
            <span class="agenda-duration">${this.formatTime(event.endDate)}</span>
          </div>

          <div class="agenda-detail-column">
            <div class="agenda-item-header">
              <span class="agenda-status-pill status-${status}">
                ${status === "active" ? '<span class="pulse-dot"></span>' : ""}${statusLabel}
              </span>
              ${event.location ? `<span class="agenda-location"><span class="loc-pin">📍</span> ${event.location}</span>` : ""}
            </div>
            <h4 class="agenda-item-title">${event.title}</h4>
            ${event.description ? `<p class="agenda-item-desc">${event.description}</p>` : ""}
          </div>
        </div>
      `;
    });

    this.container.innerHTML = `<div class="agenda-list">${itemsHtml.join("")}</div>`;
  }
}
