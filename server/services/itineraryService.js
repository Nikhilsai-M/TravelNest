const {
  buildFreeSlots,
  minutesToClockLabel,
  parseTimeToMinutes,
} = require("../utils/time");
const { parseInterestInput } = require("../utils/interests");

function normalizeRefinementOptions(refinementOptions) {
  const allowed = new Set([
    "more_food",
    "less_walking",
    "more_iconic_places",
    "quiet_places_only",
    "budget_friendly",
    "near_meetings_only",
  ]);

  return Array.from(
    new Set((Array.isArray(refinementOptions) ? refinementOptions : []).filter((item) => allowed.has(item)))
  );
}

function normalizeTransportMode(value) {
  return ["auto", "walking", "cycling", "driving"].includes(value) ? value : "auto";
}

function normalizeExpenseMode(value) {
  return ["budget", "balanced", "premium"].includes(value) ? value : "balanced";
}

function getInterestCategoryMatches(poi, interests) {
  const categories = `${poi.category || ""} ${poi.categoryLabel || ""} ${poi.name || ""} ${poi.tagSummary || ""}`.toLowerCase();

  return parseInterestInput(interests).filter((interest) => {
    if (/food|coffee|cafe|restaurant|street food|dining/.test(interest)) {
      return /cafe|restaurant|food|market/.test(categories);
    }

    if (/art|gallery|design|museum|culture/.test(interest)) {
      return /museum|gallery|art/.test(categories);
    }

    if (/history|heritage|historic|architecture|fort|monument/.test(interest)) {
      return /historic|heritage|monument|museum|fort/.test(categories);
    }

    if (/nature|park|garden|walk|outdoor|sunset|view/.test(interest)) {
      return /park|garden|viewpoint|nature/.test(categories);
    }

    if (/temple|church|mosque|spiritual|religious/.test(interest)) {
      return /worship|temple|church|mosque/.test(categories);
    }

    return categories.includes(interest);
  });
}

function getNoteMatches(poi, notes) {
  const noteTerms = parseInterestInput(notes);
  const haystack = `${poi.category || ""} ${poi.categoryLabel || ""} ${poi.name || ""} ${poi.tagSummary || ""}`.toLowerCase();

  return noteTerms.filter((term) => term.length > 2 && haystack.includes(term));
}

function normalizeExistingFreeSlots(freeSlots) {
  return freeSlots
    .map((slot, index) => {
      const startMinutes = parseTimeToMinutes(slot.startTime);
      const endMinutes = parseTimeToMinutes(slot.endTime);

      if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
        return null;
      }

      return {
        id: slot.id || `slot-${index + 1}`,
        label: slot.label || `Free Slot ${index + 1}`,
        startTime: minutesToClockLabel(startMinutes),
        endTime: minutesToClockLabel(endMinutes),
        startLabel: slot.startLabel || minutesToClockLabel(startMinutes),
        endLabel: slot.endLabel || minutesToClockLabel(endMinutes),
        durationMinutes: slot.durationMinutes || endMinutes - startMinutes,
        slotType: slot.slotType || "open-day",
        contextLabel: slot.contextLabel || "Flexible open window",
        previousMeeting: slot.previousMeeting || null,
        nextMeeting: slot.nextMeeting || null,
      };
    })
    .filter(Boolean);
}

function deriveFreeSlots({ travelerMode, freeSlots, availableMinutes, scheduleData }) {
  if (scheduleData?.meetings?.length) {
    return buildFreeSlots(scheduleData.meetings, {
      dayStart: "08:00",
      dayEnd: "21:00",
    });
  }

  if (Array.isArray(freeSlots) && freeSlots.length > 0) {
    return normalizeExistingFreeSlots(freeSlots);
  }

  const minutes = Number(availableMinutes) || (travelerMode === "business" ? 120 : 180);

  return buildFreeSlots([], {
    dayStart: "09:00",
    dayEnd: minutesToClockLabel(parseTimeToMinutes("09:00") + minutes),
  });
}

function computeInterestMatches(poi, interests) {
  const haystack = `${poi.name || ""} ${poi.categoryLabel || ""} ${poi.tagSummary || ""}`.toLowerCase();
  const directMatches = parseInterestInput(interests).filter((interest) => haystack.includes(interest));
  const categoryMatches = getInterestCategoryMatches(poi, interests);

  return Array.from(new Set([...directMatches, ...categoryMatches]));
}

