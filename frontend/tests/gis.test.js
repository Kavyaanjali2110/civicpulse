import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCoordinate,
  ensureValidCenter,
  extractCoordinates,
  filterValidGisItems,
  DEFAULT_MAP_CENTER,
} from '../src/utils/gis.js';

describe('GIS Coordinate Validation (isValidCoordinate)', () => {
  it('accepts valid floating point latitude and longitude', () => {
    assert.equal(isValidCoordinate(19.0760, 72.8800), true);
    assert.equal(isValidCoordinate(-33.8688, 151.2093), true);
    assert.equal(isValidCoordinate(0, 0), true);
    assert.equal(isValidCoordinate(90, 180), true);
    assert.equal(isValidCoordinate(-90, -180), true);
  });

  it('accepts valid numeric string coordinates', () => {
    assert.equal(isValidCoordinate("11.0168", "76.9558"), true);
    assert.equal(isValidCoordinate("19.0760", "72.8800"), true);
    assert.equal(isValidCoordinate("-12.34", "45.67"), true);
  });

  it('rejects undefined latitude', () => {
    assert.equal(isValidCoordinate(undefined, 72.8800), false);
    assert.equal(isValidCoordinate(undefined, undefined), false);
  });

  it('rejects undefined longitude', () => {
    assert.equal(isValidCoordinate(19.0760, undefined), false);
  });

  it('rejects null coordinates', () => {
    assert.equal(isValidCoordinate(null, 72.8800), false);
    assert.equal(isValidCoordinate(19.0760, null), false);
    assert.equal(isValidCoordinate(null, null), false);
  });

  it('rejects out-of-range latitude (> 90 or < -90)', () => {
    assert.equal(isValidCoordinate(90.0001, 72.8800), false);
    assert.equal(isValidCoordinate(-90.0001, 72.8800), false);
    assert.equal(isValidCoordinate(120.0, 72.8800), false);
    assert.equal(isValidCoordinate(-150.0, 72.8800), false);
  });

  it('rejects out-of-range longitude (> 180 or < -180)', () => {
    assert.equal(isValidCoordinate(19.0760, 180.0001), false);
    assert.equal(isValidCoordinate(19.0760, -180.0001), false);
    assert.equal(isValidCoordinate(19.0760, 200.0), false);
    assert.equal(isValidCoordinate(19.0760, -360.0), false);
  });

  it('rejects non-numeric strings, empty strings, and booleans', () => {
    assert.equal(isValidCoordinate("", ""), false);
    assert.equal(isValidCoordinate("   ", "72.88"), false);
    assert.equal(isValidCoordinate("abc", "def"), false);
    assert.equal(isValidCoordinate(true, false), false);
    assert.equal(isValidCoordinate(NaN, 72.88), false);
    assert.equal(isValidCoordinate(Infinity, 72.88), false);
  });
});

describe('Map Center Protection (ensureValidCenter)', () => {
  it('returns valid coordinate pair as numbers when given valid center array', () => {
    const center = [19.0760, 72.8800];
    assert.deepEqual(ensureValidCenter(center), [19.0760, 72.8800]);
  });

  it('parses valid numeric string center coordinates', () => {
    const center = ["11.0168", "76.9558"];
    assert.deepEqual(ensureValidCenter(center), [11.0168, 76.9558]);
  });

  it('falls back to safe default center when center contains undefined', () => {
    assert.deepEqual(ensureValidCenter([undefined, undefined]), DEFAULT_MAP_CENTER);
    assert.deepEqual(ensureValidCenter([undefined, 72.88]), DEFAULT_MAP_CENTER);
    assert.deepEqual(ensureValidCenter([19.076, undefined]), DEFAULT_MAP_CENTER);
  });

  it('falls back to safe default center when center contains null', () => {
    assert.deepEqual(ensureValidCenter([null, null]), DEFAULT_MAP_CENTER);
    assert.deepEqual(ensureValidCenter(null), DEFAULT_MAP_CENTER);
    assert.deepEqual(ensureValidCenter(undefined), DEFAULT_MAP_CENTER);
  });

  it('falls back to safe default center when center contains out-of-range coordinates', () => {
    assert.deepEqual(ensureValidCenter([999, 999]), DEFAULT_MAP_CENTER);
    assert.deepEqual(ensureValidCenter([-100, 50]), DEFAULT_MAP_CENTER);
  });

  it('accepts object center formats {lat, lng} or {latitude, longitude}', () => {
    assert.deepEqual(ensureValidCenter({ lat: 19.076, lng: 72.88 }), [19.076, 72.88]);
    assert.deepEqual(ensureValidCenter({ latitude: 19.076, longitude: 72.88 }), [19.076, 72.88]);
    assert.deepEqual(ensureValidCenter({ lat: null, lng: undefined }), DEFAULT_MAP_CENTER);
  });
});

