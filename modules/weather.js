/**
 * Weather Module
 *
 * Integrates with Open-Meteo API for real-time conditions and 5-day forecast.
 * Completely free, no API keys, CORS-enabled, low overhead.
 */

import { getWeatherIcon, getWeatherDescription, ICONS } from "./icons.js";

export class WeatherModule {
  constructor(config) {
    this.config = config;
    this.lastData = null;
    this.timerId = null;

    // Element references
    this.container = document.getElementById("weather-content");
    this.locationNameEl = document.getElementById("weather-location-name");
    this.errorBadgeEl = document.getElementById("weather-error-badge");
  }

  async start() {
    await this.fetchWeather();
    const intervalMs = this.config.intervals.weatherMin * 60 * 1000;
    this.timerId = setInterval(() => this.fetchWeather(), intervalMs);
  }

  stop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  async fetchWeather() {
    const { latitude, longitude, name } = this.config.location;
    const isFahrenheit = this.config.units.temperature === "fahrenheit";
    const tempUnit = isFahrenheit ? "fahrenheit" : "celsius";
    const windUnit = this.config.units.windSpeed === "mph" ? "mph" : "kmh";
    const precipUnit = this.config.units.precipitation === "inch" ? "inch" : "mm";

    const url = `${this.config.feeds.openMeteoApi}?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&precipitation_unit=${precipUnit}&timezone=auto`;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Weather HTTP ${response.status}`);
      }
      const data = await response.json();
      this.lastData = data;
      this.render(data);
      if (this.errorBadgeEl) this.errorBadgeEl.classList.add("hidden");
    } catch (err) {
      console.warn("[Weather] Fetch error:", err.message);
      if (this.lastData) {
        // Render stale cached data with indicator
        this.render(this.lastData);
        if (this.errorBadgeEl) {
          this.errorBadgeEl.textContent = "Offline (Cached)";
          this.errorBadgeEl.classList.remove("hidden");
        }
      } else {
        if (this.container) {
          this.container.innerHTML = `
            <div class="card-empty-state">
              <span class="empty-icon">${ICONS.cloudy}</span>
              <p>Weather temporarily unavailable</p>
              <span class="subtext">Retrying automatically...</span>
            </div>
          `;
        }
        if (this.errorBadgeEl) {
          this.errorBadgeEl.textContent = "Connection Error";
          this.errorBadgeEl.classList.remove("hidden");
        }
      }
    }
  }

  render(data) {
    if (!this.container) return;

    if (this.locationNameEl) {
      this.locationNameEl.textContent = this.config.location.name;
    }

    const current = data.current;
    const daily = data.daily;
    const isDay = current.is_day === 1;
    const tempSymbol = this.config.units.temperature === "fahrenheit" ? "°F" : "°C";
    const windUnit = this.config.units.windSpeed;

    const currentTemp = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const highToday = Math.round(daily.temperature_2m_max[0]);
    const lowToday = Math.round(daily.temperature_2m_min[0]);
    const humidity = Math.round(current.relative_humidity_2m);
    const windSpeed = Math.round(current.wind_speed_10m);
    const conditionDesc = getWeatherDescription(current.weather_code);
    const conditionIcon = getWeatherIcon(current.weather_code, isDay);

    // Build 5-day forecast cards
    const forecastDays = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 1; i <= 5 && i < daily.time.length; i++) {
      const dateParts = daily.time[i].split("-");
      const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const dayName = dayNames[dateObj.getDay()];
      const code = daily.weather_code[i];
      const maxT = Math.round(daily.temperature_2m_max[i]);
      const minT = Math.round(daily.temperature_2m_min[i]);
      const precipProb = daily.precipitation_probability_max ? Math.round(daily.precipitation_probability_max[i] || 0) : 0;
      const icon = getWeatherIcon(code, true);

      forecastDays.push(`
        <div class="forecast-card">
          <span class="forecast-day">${dayName}</span>
          <div class="forecast-icon">${icon}</div>
          <div class="forecast-temps">
            <span class="forecast-high">${maxT}°</span>
            <span class="forecast-low">${minT}°</span>
          </div>
          ${precipProb > 0 ? `<div class="forecast-precip"><span class="precip-drop">${ICONS.droplet}</span>${precipProb}%</div>` : `<div class="forecast-precip empty">--</div>`}
        </div>
      `);
    }

    this.container.innerHTML = `
      <div class="weather-hero">
        <div class="weather-hero-main">
          <div class="weather-hero-temp-block">
            <span class="weather-current-temp">${currentTemp}</span>
            <span class="weather-temp-deg">${tempSymbol}</span>
          </div>
          <div class="weather-hero-condition">
            <span class="condition-label">${conditionDesc}</span>
            <span class="feels-like">Feels like <strong>${feelsLike}°</strong></span>
          </div>
        </div>
        <div class="weather-hero-icon-wrapper">
          ${conditionIcon}
        </div>
      </div>

      <div class="weather-stats-bar">
        <div class="stat-pill">
          <span class="stat-label">High / Low</span>
          <span class="stat-value">${highToday}° / ${lowToday}°</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Humidity</span>
          <span class="stat-value">${humidity}%</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Wind</span>
          <span class="stat-value">${windSpeed} ${windUnit}</span>
        </div>
        <div class="stat-pill">
          <span class="stat-label">Rain Chance</span>
          <span class="stat-value">${daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0}%</span>
        </div>
      </div>

      <div class="weather-forecast-section">
        <h4 class="section-micro-title">5-Day Outlook</h4>
        <div class="forecast-grid">
          ${forecastDays.join("")}
        </div>
      </div>
    `;
  }
}
