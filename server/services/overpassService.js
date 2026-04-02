const axios = require("axios");
const { parseInterestInput } = require("../utils/interests");

function computeDiscoveryRadius({ freeMinutes, radiusMeters, travelerMode }) {
  const requestedRadius = Number(radiusMeters);

  if (Number.isFinite(requestedRadius) && requestedRadius > 0) {
    return requestedRadius;
  }

  const minutes = Number(freeMinutes) || (travelerMode === "business" ? 120 : 180);

  if (travelerMode === "business") {
    if (minutes <= 90) {
      return 1800;
    }

    if (minutes <= 180) {
      return 3000;
    }

    return 4500;
  }

  if (minutes <= 90) {
    return 2200;
  }

  if (minutes <= 150) {
    return 3500;
  }

  if (minutes <= 240) {
    return 5500;
  }

  if (minutes <= 360) {
    return 7500;
  }

  return 9500;
}

function buildInterestClauses(interests) {
  const normalizedInterests = parseInterestInput(interests);
  const clauses = [];

  if (normalizedInterests.some((term) => /food|coffee|cafe|restaurant|street food|dining/.test(term))) {
    clauses.push(
      'node["amenity"~"cafe|restaurant|fast_food|food_court"](around:RADIUS,LAT,LNG);',
      'way["amenity"~"cafe|restaurant|fast_food|food_court"](around:RADIUS,LAT,LNG);',
      'node["amenity"="marketplace"](around:RADIUS,LAT,LNG);',
      'way["amenity"="marketplace"](around:RADIUS,LAT,LNG);'
    );
  }

  if (normalizedInterests.some((term) => /art|gallery|design|museum|culture/.test(term))) {
    clauses.push(
      'node["tourism"~"museum|gallery|artwork"](around:RADIUS,LAT,LNG);',
      'way["tourism"~"museum|gallery|artwork"](around:RADIUS,LAT,LNG);'
    );
  }

  if (normalizedInterests.some((term) => /history|heritage|historic|architecture|fort|monument/.test(term))) {
    clauses.push(
      'node["historic"](around:RADIUS,LAT,LNG);',
      'way["historic"](around:RADIUS,LAT,LNG);',
      'relation["historic"](around:RADIUS,LAT,LNG);'
    );
  }

  if (normalizedInterests.some((term) => /nature|park|garden|walk|outdoor|sunset|view/.test(term))) {
    clauses.push(
      'node["leisure"~"park|garden|nature_reserve"](around:RADIUS,LAT,LNG);',
      'way["leisure"~"park|garden|nature_reserve"](around:RADIUS,LAT,LNG);',
      'node["tourism"="viewpoint"](around:RADIUS,LAT,LNG);',
      'way["tourism"="viewpoint"](around:RADIUS,LAT,LNG);'
    );
  }

  if (normalizedInterests.some((term) => /temple|church|mosque|spiritual|religious/.test(term))) {
    clauses.push(
      'node["amenity"="place_of_worship"](around:RADIUS,LAT,LNG);',
      'way["amenity"="place_of_worship"](around:RADIUS,LAT,LNG);'
    );
  }

  return clauses;
}

function buildOverpassQuery({ lat, lng, radiusMeters, travelerMode, interests }) {
  const clauses = [
    'node["tourism"~"museum|gallery|attraction|viewpoint|artwork"](around:RADIUS,LAT,LNG);',
    'way["tourism"~"museum|gallery|attraction|viewpoint|artwork"](around:RADIUS,LAT,LNG);',
    'relation["tourism"~"museum|gallery|attraction|viewpoint|artwork"](around:RADIUS,LAT,LNG);',
    'node["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:RADIUS,LAT,LNG);',
    'way["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:RADIUS,LAT,LNG);',
    'relation["historic"~"monument|memorial|castle|ruins|archaeological_site"](around:RADIUS,LAT,LNG);',
  ];

  const normalizedInterests = parseInterestInput(interests);

  if (
    travelerMode === "business" ||
    normalizedInterests.some((term) => /coffee|food|cafe/.test(term))
  ) {
    clauses.push(
      'node["amenity"~"cafe|restaurant"](around:RADIUS,LAT,LNG);',
      'way["amenity"~"cafe|restaurant"](around:RADIUS,LAT,LNG);'
    );
  }

  if (
    travelerMode === "leisure" ||
    normalizedInterests.some((term) => /park|nature|walk/.test(term))
  ) {
    clauses.push(
      'node["leisure"~"park|garden"](around:RADIUS,LAT,LNG);',
      'way["leisure"~"park|garden"](around:RADIUS,LAT,LNG);'
    );
  }

  clauses.push(...buildInterestClauses(normalizedInterests));

  return `[out:json][timeout:25];(${clauses
    .join("")
    .replaceAll("RADIUS", radiusMeters)
    .replaceAll("LAT", lat)
    .replaceAll("LNG", lng)});out center tags;`;
}

