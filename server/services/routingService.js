const axios = require("axios");

function resolveTravelProfile({ travelerMode, availableMinutes, transportMode }) {
  if (transportMode && transportMode !== "auto") {
    return transportMode;
  }

  return travelerMode === "business"
    ? "driving"
    : Number(availableMinutes || 0) >= 240
      ? "cycling"
      : "walking";
}

async function calculateTravelMatrix({ origin, pois, travelerMode, availableMinutes, transportMode }) {
  if (!origin || !Array.isArray(pois) || pois.length === 0) {
    return [];
  }

  const baseUrl = process.env.OSRM_API_URL || "https://router.project-osrm.org";
  const profile = resolveTravelProfile({ travelerMode, availableMinutes, transportMode });
  const coordinates = [
    `${origin.lng},${origin.lat}`,
    ...pois.map((poi) => `${poi.lng},${poi.lat}`),
  ].join(";");

  try {
    const response = await axios.get(`${baseUrl}/table/v1/${profile}/${coordinates}`, {
      params: {
        sources: 0,
        annotations: "duration,distance",
      },
      timeout: 20000,
    });

    const durations = response.data?.durations?.[0]?.slice(1) || [];
    const distances = response.data?.distances?.[0]?.slice(1) || [];

    return pois.map((poi, index) => ({
      ...poi,
      travelProfile: profile,
      travelMinutes: Math.max(4, Math.ceil((durations[index] || 0) / 60)),
      distanceMeters: Math.round(distances[index] || 0),
    }));
  } catch (error) {
    return pois.map((poi) => ({
      ...poi,
      travelProfile: profile,
      travelMinutes: 15,
      distanceMeters: 1000,
    }));
  }
}

module.exports = {
  calculateTravelMatrix,
  resolveTravelProfile,
};
