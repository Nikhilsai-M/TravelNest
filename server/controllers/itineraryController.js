const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const { fetchNearbyPois } = require("../services/overpassService");
const { calculateTravelMatrix } = require("../services/routingService");
const {
  buildDeterministicItinerary,
  deriveFreeSlots,
  normalizeExpenseMode,
  normalizeRefinementOptions,
  normalizeTransportMode,
  optimizeCandidatePlaces,
} = require("../services/itineraryService");
const { generateStructuredItinerary, hasGeminiConfig } = require("../services/geminiService");
const { fetchWeatherContext } = require("../services/weatherService");
const { parseInterestInput } = require("../utils/interests");

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceBetweenKm(origin, destination) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.lat - origin.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const arc =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

function buildTripTitle({ travelerMode, location, itinerary }) {
  const anchor = location?.label || "Saved trip";
  const prefix = travelerMode === "business" ? "Business plan" : "Leisure plan";
  return itinerary?.headline ? `${prefix} • ${anchor}` : anchor;
}

function buildTripAnalytics(itinerary) {
  const timeline = Array.isArray(itinerary?.timeline) ? itinerary.timeline : [];
  const categoryCounts = {};
  const placeCounts = {};

  timeline.forEach((item) => {
    const category = item.category || "Other";
    const place = item.title || "Unknown place";
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    placeCounts[place] = (placeCounts[place] || 0) + 1;
  });

  return {
    categoryCounts,
    placeCounts,
    stopTitles: timeline.map((item) => item.title).filter(Boolean),
  };
}

function formatTripSummary(trip) {
  const analytics = buildTripAnalytics(trip.itinerary);

  return {
    id: String(trip._id),
    title: trip.title || buildTripTitle({ travelerMode: trip.mode, location: trip.location, itinerary: trip.itinerary }),
    mode: trip.mode,
    location: trip.location,
    updatedAt: trip.updatedAt,
    createdAt: trip.createdAt,
    preferences: trip.preferences || [],
    notes: trip.notes || "",
    sourceDocumentName: trip.sourceDocumentName || "",
    journalEntries: (trip.journalEntries || []).map((entry, index) => ({
      id: String(entry._id || `${trip._id}-journal-${index + 1}`),
      content: entry.content || "",
      createdAt: entry.createdAt || trip.updatedAt || trip.createdAt,
    })),
    stats: trip.itinerary?.stats || null,
    travelerProfile: trip.itinerary?.travelerProfile || trip.travelerProfile || null,
    transportMode: trip.transportMode || trip.itinerary?.transportMode || "auto",
    expenseMode: trip.expenseMode || trip.itinerary?.expenseMode || "balanced",
    itineraryHeadline: trip.itinerary?.headline || "",
    itineraryOverview: trip.itinerary?.overview || "",
    analytics,
  };
}