function inferPreferenceSignals(notes, interests, travelerMode, refinementOptions = []) {
  const combined = [...parseInterestInput(interests), ...parseInterestInput(notes)].join(" ");
  const refinements = normalizeRefinementOptions(refinementOptions);

  return {
    wantsQuiet: /quiet|calm|peaceful|focus|low-key|avoid crowds/.test(combined) || refinements.includes("quiet_places_only"),
    wantsFood: /food|dining|restaurant|coffee|cafe|brunch|snack/.test(combined) || refinements.includes("more_food"),
    wantsCulture:
      /museum|heritage|historic|culture|gallery|design|architecture|iconic/.test(combined) ||
      refinements.includes("more_iconic_places"),
    wantsNature: /park|garden|nature|walk|outdoor|sunset|view/.test(combined),
    wantsShortDetours:
      travelerMode === "business" ||
      /avoid long detours|close by|nearby|walkable|light transit/.test(combined) ||
      refinements.includes("less_walking") ||
      refinements.includes("near_meetings_only"),
    wantsPhotoFriendly: /photo|photography|view|sunset|scenic/.test(combined),
    wantsBudget: /budget|cheap|affordable|free/.test(combined) || refinements.includes("budget_friendly"),
    wantsNearMeetings: travelerMode === "business" && refinements.includes("near_meetings_only"),
    refinementOptions: refinements,
  };
}

function estimateIconicFactor(poi) {
  const category = `${poi.category || ""} ${poi.categoryLabel || ""} ${poi.tagSummary || ""}`.toLowerCase();
  return /museum|historic|monument|fort|gallery|viewpoint/.test(category) ? 1 : 0;
}

function optimizeCandidatePlaces({
  pois,
  travelerMode,
  interests,
  freeSlots,
  notes = "",
  refinementOptions = [],
  weatherContext = null,
  limit = 10,
}) {
  const interestTerms = parseInterestInput(interests);
  const preferenceSignals = inferPreferenceSignals(notes, interests, travelerMode, refinementOptions);
  const maxUsefulMinutes = Math.max(...freeSlots.map((slot) => slot.durationMinutes), 90);
  const clusterCounts = new Map();

  return pois
    .filter((poi) => Number.isFinite(Number(poi?.lat)) && Number.isFinite(Number(poi?.lng)))
    .map((poi) => {
      const interestMatches = computeInterestMatches(poi, interestTerms);
      const noteMatches = getNoteMatches(poi, notes);
      const lat = Number(poi.lat);
      const lng = Number(poi.lng);
      const travelToleranceDivisor = maxUsefulMinutes >= 300 ? 35 : maxUsefulMinutes >= 180 ? 28 : 20;
      const accessibilityScore = Math.max(0, 3.2 - (poi.travelMinutes || 0) / travelToleranceDivisor);
      const fitScore = poi.visitDurationMinutes <= maxUsefulMinutes ? 1.5 : 0.4;
      const modeBonus =
        travelerMode === "business" && poi.category === "cafe"
          ? 1
          : travelerMode === "leisure" && (poi.category === "park" || poi.category === "viewpoint")
            ? 0.7
            : 0;
      const category = poi.category || "";
      const refinementBonus =
        (preferenceSignals.refinementOptions.includes("more_food") && /cafe|restaurant/.test(category) ? 1.8 : 0) +
        (preferenceSignals.refinementOptions.includes("less_walking") && (poi.travelMinutes || 0) <= 12 ? 1.6 : 0) +
        (preferenceSignals.refinementOptions.includes("more_iconic_places") && estimateIconicFactor(poi) ? 1.9 : 0) +
        (preferenceSignals.refinementOptions.includes("quiet_places_only") && /park|museum|gallery|cafe/.test(category) ? 1.4 : -0.4) +
        (preferenceSignals.refinementOptions.includes("budget_friendly") && /park|viewpoint|historic/.test(category) ? 1.2 : 0) +
        (preferenceSignals.refinementOptions.includes("near_meetings_only") && (poi.travelMinutes || 0) <= 10 ? 1.8 : -1.1);
      const weatherBonus =
        weatherContext?.isRainy
          ? /museum|gallery|cafe|restaurant/.test(category)
            ? 1.5
            : /park|viewpoint/.test(category)
              ? -1.4
              : 0
          : weatherContext?.isHot
            ? /museum|gallery|cafe|restaurant/.test(category)
              ? 1.1
              : /park|viewpoint/.test(category)
                ? -0.8
                : 0
            : weatherContext?.nearSunset
              ? /viewpoint|park|historic/.test(category)
                ? 0.9
                : 0
              : 0;
      const preferenceBonus =
        (preferenceSignals.wantsQuiet && /park|garden|cafe|museum/.test(category) ? 0.8 : 0) +
        (preferenceSignals.wantsCulture && /museum|gallery|historic/.test(category) ? 1.1 : 0) +
        (preferenceSignals.wantsNature && /park|viewpoint/.test(category) ? 0.9 : 0) +
        (preferenceSignals.wantsFood && /cafe|restaurant/.test(category) ? 0.8 : 0) +
        (preferenceSignals.wantsBudget && /park|viewpoint|historic/.test(category) ? 0.6 : 0);
      const interestScore = interestMatches.length * 4.4;
      const noteScore = noteMatches.length * 2.4;
      const premiumInterestBonus =
        interestMatches.length > 0 && /museum|historic|gallery|park|viewpoint|restaurant|cafe/.test(category)
          ? 1
          : 0;

      const score =
        poi.cultureWeight * 2.2 +
        interestScore +
        noteScore +
        accessibilityScore +
        fitScore +
        modeBonus +
        preferenceBonus +
        refinementBonus +
        weatherBonus +
        premiumInterestBonus;

      return {
        ...poi,
        lat,
        lng,
        interestMatches,
        noteMatches,
        score: Number(score.toFixed(2)),
        clusterKey: `${lat.toFixed(2)}-${lng.toFixed(2)}`,
      };
    })
    .sort((left, right) => right.score - left.score)
    .filter((poi) => {
      const current = clusterCounts.get(poi.clusterKey) || 0;

      if (current >= 2) {
        return false;
      }

      clusterCounts.set(poi.clusterKey, current + 1);
      return true;
    })
    .slice(0, limit);
}