function describeCategory(tags = {}) {
  if (tags.tourism === "museum") {
    return { key: "museum", label: "Museum", cultureWeight: 3.4, visitDurationMinutes: 80 };
  }

  if (tags.tourism === "gallery" || tags.tourism === "artwork") {
    return { key: "gallery", label: "Gallery", cultureWeight: 3.1, visitDurationMinutes: 60 };
  }

  if (tags.historic) {
    return { key: "historic", label: "Historic Site", cultureWeight: 3.6, visitDurationMinutes: 55 };
  }

  if (tags.tourism === "viewpoint") {
    return { key: "viewpoint", label: "Viewpoint", cultureWeight: 2.3, visitDurationMinutes: 35 };
  }

  if (tags.leisure === "park" || tags.leisure === "garden") {
    return { key: "park", label: "Park", cultureWeight: 1.9, visitDurationMinutes: 40 };
  }

  if (tags.amenity === "cafe") {
    return { key: "cafe", label: "Cafe", cultureWeight: 1.2, visitDurationMinutes: 35 };
  }

  if (tags.amenity === "restaurant") {
    return { key: "restaurant", label: "Restaurant", cultureWeight: 1.1, visitDurationMinutes: 60 };
  }

  return { key: "landmark", label: "Local Stop", cultureWeight: 1.5, visitDurationMinutes: 45 };
}

function normalizePoi(element) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;

  if (!lat || !lng) {
    return null;
  }

  const category = describeCategory(tags);
  const name =
    tags.name ||
    tags["name:en"] ||
    `${category.label} near ${tags.addr_street || tags.neighbourhood || "your route"}`;

  return {
    id: `poi-${element.type}-${element.id}`,
    name,
    label: name,
    lat,
    lng,
    category: category.key,
    categoryLabel: category.label,
    cultureWeight: category.cultureWeight,
    visitDurationMinutes: category.visitDurationMinutes,
    tagSummary: Object.entries(tags)
      .slice(0, 6)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", "),
    source: "overpass",
    address: [tags["addr:street"], tags["addr:city"]].filter(Boolean).join(", "),
  };
}

function buildFallbackPois({ lat, lng, travelerMode, interests, freeMinutes, radiusMeters }) {
  const normalizedInterests = parseInterestInput(interests);
  const computedRadius = computeDiscoveryRadius({
    freeMinutes,
    radiusMeters,
    travelerMode,
  });
  const degreeSpread = computedRadius / 111000;
  const seedPlaces = [
    {
      suffix: "Heritage Walk",
      category: "historic",
      categoryLabel: "Historic Site",
      cultureWeight: 3.2,
      visitDurationMinutes: 50,
      latOffset: degreeSpread * 0.45,
      lngOffset: degreeSpread * 0.18,
    },
    {
      suffix: "City Museum",
      category: "museum",
      categoryLabel: "Museum",
      cultureWeight: 3.5,
      visitDurationMinutes: 75,
      latOffset: degreeSpread * -0.32,
      lngOffset: degreeSpread * 0.28,
    },
    {
      suffix: "Local Cafe",
      category: "cafe",
      categoryLabel: "Cafe",
      cultureWeight: 1.4,
      visitDurationMinutes: 35,
      latOffset: degreeSpread * 0.22,
      lngOffset: degreeSpread * -0.26,
    },
    {
      suffix: "Viewpoint",
      category: "viewpoint",
      categoryLabel: "Viewpoint",
      cultureWeight: 2.1,
      visitDurationMinutes: 30,
      latOffset: degreeSpread * -0.38,
      lngOffset: degreeSpread * -0.18,
    },
    {
      suffix: "Park Loop",
      category: "park",
      categoryLabel: "Park",
      cultureWeight: 1.8,
      visitDurationMinutes: 40,
      latOffset: degreeSpread * 0.4,
      lngOffset: degreeSpread * -0.34,
    },
  ];

  const themedName =
    normalizedInterests[0]?.replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    (travelerMode === "business" ? "Business District" : "Nearby");

  return seedPlaces.map((place, index) => ({
    id: `fallback-poi-${index + 1}`,
    name: `${themedName} ${place.suffix}`,
    label: `${themedName} ${place.suffix}`,
    lat: Number((lat + place.latOffset).toFixed(6)),
    lng: Number((lng + place.lngOffset).toFixed(6)),
    category: place.category,
    categoryLabel: place.categoryLabel,
    cultureWeight: place.cultureWeight,
    visitDurationMinutes: place.visitDurationMinutes,
    tagSummary: "Generated fallback POI when live Overpass data was unavailable.",
    source: "fallback",
    address: "Nearby area",
  }));
}

async function fetchNearbyPois({ lat, lng, freeMinutes, radiusMeters, travelerMode, interests }) {
  const computedRadius = computeDiscoveryRadius({
    freeMinutes,
    radiusMeters,
    travelerMode,
  });
  const endpoint = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";

  const response = await axios.post(
    endpoint,
    buildOverpassQuery({ lat, lng, radiusMeters: computedRadius, travelerMode, interests }),
    {
      headers: {
        "Content-Type": "text/plain",
      },
      timeout: 30000,
    }
  );

  const seen = new Set();

  return (response.data?.elements || [])
    .map(normalizePoi)
    .filter(Boolean)
    .filter((poi) => {
      const fingerprint = `${poi.name}-${poi.lat.toFixed(4)}-${poi.lng.toFixed(4)}`;

      if (seen.has(fingerprint)) {
        return false;
      }

      seen.add(fingerprint);
      return true;
    })
    .slice(0, computedRadius >= 7000 ? 60 : 40);
}

module.exports = {
  buildFallbackPois,
  computeDiscoveryRadius,
  fetchNearbyPois,
};
