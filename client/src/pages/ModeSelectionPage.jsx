import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarCheck2,
  HeartHandshake,
  Map,
  WandSparkles,
} from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

const modeCards = [
  {
    title: "Business Traveler",
    path: "/business-setup",
    accent:
      "from-cyan-400/30 via-sky-500/10 to-transparent text-cyan-100 border-cyan-300/20",
    icon: BriefcaseBusiness,
    summary:
      "Upload a meeting schedule, extract work commitments, and uncover realistic cultural or dining windows around your day.",
    bullets: [
      "PDF meeting schedule upload",
      "Automatic free-slot detection",
      "Transit-aware between-meeting planning",
    ],
  },
  {
    title: "Leisure Traveler",
    path: "/leisure-setup",
    accent:
      "from-fuchsia-500/30 via-rose-500/10 to-transparent text-fuchsia-100 border-fuchsia-300/20",
    icon: HeartHandshake,
    summary:
      "Use live geolocation and personal interests to discover nearby places that fit the pace, mood, and time you have available.",
    bullets: [
      "Instant current-location detection",
      "Interest-tagged discovery",
      "Map-first nearby exploration",
    ],
  },
];

export default function ModeSelectionPage() {
  return (
    <section className="px-5 py-10 sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Mode Selection</p>
          <h1 className="display-type mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Choose the planning flow that matches your trip.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            Both routes end in the same AI itinerary dashboard, but each mode starts from a
            different source of context so the recommendations feel grounded from the start.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {modeCards.map((mode) => {
            const ModeIcon = mode.icon;

            return (
              <article
                key={mode.title}
                className={`relative overflow-hidden rounded-[2rem] border bg-slate-950/[0.7] p-7 shadow-[0_30px_70px_rgba(2,6,23,0.42)] backdrop-blur-xl ${mode.accent}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.accent}`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white/10 bg-white/10">
                      <ModeIcon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-slate-200">
                      AI Assisted
                    </span>
                  </div>

                  <h2 className="mt-8 text-3xl font-semibold text-white">{mode.title}</h2>
                  <p className="mt-4 text-base leading-7 text-slate-200">{mode.summary}</p>

                  <div className="mt-6 space-y-3">
                    {mode.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/[0.15] px-4 py-3"
                      >
                        <CalendarCheck2 className="h-4 w-4 shrink-0 text-cyan-200" />
                        <span className="text-sm text-slate-100">{bullet}</span>
                      </div>
                    ))}
                  </div>

                  <SignedIn>
                    <Link
                      to={mode.path}
                      className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black px-5 py-3 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(255,255,255,0.2)]"
                    >
                      Continue to Setup
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-[linear-gradient(135deg,#f8fafc,#dbeafe)] px-5 py-3 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(255,255,255,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(255,255,255,0.2)]">
                        Sign In to Continue
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-8 grid gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/[0.6] p-5">
            <WandSparkles className="h-5 w-5 text-fuchsia-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">Gemini reasoning</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Turns schedules, preferences, and filtered POIs into a structured itinerary response.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/[0.6] p-5">
            <Map className="h-5 w-5 text-cyan-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">Map-native outputs</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Designed for a later Leaflet dashboard with nearby points, route legs, and travel buffers.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/[0.6] p-5">
            <BriefcaseBusiness className="h-5 w-5 text-emerald-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">Mode-aware inputs</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Business and leisure travelers start from different context signals, but share one polished journey.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