function describeTravelerProfile({
  travelerMode,
  interests,
  notes,
  freeSlots,
  refinementOptions,
  transportMode,
  expenseMode,
}) {
  const preferenceSignals = inferPreferenceSignals(notes, interests, travelerMode, refinementOptions);
  const normalizedInterests = parseInterestInput(interests);
  const summaryParts = [];

  if (travelerMode === "business") {
    summaryParts.push("meeting-aware");
  } else {
    summaryParts.push("freeform");
  }

  if (preferenceSignals.wantsCulture) {
    summaryParts.push("culture leaning");
  }

  if (preferenceSignals.wantsFood) {
    summaryParts.push("food friendly");
  }

  if (preferenceSignals.wantsNature) {
    summaryParts.push("outdoor curious");
  }

  if (preferenceSignals.wantsShortDetours) {
    summaryParts.push("short-detour focused");
  }

  const strongestInterest = normalizedInterests.slice(0, 3);
  const totalFreeMinutes = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);

  return {
    summary: `This pass is tuned for a ${summaryParts.join(", ")} traveler with ${Math.round(totalFreeMinutes / 30) * 30} flexible minutes available, ${normalizeTransportMode(transportMode)} transport preference, and a ${normalizeExpenseMode(expenseMode)} spend style.`,
    strongestInterest,
    preferenceSignals,
    refinementOptions: normalizeRefinementOptions(refinementOptions),
    transportMode: normalizeTransportMode(transportMode),
    expenseMode: normalizeExpenseMode(expenseMode),
  };
}

function estimateStopCost({ poi, expenseMode }) {
  const mode = normalizeExpenseMode(expenseMode);
  const category = poi.category || "";
  const baseCost =
    /restaurant/.test(category) ? 28 :
    /cafe/.test(category) ? 12 :
    /museum|gallery/.test(category) ? 18 :
    /historic|viewpoint|park/.test(category) ? 8 : 10;
  const multiplier = mode === "budget" ? 0.7 : mode === "premium" ? 1.55 : 1;
  const amount = Math.max(4, Math.round(baseCost * multiplier));

  return {
    amount,
    currency: "USD",
    label:
      mode === "budget"
        ? "Budget-friendly"
        : mode === "premium"
          ? "Premium leaning"
          : "Balanced spend",
  };
}

