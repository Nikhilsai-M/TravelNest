import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  CloudRain,
  Copy,
  Download,
  Globe2,
  NotebookPen,
  Layers3,
  LoaderCircle,
  MapPinned,
  Orbit,
  PanelTopOpen,
  Radar,
  RefreshCw,
  Save,
  Share2,
  Sparkles,
  Star,
  SunMedium,
  Trees,
  Trash2,
  UtensilsCrossed,
  SquarePen,
  X,
} from "lucide-react";
import { usePlanner } from "../context/PlannerContext.jsx";
import ItineraryMap from "../components/ItineraryMap.jsx";
import RefinementChips from "../components/RefinementChips.jsx";
import ItineraryTimeline from "../components/ItineraryTimeline.jsx";
import { fetchTripById, fetchTripHistory, optimizeItinerary, updateTripJournal } from "../lib/api.js";
import {
  formatCoordinates,
  formatCurrency,
  formatExpenseMode,
  formatMinutes,
  formatTransportMode,
} from "../lib/formatters.js";

const MotionDiv = motion.div;
const MotionSection = motion.section;

function FadeSection({ children, className = "", delay = 0 }) {
  return (
    <MotionSection
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.65, delay }}
      className={className}
    >
      {children}
    </MotionSection>
  );
}

function StatPill({ label, value, caption }) {
  return (
    <MotionDiv
      whileHover={{ y: -10, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.52))] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_32%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      <p className="relative text-xs uppercase tracking-[0.32em] text-slate-400">{label}</p>
      <p className="relative mt-4 text-3xl font-semibold text-white sm:text-4xl">{value}</p>
      <p className="relative mt-3 max-w-[24ch] text-sm leading-6 text-slate-300">{caption}</p>
    </MotionDiv>
  );
}

function MetricStrip({ icon, label, value, meta, tone }) {
  const MetricIcon = icon;

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4 backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className={["flex h-11 w-11 items-center justify-center rounded-2xl border", tone].join(" ")}>
          <MetricIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-semibold text-white">{value}</p>
          <p className="mt-1 text-sm text-slate-300">{meta}</p>
        </div>
      </div>
    </div>
  );
}

