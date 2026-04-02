import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Compass, MapPinned, Route as RouteIcon, Sparkles } from "lucide-react";
import AuthSync from "./components/AuthSync.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { PlannerProvider } from "./context/PlannerContext.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ModeSelectionPage from "./pages/ModeSelectionPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import BusinessSetupPage from "./pages/BusinessSetupPage.jsx";
import LeisureSetupPage from "./pages/LeisureSetupPage.jsx";
import ItineraryDashboardPage from "./pages/ItineraryDashboardPage.jsx";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Modes", to: "/mode" },
  { label: "Business Setup", to: "/business-setup" },
  { label: "Leisure Setup", to: "/leisure-setup" },
  { label: "Itinerary", to: "/itinerary" },
  { label: "Dashboard", to: "/dashboard" },
];

const MotionDiv = motion.div;
const MotionNav = motion.nav;
const MotionMain = motion.main;

function AppShell() {
  const location = useLocation();

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:140px_140px] opacity-[0.08] animate-grid-pan" />
        <div className="absolute left-[8%] top-12 h-72 w-72 rounded-full bg-cyan-400/12 blur-3xl animate-float-slow" />
        <div className="absolute right-[10%] top-28 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-3xl animate-float-delayed" />
        <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl animate-float-slow" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(217,70,239,0.08),transparent_28%)]" />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <MotionDiv initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <NavLink to="/" className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.2)]">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Travel Nest</p>
                <p className="font-semibold text-white">AI Travel Companion</p>
              </div>
            </NavLink>
          </MotionDiv>

          <MotionNav
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="relative flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-2 backdrop-blur-md"
          >
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "rounded-full border px-4 py-2 text-sm transition duration-300",
                    isActive
                      ? "border-cyan-300/45 bg-[linear-gradient(135deg,rgba(8,145,178,0.35),rgba(59,130,246,0.18))] text-cyan-50 shadow-[0_0_30px_rgba(34,211,238,0.18)]"
                      : "border-transparent bg-transparent text-slate-300 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.08] hover:text-white",
                  ].join(" ")
                }
              >
                {item.label}
              </NavLink>
            ))}
          </MotionNav>

          <MotionDiv
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="relative flex items-center gap-3 self-start lg:self-auto"
          >
            <SignedOut>
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.18)] transition hover:-translate-y-0.5 hover:bg-cyan-300">
                    Sign Up
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>

            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "h-10 w-10 border border-cyan-300/30 shadow-[0_0_20px_rgba(34,211,238,0.18)]",
                  },
                }}
              />
            </SignedIn>
          </MotionDiv>
        </div>
      </header>

      <MotionMain
        key={location.pathname}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 min-h-[calc(100vh-88px)]"
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/sign-in/*" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up/*" element={<AuthPage mode="sign-up" />} />
            <Route path="/mode" element={<ModeSelectionPage />} />
            <Route
              path="/business-setup"
              element={
                <ProtectedRoute>
                  <BusinessSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leisure-setup"
              element={
                <ProtectedRoute>
                  <LeisureSetupPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/itinerary"
              element={
                <ProtectedRoute>
                  <ItineraryDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </MotionMain>

      <footer className="relative z-10 border-t border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.94),rgba(8,15,35,0.98))]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.08),transparent_24%),radial-gradient(circle_at_85%_20%,rgba(217,70,239,0.08),transparent_22%)]" />
        </div>

        <div className="mx-auto grid w-full max-w-[1600px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <MotionDiv
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-slate-400">Travel Nest</p>
                <p className="mt-1 text-lg font-semibold text-white">AI Travel Companion</p>
              </div>
            </div>

            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
              Travel Nest helps people turn business gaps and leisure hours into smarter,
              better-planned city experiences.
            </p>

            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-200">
              <div className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-fuchsia-300" />
                AI-based planning
              </div>
              <div className="inline-flex items-center gap-2">
                <MapPinned className="h-4 w-4 text-cyan-300" />
                Live map context
              </div>
              <div className="inline-flex items-center gap-2">
                <RouteIcon className="h-4 w-4 text-emerald-300" />
                Time-aware routes
              </div>
            </div>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="relative"
          >
            <p className="text-sm uppercase tracking-[0.32em] text-slate-400">Navigation</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
              {navItems.map((item) => (
                <NavLink
                  key={`footer-${item.to}`}
                  to={item.to}
                  className="text-sm text-slate-300 transition hover:text-cyan-200"
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </MotionDiv>
        </div>

        <div className="relative border-t border-white/10 px-5 py-4 text-sm text-slate-400 sm:px-8">
          <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>Travel Nest shapes business gaps and leisure windows into memorable city plans.</p>
            <p>React, maps, routing, auth, and AI working in one polished travel canvas.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <BrowserRouter>
        <AuthSync />
        <AppShell />
      </BrowserRouter>
    </PlannerProvider>
  );
}