function scorePoiForSlot({ poi, slot, travelerMode, profile, weatherContext }) {
  const slotMinutes = slot.durationMinutes;
  const travelMinutes = poi.travelMinutes || 12;
  const stayMinutes = poi.visitDurationMinutes || 45;
  const shortWindow = slotMinutes <= 90;
  const longWindow = slotMinutes >= 150;
  const slotType = slot.slotType || "open-day";
  const category = poi.category || "";

  let score = poi.score || 0;

  if (stayMinutes + travelMinutes > slotMinutes - 12) {
    score -= 4.5;
  }

  if (shortWindow) {
    score -= travelMinutes * 0.22;
    score += stayMinutes <= 45 ? 1.8 : -1;
  }

  if (longWindow) {
    score += stayMinutes >= 50 ? 1.2 : 0;
  }

  if (travelerMode === "business") {
    if (slotType === "between-meetings") {
      score += /cafe|restaurant|park/.test(category) ? 2.4 : 0;
      score += travelMinutes <= 12 ? 1.6 : -1.2;
      score += stayMinutes <= Math.max(55, slotMinutes - 25) ? 0.8 : -0.8;
    }

    if (slotType === "before-first-meeting") {
      score += /cafe|park|viewpoint/.test(category) ? 1.5 : 0.4;
      score += travelMinutes <= 15 ? 1.2 : -0.8;
    }

    if (slotType === "after-last-meeting") {
      score += /museum|historic|gallery|restaurant|park/.test(category) ? 1.9 : 0;
    }
  }

  if (profile.preferenceSignals.wantsQuiet && /park|museum|gallery|cafe/.test(category)) {
    score += 1;
  }

  if (profile.preferenceSignals.wantsPhotoFriendly && /viewpoint|historic|gallery/.test(category)) {
    score += 0.8;
  }

  if (profile.preferenceSignals.wantsBudget && /park|viewpoint|historic/.test(category)) {
    score += 0.6;
  }

  if (profile.preferenceSignals.refinementOptions.includes("less_walking")) {
    score += travelMinutes <= 10 ? 1.1 : -0.5;
  }

  if (profile.preferenceSignals.refinementOptions.includes("near_meetings_only")) {
    score += travelMinutes <= 8 ? 1.4 : -1.2;
  }

  if (weatherContext?.isRainy && /park|viewpoint/.test(category)) {
    score -= 1.3;
  }

  return Number(score.toFixed(2));
}

function buildScheduleFit(slot) {
  if (slot.nextMeeting?.title && slot.previousMeeting?.title) {
    return `Fits neatly between ${slot.previousMeeting.title} and ${slot.nextMeeting.title}.`;
  }

  if (slot.nextMeeting?.title) {
    return `Leaves a clean buffer before ${slot.nextMeeting.title}.`;
  }

  if (slot.previousMeeting?.title) {
    return `Works well as a decompression stop after ${slot.previousMeeting.title}.`;
  }

  return "Fits the available window without forcing a long detour.";
}

function buildWeatherFit(weatherContext, poi) {
  if (!weatherContext) {
    return "Weather conditions were neutral, so category balance stayed flexible.";
  }

  if (weatherContext.isRainy) {
    return /museum|gallery|cafe|restaurant/.test(poi.category || "")
      ? "Current rain risk makes indoor comfort more valuable."
      : "Outdoor exposure was tolerated only because this stop still scored strongly overall.";
  }

  if (weatherContext.isHot) {
    return /museum|gallery|cafe|restaurant/.test(poi.category || "")
      ? "Warm conditions favor indoor or shaded breaks."
      : "Outdoor time was kept lighter because of the heat.";
  }

  if (weatherContext.nearSunset && /viewpoint|park|historic/.test(poi.category || "")) {
    return "Current conditions make scenic outdoor timing more attractive.";
  }

  return "Weather was considered, but it did not strongly constrain this stop.";
}