describe('Coordinate Extraction & Normalization (extractCoordinates)', () => {
  it('extracts from {lat, lng} (Heatmap points)', () => {
    const item = { lat: 19.081, lng: 72.885, title: 'Heatmap item' };
    assert.deepEqual(extractCoordinates(item), [19.081, 72.885]);
  });

  it('extracts from {latitude, longitude} (Assets, Complaints)', () => {
    const item = { latitude: 19.082, longitude: 72.886, name: 'General Hospital' };
    assert.deepEqual(extractCoordinates(item), [19.082, 72.886]);
  });

  it('extracts from {centroid_lat, centroid_lon} (DBSCAN Hotspots)', () => {
    const item = { centroid_lat: 19.083, centroid_lon: 72.887, cluster_code: 'CL-01' };
    assert.deepEqual(extractCoordinates(item), [19.083, 72.887]);
  });

  it('extracts from nested {location: {latitude, longitude}} (WhatsApp webhook)', () => {
    const item = { location: { latitude: 19.084, longitude: 72.888 }, message: 'Pothole' };
    assert.deepEqual(extractCoordinates(item), [19.084, 72.888]);
  });

  it('extracts from array {coordinates: [lat, lng]} (Recommendations)', () => {
    const item = { coordinates: [19.085, 72.889], title: 'Action Plan' };
    assert.deepEqual(extractCoordinates(item), [19.085, 72.889]);
  });

  it('resolves coordinates via fallbackLookup for predictive risk items missing coordinates', () => {
    const assetLookup = new Map([
      [101, { id: 101, name: 'Water Tanker Point', latitude: 19.090, longitude: 72.890 }],
      [102, { id: 102, name: 'Substation Alpha', latitude: 19.095, longitude: 72.895 }],
    ]);

    const riskItem = {
      asset_id: 101,
      asset_name: 'Water Tanker Point',
      health_score: 42.0,
      predictions: { '30_days': { risk_level: 'CRITICAL', risk_percentage: 85 } },
    };

    assert.deepEqual(extractCoordinates(riskItem, assetLookup), [19.090, 72.890]);
  });

  it('returns null when record has no coordinates and no match in fallbackLookup', () => {
    const assetLookup = new Map();
    const riskItem = { asset_id: 999, asset_name: 'Unknown Asset' };
    assert.equal(extractCoordinates(riskItem, assetLookup), null);
    assert.equal(extractCoordinates({}), null);
    assert.equal(extractCoordinates(null), null);
  });
});

describe('Mixed Dataset GIS Filtering (filterValidGisItems)', () => {
  it('filters out invalid and missing records without crashing and retains valid records', () => {
    const mixedRecords = [
      { id: 1, name: 'Valid Hospital', latitude: 19.0760, longitude: 72.8800 },
      { id: 2, name: 'Missing Lat', latitude: undefined, longitude: 72.8800 },
      { id: 3, name: 'Missing Lng', latitude: 19.0760, longitude: undefined },
      { id: 4, name: 'Null Coords (SMS)', latitude: null, longitude: null },
      { id: 5, name: 'Valid School', latitude: "19.0850", longitude: "72.8900" },
      { id: 6, name: 'Out of range lat', latitude: 150.0, longitude: 72.8800 },
      { id: 7, name: 'Out of range lng', latitude: 19.0760, longitude: 250.0 },
      { id: 8, name: 'Valid Transit Hub', lat: 19.0720, lng: 72.8750 },
    ];

    let validCount = 0;
    let skippedCount = 0;

    const result = filterValidGisItems(mixedRecords, null, (v, s) => {
      validCount = v;
      skippedCount = s;
    });

    // Valid records: id 1, 5, 8 (3 valid)
    // Skipped records: id 2, 3, 4, 6, 7 (5 skipped)
    assert.equal(result.length, 3);
    assert.equal(validCount, 3);
    assert.equal(skippedCount, 5);

    assert.deepEqual(result.map((r) => r.id), [1, 5, 8]);
    assert.deepEqual(result[0]._coords, [19.0760, 72.8800]);
    assert.deepEqual(result[1]._coords, [19.0850, 72.8900]);
    assert.deepEqual(result[2]._coords, [19.0720, 72.8750]);
  });

  it('handles empty arrays and null inputs gracefully', () => {
    assert.deepEqual(filterValidGisItems([]), []);
    assert.deepEqual(filterValidGisItems(null), []);
    assert.deepEqual(filterValidGisItems(undefined), []);
  });

  it('successfully cross-references and normalizes predictive risk items with infrastructure assets', () => {
    const infraAssets = [
      { id: 1, name: 'Hospital A', latitude: 19.081, longitude: 72.881 },
      { id: 2, name: 'School B', latitude: 19.082, longitude: 72.882 },
      { id: 3, name: 'Defective Asset without GPS', latitude: null, longitude: null },
    ];

    const infraMap = new Map(infraAssets.map((a) => [a.id, a]));

    const riskItems = [
      { asset_id: 1, asset_name: 'Hospital A', health_score: 30 },
      { asset_id: 2, asset_name: 'School B', health_score: 55 },
      { asset_id: 3, asset_name: 'Defective Asset', health_score: 20 },
      { asset_id: 99, asset_name: 'Unmapped Asset', health_score: 80 },
    ];

    const result = filterValidGisItems(riskItems, infraMap);

    assert.equal(result.length, 2);
    assert.equal(result[0].asset_id, 1);
    assert.deepEqual(result[0]._coords, [19.081, 72.881]);
    assert.equal(result[1].asset_id, 2);
    assert.deepEqual(result[1]._coords, [19.082, 72.882]);
  });
});
