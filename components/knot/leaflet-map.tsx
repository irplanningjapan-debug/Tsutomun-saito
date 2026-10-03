'use client'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'

export type MunicipalityMapPoint = {
  area: string
  lat: number
  lng: number
  count: number
}

// Renders the map-pin marker as raw HTML for a Leaflet divIcon: a circular pin (orange
// when selected or when it has activities, gray otherwise) with a count badge and a
// municipality label underneath. Mirrors the previous CSS-positioned pin design 1:1.
function createPinIcon(area: string, count: number, selected: boolean) {
  const circleClass = selected
    ? 'background:#f59e0b;color:#0f172a;box-shadow:0 0 0 4px rgba(253,230,138,1);transform:scale(1.1);'
    : count > 0
      ? 'background:#fbbf24;color:#0f172a;'
      : 'background:#cbd5e1;color:#64748b;'

  return L.divIcon({
    className: 'knot-map-pin',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:68px;transform:translate(-50%,-50%);">
        <span style="position:relative;display:grid;place-items:center;width:32px;height:32px;border-radius:9999px;border:3px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.25);${circleClass}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
          </svg>
          ${count > 0 ? `<span style="position:absolute;top:-5px;right:-5px;display:grid;place-items:center;min-width:15px;border-radius:9999px;border:2px solid white;background:#b45309;padding:0 3px;font-size:9px;font-weight:900;color:white;">${count}</span>` : ''}
        </span>
        <span style="margin-top:3px;white-space:nowrap;border-radius:9999px;background:rgba(255,255,255,0.9);padding:3px 6px;font-size:9px;font-weight:900;color:#334155;box-shadow:0 1px 3px rgba(0,0,0,0.15);">${area} (${count}件)</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

// Bounding box covering all of Miyazaki Prefecture, from Takachiho/Nobeoka in the
// north to Kushima/Miyakonojo in the south, used to fit the whole prefecture into
// view on a single, non-scrolling screen.
const MIYAZAKI_BOUNDS: [[number, number], [number, number]] = [
  [32.05, 131.15], // 南西（都於郡・三財）
  [32.32, 131.45], // 北東（東米良・穂北）
]

export function MunicipalityMap({
  points,
  selectedArea,
  onSelectArea,
}: {
  points: MunicipalityMapPoint[]
  selectedArea: string | null
  onSelectArea: (area: string) => void
}) {
  return (
    <MapContainer
      center={[32.17, 131.34]}
zoom={10}
      bounds={MIYAZAKI_BOUNDS}
      boundsOptions={{ padding: [20, 20] }}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
      className="absolute inset-0 z-10 h-full w-full"
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {points.map((point) => (
        <Marker
          key={point.area}
          position={[point.lat, point.lng]}
          icon={createPinIcon(point.area, point.count, selectedArea === point.area)}
          alt={`${point.area}の活動を見る（${point.count}件）`}
          eventHandlers={{ click: () => onSelectArea(point.area) }}
        />
      ))}
    </MapContainer>
  )
}
