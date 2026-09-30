# Raspberry Pi 3B+ Ambient Kiosk Dashboard

A lightweight, modern, static web dashboard designed specifically for 1080p landscape wall mounting on a **Raspberry Pi 3 Model B+** (1GB RAM).

Built with **pure Vanilla HTML5, CSS3, and ES6 JavaScript** with zero heavy build steps, low CPU/GPU usage, zero memory leaks, and offline resilience.

---

## Features & Architecture

- **1080p Dark Slate Kiosk Design**: Clean high-contrast card borders, subtle glassmorphism styling, zero expensive CSS blur filters (prevents GPU throttling on Raspberry Pi VideoCore IV).
- **Header & Clock**: Real-time 1-second clock with blinking separator, seconds display, formatted full date, and live network/refresh status badges.
- **Weather Panel**: Real-time conditions and 5-day forecast via [Open-Meteo](https://open-meteo.com/) (100% free, no API keys, zero rate-limit hassles).
- **Radar Panel**: Looping regional Doppler radar via [RainViewer](https://www.rainviewer.com/api.html) rendered directly onto a single 2D `<canvas>` with CartoDB Dark Matter basemap. Zero DOM nodes created or destroyed during cycling; pre-rendered offscreen buffer swaps every 15 minutes.
- **Live Traffic & Commute Hub**: Real-time commute duration calculations, delay deltas, and corridor statuses from home (`1500 3rd Ave, Altoona, PA`) to major destinations (I-99 North/South, Downtown & UPMC, Logan Town Centre, Pleasant Valley / PA-764). Combined with live National Weather Service & PennDOT road advisories.
- **Daily Agenda & Events**: Chronological schedule tracking with live status indicators (`In Progress`, `Upcoming`, `Completed`). Supports remote iCal/webcal URLs (`.ics`) and local `data/events.json`.
- **Engine Stability & Resilience**:
  - Independent retry intervals with stale-cache retention during network drops.
  - Automatic silent reload once every 24 hours at 3:00 AM (`dailyReloadHour: 3`) to flush Chromium memory and prevent long-term browser bloat.

---

## Directory Structure

```
HomeDashboard/
├── index.html              # 1080p semantic HTML5 layout container
├── styles.css              # Dark mode slate design system, CSS Grid, high-contrast typography
├── config.js               # Central user configuration (lat/lon, intervals, feeds, units, routes)
├── app.js                  # Main controller, module orchestrator, lifecycle & resilience
├── modules/
│   ├── clock.js            # Digital clock, date formatting, seconds pulse, network status
│   ├── weather.js          # Open-Meteo client, current conditions, 5-day forecast
│   ├── radar.js            # RainViewer tile compositor & smooth canvas frame cycler
│   ├── traffic.js          # Real-time commute duration calculator & NWS road hazard parser
│   ├── agenda.js           # iCal/ICS parser & local event reader with status badges
│   └── icons.js            # Lightweight inline SVG icon definitions
├── data/
│   ├── events.json         # Out-of-the-box local calendar events fallback
│   └── alerts.json         # Out-of-the-box sample traffic and hazard alerts fallback
├── scripts/
│   ├── start-kiosk.sh      # Production shell script to launch Chromium in kiosk mode
│   └── setup-pi.sh         # One-shot provisioning script for Raspberry Pi OS
└── README.md
```

---

## Configuration (`config.js`)

Edit [`config.js`](file:///c:/Users/dylan/OneDrive/Documents/Adams%20Connect/App%20Dev/HomeDashboard/config.js) to set your location, preferences, and feeds:

```javascript
export const CONFIG = {
  location: {
    address: "1500 3rd Ave, Altoona, PA 16602",
    name: "Altoona, PA",
    latitude: 40.508001,
    longitude: -78.396269,
    zoom: 7
  },
  traffic: {
    origin: {
      address: "1500 3rd Ave, Altoona, PA 16602",
      latitude: 40.508001,
      longitude: -78.396269
    },
    routes: [
      { id: "downtown-upmc", name: "Downtown & UPMC Altoona", via: "via Chestnut Ave / 7th St", destination: { latitude: 40.5187, longitude: -78.3995 }, typicalMin: 6 },
      { id: "i99-north", name: "I-99 North (Tyrone / PSU)", via: "via Frankstown Rd / I-99 N", destination: { latitude: 40.5510, longitude: -78.3650 }, typicalMin: 8 },
      { id: "i99-south", name: "I-99 South (Hollidaysburg / US-22)", via: "via Plank Rd / I-99 S", destination: { latitude: 40.4430, longitude: -78.3880 }, typicalMin: 9 },
      { id: "logan-centre", name: "Logan Town Centre / Goods Ln", via: "via Plank Rd / I-99", destination: { latitude: 40.4785, longitude: -78.4060 }, typicalMin: 7 },
      { id: "pa-764", name: "Pleasant Valley / PA-764", via: "via Pleasant Valley Blvd", destination: { latitude: 40.4950, longitude: -78.4080 }, typicalMin: 5 }
    ]
  },
  map: {
    provider: "esri-dark",
    mapboxToken: ""
  },
  units: {
    temperature: "fahrenheit",
    windSpeed: "mph",
    precipitation: "inch",
    clock24h: false,
    showSeconds: true
  },
  intervals: {
    clockSec: 1,
    weatherMin: 5,
    radarFramesFetchMin: 5,
    radarCycleMs: 500,
    trafficMin: 3,
    agendaMin: 10,
    dailyReloadHour: 3
  },
  feeds: {
    calendarIcsUrls: [...],
    localEventsPath: "./data/events.json",
    localAlertsPath: "./data/alerts.json",
    rainViewerApi: "https://api.rainviewer.com/public/weather-maps.json",
    openMeteoApi: "https://api.open-meteo.com/v1/forecast",
    nwsAlertsApi: "https://api.weather.gov/alerts/active",
    osrmRoutingApi: "https://router.project-osrm.org/route/v1/driving"
  }
};
```

---

## Raspberry Pi OS Kiosk Setup Guide

### 1. Automated Setup (Recommended)
Run the automated provisioning script directly on the Raspberry Pi:
```bash
cd /home/pi/HomeDashboard
chmod +x scripts/setup-pi.sh
./scripts/setup-pi.sh
```

### 2. Manual Installation
If configuring manually:

#### A. Install Dependencies
```bash
sudo apt update
sudo apt install -y chromium-browser unclutter xdotool python3
```

#### B. Configure Autostart
- **Raspberry Pi OS with X11 / LXDE (Bullseye)**:
  Edit `~/.config/lxsession/LXDE-pi/autostart`:
  ```
  @/home/pi/HomeDashboard/scripts/start-kiosk.sh
  ```
- **Raspberry Pi OS with Wayland / Labwc (Bookworm)**:
  Edit `~/.config/labwc/autostart`:
  ```bash
  /home/pi/HomeDashboard/scripts/start-kiosk.sh &
  ```

#### C. Prevent Screen Sleep & Blanking
Edit `/etc/lightdm/lightdm.conf` and set:
```ini
[Seat:*]
xserver-command=X -s 0 -dpms
```

### 3. Immediate Testing
Test the kiosk mode on the Pi without rebooting:
```bash
./scripts/start-kiosk.sh
```
*(Press `Alt + F4` or `Ctrl + W` to exit kiosk mode during testing).*

---

## Running Locally on PC / Mac (Development)

Because the project uses standard ES6 modules, open the folder in any HTTP server:

```bash
# Python 3:
python -m http.server 8080

# Or npx serve:
npx serve -p 8080 .
```

Open `http://localhost:8080` in your browser.