function buildReasonDetails({ poi, travelerMode, slot, profile, weatherContext }) {
  const reasons = [];

  if (poi.interestMatches?.length) {
    reasons.push(`matches your stated interests in ${poi.interestMatches.join(", ")}`);
  }

  if (poi.noteMatches?.length) {
    reasons.push(`echoes your notes about ${poi.noteMatches.join(", ")}`);
  }

  if ((poi.travelMinutes || 0) <= 12) {
    reasons.push("keeps transit light");
  }

  if (travelerMode === "business") {
    reasons.push(buildScheduleFit(slot).toLowerCase());
  }

  if (profile.preferenceSignals.wantsQuiet && /park|museum|gallery|cafe/.test(poi.category || "")) {
    reasons.push("supports a calmer pace");
  }

  if (profile.preferenceSignals.refinementOptions.includes("more_food") && /cafe|restaurant/.test(poi.category || "")) {
    reasons.push("leans into your food-focused refinement");
  }

  if (weatherContext?.isRainy && /museum|gallery|cafe|restaurant/.test(poi.category || "")) {
    reasons.push("works better in rainy conditions");
  }

  if (!reasons.length) {
    reasons.push(
      travelerMode === "business"
        ? "fits a realistic workday break with solid local payoff"
        : "adds distinctive local character without straying too far"
    );
  }

  return reasons.slice(0, 3);
}

function buildReason({ poi, travelerMode, slot, profile, weatherContext }) {
  const reasonDetails = buildReasonDetails({ poi, travelerMode, slot, profile, weatherContext });

  return `${poi.name} was chosen because it ${reasonDetails.join(", ")}.`;
}

function buildHighlight(poi, slot) {
  const context = slot.contextLabel || "Flexible window";
  return `${context} • ${poi.categoryLabel} • ${(poi.travelMinutes || 0)} min away`;
}

function pickBestPoiForSlot({ remainingPois, slot, travelerMode, profile, weatherContext }) {
  const ranked = remainingPois
    .filter((poi) => {
      const travelMinutes = Math.min(poi.travelMinutes || 12, Math.max(6, Math.floor(slot.durationMinutes / 3)));
      return (poi.visitDurationMinutes || 45) + travelMinutes >= 25 && slot.durationMinutes - travelMinutes >= 25;
    })
    .map((poi) => ({
      poi,
      slotScore: scorePoiForSlot({ poi, slot, travelerMode, profile, weatherContext }),
    }))
    .sort((left, right) => right.slotScore - left.slotScore);

  return ranked[0] || null;
}

