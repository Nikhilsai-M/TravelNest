const axios = require("axios");

function classifyWeather(current) {
  const temperature = Number(current?.temperature_2m);
  const precipitation = Number(current?.precipitation);
  const cloudCover = Number(current?.cloud_cover);
  const isDay = Boolean(current?.is_day);
  const weatherCode = Number(current?.weather_code);

  const isRainy =
    precipitation >= 0.3 ||
    [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode);
  const isHot = temperature >= 32;
  const isPleasant = temperature >= 19 && temperature <= 29 && !isRainy;
  const isCloudy = cloudCover >= 65;
  const nearSunset = !isDay || (cloudCover < 70 && !isRainy);

  return {
    temperatureC: Number.isFinite(temperature) ? Math.round(temperature) : null,
    precipitationMm: Number.isFinite(precipitation) ? Number(precipitation.toFixed(1)) : 0,
    cloudCover: Number.isFinite(cloudCover) ? cloudCover : null,
    isDay,
    isRainy,
    isHot,
    isPleasant,
    isCloudy,
    nearSunset,
    summary: isRainy
      ? "Rain is likely, so indoor and low-transit stops are favored."
      : isHot
        ? "Warm conditions favor shaded or indoor stops and lighter walking."
        : nearSunset
          ? "Conditions support scenic or outdoor stops if timing allows."
          : "Conditions are neutral, so the planner can balance indoor and outdoor picks.",
  };
}

async function fetchWeatherContext({ lat, lng }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  try {
    const response = await axios.get("https://api.open-meteo.com/v1/forecast", {
      params: {
        latitude: lat,
        longitude: lng,
        current: "temperature_2m,precipitation,weather_code,cloud_cover,is_day",
        timezone: "auto",
      },
      timeout: 12000,
    });

    const current = response.data?.current;

    if (!current) {
      return null;
    }

    return classifyWeather(current);
  } catch (error) {
    return null;
  }
}

module.exports = {
  fetchWeatherContext,
};
