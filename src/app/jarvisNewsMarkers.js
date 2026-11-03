/**
 * Read-only, origin-scoped Jarvis RSS overlay.
 * Coordinates are either explicitly published by a feed or geocoded CITY
 * CENTROIDS. Neither marker claims the user's GPS is the incident location.
 * Independent of shared annotations, view changes, and other live layers.
 */
import * as Cesium from 'cesium';

const JARVIS_ORIGIN = 'https://jarvis.bot-coin.com';
const MAX_NEWS = 25;
export const NEWS_MARKER_MESSAGE = 'gev:news-markers';

const limited = (value, max) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';

export function normalizeNewsMarkers(input) {
  if (!Array.isArray(input)) return [];
  const result = [];
  for (const item of input.slice(0, MAX_NEWS)) {
    if (!item || typeof item !== 'object') continue;
    const lat = item.lat, lon = item.lon;
    if (typeof lat !== 'number' || !Number.isFinite(lat) || lat < -90 || lat > 90 ||
        typeof lon !== 'number' || !Number.isFinite(lon) || lon < -180 || lon > 180) continue;
    let url;
    try {
      const candidate = new URL(item.url);
      if (candidate.protocol !== 'https:' || candidate.username || candidate.password ||
          candidate.port || !candidate.hostname.includes('.')) continue;
      url = candidate.href.slice(0, 1600);
    } catch { continue; }
    const title = limited(item.title, 180);
    if (!title) continue;
    result.push({
      id: limited(item.id, 140) || String(result.length),
      lat, lon, url, title, source: limited(item.source, 80),
      publishedAt: limited(item.publishedAt, 35),
      precision: item.precision === 'feed' ? 'feed' : 'city',
      locationLabel: limited(item.locationLabel, 180),
      count: Number.isInteger(item.count) ? Math.max(1, Math.min(99, item.count)) : 1,
    });
  }
  return result;
}

export function installJarvisNewsMarkers(viewer, { windowRef = globalThis.window } = {}) {
  const dataSource = new Cesium.CustomDataSource('jarvis-geolocated-rss-news');
  viewer.dataSources.add(dataSource);
  const container = viewer.container || viewer.scene.canvas.parentElement;
  const tooltip = windowRef.document.createElement('div');
  tooltip.className = 'jarvis-news-tooltip';
  tooltip.setAttribute('role', 'tooltip');
  Object.assign(tooltip.style, {
    position: 'absolute', zIndex: '40', pointerEvents: 'none',
    display: 'none', maxWidth: '285px', padding: '10px 12px',
    background: 'rgba(10,19,33,.95)', color: '#f4f8ff',
    border: '1px solid rgba(125,206,255,.55)', borderRadius: '9px',
    boxShadow: '0 10px 30px rgba(0,0,0,.45)',
    font: '12px/1.4 system-ui,sans-serif',
  });
  const title = windowRef.document.createElement('strong');
  const meta = windowRef.document.createElement('div');
  const place = windowRef.document.createElement('div');
  meta.style.opacity = '.8';
  place.style.opacity = '.85';
  place.style.marginTop = '5px';
  tooltip.append(title, meta, place);
  container.appendChild(tooltip);
  const lookup = new Map();
  const canvas = viewer.scene.canvas;

  function set(items) {
    dataSource.entities.removeAll();
    lookup.clear();
    tooltip.style.display = 'none';
    for (const item of normalizeNewsMarkers(items)) {
      const entity = dataSource.entities.add({
        id: 'jarvis-rss-' + item.id + '-' + lookup.size,
        name: item.title,
        position: Cesium.Cartesian3.fromDegrees(item.lon, item.lat, 25),
        point: {
          pixelSize: item.precision === 'feed' ? 13 : 11,
          color: Cesium.Color.fromCssColorString(item.precision === 'feed' ? '#4be3ff' : '#ffcd73'),
          outlineColor: Cesium.Color.fromCssColorString('#091321'),
          outlineWidth: 3,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: '📰' + (item.count > 1 ? ' ' + item.count : ''),
          font: '14px sans-serif',
          showBackground: true,
          backgroundColor: Cesium.Color.fromCssColorString('#142338').withAlpha(.88),
          pixelOffset: new Cesium.Cartesian2(0, -24),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 800000),
        },
      });
      lookup.set(entity.id, item);
    }
    viewer.scene.requestRender?.();
  }

  function pick(event) {
    const r = canvas.getBoundingClientRect();
    const x = event.clientX - r.left, y = event.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return { item: null, x, y };
    const p = viewer.scene.pick(new Cesium.Cartesian2(x, y));
    return { item: lookup.get(p?.id?.id) || null, x, y };
  }
  const onMove = (event) => {
    const { item, x, y } = pick(event);
    if (!item) { tooltip.style.display = 'none'; canvas.style.cursor = ''; return; }
    title.textContent = item.title;
    meta.textContent = [item.source, item.count > 1 ? item.count + ' Meldungen' : '',
      item.precision === 'feed' ? 'RSS-Koordinate' : 'Ungefähr'].filter(Boolean).join(' · ');
    place.textContent = item.locationLabel || 'Ortsbezug aus der Nachrichtenquelle';
    const r = container.getBoundingClientRect();
    const c = canvas.getBoundingClientRect();
    tooltip.style.left = Math.max(6, Math.min(r.width - 295, x + c.left - r.left + 14)) + 'px';
    tooltip.style.top = Math.max(6, Math.min(r.height - 118, y + c.top - r.top + 14)) + 'px';
    tooltip.style.display = 'block';
    canvas.style.cursor = 'pointer';
  };
  const onClick = (event) => {
    const { item } = pick(event);
    if (item) windowRef.open(item.url, '_blank', 'noopener,noreferrer');
  };
  const onLeave = () => { tooltip.style.display = 'none'; canvas.style.cursor = ''; };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('pointerleave', onLeave);
  return {
    set,
    destroy() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('pointerleave', onLeave);
      tooltip.remove();
      viewer.dataSources.remove(dataSource, true);
    },
  };
}

export function acceptsJarvisNewsMessage(event, peer) {
  return event?.source === peer && event?.origin === JARVIS_ORIGIN &&
    event?.data?.type === NEWS_MARKER_MESSAGE;
}
