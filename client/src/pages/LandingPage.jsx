import { ArrowRight, BrainCircuit, Clock3, MapPinned, Sparkles } from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const MotionArticle = motion.article;
const MotionButton = motion.button;
const MotionDiv = motion.div;
const MotionSpan = motion.span;

const featureCards = [
  {
    title: "Time Efficiency",
    description:
      "Turn free windows between meetings or city walks into feasible plans instead of guesswork.",
    icon: Clock3,
  },
  {
    title: "Smart Exploration",
    description:
      "Blend live location, travel time, and personal interests into recommendations that feel grounded.",
    icon: MapPinned,
  },
  {
    title: "Context-Aware AI",
    description:
      "Gemini interprets schedules and intent, while routing and POI filters keep the itinerary realistic.",
    icon: BrainCircuit,
  },
];

const previewStops = [
  { time: "12:15", title: "Quick lunch near meeting venue", meta: "8 min walk" },
  { time: "13:30", title: "Heritage museum visit", meta: "45 min stay" },
  { time: "15:00", title: "Coffee reset + travel buffer", meta: "6 min ride" },
];

const metrics = [
  { label: "Route fit", value: "94%", tone: "cyan" },
  { label: "Live context", value: "6 signals", tone: "fuchsia" },
  { label: "Generated", value: "< 20 sec", tone: "emerald" },
];

export default function LandingPage() {
  return (
    <section className="relative isolate overflow-hidden px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[4%] top-8 h-64 w-64 rounded-full bg-cyan-400/12 blur-3xl animate-float-slow" />
        <div className="absolute right-[6%] top-16 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl animate-float-delayed" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl animate-float-slow" />
      </div>

      <div className="grid min-h-[calc(100vh-10rem)] gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <MotionDiv
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10"
        >
          <MotionSpan
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.12)]"
          >
            <Sparkles className="h-4 w-4 animate-pulse-glow" />
            AI Context-Aware Travel Companion
          </MotionSpan>

          <h1 className="display-type mt-7 max-w-4xl text-5xl font-semibold leading-[0.92] text-white sm:text-6xl lg:text-7xl">
            Make every hour in a new city feel deliberately designed.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Travel Nest turns schedule gaps into premium, route-aware plans with motion-rich
            intelligence, nearby discovery, and traveler-first context.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SignedIn>
              <MotionDiv whileHover={{ y: -4, scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/mode"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#38bdf8)] px-6 py-3 font-medium text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.25)] transition"
                >
                  Choose Traveler Mode
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </MotionDiv>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <MotionButton
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#67e8f9,#38bdf8)] px-6 py-3 font-medium text-slate-950 shadow-[0_0_35px_rgba(34,211,238,0.25)] transition"
                >
                  Sign In to Start
                  <ArrowRight className="h-4 w-4" />
                </MotionButton>
              </SignInButton>
            </SignedOut>
            <MotionDiv whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/business-setup"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-medium text-white transition hover:border-white/25 hover:bg-white/10"
              >
                Preview Business Flow
              </Link>
            </MotionDiv>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {metrics.map((metric, index) => (
              <MotionDiv
                key={metric.label}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.16 + index * 0.08 }}
                className="rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
              >
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
              </MotionDiv>
            ))}
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {featureCards.map((feature, index) => {
              const FeatureIcon = feature.icon;

              return (
                <MotionArticle
                  key={feature.title}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.28 + index * 0.08 }}
                  whileHover={{ y: -10, scale: 1.01 }}
                  className="rounded-[1.8rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_24px_55px_rgba(2,6,23,0.28)] backdrop-blur-md"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/70 text-cyan-200 shadow-[0_0_25px_rgba(34,211,238,0.12)]">
                    <FeatureIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{feature.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{feature.description}</p>
                </MotionArticle>
              );
            })}
          </div>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.75, delay: 0.15 }}
          className="relative z-10"
        >
          <div className="absolute -left-8 top-10 h-32 w-32 rounded-full border border-cyan-300/20 bg-cyan-400/[0.08] blur-2xl" />
          <div className="absolute -right-4 bottom-14 h-40 w-40 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/[0.08] blur-2xl" />

          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/10 bg-[linear-gradient(160deg,rgba(7,12,28,0.95),rgba(15,23,42,0.68))] p-6 shadow-[0_40px_120px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.12),transparent_30%)]" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Sample AI Plan</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Mumbai Midtown Sprint</h2>
              </div>
              <MotionDiv
                animate={{ boxShadow: ["0 0 0 rgba(110,231,183,0.15)", "0 0 25px rgba(110,231,183,0.35)", "0 0 0 rgba(110,231,183,0.15)"] }}
                transition={{ duration: 2.8, repeat: Infinity }}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200"
              >
                Feasible
              </MotionDiv>
            </div>

            <div className="relative mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>Free window detected</span>
                <span>12:00 PM - 4:30 PM</span>
              </div>

              <div className="mt-5 space-y-4">
                {previewStops.map((stop, index) => (
                  <MotionDiv
                    key={stop.time}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.45, delay: 0.35 + index * 0.12 }}
                    whileHover={{ x: 8 }}
                    className="flex gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                        {stop.time}
                      </div>
                      <div className="mt-2 h-full w-px bg-gradient-to-b from-cyan-300/40 to-transparent" />
                    </div>
                    <div className="flex-1 rounded-[1.4rem] border border-white/10 bg-slate-900/70 p-4 backdrop-blur-md">
                      <p className="font-medium text-white">{stop.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{stop.meta}</p>
                    </div>
                  </MotionDiv>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <MotionDiv
                whileHover={{ y: -8 }}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5"
              >
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Inputs</p>
                <p className="mt-3 text-lg font-semibold text-white">Schedule + location + interests</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  The itinerary engine weighs timing, transit friction, and cultural fit before drafting a plan.
                </p>
              </MotionDiv>
              <MotionDiv
                whileHover={{ y: -8 }}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5"
              >
                <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Outputs</p>
                <p className="mt-3 text-lg font-semibold text-white">Timeline + map-ready POIs</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Designed for an animated dashboard with route staging, live context, and graceful regeneration.
                </p>
              </MotionDiv>
            </div>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}
