/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "travel-nest-planner-state";

const defaultPlannerState = {
  mode: "",
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
  tripHistory: [],
  storageStatus: "",
  journalEntries: [],
  documentName: "",
  availableMinutes: 180,
  transportMode: "auto",
  expenseMode: "balanced",
  poiSource: "",
  poiRadiusMeters: 0,
};

const PlannerContext = createContext(null);

function loadPlannerState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultPlannerState, ...JSON.parse(raw) } : defaultPlannerState;
  } catch {
    return defaultPlannerState;
  }
}

export function PlannerProvider({ children }) {
  const [plannerState, setPlannerState] = useState(loadPlannerState);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plannerState));
  }, [plannerState]);

  const mergePlannerState = useCallback((patch) => {
    setPlannerState((current) => {
      const resolvedPatch = typeof patch === "function" ? patch(current) : patch;

      if (!resolvedPatch || typeof resolvedPatch !== "object") {
        return current;
      }

      const nextState = {
        ...current,
        ...resolvedPatch,
      };

      const hasChanged = Object.keys(resolvedPatch).some(
        (key) => !Object.is(current[key], nextState[key])
      );

      return hasChanged ? nextState : current;
    });
  }, []);

  const resetPlannerState = useCallback(() => {
    setPlannerState(defaultPlannerState);
  }, []);

  const value = useMemo(
    () => ({
      plannerState,
      mergePlannerState,
      resetPlannerState,
    }),
    [plannerState, mergePlannerState, resetPlannerState]
  );

  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
}

export function usePlanner() {
  const context = useContext(PlannerContext);

  if (!context) {
    throw new Error("usePlanner must be used inside PlannerProvider.");
  }

  return context;
}