function formatSavedDate(value) {
  if (!value) {
    return "Just now";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRefinementLabel(value) {
  return value
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildExportText({ itinerary, location, storageStatus }) {
  const timelineLines = (itinerary.timeline || []).map(
    (item, index) =>
      `${index + 1}. ${item.title} | ${item.startTime} - ${item.endTime} | ${item.reason}`
  );

  return [
    `Travel Nest Itinerary`,
    ``,
    `Headline: ${itinerary.headline}`,
    `Mode: ${itinerary.travelerMode}`,
    `Location: ${location?.label || "Unknown area"}`,
    `Transport: ${formatTransportMode(itinerary.transportMode)}`,
    `Expense mode: ${formatExpenseMode(itinerary.expenseMode)}`,
    `Overview: ${itinerary.overview}`,
    `Storage: ${storageStatus || "local"}`,
    `Estimated cost: ${formatCurrency(itinerary.stats?.totalEstimatedCost || 0)}`,
    ``,
    `Timeline`,
    ...timelineLines,
    ``,
    `Tips`,
    ...(itinerary.tips || []).map((tip) => `- ${tip}`),
  ].join("\n");
}

function getAreaName(label) {
  const value = String(label || "").trim();

  if (!value) {
    return "this area";
  }

  return value.split(",")[0]?.trim() || value;
}

function dedupeMustTryCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    const key = candidate.id || `${candidate.name}-${candidate.lat}-${candidate.lng}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildMustTryGroups({ shortlist = [], rawPois = [] }) {
  const rankedCandidates = dedupeMustTryCandidates([
    ...shortlist,
    ...rawPois.map((poi) => ({ ...poi, score: poi.score || poi.cultureWeight || 0 })),
  ]).sort((left, right) => Number(right.score || 0) - Number(left.score || 0));

  const priorityGroups = [
    {
      id: "famous",
      title: "Famous Pick",
      subtitle: "Signature stop",
      icon: Star,
      accent: "text-amber-200 border-amber-300/20 bg-amber-400/10",
      matcher: (category) => /museum|historic|landmark|gallery|viewpoint/.test(category),
      fallback: "Top-rated cultural or iconic stop in the area.",
    },
    {
      id: "food",
      title: "Food Must-Try",
      subtitle: "Taste the area",
      icon: UtensilsCrossed,
      accent: "text-rose-200 border-rose-300/20 bg-rose-400/10",
      matcher: (category) => /restaurant|cafe|market/.test(category),
      fallback: "Good for a local bite, cafe reset, or signature food break.",
    },
    {
      id: "scenic",
      title: "Scenic Stop",
      subtitle: "Views and atmosphere",
      icon: Trees,
      accent: "text-emerald-200 border-emerald-300/20 bg-emerald-400/10",
      matcher: (category) => /park|viewpoint|garden/.test(category),
      fallback: "Strong option for a slower moment, walk, or view.",
    },
  ];

  const used = new Set();
  const matchedPriorityGroups = priorityGroups
    .map((group) => {
      const match = rankedCandidates.find((candidate) => {
        const key = candidate.id || candidate.name;
        return !used.has(key) && group.matcher(candidate.category || "");
      });

      if (!match) {
        return null;
      }

      used.add(match.id || match.name);

      return {
        ...group,
        place: match,
      };
    })
    .filter(Boolean);

  if (!matchedPriorityGroups.length) {
    return [];
  }

  const localFallback = rankedCandidates.find((candidate) => {
    const key = candidate.id || candidate.name;
    return !used.has(key);
  });

  if (localFallback) {
    matchedPriorityGroups.push({
      id: "local",
      title: "Local Special",
      subtitle: "Area gem",
      icon: Sparkles,
      accent: "text-cyan-200 border-cyan-300/20 bg-cyan-400/10",
      fallback: "A worthwhile nearby stop that stands out in this planning pass.",
      place: localFallback,
    });
  }

  return matchedPriorityGroups;
}

export default function ItineraryDashboardPage() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plannerState, mergePlannerState, resetPlannerState } = usePlanner();
  const itinerary = plannerState.itinerary;
  const [refinementOptions, setRefinementOptions] = useState(
    plannerState.refinementOptions || itinerary?.refinementOptions || []
  );
  const [historyStatus, setHistoryStatus] = useState("idle");
  const [historyError, setHistoryError] = useState("");
  const [loadingTripId, setLoadingTripId] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [journalInput, setJournalInput] = useState("");
  const [isSavingJournal, setIsSavingJournal] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState("");
  const [editingJournalContent, setEditingJournalContent] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    setRefinementOptions(plannerState.refinementOptions || itinerary?.refinementOptions || []);
  }, [itinerary, plannerState.refinementOptions]);

  const loadHistory = useCallback(async () => {
    const data = await fetchTripHistory(getToken);

    mergePlannerState({
      tripHistory: data.trips || [],
      storageStatus: data.storage || "",
    });

    return data;
  }, [getToken, mergePlannerState]);

  useEffect(() => {
    let isMounted = true;

    async function loadHistoryList() {
      try {
        setHistoryStatus("loading");
        await loadHistory();

        if (!isMounted) {
          return;
        }

        setHistoryStatus("success");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setHistoryError(requestError.response?.data?.error || "Unable to load saved trip history.");
        setHistoryStatus("error");
      }
    }

    loadHistoryList();

    return () => {
      isMounted = false;
    };
  }, [loadHistory]);

  const handleLoadTrip = useCallback(async (tripId) => {
    try {
      setLoadingTripId(tripId);
      const response = await fetchTripById(tripId, getToken);
      const trip = response.trip;

      mergePlannerState({
        mode: trip.mode,
        location: trip.location,
        interests: trip.preferences || [],
        notes: trip.notes || "",
        refinementOptions: trip.itinerary?.refinementOptions || trip.refinementOptions || [],
        schedule: trip.schedule || null,
        scheduleText: trip.scheduleText || "",
        freeSlots: trip.freeSlots || [],
        rawPois: trip.rawPois || [],
        itinerary: trip.itinerary || null,
        weatherContext: trip.itinerary?.weatherContext || null,
        journalEntries: trip.journalEntries || [],
        transportMode: trip.transportMode || trip.itinerary?.transportMode || "auto",
        expenseMode: trip.expenseMode || trip.itinerary?.expenseMode || "balanced",
        tripId: trip.id,
      });
      setSearchParams({ trip: trip.id });
    } catch (requestError) {
      setHistoryError(requestError.response?.data?.error || "Unable to load that trip.");
    } finally {
      setLoadingTripId("");
    }
  }, [getToken, mergePlannerState, setSearchParams]);

  useEffect(() => {
    const sharedTripId = searchParams.get("trip");

    if (!sharedTripId || sharedTripId === plannerState.tripId || loadingTripId) {
      return;
    }

    handleLoadTrip(sharedTripId);
  }, [handleLoadTrip, loadingTripId, plannerState.tripId, searchParams]);

  async function handleRegenerate() {
    if (!itinerary || !plannerState.location) {
      return;
    }

    try {
      setActionMessage("");
      setHistoryError("");
      setIsRegenerating(true);

      const response = await optimizeItinerary(
        {
          travelerMode: itinerary.travelerMode,
          location: plannerState.location,
          interests: plannerState.interests,
          notes: plannerState.notes,
          refinementOptions,
          availableMinutes: plannerState.availableMinutes,
          transportMode: plannerState.transportMode,
          expenseMode: plannerState.expenseMode,
          freeSlots: plannerState.freeSlots,
          rawPois: plannerState.rawPois,
          schedule: plannerState.schedule,
          scheduleText: plannerState.scheduleText,
          documentName: plannerState.documentName,
        },
        getToken
      );

      mergePlannerState({
        refinementOptions,
        itinerary: response.itinerary,
        ai: response.ai,
        weatherContext: response.weatherContext || null,
        tripId: response.tripId || plannerState.tripId,
        poiSource: response.poiSource || plannerState.poiSource,
        transportMode: response.transportMode || plannerState.transportMode,
        expenseMode: response.expenseMode || plannerState.expenseMode,
      });

      if (response.tripId || plannerState.tripId) {
        setSearchParams({ trip: response.tripId || plannerState.tripId });
      }

      await loadHistory();
      setHistoryStatus("success");
      setActionMessage("Itinerary refreshed with your latest refinement choices.");
    } catch (requestError) {
      setHistoryError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Unable to regenerate the itinerary right now."
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleCopySummary() {
    if (!itinerary) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildExportText({
          itinerary,
          location: plannerState.location,
          storageStatus: plannerState.storageStatus,
        })
      );
      setActionMessage("Itinerary summary copied to clipboard.");
    } catch {
      setActionMessage("Clipboard copy is not available in this browser.");
    }
  }

  async function handleCopyShareLink() {
    const tripId = plannerState.tripId || searchParams.get("trip");

    if (!tripId) {
      setActionMessage("Generate and save this itinerary first to create a share link.");
      return;
    }

    const shareUrl = `${window.location.origin}/itinerary?trip=${tripId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setActionMessage("Share link copied to clipboard.");
    } catch {
      setActionMessage("Unable to copy the share link in this browser.");
    }
  }

  async function handleSaveJournalEntry() {
    const nextEntryContent = journalInput.trim();

    if (!nextEntryContent) {
      return;
    }

    const nextEntries = [
      {
        id: `journal-${Date.now()}`,
        content: nextEntryContent,
        createdAt: new Date().toISOString(),
      },
      ...(plannerState.journalEntries || []),
    ];

    setJournalInput("");
    await persistJournalEntries(
      nextEntries,
      plannerState.tripId ? "Journal entry saved to this trip." : "Journal entry saved locally."
    );
  }

  async function persistJournalEntries(nextEntries, successMessage) {
    mergePlannerState({
      journalEntries: nextEntries,
    });

    if (!plannerState.tripId) {
      setActionMessage(`${successMessage} Saved locally for this unsaved itinerary.`);
      return;
    }

    try {
      setIsSavingJournal(true);
      const response = await updateTripJournal(plannerState.tripId, nextEntries, getToken);
      mergePlannerState({
        journalEntries: response.journalEntries || nextEntries,
      });
      setActionMessage(successMessage);
      await loadHistory();
    } catch (requestError) {
      setHistoryError(
        requestError.response?.data?.error ||
          requestError.message ||
          "Unable to update the trip journal right now."
      );
    } finally {
      setIsSavingJournal(false);
    }
  }

  function startEditingJournalEntry(entry) {
    setEditingJournalId(entry.id || "");
    setEditingJournalContent(entry.content || "");
  }

  function cancelEditingJournalEntry() {
    setEditingJournalId("");
    setEditingJournalContent("");
  }

  async function handleUpdateJournalEntry(entryId) {
    const nextContent = editingJournalContent.trim();

    if (!nextContent) {
      return;
    }

    const nextEntries = (plannerState.journalEntries || []).map((entry) =>
      entry.id === entryId
        ? {
            ...entry,
            content: nextContent,
          }
        : entry
    );

    await persistJournalEntries(nextEntries, "Journal entry updated.");
    cancelEditingJournalEntry();
  }

  async function handleDeleteJournalEntry(entryId) {
    const nextEntries = (plannerState.journalEntries || []).filter((entry) => entry.id !== entryId);

    await persistJournalEntries(nextEntries, "Journal entry deleted.");

    if (editingJournalId === entryId) {
      cancelEditingJournalEntry();
    }
  }

  function handleDownloadSummary() {
    if (!itinerary) {
      return;
    }

    const fileText = buildExportText({
      itinerary,
      location: plannerState.location,
      storageStatus: plannerState.storageStatus,
    });
    const blob = new Blob([fileText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileSlug = itinerary.headline
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    link.href = url;
    link.download = `${fileSlug || "travel-nest-itinerary"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setActionMessage("Itinerary summary downloaded.");
  }

  const refinementSummary = useMemo(
    () => (refinementOptions || []).map(formatRefinementLabel),
    [refinementOptions]
  );
  const mustTryGroups = useMemo(
    () =>
      buildMustTryGroups({
        shortlist: itinerary?.shortlistedPois || [],
        rawPois: plannerState.rawPois || [],
      }),
    [itinerary, plannerState.rawPois]
  );

  if (!itinerary) {
    return (
      <section className="flex min-h-[65vh] items-center justify-center px-5 py-12 sm:px-8">
        <div className="max-w-2xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-[0_25px_60px_rgba(2,6,23,0.35)]">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Itinerary Dashboard</p>
          <h1 className="display-type mt-4 text-4xl font-semibold tracking-tight text-white">
            Your itinerary appears here after setup.
          </h1>
          <p className="mt-5 text-base leading-7 text-slate-300">
            Start with either Business Setup or Leisure Setup, then generate the plan to unlock the
            timeline, reasoning panels, and saved history.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/business-setup"
              className="rounded-full bg-cyan-400 px-6 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              Business Setup
            </Link>
            <Link
              to="/leisure-setup"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-3 font-medium text-white transition hover:bg-white/10"
            >
              Leisure Setup
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute right-[6%] top-20 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col gap-8">
        <FadeSection className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,10,25,0.95),rgba(17,24,39,0.72))] shadow-[0_35px_120px_rgba(2,6,23,0.38)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[6%] top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl animate-float-slow" />
            <div className="absolute right-[8%] top-12 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl animate-float-delayed" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-[0.08]" />
          </div>
          <div className="grid gap-8 px-6 py-7 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
            <div className="relative">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
                  <Orbit className="h-4 w-4" />
                  {itinerary.travelerMode} itinerary
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                  <PanelTopOpen className="h-4 w-4 text-fuchsia-300" />
                  Live planning canvas
                </span>
              </div>

              <h1 className="display-type mt-6 max-w-4xl text-4xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
                {itinerary.headline}
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                {itinerary.overview}
              </p>

              {itinerary.travelerProfile?.summary ? (
                <div className="mt-6 max-w-3xl rounded-[1.6rem] border border-cyan-300/15 bg-cyan-400/[0.07] px-4 py-4 text-sm leading-7 text-cyan-50 backdrop-blur-md">
                  {itinerary.travelerProfile.summary}
                </div>
              ) : null}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={itinerary.travelerMode === "business" ? "/business-setup" : "/leisure-setup"}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1]"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refine Inputs
                </Link>
                <button
                  type="button"
                  onClick={resetPlannerState}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#38bdf8)] px-5 py-3 font-medium text-slate-950 shadow-[0_0_30px_rgba(34,211,238,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]"
                >
                  <Sparkles className="h-4 w-4" />
                  Reset Planner
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1]"
                >
                  <Copy className="h-4 w-4" />
                  Copy Summary
                </button>
                <button
                  type="button"
                  onClick={handleDownloadSummary}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1]"
                >
                  <Download className="h-4 w-4" />
                  Offline Export
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-5 py-3 font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.1]"
                >
                  <Share2 className="h-4 w-4" />
                  Share Link
                </button>
              </div>

              {actionMessage ? (
                <p className="mt-4 text-sm text-cyan-200">{actionMessage}</p>
              ) : null}
            </div>

            <MotionDiv
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              className="grid gap-4 self-start"
            >
              <MotionDiv
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
                className="rounded-[1.9rem] border border-white/10 bg-black/[0.2] p-5 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Decision pulse</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {itinerary.decisionSummary?.primaryLens || "Balanced fit"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-100">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">
                  {itinerary.decisionSummary?.explanation}
                </p>
              </MotionDiv>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <MetricStrip
                  icon={itinerary.weatherContext?.isRainy ? CloudRain : SunMedium}
                  label="Weather"
                  value={
                    itinerary.weatherContext?.temperatureC != null
                      ? `${itinerary.weatherContext.temperatureC} deg C`
                      : "Unavailable"
                  }
                  meta={itinerary.weatherContext?.summary || "Weather data unavailable"}
                  tone="border-amber-300/20 bg-amber-400/10 text-amber-100"
                />
                <MetricStrip
                  icon={MapPinned}
                  label="Transport"
                  value={formatTransportMode(itinerary.transportMode)}
                  meta="Travel profile used for route calculations."
                  tone="border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
                />
                <MetricStrip
                  icon={BrainCircuit}
                  label="Expense Mode"
                  value={formatExpenseMode(itinerary.expenseMode)}
                  meta={`${formatCurrency(itinerary.stats?.totalEstimatedCost || 0)} estimated total`}
                  tone="border-fuchsia-300/20 bg-fuchsia-400/10 text-fuchsia-100"
                />
              </div>
            </MotionDiv>
          </div>

          <div className="grid gap-px border-t border-white/10 bg-white/10 md:grid-cols-4">
            <StatPill
              label="Selected Stops"
              value={String(itinerary.stats.selectedPoiCount)}
              caption="Stops that fit the current time budget."
            />
            <StatPill
              label="Visit Time"
              value={formatMinutes(itinerary.stats.totalVisitMinutes)}
              caption="Estimated time spent at destinations."
            />
            <StatPill
              label="Transit Time"
              value={formatMinutes(itinerary.stats.totalTravelMinutes)}
              caption="Route friction across the full pass."
            />
            <StatPill
              label="Window Usage"
              value={`${itinerary.stats.utilizationRate || 0}%`}
              caption="How much of the free window is activated."
            />
          </div>
        </FadeSection>

        <FadeSection delay={0.08} className="grid items-start gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.54))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.26)] backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Context Stack</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Signals shaping this route</h2>
                  </div>
                  <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-100">
                    <Layers3 className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4">
                    <div className="flex items-start gap-3">
                      <MapPinned className="mt-1 h-4 w-4 text-cyan-300" />
                      <div>
                        <p className="font-semibold text-white">
                          {plannerState.location?.label || "Current area"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {formatCoordinates(plannerState.location)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4">
                    <div className="flex items-start gap-3">
                      <CalendarClock className="mt-1 h-4 w-4 text-fuchsia-300" />
                      <div className="w-full">
                        <p className="font-semibold text-white">Free windows</p>
                        <div className="mt-3 space-y-3">
                          {itinerary.freeSlots.map((slot) => (
                            <div
                              key={slot.id}
                              className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3 last:border-b-0 last:pb-0"
                            >
                              <div>
                                <p className="text-sm text-slate-200">
                                  {slot.startLabel} - {slot.endLabel}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                                  {slot.contextLabel}
                                </p>
                              </div>
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                                {formatMinutes(slot.durationMinutes)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {(itinerary.refinementOptions || []).length ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4">
                      <p className="text-sm font-semibold text-white">Refinement chips</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {itinerary.refinementOptions.map((option) => (
                          <span
                            key={option}
                            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100"
                          >
                            {option.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.54))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.26)] backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Map Stage</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Interactive route context</h2>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-3 text-cyan-100">
                    <Globe2 className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6">
                  <ItineraryMap center={plannerState.location} mapPoints={itinerary.mapPoints} />
                </div>
              </div>
            </div>

            {mustTryGroups.length ? (
              <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.54))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.26)] backdrop-blur-md">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Must Try</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Popular and area-special picks for {getAreaName(plannerState.location?.label)}
                    </h2>
                  </div>
                  <div className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-sm text-amber-100">
                    Local highlights
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {mustTryGroups.map((group) => {
                    const GroupIcon = group.icon;

                    return (
                      <div
                        key={group.id}
                        className="rounded-[1.6rem] border border-white/10 bg-black/[0.18] p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                              {group.subtitle}
                            </p>
                            <h3 className="mt-2 text-xl font-semibold text-white">{group.title}</h3>
                          </div>
                          <div className={["rounded-2xl border p-3", group.accent].join(" ")}>
                            <GroupIcon className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          <div>
                            <p className="text-lg font-semibold text-white">{group.place.name}</p>
                            <p className="mt-1 text-sm leading-7 text-slate-300">
                              {group.place.reason ||
                                group.place.highlight ||
                                group.place.tagSummary ||
                                group.fallback}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                              {group.place.categoryLabel || "Local stop"}
                            </span>
                            {group.place.travelMinutes ? (
                              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                                {group.place.travelMinutes} min away
                              </span>
                            ) : null}
                            {group.place.interestMatches?.[0] ? (
                              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                                {group.place.interestMatches[0]}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.82),rgba(15,23,42,0.54))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.26)] backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Execution Flow</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Planned stop sequence</h2>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                  Feasibility checked
                </div>
              </div>
              <div className="mt-6">
                <ItineraryTimeline timeline={itinerary.timeline} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <MotionDiv
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.56))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trip Journal</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Capture notes and moments</h2>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-amber-100">
                  <NotebookPen className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <textarea
                  rows="4"
                  value={journalInput}
                  onChange={(event) => setJournalInput(event.target.value)}
                  placeholder="Write what stood out, what changed, or what you want to remember about this trip..."
                  className="w-full rounded-[1.5rem] border border-white/10 bg-black/[0.18] px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-300">
                    {plannerState.tripId
                      ? "Entries are attached to this saved trip."
                      : "This itinerary is not saved yet, so journal entries stay local for now."}
                  </p>
                  <button
                    type="button"
                    disabled={isSavingJournal || !journalInput.trim()}
                    onClick={handleSaveJournalEntry}
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSavingJournal ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <NotebookPen className="h-4 w-4" />
                    )}
                    Save Entry
                  </button>
                </div>

                <div className="space-y-3">
                  {(plannerState.journalEntries || []).length ? (
                    plannerState.journalEntries.map((entry) => (
                      <div
                        key={entry.id || entry.createdAt}
                        className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4"
                      >
                        {editingJournalId === entry.id ? (
                          <>
                            <textarea
                              rows="4"
                              value={editingJournalContent}
                              onChange={(event) => setEditingJournalContent(event.target.value)}
                              className="w-full rounded-[1.1rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300/40"
                            />
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                disabled={isSavingJournal || !editingJournalContent.trim()}
                                onClick={() => handleUpdateJournalEntry(entry.id)}
                                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <Save className="h-4 w-4" />
                                Save
                              </button>
                              <button
                                type="button"
                                disabled={isSavingJournal}
                                onClick={cancelEditingJournalEntry}
                                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm leading-7 text-slate-200">{entry.content}</p>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                {formatSavedDate(entry.createdAt)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isSavingJournal}
                                  onClick={() => startEditingJournalEntry(entry)}
                                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <SquarePen className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={isSavingJournal}
                                  onClick={() => handleDeleteJournalEntry(entry.id)}
                                  className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm leading-7 text-slate-300">
                      No journal entries yet. Add quick reflections, trip decisions, or memorable moments here.
                    </p>
                  )}
                </div>
              </div>
            </MotionDiv>

            <MotionDiv
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.56))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Regenerate</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Tune this itinerary</h2>
                </div>
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isRegenerating ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerate
                </button>
              </div>

              <div className="mt-5">
                <RefinementChips
                  value={refinementOptions}
                  onChange={setRefinementOptions}
                  travelerMode={itinerary.travelerMode}
                />
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Adjust the route personality here, then regenerate without leaving the dashboard.
                </p>
                {refinementSummary.length ? (
                  <p className="mt-3 text-sm text-cyan-200">
                    Active: {refinementSummary.join(", ")}
                  </p>
                ) : null}
              </div>
            </MotionDiv>

            <MotionDiv
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.56))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">AI Briefing</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Priority guidance and shortlist</h2>
                </div>
                <div className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 p-3 text-fuchsia-100">
                  <Radar className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-4 text-sm text-slate-300">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/[0.18] p-5">
                  <p className="font-semibold text-white">AI tips</p>
                  <div className="mt-3 space-y-3">
                    {itinerary.tips.map((tip) => (
                      <div key={tip} className="flex gap-3">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                        <p>{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/[0.18] p-5">
                  <p className="font-semibold text-white">Shortlist behind the scenes</p>
                  <div className="mt-4 space-y-3">
                    {itinerary.shortlistedPois.slice(0, 5).map((poi) => (
                      <div
                        key={poi.id}
                        className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.03] px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-white">{poi.name}</p>
                          {poi.interestMatches?.length ? (
                            <p className="truncate text-xs text-cyan-200">
                              Matches: {poi.interestMatches.join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                          {poi.categoryLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv
              whileHover={{ y: -6 }}
              transition={{ duration: 0.25 }}
              className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.86),rgba(15,23,42,0.56))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Saved History</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Reopen past trips</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
                  {plannerState.storageStatus || "local"}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {historyStatus === "loading" ? (
                  <div className="grid gap-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-24 animate-pulse rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04]"
                      />
                    ))}
                  </div>
                ) : null}
                {historyError ? (
                  <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                    {historyError}
                  </div>
                ) : null}
                {!plannerState.tripHistory?.length && historyStatus === "success" ? (
                  <p className="text-sm leading-7 text-slate-300">
                    Generate a trip while MongoDB is connected and it will appear here for quick reload.
                  </p>
                ) : null}
                {(plannerState.tripHistory || []).map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => handleLoadTrip(trip.id)}
                    disabled={loadingTripId === trip.id}
                    className="w-full rounded-[1.6rem] border border-white/10 bg-black/[0.18] p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-black/[0.24] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{trip.title}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {trip.location?.label || "Saved area"} / {trip.mode}
                        </p>
                        <p className="mt-2 text-sm text-slate-400">{trip.itineraryHeadline}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {loadingTripId === trip.id ? (
                          <div className="inline-flex items-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Loading
                          </div>
                        ) : (
                          <>
                            <p>{formatSavedDate(trip.updatedAt)}</p>
                            <p className="mt-2">
                              {trip.stats?.selectedPoiCount || 0} stops / {formatMinutes(trip.stats?.totalVisitMinutes || 0)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </MotionDiv>

            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.92),rgba(12,18,34,0.6))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-white">Ready for another pass?</p>
                  <p className="mt-1 text-sm leading-7 text-slate-300">
                    Adjust your inputs, change the time budget, or switch traveler modes to regenerate a different route.
                  </p>
                </div>
                <Link
                  to="/mode"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-3 font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
                >
                  Choose Another Mode
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </FadeSection>
      </div>
    </section>
  );
}
