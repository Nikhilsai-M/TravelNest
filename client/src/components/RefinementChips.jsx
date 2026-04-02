const CHIP_OPTIONS = [
  { id: "more_food", label: "More food" },
  { id: "less_walking", label: "Less walking" },
  { id: "more_iconic_places", label: "More iconic places" },
  { id: "quiet_places_only", label: "Quiet places only" },
  { id: "budget_friendly", label: "Budget-friendly" },
  { id: "near_meetings_only", label: "Near meetings only", businessOnly: true },
];

export default function RefinementChips({
  value = [],
  onChange,
  travelerMode = "leisure",
}) {
  const visibleOptions = CHIP_OPTIONS.filter(
    (option) => !option.businessOnly || travelerMode === "business"
  );

  function toggleChip(id) {
    const next = value.includes(id) ? value.filter((item) => item !== id) : [...value, id];
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleOptions.map((option) => {
        const active = value.includes(option.id);

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggleChip(option.id)}
            className={[
              "rounded-full border px-4 py-2 text-sm transition",
              active
                ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