exports.optimizeItinerary = async (req, res) => {
  try {
    const travelerMode = req.body.travelerMode || "leisure";
    const location = req.body.location
      ? {
          ...req.body.location,
          lat: Number(req.body.location.lat),
          lng: Number(req.body.location.lng),
        }
      : null;
    const notes = req.body.notes?.trim() || "";
    const preferences = parseInterestInput(req.body.interests);
    const refinementOptions = normalizeRefinementOptions(req.body.refinementOptions);
    const transportMode = normalizeTransportMode(req.body.transportMode);
    const expenseMode = normalizeExpenseMode(req.body.expenseMode);
    const freeSlots = deriveFreeSlots({
      travelerMode,
      freeSlots: req.body.freeSlots,
      availableMinutes: req.body.availableMinutes,
      scheduleData: req.body.schedule,
    });

    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
      return res.status(400).json({
        error: "location with numeric lat and lng is required.",
      });
    }

    const weatherContext = await fetchWeatherContext({
      lat: location.lat,
      lng: location.lng,
    });

    let rawPois = Array.isArray(req.body.rawPois) && req.body.rawPois.length > 0 ? req.body.rawPois : [];

    rawPois = rawPois
      .map((poi, index) => ({
        id: poi.id || `poi-${index + 1}`,
        name: poi.name || poi.label || `Stop ${index + 1}`,
        label: poi.label || poi.name || `Stop ${index + 1}`,
        lat: Number(poi.lat),
        lng: Number(poi.lng),
        category: poi.category || "landmark",
        categoryLabel: poi.categoryLabel || "Local Stop",
        cultureWeight: Number(poi.cultureWeight || 1.5),
        visitDurationMinutes: Number(poi.visitDurationMinutes || 45),
        tagSummary: poi.tagSummary || "",
        source: poi.source || "client",
        address: poi.address || "",
      }))
      .filter((poi) => Number.isFinite(poi.lat) && Number.isFinite(poi.lng));

    if (rawPois.length > 0) {
      rawPois = rawPois.filter(
        (poi) => distanceBetweenKm(location, { lat: poi.lat, lng: poi.lng }) <= 40
      );
    }

    if (rawPois.length === 0) {
      try {
        rawPois = await fetchNearbyPois({
          lat: location.lat,
          lng: location.lng,
          freeMinutes: freeSlots[0]?.durationMinutes || Number(req.body.availableMinutes) || 120,
          radiusMeters: req.body.radiusMeters ? Number(req.body.radiusMeters) : undefined,
          travelerMode,
          interests: preferences,
        });
      } catch (poiError) {
        console.warn("POI fetch failed during itinerary optimization:", poiError.message);
        rawPois = [];
      }
    }

    const prerankedPois = optimizeCandidatePlaces({
      pois: rawPois,
      travelerMode,
      interests: preferences,
      freeSlots,
      notes,
      refinementOptions,
      weatherContext,
      limit: Math.min(rawPois.length, 36),
    });

    const routeReadyPois = await calculateTravelMatrix({
      origin: location,
      pois: prerankedPois.slice(0, 24),
      travelerMode,
      availableMinutes: Math.max(...freeSlots.map((slot) => slot.durationMinutes), 0),
      transportMode,
    });

    const shortlistedPois = optimizeCandidatePlaces({
      pois: routeReadyPois,
      travelerMode,
      interests: preferences,
      freeSlots,
      notes,
      refinementOptions,
      weatherContext,
      limit: 10,
    });

    const baseItinerary = buildDeterministicItinerary({
      travelerMode,
      location,
      interests: preferences,
      notes,
      freeSlots,
      shortlistedPois,
      rawPoiCount: rawPois.length,
      refinementOptions,
      weatherContext,
      transportMode,
      expenseMode,
    });

    const aiItinerary = await generateStructuredItinerary({
      travelerMode,
      location,
      interests: preferences,
      notes,
      baseItinerary,
    });

    const itinerary = aiItinerary || baseItinerary;
    let tripId = null;

    try {
      const savedTrip = await Trip.create({
        user: req.dbUser?._id || null,
        userSnapshot: req.dbUser
          ? {
              clerkId: req.dbUser.clerkId,
              fullName: req.dbUser.fullName,
              email: req.dbUser.email,
            }
          : {
              clerkId: req.auth?.userId || "",
              fullName: req.clerkUser?.fullName || "",
              email: req.clerkUser?.emailAddresses?.[0]?.emailAddress || "",
            },
        title: buildTripTitle({ travelerMode, location, itinerary }),
        mode: travelerMode,
        location,
        preferences,
        notes,
        refinementOptions,
        scheduleText: req.body.scheduleText || "",
        scheduleData: req.body.schedule || null,
        freeSlots,
        rawPois: rawPois.slice(0, 30),
        itinerary,
        sourceDocumentName: req.body.documentName || null,
        travelerProfile: itinerary.travelerProfile || null,
        journalEntries: [],
        transportMode,
        expenseMode,
      });

      tripId = savedTrip._id;
    } catch (persistError) {
      console.warn("Trip persistence failed:", persistError.message);
      tripId = null;
    }

    res.json({
      tripId,
      ai: {
        provider: "gemini",
        configured: hasGeminiConfig(),
        used: Boolean(aiItinerary),
        stage: `${travelerMode}-itinerary-refinement`,
      },
      poiSource:
        rawPois.length > 0 ? Array.from(new Set(rawPois.map((poi) => poi.source || "unknown"))).join(", ") : "none",
      itinerary,
      weatherContext,
      transportMode,
      expenseMode,
      rawPoiCount: rawPois.length,
      prerankedPoiCount: prerankedPois.length,
      selectedPoiCount: itinerary.mapPoints?.length || 0,
      location,
    });
  } catch (error) {
    console.error("optimizeItinerary failed:", error);
    res.status(500).json({
      error: error.message || "Failed to optimize itinerary.",
      stage: "optimize-itinerary",
    });
  }
};

