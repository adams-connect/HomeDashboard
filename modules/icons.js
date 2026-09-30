/**
 * High-performance, lightweight inline SVG icons.
 * Zero external font requests or network round-trips.
 */

export const ICONS = {
  // Weather Icons based on WMO Weather Interpretation Codes
  sun: `
    <svg class="svg-icon weather-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2"></path>
      <path d="M12 20v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="m17.66 17.66 1.41 1.41"></path>
      <path d="M2 12h2"></path>
      <path d="M20 12h2"></path>
      <path d="m6.34 17.66-1.41 1.41"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
    </svg>`,

  moon: `
    <svg class="svg-icon weather-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    </svg>`,

  partlyCloudyDay: `
    <svg class="svg-icon weather-partly-cloudy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2v2"></path>
      <path d="m4.93 4.93 1.41 1.41"></path>
      <path d="M20 12h2"></path>
      <path d="m19.07 4.93-1.41 1.41"></path>
      <path d="M15.5 17a4.5 4.5 0 0 0-4.47-4.04 4.5 4.5 0 0 0-4.03 4.04A3.5 3.5 0 1 0 7 21h10a3.5 3.5 0 0 0-1.5-6Z"></path>
    </svg>`,

  partlyCloudyNight: `
    <svg class="svg-icon weather-partly-cloudy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      <path d="M17.5 19H9a5 5 0 0 1-1-9.9 5.5 5.5 0 0 1 10.5 1.9 4 4 0 0 1-1 8Z"></path>
    </svg>`,

  cloudy: `
    <svg class="svg-icon weather-cloudy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
    </svg>`,

  rain: `
    <svg class="svg-icon weather-rain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
      <path d="M16 14v6"></path>
      <path d="M8 14v6"></path>
      <path d="M12 16v6"></path>
    </svg>`,

  thunderstorm: `
    <svg class="svg-icon weather-storm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
      <path d="m13 14-3 5h3l-1 5"></path>
    </svg>`,

  snow: `
    <svg class="svg-icon weather-snow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 16h.01"></path>
      <path d="M8 20h.01"></path>
      <path d="M12 18h.01"></path>
      <path d="M12 22h.01"></path>
      <path d="M16 16h.01"></path>
      <path d="M16 20h.01"></path>
      <path d="M17.5 15H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
    </svg>`,

  fog: `
    <svg class="svg-icon weather-fog" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 10h14"></path>
      <path d="M3 14h18"></path>
      <path d="M6 18h12"></path>
      <path d="M8 6h8"></path>
    </svg>`,

  wind: `
    <svg class="svg-icon weather-wind" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
    </svg>`,

  droplet: `
    <svg class="svg-icon icon-droplet" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
    </svg>`,

  // UI & Status Icons
  alertTriangle: `
    <svg class="svg-icon icon-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`,

  checkCircle: `
    <svg class="svg-icon icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>`,

  calendar: `
    <svg class="svg-icon icon-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>`,

  radar: `
    <svg class="svg-icon icon-radar" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"></path>
      <path d="M4 6h.01"></path>
      <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"></path>
      <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"></path>
      <path d="M12 18h.01"></path>
      <path d="M17.99 11.66A6 6 0 0 1 15.77 16.63"></path>
      <circle cx="12" cy="12" r="2"></circle>
      <path d="m13.41 10.59 5.66-5.66"></path>
    </svg>`,

  wifi: `
    <svg class="svg-icon icon-wifi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h.01"></path>
      <path d="M2 8.82a15 15 0 0 1 20 0"></path>
      <path d="M5 12.86a10 10 0 0 1 14 0"></path>
      <path d="M8.5 16.43a5 5 0 0 1 7 0"></path>
    </svg>`,

  wifiOff: `
    <svg class="svg-icon icon-wifi-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"></line>
      <path d="M8.5 16.43a5 5 0 0 1 7 0"></path>
      <path d="M5 12.86a10 10 0 0 1 3.5-2.29"></path>
      <path d="M15.5 10.57a10 10 0 0 1 3.5 2.29"></path>
      <path d="M2 8.82a15 15 0 0 1 6.5-2.73"></path>
      <path d="M15.5 6.09a15 15 0 0 1 6.5 2.73"></path>
      <line x1="12" y1="20" x2="12.01" y2="20"></line>
    </svg>`,

  refresh: `
    <svg class="svg-icon icon-refresh" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.5 2v6h-6"></path>
      <path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
    </svg>`
};

/**
 * Maps WMO weather code and day/night status to corresponding SVG icon
 * @param {number} code - WMO weather code (0-99)
 * @param {boolean} isDay - 1 for day, 0 for night
 * @returns {string} SVG HTML string
 */
export function getWeatherIcon(code, isDay = true) {
  if (code === 0) return isDay ? ICONS.sun : ICONS.moon;
  if (code === 1 || code === 2) return isDay ? ICONS.partlyCloudyDay : ICONS.partlyCloudyNight;
  if (code === 3) return ICONS.cloudy;
  if (code >= 45 && code <= 48) return ICONS.fog;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ICONS.rain;
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return ICONS.snow;
  if (code >= 95 && code <= 99) return ICONS.thunderstorm;
  return isDay ? ICONS.partlyCloudyDay : ICONS.partlyCloudyNight;
}

/**
 * Maps WMO weather code to descriptive label
 * @param {number} code - WMO weather code
 * @returns {string} Description
 */
export function getWeatherDescription(code) {
  const map = {
    0: "Clear Sky",
    1: "Mainly Clear",
    2: "Partly Cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing Rime Fog",
    51: "Light Drizzle",
    53: "Moderate Drizzle",
    55: "Dense Drizzle",
    56: "Light Freezing Drizzle",
    57: "Dense Freezing Drizzle",
    61: "Slight Rain",
    63: "Moderate Rain",
    65: "Heavy Rain",
    66: "Light Freezing Rain",
    67: "Heavy Freezing Rain",
    71: "Slight Snow Fall",
    73: "Moderate Snow Fall",
    75: "Heavy Snow Fall",
    77: "Snow Grains",
    80: "Slight Rain Showers",
    81: "Moderate Rain Showers",
    82: "Violent Rain Showers",
    85: "Slight Snow Showers",
    86: "Heavy Snow Showers",
    95: "Thunderstorm",
    96: "Thunderstorm with Hail",
    99: "Severe Thunderstorm"
  };
  return map[code] || "Partly Cloudy";
}
