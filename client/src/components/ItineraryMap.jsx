import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Pane,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";

function FitMapToPoints({ center, mapPoints }) {
  const map = useMap();

  useEffect(() => {
    const points = [
      ...(center ? [[center.lat, center.lng]] : []),
      ...mapPoints.map((point) => [point.lat, point.lng]),
    ];

    if (points.length > 1) {
      map.fitBounds(points, { padding: [36, 36] });
    } else if (points.length === 1) {
      map.setView(points[0], 14);
    }
  }, [center, map, mapPoints]);

  return null;
}

export default function ItineraryMap({ center, mapPoints = [] }) {
  const mapCenter = center
    ? [center.lat, center.lng]
    : mapPoints.length > 0
      ? [mapPoints[0].lat, mapPoints[0].lng]
      : [20.5937, 78.9629];
  const routeLine = mapPoints.map((point) => [point.lat, point.lng]);

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-[0_30px_90px_rgba(2,6,23,0.4)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] h-24 bg-gradient-to-b from-slate-950 via-slate-950/70 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[401] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.28))]" />

      <div className="absolute left-4 top-4 z-[600] flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-3 text-sm text-slate-200">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-950/65 px-3 py-1 backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.7)]" />
          Anchor
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-slate-950/65 px-3 py-1 backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_14px_rgba(244,114,182,0.7)]" />
          Planned stops
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-slate-950/65 px-3 py-1 backdrop-blur-md">
          <span className="block h-[2px] w-4 rounded-full bg-emerald-300" />
          Route order
        </div>
      </div>

      <div className="h-[30rem]">
        <MapContainer center={mapCenter} zoom={14} scrollWheelZoom className="h-full w-full">
          <FitMapToPoints center={center} mapPoints={mapPoints} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Pane name="routes" style={{ zIndex: 450 }} />
          {routeLine.length > 1 ? (
            <Polyline
              positions={routeLine}
              pane="routes"
              pathOptions={{ color: "#6ee7b7", weight: 4, opacity: 0.8, dashArray: "8 8" }}
            />
          ) : null}

          {center ? (
            <CircleMarker
              center={[center.lat, center.lng]}
              radius={11}
              pathOptions={{ color: "#22d3ee", fillColor: "#22d3ee", fillOpacity: 0.9 }}
            >
              <Tooltip permanent direction="bottom" offset={[0, 16]}>
                <span className="text-xs font-semibold">Anchor</span>
              </Tooltip>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{center.label || "Your anchor location"}</p>
                  <p>
                    {Number(center.lat).toFixed(4)}, {Number(center.lng).toFixed(4)}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          ) : null}

          {mapPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lng]}
              radius={12}
              pathOptions={{ color: "#f472b6", fillColor: "#f472b6", fillOpacity: 0.85 }}
            >
              <Tooltip permanent direction="top" offset={[0, -12]}>
                <span className="text-xs font-semibold">{point.order}</span>
              </Tooltip>
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{point.title}</p>
                  <p>Stop {point.order}</p>
                  <p>
                    {point.startTime} - {point.endTime}
                  </p>
                  <p>{point.reason}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-[600] flex flex-wrap items-end justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/60 px-4 py-3 backdrop-blur-xl">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Map intelligence</p>
          <p className="mt-1 text-sm text-slate-200">
            {mapPoints.length
              ? `${mapPoints.length} synchronized stops plotted with a route-aware sequence.`
              : "Anchor is ready. Generate stops to unlock the plotted route."}
          </p>
        </div>
        <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-100">
          Smooth route preview
        </div>
      </div>
    </div>
  );
}
