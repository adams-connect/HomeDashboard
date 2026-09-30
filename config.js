/**
 * Raspberry Pi Kiosk Wall Dashboard - Configuration
 *
 * Customize coordinates, display units, polling intervals, and feeds here.
 * Changes take effect on next reload or at the daily reload cycle.
 */

export const CONFIG = {
  // Primary location for Weather, Radar, and Alerts
  location: {
    name: "New York, NY",
    latitude: 40.7128,
    longitude: -74.0060,
    zoom: 7 // Radar zoom level (6 = broad regional ~200mi, 7 = metro ~100mi, 8 = local ~50mi)
  },

  // Measurement and display units
  units: {
    temperature: "fahrenheit", // "fahrenheit" | "celsius"
    windSpeed: "mph",          // "mph" | "kmh"
    precipitation: "inch",     // "inch" | "mm"
    clock24h: false,           // false: 12-hour (e.g. 7:45 PM), true: 24-hour (19:45)
    showSeconds: true          // Show ticking seconds in digital clock
  },

  // Polling intervals and timing cycles
  intervals: {
    clockSec: 1,               // Digital clock tick rate
    weatherMin: 15,            // Weather data refresh frequency
    radarFramesFetchMin: 15,   // Radar tile metadata refresh frequency
    radarCycleMs: 800,         // Radar animation speed per frame (800ms is standard)
    trafficMin: 5,             // Traffic & hazard alerts refresh frequency
    agendaMin: 10,             // Daily agenda / calendar refresh frequency
    dailyReloadHour: 3         // Hour of the day (0-23) for silent 24-hour document reload (3:00 AM)
  },

  // External feeds & data sources
  feeds: {
    // Optional public or secret iCal/webcal URL (e.g., Google Calendar, Apple iCloud, Outlook).
    // Note: Due to CORS, this works natively when Chromium is launched with --disable-web-security
    // in kiosk mode. If left empty or if fetch fails, the dashboard falls back to data/events.json.
    calendarIcsUrl: "",

    // Fallback local calendar path
    localEventsPath: "./data/events.json",

    // Fallback local alerts path
    localAlertsPath: "./data/alerts.json",

    // RainViewer API endpoint
    rainViewerApi: "https://api.rainviewer.com/public/weather-maps.json",

    // Open-Meteo Base URL
    openMeteoApi: "https://api.open-meteo.com/v1/forecast",

    // NWS Active Alerts API
    nwsAlertsApi: "https://api.weather.gov/alerts/active"
  }
};
