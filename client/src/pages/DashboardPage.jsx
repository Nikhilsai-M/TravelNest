import { useAuth, useUser } from "@clerk/clerk-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, Compass, MapPinned, PieChart, Route } from "lucide-react";
import { fetchTripById, fetchTripHistory } from "../lib/api.js";
import { usePlanner } from "../context/PlannerContext.jsx";
import { formatMinutes } from "../lib/formatters.js";

function Card({ eyebrow, title, children, className = "" }) {
  return (
    <section
      className={`rounded-[2rem] border border-white/10 bg-slate-950/[0.72] p-6 shadow-[0_25px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl ${className}`}
    >
      <p className="text-sm uppercase tracking-[0.25em] text-slate-400">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatTile({ label, value, caption }) {
  return (
    <div className="rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-black/[0.18] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-sm uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-300">{caption}</p>
    </div>
  );
}

function HorizontalBars({ items, emptyMessage, valueSuffix = "" }) {
  const max = items[0]?.value || 1;

  if (!items.length) {
    return <p className="text-sm leading-7 text-slate-300">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate font-medium text-white">{item.label}</p>
            <p className="shrink-0 text-sm text-slate-300">
              {item.value}
              {valueSuffix}
            </p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300"
              style={{ width: `${Math.max(10, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutSummary({ businessTrips, leisureTrips }) {
  const total = businessTrips + leisureTrips;
  const businessDegrees = total ? (businessTrips / total) * 360 : 0;

  return (
    <div className="flex items-center gap-6">
      <div
        className="flex h-36 w-36 items-center justify-center rounded-full border border-white/10"
        style={{
          background: total
            ? `conic-gradient(#22d3ee 0deg ${businessDegrees}deg, #f59e0b ${businessDegrees}deg 360deg)`
            : "conic-gradient(#334155 0deg 360deg)",
        }}
      >
        <div className="flex h-22 w-22 flex-col items-center justify-center rounded-full bg-slate-950 text-center">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Trips</span>
          <span className="mt-1 text-2xl font-semibold text-white">{total}</span>
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-200">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-cyan-300" />
          <span>Business: {businessTrips}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span>Leisure: {leisureTrips}</span>
        </div>
      </div>
    </div>
  );
}

function formatSavedDate(value) {
  if (!value) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function compactLocationLabel(label) {
  const trimmed = String(label || "").trim();

  if (!trimmed) {
    return "Saved area";
  }

  const parts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }

  return trimmed;
}

function buildDashboardAnalytics(trips) {
  const categoryCounts = new Map();
  const placeCounts = new Map();
  const cityCounts = new Map();
  let totalStops = 0;
  let totalVisitMinutes = 0;
  let businessTrips = 0;
  let leisureTrips = 0;

  trips.forEach((trip) => {
    if (trip.mode === "business") {
      businessTrips += 1;
    } else if (trip.mode === "leisure") {
      leisureTrips += 1;
    }

    totalStops += Number(trip.stats?.selectedPoiCount || 0);
    totalVisitMinutes += Number(trip.stats?.totalVisitMinutes || 0);

    Object.entries(trip.analytics?.categoryCounts || {}).forEach(([label, value]) => {
      categoryCounts.set(label, (categoryCounts.get(label) || 0) + value);
    });

    Object.entries(trip.analytics?.placeCounts || {}).forEach(([label, value]) => {
      placeCounts.set(label, (placeCounts.get(label) || 0) + value);
    });

    if (trip.location?.label) {
      cityCounts.set(trip.location.label, (cityCounts.get(trip.location.label) || 0) + 1);
    }
  });

  const toSortedArray = (map) =>
    Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((left, right) => right.value - left.value);

  return {
    totalTrips: trips.length,
    totalStops,
    totalVisitMinutes,
    businessTrips,
    leisureTrips,
    topCategories: toSortedArray(categoryCounts).slice(0, 5),
    topPlaces: toSortedArray(placeCounts).slice(0, 5),
    topAreas: toSortedArray(cityCounts).slice(0, 5),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { plannerState, mergePlannerState } = usePlanner();
  const [trips, setTrips] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [loadingTripId, setLoadingTripId] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        setStatus("loading");
        const tripHistory = await fetchTripHistory(getToken);

        if (!isMounted) {
          return;
        }

        setTrips(tripHistory.trips || []);
        mergePlannerState({
          tripHistory: tripHistory.trips || [],
          storageStatus: tripHistory.storage || "",
        });
        setStatus("success");
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        setError(
          requestError.response?.data?.message ||
            requestError.response?.data?.error ||
            requestError.message ||
            "Unable to load your dashboard.",
        );
        setStatus("error");
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [getToken, mergePlannerState]);

  async function handleOpenTrip(tripId) {
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

      navigate("/itinerary");
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Unable to open that saved trip.");
    } finally {
      setLoadingTripId("");
    }
  }

  const currentItinerary = plannerState.itinerary;
  const analytics = useMemo(() => buildDashboardAnalytics(trips), [trips]);

  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 shadow-[0_25px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Travel Dashboard</p>
          <h1 className="display-type mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {user?.firstName ? `${user.firstName}'s exploration patterns.` : "Your exploration patterns."}
          </h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">
            See what kinds of places you explore most, which cities you return to, and how your saved itineraries are shaping up over time.
          </p>
        </div>

        {status === "error" ? (
          <div className="rounded-[1.5rem] border border-rose-300/20 bg-rose-500/10 p-5 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatTile
            label="Saved Trips"
            value={String(analytics.totalTrips)}
            caption="Itineraries available for analysis and reopening."
          />
          <StatTile
            label="Stops Explored"
            value={String(analytics.totalStops)}
            caption="Total selected places across your saved trips."
          />
          <StatTile
            label="Visit Time"
            value={formatMinutes(analytics.totalVisitMinutes)}
            caption="Estimated time spent across all itinerary stops."
          />
          <StatTile
            label="Current Draft"
            value={currentItinerary ? `${currentItinerary.stats?.selectedPoiCount || 0} stops` : "None"}
            caption="The itinerary currently loaded in the planner."
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Card eyebrow="Category Split" title="What kinds of places you explore">
              <HorizontalBars
                items={analytics.topCategories}
                emptyMessage="Generate and save a few itineraries to see which categories dominate your travel style."
              />
            </Card>

            <Card eyebrow="Top Places" title="Places that appear most often">
              <HorizontalBars
                items={analytics.topPlaces}
                emptyMessage="Your most frequently selected stops will appear here once you save a few trips."
              />
            </Card>

            <Card eyebrow="Current Draft" title="What the planner is holding now">
              {currentItinerary ? (
                <div className="space-y-4 text-sm text-slate-200">
                  <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                    <div className="flex items-start gap-3">
                      <Compass className="mt-1 h-4 w-4 text-cyan-300" />
                      <div>
                        <p className="font-semibold text-white">{currentItinerary.headline}</p>
                        <p className="mt-2 leading-7 text-slate-300">{currentItinerary.overview}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                      <p className="text-slate-400">Stops planned</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {currentItinerary.stats?.selectedPoiCount || 0}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/[0.18] p-4">
                      <p className="text-slate-400">Visit time</p>
                      <p className="mt-2 text-xl font-semibold text-white">
                        {formatMinutes(currentItinerary.stats?.totalVisitMinutes || 0)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/itinerary"
                    className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
                  >
                    Open Current Itinerary
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm leading-7 text-slate-300">
                  No current itinerary is loaded. Generate one from Business Setup or Leisure Setup, or reopen a saved trip from the list.
                </p>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card eyebrow="Travel Mix" title="Business vs leisure">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <DonutSummary
                  businessTrips={analytics.businessTrips}
                  leisureTrips={analytics.leisureTrips}
                />
                <div className="grid flex-1 gap-3">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4">
                    <div className="flex items-center gap-2 text-white">
                      <PieChart className="h-4 w-4 text-cyan-300" />
                      <span className="font-medium">Planning style</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {analytics.businessTrips > analytics.leisureTrips
                        ? "Your saved history leans more toward business-oriented planning."
                        : analytics.leisureTrips > analytics.businessTrips
                          ? "Your saved history leans more toward leisure exploration."
                          : "Your saved history is evenly split between business and leisure planning."}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.18] p-4">
                    <div className="flex items-center gap-2 text-white">
                      <Route className="h-4 w-4 text-emerald-300" />
                      <span className="font-medium">Average trip density</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-300">
                      {analytics.totalTrips
                        ? `${Math.round((analytics.totalStops / analytics.totalTrips) * 10) / 10} stops per saved trip on average.`
                        : "No saved trips yet to estimate average route density."}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card eyebrow="Top Areas" title="Where you plan the most">
              <HorizontalBars
                items={analytics.topAreas}
                emptyMessage="Saved destinations will appear here once you start building history."
              />
            </Card>

            <Card eyebrow="Trip History" title="Reopen past itineraries">
              {status === "loading" ? (
                <p className="text-sm text-cyan-200">Loading your trip history...</p>
              ) : null}
              {!trips.length && status === "success" ? (
                <p className="text-sm leading-7 text-slate-300">
                  No saved trips yet. Generate an itinerary and it will show up here with analytics.
                </p>
              ) : null}
              <div className="space-y-3">
                {trips.map((trip) => (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => handleOpenTrip(trip.id)}
                    disabled={loadingTripId === trip.id}
                    className="w-full rounded-[1.5rem] border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/[0.18] p-4 text-left transition hover:border-cyan-300/25 hover:bg-black/[0.24] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="max-w-[20rem] text-lg font-semibold leading-7 text-white sm:max-w-none">
                              {trip.title}
                            </p>
                            {loadingTripId === trip.id ? (
                              <span className="shrink-0 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                                Opening...
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                            {trip.itineraryHeadline || trip.itineraryOverview}
                          </p>
                        </div>
                        <div className="grid shrink-0 gap-2 text-xs text-slate-400 lg:min-w-[13rem] lg:justify-items-end">
                          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            <MapPinned className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{compactLocationLabel(trip.location?.label)}</span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            <Clock3 className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatSavedDate(trip.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                          {trip.mode}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {trip.stats?.selectedPoiCount || 0} stops
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          {formatMinutes(trip.stats?.totalVisitMinutes || 0)}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-white/10 bg-black/[0.22] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Area</p>
                          <p className="mt-2 truncate text-sm text-white">
                            {compactLocationLabel(trip.location?.label)}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-black/[0.22] px-4 py-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Summary</p>
                          <p className="mt-2 text-sm text-white">
                            {trip.stats?.selectedPoiCount || 0} stops in {formatMinutes(trip.stats?.totalVisitMinutes || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        {(trip.analytics?.stopTitles || []).slice(0, 3).map((title) => (
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
