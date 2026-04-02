import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, FileUp, LoaderCircle, MapPin, Sparkles } from "lucide-react";
import RefinementChips from "../components/RefinementChips.jsx";
import { usePlanner } from "../context/PlannerContext.jsx";
import { extractSchedule, fetchPois, optimizeItinerary } from "../lib/api.js";
import { formatCoordinates, formatMinutes, parseInterestString } from "../lib/formatters.js";

const TRANSPORT_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "walking", label: "Walking" },
  { value: "cycling", label: "Cycling" },
  { value: "driving", label: "Driving" },
];
const EXPENSE_OPTIONS = [
  { value: "budget", label: "Budget" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_45px_rgba(2,6,23,0.24)]">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{title}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{subtitle}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function BusinessSetupPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { plannerState, mergePlannerState } = usePlanner();
  const [selectedFile, setSelectedFile] = useState(null);
  const [scheduleTextInput, setScheduleTextInput] = useState("");
  const [baseLocationQuery, setBaseLocationQuery] = useState("");
  const [interestInput, setInterestInput] = useState("");
  const [notes, setNotes] = useState("");
  const [transportMode, setTransportMode] = useState("auto");
  const [expenseMode, setExpenseMode] = useState("balanced");
  const [refinementOptions, setRefinementOptions] = useState([]);
  const [error, setError] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    mergePlannerState({
      mode: "business",
      location: null,
      interests: [],
      notes: "",
      refinementOptions: [],
      scheduleText: "",
      schedule: null,
      freeSlots: [],
      rawPois: [],
      itinerary: null,
      ai: null,
      weatherContext: null,
      tripId: "",
      documentName: "",
      transportMode: "auto",
      expenseMode: "balanced",
      poiSource: "",
      poiRadiusMeters: 0,
    });
    setSelectedFile(null);
    setScheduleTextInput("");
    setBaseLocationQuery("");
    setInterestInput("");
    setNotes("");
    setTransportMode("auto");
    setExpenseMode("balanced");
    setRefinementOptions([]);
    setError("");
  }, [mergePlannerState]);

  const freeSlots = plannerState.freeSlots || [];
  const meetings = plannerState.schedule?.meetings || [];
  const previewPois = plannerState.rawPois.slice(0, 6);

  async function handleExtractSchedule(event) {
    event.preventDefault();
    setError("");

    const trimmedScheduleText = scheduleTextInput.trim();

    if (!selectedFile && !trimmedScheduleText) {
      setError("Upload a PDF or paste your schedule text so the planner has something to analyze.");
      return;
    }

    setIsExtracting(true);

    try {
      const formData = new FormData();

      if (selectedFile) {
        formData.append("schedulePdf", selectedFile);
      }

      if (trimmedScheduleText) {
        formData.append("scheduleText", trimmedScheduleText);
      }

      formData.append("baseLocationQuery", baseLocationQuery);
      formData.append("interests", interestInput);
      formData.append("notes", notes);

      const extracted = await extractSchedule(formData, getToken);
      const nextState = {
        mode: "business",
        location: extracted.location,
        interests: extracted.preferences,
        notes: extracted.notes,
        refinementOptions,
        transportMode,
        expenseMode,
        scheduleText: extracted.scheduleText,
        schedule: extracted.schedule,
        freeSlots: extracted.freeSlots,
        documentName: extracted.documentName,
      };

      mergePlannerState(nextState);

      if (extracted.location) {
        const poiPreview = await fetchPois(
          {
            lat: extracted.location.lat,
            lng: extracted.location.lng,
            freeMinutes: extracted.freeSlots[0]?.durationMinutes || 120,
            travelerMode: "business",
            interests: extracted.preferences.join(","),
          },
          getToken
        );

        mergePlannerState({
          ...nextState,
          rawPois: poiPreview.pois,
          poiSource: poiPreview.source,
          poiRadiusMeters: poiPreview.radiusMeters,
        });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to extract your schedule right now.");
    } finally {
      setIsExtracting(false);
    }
  }

  async function handleGenerateItinerary() {
    if (!plannerState.schedule) {
      setError("Extract your schedule first so we know your meetings and free slots.");
      return;
    }

    if (!plannerState.location) {
      setError("Add a clear city or venue area so the app can anchor nearby places.");
      return;
    }

    setError("");
    setIsGenerating(true);

    try {
      const response = await optimizeItinerary(
        {
          travelerMode: "business",
          location: plannerState.location,
          interests: parseInterestString(interestInput),
          notes,
          refinementOptions,
          transportMode,
          expenseMode,
          freeSlots: plannerState.freeSlots,
          rawPois: plannerState.rawPois,
          schedule: plannerState.schedule,
          scheduleText: plannerState.scheduleText,
          documentName: plannerState.documentName,
        },
        getToken
      );

      mergePlannerState({
        interests: parseInterestString(interestInput),
        notes,
        refinementOptions,
        transportMode,
        expenseMode,
        itinerary: response.itinerary,
        ai: response.ai,
        weatherContext: response.weatherContext || null,
        tripId: response.tripId || "",
        poiSource: response.poiSource || plannerState.poiSource,
      });

      navigate("/itinerary");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to build the itinerary right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Business Setup" subtitle="Upload a meeting schedule and uncover usable free windows.">
          <form className="space-y-5" onSubmit={handleExtractSchedule}>
            <label className="block rounded-[1.5rem] border border-dashed border-cyan-300/20 bg-cyan-400/[0.06] p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-200">
                  <FileUp className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-white">Meeting schedule PDF</p>
                  <p className="mt-1 text-sm text-slate-300">
                    Upload agendas, conference schedules, or internal meeting plans. If the PDF is
                    scanned or messy, you can use the text area below instead.
                  </p>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:font-medium file:text-slate-950"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                Schedule text
              </span>
              <textarea
                rows="8"
                value={scheduleTextInput}
                onChange={(event) => setScheduleTextInput(event.target.value)}
                placeholder="Paste your meetings here if you do not want to upload a PDF. Example: 09:00 AM - 10:30 AM Product review at Bengaluru office..."
                className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
              />
              <p className="mt-2 text-sm text-slate-400">
                Use either PDF, text, or both. When both are provided, the planner can fall back to
                the pasted text if the PDF is hard to read.
              </p>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Fallback city or venue area
                </span>
                <input
                  value={baseLocationQuery}
                  onChange={(event) => setBaseLocationQuery(event.target.value)}
                  placeholder="Bengaluru, Koramangala"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Interests for free time
                </span>
                <input
                  value={interestInput}
                  onChange={(event) => setInterestInput(event.target.value)}
                  placeholder="museums, heritage, coffee"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Extra notes</span>
              <textarea
                rows="4"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Prefer quiet cafes between meetings, avoid long detours, interested in design museums..."
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">
                  Transportation mode
                </span>
                <select
                  value={transportMode}
                  onChange={(event) => setTransportMode(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                >
                  {TRANSPORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Expense mode</span>
                <select
                  value={expenseMode}
                  onChange={(event) => setExpenseMode(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                >
                  {EXPENSE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">
                One-click refinement
              </span>
              <RefinementChips
                value={refinementOptions}
                onChange={setRefinementOptions}
                travelerMode="business"
              />
              <p className="mt-2 text-sm text-slate-400">
                Use these to bias the next pass toward food, shorter detours, quieter stops, or near-meeting picks.
              </p>
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isExtracting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-cyan-400 px-6 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isExtracting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Extract Schedule
              </button>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateItinerary}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4" />}
                Generate And Open Itinerary
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Extraction Result" subtitle="Meetings, open slots, and the city anchor.">
            {plannerState.schedule ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <p className="text-sm text-slate-400">Document</p>
                    <p className="mt-2 font-semibold text-white">{plannerState.documentName}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <p className="text-sm text-slate-400">Meetings found</p>
                    <p className="mt-2 font-semibold text-white">{meetings.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <p className="text-sm text-slate-400">Free windows</p>
                    <p className="mt-2 font-semibold text-white">{freeSlots.length}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <p className="text-sm text-slate-400">Transport mode</p>
                    <p className="mt-2 font-semibold text-white">{transportMode}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <p className="text-sm text-slate-400">Expense mode</p>
                    <p className="mt-2 font-semibold text-white">{expenseMode}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 h-4 w-4 text-cyan-300" />
                    <div>
                      <p className="font-semibold text-white">
                        {plannerState.location?.label || plannerState.schedule.city}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        {formatCoordinates(plannerState.location)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white">Detected meetings</h3>
                  <div className="mt-3 space-y-3">
                    {meetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="rounded-2xl border border-white/10 bg-black/[0.18] p-4"
                      >
                        <p className="font-semibold text-white">{meeting.title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {meeting.startLabel} - {meeting.endLabel}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {meeting.locationName || "Location not detected"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {plannerState.schedule.constraints?.length ? (
                  <div>
                    <h3 className="text-lg font-semibold text-white">Planning constraints</h3>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {plannerState.schedule.constraints.map((constraint) => (
                        <div
                          key={constraint}
                          className="rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4 text-amber-100"
                        >
                          {constraint}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm leading-7 text-slate-300">
                After extraction, this panel will show parsed meetings, free slots, and the city
                anchor used for nearby cultural discovery.
              </p>
            )}
          </Panel>

          <Panel title="Free Time + Nearby Pool" subtitle="Preview what the optimizer has to work with.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                <p className="font-semibold text-white">Free slots</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {freeSlots.length ? (
                    freeSlots.map((slot) => (
                      <div key={slot.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span>
                            {slot.startLabel} - {slot.endLabel}
                          </span>
                          <span>{formatMinutes(slot.durationMinutes)}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                          {slot.contextLabel || "Flexible free window"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p>No free windows detected yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                <p className="font-semibold text-white">Nearby cultural pool</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {previewPois.length ? (
                    previewPois.map((poi) => (
                      <div key={poi.id} className="flex items-center justify-between gap-3">
                        <span className="truncate">{poi.name}</span>
                        <span className="shrink-0 text-slate-400">{poi.categoryLabel}</span>
                      </div>
                    ))
                  ) : (
                    <p>Extract a schedule with a location to load nearby POIs.</p>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
