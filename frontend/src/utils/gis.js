/**
 * CivicPulse GIS Utility Module
 * 
 * Provides robust coordinate validation, extraction, and normalization
 * for Leaflet geospatial components across the CivicPulse frontend.
 */

export const DEFAULT_MAP_CENTER = [19.0760, 72.8800]; // Metro Civic Center

/**
 * Validates whether a latitude and longitude pair represents a valid geographic coordinate.
 * 
 * Rules:
 * - Latitude must be a finite number between -90 and 90 inclusive.
 * - Longitude must be a finite number between -180 and 180 inclusive.
 * - Rejects null, undefined, booleans, empty/whitespace strings, NaN, Infinity.
 * - Accepts numeric strings that parse to valid coordinates (e.g. "11.0168", "76.9558").
 * 
 * @param {any} lat Latitude value to validate
 * @param {any} lng Longitude value to validate
 * @returns {boolean} True if coordinates are valid geographic coordinates
 */
export function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }

  // Reject booleans (Number(true) === 1, Number(false) === 0)
  if (typeof lat === 'boolean' || typeof lng === 'boolean') {
    return false;
  }

  // Reject empty or whitespace-only strings
  if (typeof lat === 'string' && lat.trim() === '') {
    return false;
  }
  if (typeof lng === 'string' && lng.trim() === '') {
    return false;
  }

  const numLat = Number(lat);
  const numLng = Number(lng);

  if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
    return false;
  }

  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180;
}

/**
 * Ensures that the center position passed to Leaflet MapContainer is valid.
 * If the provided center is invalid or undefined, returns a safe default.
 * 
 * @param {any} center Array [lat, lng] or object with lat/lng
 * @param {[number, number]} fallback Fallback coordinate pair (default: Mumbai metro center)
 * @returns {[number, number]} Valid [lat, lng] coordinate pair
 */
export function ensureValidCenter(center, fallback = DEFAULT_MAP_CENTER) {
  if (Array.isArray(center) && center.length >= 2) {
    if (isValidCoordinate(center[0], center[1])) {
      return [Number(center[0]), Number(center[1])];
    }
  } else if (center && typeof center === 'object') {
    const lat = center.latitude ?? center.lat;
    const lng = center.longitude ?? center.lng ?? center.lon;
    if (isValidCoordinate(lat, lng)) {
      return [Number(lat), Number(lng)];
    }
  }

  return isValidCoordinate(fallback?.[0], fallback?.[1])
    ? [Number(fallback[0]), Number(fallback[1])]
    : [19.0760, 72.8800];
}

/**
 * Extracts and normalizes latitude and longitude from various API data shapes used in CivicPulse.
 * 
 * Supported schemas:
 * - { lat, lng } (e.g., /gov/heatmap/points)
 * - { latitude, longitude } (e.g., /gov/infrastructure-assets, /gov/priority-rankings)
 * - { centroid_lat, centroid_lon } (e.g., /gov/hotspots)
 * - { location: { latitude, longitude } } (e.g., WhatsApp intake)
 * - { coordinates: [lat, lng] } (e.g., /gov/recommendations)
 * - Cross-reference via fallbackLookup (e.g. matching asset_id in infrastructureAssets for predictive risk)
 * 
 * @param {object} item The data record
 * @param {Map<number|string, object>|object|null} fallbackLookup Optional lookup table or map
 * @returns {[number, number]|null} Normalized [lat, lng] or null if missing/invalid
 */
export function extractCoordinates(item, fallbackLookup = null) {
  if (!item || typeof item !== 'object') {
    return null;
  }

  let lat = undefined;
  let lng = undefined;

  // 1. Check direct properties
  if (item.latitude !== undefined && item.latitude !== null) {
    lat = item.latitude;
  } else if (item.lat !== undefined && item.lat !== null) {
    lat = item.lat;
  } else if (item.centroid_lat !== undefined && item.centroid_lat !== null) {
    lat = item.centroid_lat;
  }

  if (item.longitude !== undefined && item.longitude !== null) {
    lng = item.longitude;
  } else if (item.lng !== undefined && item.lng !== null) {
    lng = item.lng;
  } else if (item.centroid_lon !== undefined && item.centroid_lon !== null) {
    lng = item.centroid_lon;
  } else if (item.lon !== undefined && item.lon !== null) {
    lng = item.lon;
  }

  // 2. Check nested location object
  if ((lat === undefined || lng === undefined) && item.location && typeof item.location === 'object') {
    if (lat === undefined) lat = item.location.latitude ?? item.location.lat;
    if (lng === undefined) lng = item.location.longitude ?? item.location.lng ?? item.location.lon;
  }

  // 3. Check coordinates array
  if ((lat === undefined || lng === undefined) && Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
    if (lat === undefined) lat = item.coordinates[0];
    if (lng === undefined) lng = item.coordinates[1];
  }

  // 4. Check fallback cross-reference lookup (e.g., asset_id -> infrastructure asset)
  if ((lat === undefined || lng === undefined) && fallbackLookup) {
    const lookupKey = item.asset_id ?? item.infrastructure_id ?? item.id;
    if (lookupKey !== undefined && lookupKey !== null) {
      const referencedAsset = fallbackLookup instanceof Map
        ? fallbackLookup.get(lookupKey)
        : fallbackLookup[lookupKey];

      if (referencedAsset && typeof referencedAsset === 'object') {
        if (lat === undefined) lat = referencedAsset.latitude ?? referencedAsset.lat;
        if (lng === undefined) lng = referencedAsset.longitude ?? referencedAsset.lng ?? referencedAsset.lon;
      }
    }
  }

  if (isValidCoordinate(lat, lng)) {
    return [Number(lat), Number(lng)];
  }

  return null;
}

/**
 * Filters an array of GIS records, discarding records with missing or invalid coordinates.
 * Each valid item is augmented with an immutable `_coords` property containing [lat, lng].
 * 
 * @template T
 * @param {T[]} items List of data items to filter
 * @param {Map<number|string, object>|object|null} fallbackLookup Optional lookup table for resolution
 * @param {function(number, number): void} [onReport] Optional callback reporting (validCount, skippedCount)
 * @returns {Array<T & { _coords: [number, number] }>} Filtered list of valid GIS items
 */
export function filterValidGisItems(items, fallbackLookup = null, onReport = null) {
  if (!Array.isArray(items)) {
    return [];
  }

  const validItems = [];
  let skippedCount = 0;

  for (const item of items) {
    const coords = extractCoordinates(item, fallbackLookup);
    if (coords) {
      validItems.push({
        ...item,
        _coords: coords,
        // Also populate normalized properties for backwards compatibility
        latitude: coords[0],
        longitude: coords[1],
        lat: coords[0],
        lng: coords[1],
      });
    } else {
      skippedCount++;
    }
  }

  if (onReport && typeof onReport === 'function') {
    onReport(validItems.length, skippedCount);
  }

  return validItems;
}
