import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

const ORIGIN = [53.4597, -6.2181]; // Swords, Dublin, Ireland

function getCurvePoints(start, end, bendFactor = 0.2, numPoints = 50) {
  const points = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const latDiff = lat2 - lat1;
  const lngDiff = lng2 - lng1;
  const ctrlLat = midLat - lngDiff * bendFactor;
  const ctrlLng = midLng + latDiff * bendFactor;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const u = 1 - t;
    const ptLat = u * u * lat1 + 2 * u * t * ctrlLat + t * t * lat2;
    const ptLng = u * u * lng1 + 2 * u * t * ctrlLng + t * t * lng2;
    points.push([ptLat, ptLng]);
  }
  return points;
}

function hashCoordsFor(row) {
  let hash = 0;
  const hashStr = String(row.name || row.ticketRef);
  for (let i = 0; i < hashStr.length; i++) {
    hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return [42.0 + (Math.abs(hash % 160) / 10), -4.0 + (Math.abs((hash >> 2) % 300) / 10)];
}

function makeNodeIcon(variant) {
  return L.divIcon({
    className: '',
    html: `<div class="map-node map-node--${variant}"></div>`,
    iconSize: [9, 9],
  });
}

export default function CommandMap({ records, onSelectRow, focusTask }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const linesRef = useRef([]);
  const originSetRef = useRef(false);

  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, { zoomControl: false, attributionControl: false }).setView([50.0, 6.0], 4);
    // OpenStreetMap's own tile servers are keyless, have no per-network blocks,
    // and are run by the OSM Foundation rather than a commercial CDN, so this
    // project no longer depends on Carto (whose hosts started returning
    // "API key required" placeholders on some networks). The tiles are light by
    // default, so a CSS filter on the tile pane inverts them into a dark map
    // that matches the rest of this console. The provider list stays in place
    // so a second keyless source can be appended if OSM ever rate-limits us.
    const TILE_PROVIDERS = [
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ];
    let providerIdx = 0;
    const tileLayer = L.tileLayer(TILE_PROVIDERS[providerIdx], {
      maxZoom: 19,
      crossOrigin: true,
      attribution: '© OpenStreetMap',
    }).addTo(map);
    tileLayer.on('tileerror', () => {
      if (providerIdx >= TILE_PROVIDERS.length - 1) return;
      providerIdx += 1;
      tileLayer.setUrl(TILE_PROVIDERS[providerIdx]);
    });
    // Turn the light OSM tiles into a dark basemap.
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter =
        'invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.92) grayscale(0.28)';
    }
    mapRef.current = map;
    // StrictMode mounts effects twice in dev (mount -> cleanup -> mount), so
    // this must be cancellable: otherwise it fires after map.remove() and
    // Leaflet throws on the destroyed pane.
    const sizeTimer = setTimeout(() => map.invalidateSize(), 50);

    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      linesRef.current = [];
      originSetRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!originSetRef.current) {
      L.marker(ORIGIN, {
        icon: L.divIcon({
          className: '',
          html: '<div class="origin-reticle"><span></span></div>',
          iconSize: [22, 22],
        }),
      })
        .addTo(map)
        .bindPopup(
          '<div class="popup-head">Origin Node</div><div class="popup-body">SWORDS, DUBLIN<br/><span class="k">IE · DISPATCH HUB</span></div>'
        );
      originSetRef.current = true;
    }

    linesRef.current.forEach((line) => map.removeLayer(line));
    linesRef.current = [];

    const currentIds = new Set();

    records.forEach((row) => {
      let coords = row.coords;
      if (!coords || coords.length !== 2) coords = hashCoordsFor(row);
      currentIds.add(row.ticketRef);

      const outStatus = String(row.outboundStatus || '').toLowerCase();
      const retStatus = String(row.returnStatus || '').toLowerCase();
      const isMovingInbound = outStatus.includes('delivered') && row.returnTrk !== '-' && !retStatus.includes('delivered');
      const isError =
        outStatus.includes('🔴') || retStatus.includes('🔴') || retStatus.includes('throttled') || retStatus.includes('offline');
      const variant = isError ? 'error' : isMovingInbound ? 'inbound' : 'outbound';

      const popupHtml = `
        <div class="popup-head">${row.ticketRef} · ${String(row.carrier || '').toUpperCase()}</div>
        <div class="popup-body">
          <div><span class="k">OUTBOUND</span> ${row.outboundStatus || '—'}</div>
          <div><span class="k">RETURN&nbsp;&nbsp;</span> ${row.returnStatus || '—'}</div>
          <div><span class="k">CONSIGNEE</span> ${row.name || '—'}</div>
        </div>`;

      let marker = markersRef.current[row.ticketRef];
      if (marker) {
        marker.setLatLng(coords);
        marker.setIcon(makeNodeIcon(variant));
        marker.getPopup().setContent(popupHtml);
      } else {
        marker = L.marker(coords, { icon: makeNodeIcon(variant) }).addTo(map).bindPopup(popupHtml);
        markersRef.current[row.ticketRef] = marker;
      }

      marker.off('click');
      marker.on('click', () => onSelectRow(row, coords));

      const vectorLine = L.polyline(getCurvePoints(ORIGIN, coords), {
        className: isMovingInbound ? 'animated-polyline-inbound' : 'animated-polyline-outbound',
        weight: 1.5,
      }).addTo(map);
      linesRef.current.push(vectorLine);
    });

    Object.keys(markersRef.current).forEach((ticketRef) => {
      if (!currentIds.has(ticketRef)) {
        map.removeLayer(markersRef.current[ticketRef]);
        delete markersRef.current[ticketRef];
      }
    });
  }, [records, onSelectRow]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = focusTask && markersRef.current[focusTask];
    if (map && marker) {
      map.flyTo(marker.getLatLng(), 6, { animate: true, duration: 0.8 });
      marker.openPopup();
    }
  }, [focusTask]);

  return (
    <div className="absolute inset-0">
      <div ref={mapElRef} className="w-full h-full" />
      <div className="map-graticule" />
      <div className="map-vignette" />
      <div className="map-radar-overlay">
        <svg width="260" height="260" viewBox="0 0 260 260" style={{ opacity: 0.22 }}>
          <defs>
            <linearGradient id="sweepGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ff6b1a" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ff6b1a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="radar-sweep" style={{ transformOrigin: '130px 130px' }}>
            <path d="M 130 130 L 130 15 A 115 115 0 0 1 210 50 Z" fill="url(#sweepGrad)" />
          </g>
          <circle cx="130" cy="130" r="115" fill="none" stroke="#ff6b1a" strokeWidth="1" strokeOpacity="0.28" />
          <circle cx="130" cy="130" r="76" fill="none" stroke="#ff6b1a" strokeWidth="1" strokeOpacity="0.2" />
          <circle cx="130" cy="130" r="38" fill="none" stroke="#ff6b1a" strokeWidth="1" strokeOpacity="0.14" />
          <line x1="130" y1="10" x2="130" y2="250" stroke="#ff6b1a" strokeWidth="1" strokeOpacity="0.14" />
          <line x1="10" y1="130" x2="250" y2="130" stroke="#ff6b1a" strokeWidth="1" strokeOpacity="0.14" />
        </svg>
      </div>
    </div>
  );
}
