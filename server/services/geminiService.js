const axios = require("axios");
const { extractJsonFromText } = require("../utils/json");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function hasGeminiConfig() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function callGeminiJson(prompt) {
  if (!hasGeminiConfig()) {
    return null;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const response = await axios.post(endpoint, {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  });

  const text =
    response.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

  return extractJsonFromText(text);
}

function inferScheduleFallback({ rawText, fallbackCity, preferences }) {
  const normalizedText = String(rawText || "").replace(/\r/g, "");
  const cityMatch = normalizedText.match(/(?:^|\n)\s*city\s*:\s*(.+)/i);
  const detectedCity = cityMatch?.[1]?.trim() || "";
  const matches = Array.from(
    normalizedText.matchAll(
      /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:-|to|–|—|â€“|â€”)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/g
    )
  );

  const meetings = matches.slice(0, 8).map((match, index, allMatches) => {
    const blockStart = match.index ?? 0;
    const blockEnd = allMatches[index + 1]?.index ?? normalizedText.length;
    const block = normalizedText.slice(blockStart, blockEnd);
    const titleMatch =
      block.match(/meeting\s*:\s*(.+)/i) ||
      block.match(/title\s*:\s*(.+)/i) ||
      block.match(/subject\s*:\s*(.+)/i);
    const locationMatch =
      block.match(/location\s*:\s*(.+)/i) ||
      block.match(/venue\s*:\s*(.+)/i);
    const explicitLocation = locationMatch?.[1]?.trim() || "";
    const locationName =
      explicitLocation && detectedCity && !new RegExp(detectedCity, "i").test(explicitLocation)
        ? `${explicitLocation}, ${detectedCity}`
        : explicitLocation || detectedCity || fallbackCity || "Business district";

    return {
      title: titleMatch?.[1]?.trim() || `Meeting ${index + 1}`,
      startTime: match[1],
      endTime: match[2],
      locationName,
      note: explicitLocation
        ? "Detected from schedule text with explicit venue parsing."
        : "Detected from schedule text with fallback parsing.",
    };
  });

  return {
    summary:
      meetings.length > 0
        ? "Fallback parsing detected meeting windows and venue hints from the uploaded schedule."
        : "No clear meeting ranges were detected, so the app will treat your day as mostly flexible.",
    city: detectedCity || fallbackCity || "",
    confidence: meetings.length > 0 ? "medium" : "low",
    primaryLocationQuery:
      meetings.find((meeting) => meeting.locationName)?.locationName || detectedCity || fallbackCity || "",
    meetings,
    inferredInterests: preferences,
    constraints: meetings.length > 0 ? [] : ["No explicit meeting times found in the uploaded text."],
  };
}

async function extractScheduleWithGemini({ rawText, fallbackCity, preferences, notes }) {
  const prompt = `
You extract structured business-travel schedules from raw text.

Return valid JSON with this exact shape:
{
  "summary": "short summary",
  "city": "best guess city or empty string",
  "confidence": "high|medium|low",
  "primaryLocationQuery": "best single location string for geocoding",
  "meetings": [
    {
      "title": "meeting title",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "locationName": "location or area",
      "note": "short note"
    }
  ],
  "inferredInterests": ["museum", "coffee"],
  "constraints": ["short bullet"]
}

Rules:
- Use 24-hour HH:MM format.
- If uncertain, make a reasonable guess and lower confidence.
- Keep meetings ordered.
- Prefer concise outputs.
- If the text contains meeting-level venue/location lines, preserve them instead of replacing them with the fallback city.
- If the text contains a city line, use it as context for the meeting locations.

Fallback city from user: ${fallbackCity || "none"}
Known interests from user: ${preferences.join(", ") || "none"}
User notes: ${notes || "none"}

Raw schedule text:
${rawText.slice(0, 15000)}
`;

  try {
    return await callGeminiJson(prompt);
  } catch (error) {
    return null;
  }
}

async function generateStructuredItinerary({
  travelerMode,
  location,
  interests,
  notes,
  baseItinerary,
}) {
  const prompt = `
You are refining a travel itinerary into polished JSON while preserving the exact stop order and times.
The output must sound intentional and personalized, not generic.

Return valid JSON with this exact shape:
{
  "headline": "short headline",
  "overview": "2 sentence summary",
  "tips": ["tip 1", "tip 2", "tip 3"],
  "decisionSummary": {
    "primaryLens": "short phrase",
    "explanation": "1 sentence"
  },
  "timeline": [
    {
      "slotId": "slot id",
      "placeId": "poi id",
      "reason": "why this stop fits the traveler",
      "highlight": "short highlight",
      "personalization": "short sentence",
      "scheduleFit": "short sentence",
      "tradeoff": "short sentence"
    }
  ]
}

Rules:
- Keep the same number of timeline items.
- Do not change slotId or placeId.
- Focus on feasibility, local character, explicit personalization, and the user's interests.
- In business mode, mention meeting buffers or reset value when relevant.
- Make each reason explain both relevance and practicality.
- Keep tips concise.

Traveler mode: ${travelerMode}
Location: ${location.label || `${location.lat}, ${location.lng}`}
Interests: ${interests.join(", ") || "none"}
Notes: ${notes || "none"}

Base itinerary:
${JSON.stringify(baseItinerary)}
`;

  try {
    const refined = await callGeminiJson(prompt);

    if (!refined || !Array.isArray(refined.timeline)) {
      return null;
    }

    const enrichedTimeline = baseItinerary.timeline.map((item) => {
      const aiMatch = refined.timeline.find(
        (entry) => entry.slotId === item.slotId && entry.placeId === item.placeId
      );

      return {
        ...item,
        reason: aiMatch?.reason || item.reason,
        highlight: aiMatch?.highlight || item.highlight,
        explanation: {
          ...item.explanation,
          personalization: aiMatch?.personalization || item.explanation?.personalization,
          scheduleFit: aiMatch?.scheduleFit || item.explanation?.scheduleFit,
          tradeoff: aiMatch?.tradeoff || item.explanation?.tradeoff,
        },
      };
    });

    return {
      ...baseItinerary,
      headline: refined.headline || baseItinerary.headline,
      overview: refined.overview || baseItinerary.overview,
      decisionSummary: {
        ...baseItinerary.decisionSummary,
        primaryLens: refined.decisionSummary?.primaryLens || baseItinerary.decisionSummary?.primaryLens,
        explanation: refined.decisionSummary?.explanation || baseItinerary.decisionSummary?.explanation,
      },
      tips:
        Array.isArray(refined.tips) && refined.tips.length > 0 ? refined.tips : baseItinerary.tips,
      timeline: enrichedTimeline,
    };
  } catch (error) {
    return null;
  }
}

module.exports = {
  extractScheduleWithGemini,
  generateStructuredItinerary,
  hasGeminiConfig,
  inferScheduleFallback,
};