function buildDeterministicItinerary({
  travelerMode,
  location,
  interests,
  notes,
  freeSlots,
  shortlistedPois,
  rawPoiCount,
  refinementOptions = [],
  weatherContext = null,
  transportMode = "auto",
  expenseMode = "balanced",
}) {
  const remainingPois = [...shortlistedPois];
  const timeline = [];
  const profile = describeTravelerProfile({
    travelerMode,
    interests,
    notes,
    freeSlots,
    refinementOptions,
    transportMode,
    expenseMode,
  });

  freeSlots.forEach((slot) => {
    let remaining = slot.durationMinutes;
    let cursor = parseTimeToMinutes(slot.startTime);
    const slotLimit = slot.durationMinutes >= 200 ? 2 : 1;
    let added = 0;

    while (remainingPois.length > 0 && remaining > 40 && added < slotLimit) {
      const selected = pickBestPoiForSlot({
        remainingPois,
        slot,
        travelerMode,
        profile,
        weatherContext,
      });

      if (!selected) {
        break;
      }

      const { poi } = selected;
      const travelMinutes = Math.min(poi.travelMinutes || 12, Math.max(6, Math.floor(remaining / 3)));
      const stayMinutes = Math.min(poi.visitDurationMinutes || 45, remaining - travelMinutes);

      if (stayMinutes < 25) {
        continue;
      }

      const selectedIndex = remainingPois.findIndex((candidate) => candidate.id === poi.id);

      if (selectedIndex >= 0) {
        remainingPois.splice(selectedIndex, 1);
      }

      const startMinutes = cursor + travelMinutes;
      const endMinutes = startMinutes + stayMinutes;
      const reasoningPoints = buildReasonDetails({ poi, travelerMode, slot, profile, weatherContext });
      const costEstimate = estimateStopCost({ poi, expenseMode });

      timeline.push({
        id: `${slot.id}-${poi.id}`,
        slotId: slot.id,
        placeId: poi.id,
        title: poi.name,
        category: poi.categoryLabel,
        startTime: minutesToClockLabel(startMinutes),
        endTime: minutesToClockLabel(endMinutes),
        durationMinutes: stayMinutes,
        travelMinutes,
        distanceMeters: poi.distanceMeters || null,
        score: selected.slotScore,
        reason: buildReason({ poi, travelerMode, slot, profile, weatherContext }),
        highlight: buildHighlight(poi, slot),
        costEstimate,
        explanation: {
          whyChosen: reasoningPoints,
          personalization:
            poi.interestMatches?.length || poi.noteMatches?.length
              ? "Directly tied to your interests, notes, or active refinement chips."
              : "Chosen mainly for fit, local character, and route efficiency.",
          scheduleFit: buildScheduleFit(slot),
          weatherFit: buildWeatherFit(weatherContext, poi),
          tradeoff:
            travelMinutes > 15
              ? "Slightly longer transit was accepted because the stop scores well for relevance."
              : "This stop stays close enough to protect the rest of the plan.",
        },
        place: poi,
        slotContext: {
          label: slot.contextLabel,
          slotType: slot.slotType,
          previousMeeting: slot.previousMeeting || null,
          nextMeeting: slot.nextMeeting || null,
        },
      });

      cursor = endMinutes;
      remaining = parseTimeToMinutes(slot.endTime) - cursor;
      added += 1;
    }
  });

  const mapPoints = timeline.map((item, index) => ({
    id: item.placeId,
    order: index + 1,
    title: item.title,
    lat: item.place.lat,
    lng: item.place.lng,
    category: item.category,
    startTime: item.startTime,
    endTime: item.endTime,
    reason: item.reason,
  }));

  const totalFreeMinutes = freeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);
  const totalVisitMinutes = timeline.reduce((sum, item) => sum + item.durationMinutes, 0);
  const totalTravelMinutes = timeline.reduce((sum, item) => sum + item.travelMinutes, 0);
  const totalEstimatedCost = timeline.reduce((sum, item) => sum + (item.costEstimate?.amount || 0), 0);
  const usedMinutes = totalVisitMinutes + totalTravelMinutes;
  const utilizationRate = totalFreeMinutes ? Math.min(100, Math.round((usedMinutes / totalFreeMinutes) * 100)) : 0;

  return {
    headline:
      travelerMode === "business"
        ? "A meeting-aware city plan for your open windows"
        : "A more personal city plan built around your current context",
    overview:
      timeline.length > 0
        ? `This itinerary balances relevance, cultural payoff, travel time, and live conditions across ${freeSlots.length} open window${freeSlots.length > 1 ? "s" : ""}.`
        : "No strong nearby candidates fit the current timing, so the planner is holding a lightweight shortlist you can refine manually.",
    travelerMode,
    location,
    interests,
    notes,
    freeSlots,
    timeline,
    mapPoints,
    shortlistedPois,
    travelerProfile: profile,
    refinementOptions: normalizeRefinementOptions(refinementOptions),
    weatherContext,
    transportMode: normalizeTransportMode(transportMode),
    expenseMode: normalizeExpenseMode(expenseMode),
    decisionSummary: {
      primaryLens:
        travelerMode === "business"
          ? "meeting buffers, short detours, weather comfort, and reset-friendly stops"
          : "interest alignment, local character, weather fit, and route efficiency",
      selectionConfidence: timeline.length >= 2 ? "high" : timeline.length === 1 ? "medium" : "low",
      explanation: timeline.length
        ? "Stops were selected by combining interest relevance, refinement chips, weather context, travel feasibility, and slot-specific fit."
        : "No stop cleared the current fit threshold with enough spare time left for a confident recommendation.",
    },
    stats: {
      rawPoiCount,
      selectedPoiCount: mapPoints.length,
      totalTravelMinutes,
      totalVisitMinutes,
      totalFreeMinutes,
      utilizationRate,
      totalEstimatedCost,
    },
    tips: [
      travelerMode === "business"
        ? "Keep the first between-meeting stop if your schedule starts slipping."
        : "Start with the highest-confidence stop if your time shrinks unexpectedly.",
      weatherContext?.summary || "Weather conditions were neutral in this planning pass.",
      "Use the refinement chips to quickly push the next pass toward food, walking comfort, or iconic places.",
    ],
  };
}

module.exports = {
  buildDeterministicItinerary,
  deriveFreeSlots,
  getNoteMatches,
  normalizeExpenseMode,
  normalizeRefinementOptions,
  normalizeTransportMode,
  optimizeCandidatePlaces,
};
