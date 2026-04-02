const pdfParse = require("pdf-parse");
const {
  extractScheduleWithGemini,
  hasGeminiConfig,
  inferScheduleFallback,
} = require("../services/geminiService");
const { geocodeQuery } = require("../services/geocodingService");
const { buildFreeSlots, normalizeMeetings } = require("../utils/time");
const { parseInterestInput } = require("../utils/interests");

exports.extractSchedule = async (req, res) => {
  try {
    const uploadedFile = req.file;
    const rawScheduleText = req.body.scheduleText?.trim();
    const fallbackCity = req.body.baseLocationQuery?.trim();
    const notes = req.body.notes?.trim() || "";
    const preferences = parseInterestInput(req.body.interests);

    if (!uploadedFile && !rawScheduleText) {
      return res.status(400).json({
        error: "Upload a PDF or provide scheduleText.",
      });
    }

    let scheduleText = rawScheduleText || "";

    if (uploadedFile) {
      const parsed = await pdfParse(uploadedFile.buffer);
      const pdfText = parsed.text?.trim() || "";

      // Prefer the PDF when it has usable text, but keep pasted text as a reliable fallback.
      scheduleText = pdfText || rawScheduleText || "";
    }

    if (!scheduleText) {
      return res.status(400).json({
        error: "No readable text was found in the uploaded schedule.",
      });
    }

    const fallbackSchedule = inferScheduleFallback({
      rawText: scheduleText,
      fallbackCity,
      preferences,
    });

    const geminiSchedule = await extractScheduleWithGemini({
        rawText: scheduleText,
        fallbackCity,
        preferences,
        notes,
      });

    const aiSchedule = geminiSchedule
      ? {
          ...fallbackSchedule,
          ...geminiSchedule,
          city:
            geminiSchedule.city && geminiSchedule.city.trim()
              ? geminiSchedule.city.trim()
              : fallbackSchedule.city,
          primaryLocationQuery:
            geminiSchedule.primaryLocationQuery && geminiSchedule.primaryLocationQuery.trim()
              ? geminiSchedule.primaryLocationQuery.trim()
              : fallbackSchedule.primaryLocationQuery,
          meetings: (geminiSchedule.meetings || []).map((meeting, index) => {
            const fallbackMeeting = fallbackSchedule.meetings[index];
            const genericGeminiLocation =
              !meeting.locationName ||
              (fallbackCity && meeting.locationName.trim().toLowerCase() === fallbackCity.toLowerCase());

            return {
              ...fallbackMeeting,
              ...meeting,
              locationName:
                genericGeminiLocation && fallbackMeeting?.locationName
                  ? fallbackMeeting.locationName
                  : meeting.locationName || fallbackMeeting?.locationName || "",
            };
          }),
        }
      : fallbackSchedule;

    const meetings = normalizeMeetings(aiSchedule.meetings || []);
    const freeSlots = buildFreeSlots(meetings, {
      dayStart: process.env.DEFAULT_DAY_START || "08:00",
      dayEnd: process.env.DEFAULT_DAY_END || "21:00",
    });

    const locationCandidates = [
      aiSchedule.primaryLocationQuery,
      meetings.find((meeting) => meeting.locationName)?.locationName,
      aiSchedule.city,
      fallbackCity,
    ].filter(Boolean);

    let location = null;

    for (const query of locationCandidates) {
      location = await geocodeQuery(query);

      if (location) {
        break;
      }
    }

    res.json({
      travelerMode: "business",
      documentName: uploadedFile?.originalname || "manual-schedule.txt",
      scheduleText,
      preferences: Array.from(new Set([...(aiSchedule.inferredInterests || []), ...preferences])),
      schedule: {
        summary:
          aiSchedule.summary ||
          "Schedule parsed with fallback logic. You can still generate an itinerary from detected free time.",
        city: aiSchedule.city || fallbackCity || location?.label || "Unknown area",
        confidence: aiSchedule.confidence || "medium",
        meetings,
        constraints: aiSchedule.constraints || [],
      },
      ai: {
        provider: "gemini",
        configured: hasGeminiConfig(),
        used: Boolean(geminiSchedule),
        stage: "business-schedule-extraction",
      },
      location,
      freeSlots,
      notes,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to extract schedule.",
    });
  }
};
