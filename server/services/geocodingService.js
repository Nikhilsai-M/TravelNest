const axios = require("axios");

function buildHeaders() {
  return {
    "User-Agent":
      process.env.NOMINATIM_USER_AGENT ||
      "travel-nest/1.0 (opensource-travel-planner@example.com)",
    "Accept-Language": "en",
  };
}

async function geocodeQuery(query) {
  if (!query) {
    return null;
  }

  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: query,
        format: "jsonv2",
        limit: 1,
      },
      headers: buildHeaders(),
      timeout: 12000,
    });

    const hit = response.data?.[0];

    if (!hit) {
      return null;
    }

    return {
      label: hit.display_name,
      lat: Number(hit.lat),
      lng: Number(hit.lon),
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  geocodeQuery,
};
