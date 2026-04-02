const {
  buildFallbackPois,
  computeDiscoveryRadius,
  fetchNearbyPois,
} = require("../services/overpassService");
const { geocodeQuery } = require("../services/geocodingService");
const { parseInterestInput } = require("../utils/interests");

exports.fetchPois = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const freeMinutes = Number(req.query.freeMinutes || 90);
    const radiusMeters = req.query.radiusMeters ? Number(req.query.radiusMeters) : undefined;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({
        error: "lat and lng query parameters are required.",
      });
    }

    const travelerMode = req.query.travelerMode || "leisure";
    const interests = parseInterestInput(req.query.interests);
    const effectiveRadiusMeters = computeDiscoveryRadius({
      freeMinutes,
      radiusMeters,
      travelerMode,
    });
    let pois = [];
    let source = "overpass";

    try {
      pois = await fetchNearbyPois({
        lat,
        lng,
        freeMinutes,
        radiusMeters: effectiveRadiusMeters,
        travelerMode,
        interests,
      });
    } catch (error) {
      console.warn("fetch-pois live lookup failed:", error.message);
      pois = buildFallbackPois({
        lat,
        lng,
        travelerMode,
        interests,
        freeMinutes,
        radiusMeters: effectiveRadiusMeters,
      });
      source = "fallback";
    }

    res.json({
      location: {
        lat,
        lng,
      },
      freeMinutes,
      radiusMeters: effectiveRadiusMeters,
      source,
      count: pois.length,
      pois,
    });
  } catch (error) {
    console.error("fetchPois failed:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch nearby POIs.",
    });
  }
};

exports.geocodePlace = async (req, res) => {
  try {
    const query = req.query.query?.trim();

    if (!query) {
      return res.status(400).json({
        error: "query is required.",
      });
    }

    const location = await geocodeQuery(query);

    if (!location) {
      return res.status(404).json({
        error: "No matching location found.",
      });
    }

    return res.json({ location });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to geocode location.",
    });
  }
};