exports.listTripHistory = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        trips: [],
        storage: "unavailable",
      });
    }

    const query = req.dbUser?._id
      ? {
          $or: [{ user: req.dbUser._id }, { "userSnapshot.clerkId": req.auth.userId }],
        }
      : { "userSnapshot.clerkId": req.auth.userId };

    const trips = await Trip.find(query).sort({ updatedAt: -1 }).limit(12).lean();

    return res.json({
      trips: trips.map(formatTripSummary),
      storage: "mongodb",
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load trip history.",
    });
  }
};

exports.getTripHistoryItem = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "MongoDB is not connected.",
      });
    }

    const query = req.dbUser?._id
      ? {
          _id: req.params.tripId,
          $or: [{ user: req.dbUser._id }, { "userSnapshot.clerkId": req.auth.userId }],
        }
      : { _id: req.params.tripId, "userSnapshot.clerkId": req.auth.userId };

    const trip = await Trip.findOne(query).lean();

    if (!trip) {
      return res.status(404).json({
        error: "Trip not found.",
      });
    }

    return res.json({
      trip: {
        ...formatTripSummary(trip),
        schedule: trip.scheduleData || null,
        scheduleText: trip.scheduleText || "",
        freeSlots: trip.freeSlots || [],
        rawPois: trip.rawPois || [],
        itinerary: trip.itinerary || null,
        journalEntries: (trip.journalEntries || []).map((entry, index) => ({
          id: String(entry._id || `${trip._id}-journal-${index + 1}`),
          content: entry.content || "",
          createdAt: entry.createdAt || trip.updatedAt || trip.createdAt,
        })),
        transportMode: trip.transportMode || trip.itinerary?.transportMode || "auto",
        expenseMode: trip.expenseMode || trip.itinerary?.expenseMode || "balanced",
      },
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to load trip.",
    });
  }
};

exports.updateTripJournal = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "MongoDB is not connected.",
      });
    }

    const query = req.dbUser?._id
      ? {
          _id: req.params.tripId,
          $or: [{ user: req.dbUser._id }, { "userSnapshot.clerkId": req.auth.userId }],
        }
      : { _id: req.params.tripId, "userSnapshot.clerkId": req.auth.userId };

    const trip = await Trip.findOne(query);

    if (!trip) {
      return res.status(404).json({
        error: "Trip not found.",
      });
    }

    const entries = Array.isArray(req.body.journalEntries)
      ? req.body.journalEntries
          .map((entry) => ({
            content: String(entry.content || "").trim(),
            createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
          }))
          .filter((entry) => entry.content)
          .slice(-50)
      : [];

    trip.journalEntries = entries;
    await trip.save();

    return res.json({
      journalEntries: trip.journalEntries.map((entry, index) => ({
        id: String(entry._id || `${trip._id}-journal-${index + 1}`),
        content: entry.content || "",
        createdAt: entry.createdAt || trip.updatedAt || trip.createdAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Failed to update trip journal.",
    });
  }
};
