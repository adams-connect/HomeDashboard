/**
 * Raspberry Pi Kiosk Wall Dashboard - Configuration
 *
 * Customize coordinates, display units, polling intervals, and feeds here.
 * Changes take effect on next reload or at the daily reload cycle.
 */

export const CONFIG = {
  // Primary location for Weather, Radar, and Alerts
  location: {
    address: "1500 3rd Ave, Altoona, PA 16602",
    name: "Altoona, PA",
    latitude: 40.508001,
    longitude: -78.396269,
    zoom: 7 // Radar zoom level (6 = broad regional ~200mi, 7 = metro ~100mi, 8 = local ~50mi)
  },

  // Live Traffic & Commute Corridor Configuration
  traffic: {
    origin: {
      address: "1500 3rd Ave, Altoona, PA 16602",
      latitude: 40.508001,
      longitude: -78.396269
    },
    // Monitored destinations and corridors from home
    routes: [
      {
        id: "downtown-upmc",
        name: "Downtown & UPMC Altoona",
        via: "via Chestnut Ave / 7th St",
        destination: { latitude: 40.5187, longitude: -78.3995 },
        typicalMin: 6,
        distanceMi: 2.1
      },
      {
        id: "i99-north",
        name: "I-99 North (Tyrone / PSU)",
        via: "via Frankstown Rd / I-99 N",
        destination: { latitude: 40.5510, longitude: -78.3650 },
        typicalMin: 8,
        distanceMi: 4.3
      },
      {
        id: "i99-south",
        name: "I-99 South (Hollidaysburg / US-22)",
        via: "via Plank Rd / I-99 S",
        destination: { latitude: 40.4430, longitude: -78.3880 },
        typicalMin: 9,
        distanceMi: 4.8
      },
      {
        id: "logan-centre",
        name: "Logan Town Centre / Goods Ln",
        via: "via Plank Rd / I-99",
        destination: { latitude: 40.4785, longitude: -78.4060 },
        typicalMin: 7,
        distanceMi: 3.4
      },
      {
        id: "pa-764",
        name: "Pleasant Valley / PA-764",
        via: "via Pleasant Valley Blvd",
        destination: { latitude: 40.4950, longitude: -78.4080 },
        typicalMin: 5,
        distanceMi: 1.8
      }
    ]
  },

  // Map Basemap Configuration
  map: {
    // Selected basemap style:
    // "esri-dark"     -> High-contrast dark map with county/highway labels (100% FREE, NO API key required)
    // "carto-dark"    -> Minimalist slate dark map (100% FREE, NO API key required)
    // "carto-voyager" -> Muted modern color map (100% FREE, NO API key required)
    // "mapbox"        -> Ultra-crisp vector raster map (Requires free Mapbox public token below)
    provider: "esri-dark",

    // Optional Mapbox public access token (https://account.mapbox.com)
    mapboxToken: ""
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
    weatherMin: 5,            // Weather data refresh frequency
    radarFramesFetchMin: 5,   // Radar tile metadata refresh frequency
    radarCycleMs: 500,         // Radar animation speed per frame (800ms is standard)
    trafficMin: 3,             // Traffic & commute updates refresh frequency
    agendaMin: 10,             // Daily agenda / calendar refresh frequency
    dailyReloadHour: 3         // Hour of the day (0-23) for silent 24-hour document reload (3:00 AM)
  },

  // External feeds & data sources
  feeds: {
    calendarIcsUrls: [
      "https://calendar.google.com/calendar/ical/dylanadams41%40gmail.com/private-f04fcf08c95f8544924e49d84fceeb43/basic.ics"
    ],

    // Fallback local calendar path (used if URLs are empty or offline)
    localEventsPath: "./data/events.json",

    // Fallback local alerts path
    localAlertsPath: "./data/alerts.json",

    // RainViewer API endpoint
    rainViewerApi: "https://api.rainviewer.com/public/weather-maps.json",

    // Open-Meteo Base URL
    openMeteoApi: "https://api.open-meteo.com/v1/forecast",

    // NWS Active Alerts API
    nwsAlertsApi: "https://api.weather.gov/alerts/active",

    // OSRM Routing Engine for live driving duration calculation
    osrmRoutingApi: "https://router.project-osrm.org/route/v1/driving"
  }
};
