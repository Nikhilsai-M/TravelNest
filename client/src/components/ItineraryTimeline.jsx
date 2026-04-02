import { motion } from "framer-motion";
import { Clock3, MapPin, Route } from "lucide-react";
import { formatCurrency, formatMinutes } from "../lib/formatters.js";

const MotionArticle = motion.article;

export default function ItineraryTimeline({ timeline = [] }) {
  if (!timeline.length) {
    return (
      <div className="rounded-[1.75rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-sm text-slate-300">
        No itinerary stops are ready yet. Generate one from Business Setup or Leisure Setup.
      </div>
    );
  }

  return (
    <div className="relative space-y-6 before:absolute before:bottom-4 before:left-5 before:top-4 before:w-px before:bg-gradient-to-b before:from-cyan-300/50 before:via-fuchsia-300/30 before:to-transparent sm:before:left-6">
      {timeline.map((item, index) => (
        <MotionArticle
          key={item.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, delay: index * 0.06 }}
          className="relative ml-0 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.58))] p-5 shadow-[0_25px_70px_rgba(2,6,23,0.3)] backdrop-blur-md sm:ml-6 sm:p-6"
        >
          <div className="absolute left-5 top-10 h-3.5 w-3.5 -translate-x-[1.86rem] rounded-full border border-cyan-200/50 bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.65)] sm:-translate-x-[2.34rem]" />
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_25px_rgba(34,211,238,0.15)]">
              {index + 1}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                    {item.category}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">{item.title}</h3>
                </div>
                <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-200">
                  {item.startTime} - {item.endTime}
                </div>
              </div>

              <p className="text-sm leading-6 text-slate-300">{item.reason}</p>

              {item.explanation ? (
                <div className="grid gap-3 xl:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.2] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Why Chosen</p>
                    <div className="mt-2 space-y-2 text-sm text-slate-200">
                      {(item.explanation.whyChosen || []).map((point) => (
                        <p key={point}>{point}</p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.2] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Personalization
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {item.explanation.personalization}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-cyan-100">
                      {item.explanation.scheduleFit}
                    </p>
                    {item.explanation.weatherFit ? (
                      <p className="mt-3 text-sm leading-6 text-emerald-100">
                        {item.explanation.weatherFit}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/[0.2] p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Tradeoff</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {item.explanation.tradeoff}
                    </p>
                    {item.slotContext?.label ? (
                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                        {item.slotContext.label}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 text-sm text-slate-300">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/[0.2] px-3 py-2">
                  <Clock3 className="h-4 w-4 text-cyan-300" />
                  Stay {formatMinutes(item.durationMinutes)}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/[0.2] px-3 py-2">
                  <Route className="h-4 w-4 text-fuchsia-300" />
                  Travel {formatMinutes(item.travelMinutes)}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/[0.2] px-3 py-2">
                  <MapPin className="h-4 w-4 text-emerald-300" />
                  {item.highlight}
                </div>
                {item.costEstimate ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/[0.2] px-3 py-2">
                    <span className="text-amber-300">$</span>
                    {formatCurrency(item.costEstimate.amount, item.costEstimate.currency)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </MotionArticle>
      ))}
    </div>
  );
}
