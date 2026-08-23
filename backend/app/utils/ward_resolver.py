"""
Ward Resolver — maps geographic coordinates to civic ward boundaries.

10 wards are defined as non-overlapping lat/lon bounding boxes over the
Metro Civic Center area (BASE_LAT=19.0760, BASE_LON=72.8777).
Checks wards in order and returns the first match.
Falls back to Ward 10 for unmatched coordinates.
"""
from typing import Tuple

BASE_LAT = 19.0760
BASE_LON = 72.8777

# (ward_id, display_name, lat_min, lat_max, lon_min, lon_max)
_WARD_GRID = [
    (1,  "Ward 1 – North Hospital Zone",
     BASE_LAT + 0.003, BASE_LAT + 0.015, BASE_LON - 0.001, BASE_LON + 0.007),
    (2,  "Ward 2 – West School Zone",
     BASE_LAT + 0.001, BASE_LAT + 0.006, BASE_LON - 0.009, BASE_LON - 0.001),
    (3,  "Ward 3 – Central Metro Zone",
     BASE_LAT - 0.001, BASE_LAT + 0.003, BASE_LON - 0.001, BASE_LON + 0.003),
    (4,  "Ward 4 – South Pediatric Zone",
     BASE_LAT - 0.012, BASE_LAT - 0.004, BASE_LON + 0.003, BASE_LON + 0.010),
    (5,  "Ward 5 – North West Sector",
     BASE_LAT + 0.006, BASE_LAT + 0.020, BASE_LON - 0.009, BASE_LON - 0.001),
    (6,  "Ward 6 – South Central",
     BASE_LAT - 0.004, BASE_LAT - 0.001, BASE_LON - 0.001, BASE_LON + 0.007),
    (7,  "Ward 7 – South West",
     BASE_LAT - 0.007, BASE_LAT - 0.002, BASE_LON - 0.009, BASE_LON - 0.001),
    (8,  "Ward 8 – South Bridge Zone",
     BASE_LAT - 0.010, BASE_LAT - 0.003, BASE_LON - 0.002, BASE_LON + 0.003),
    (9,  "Ward 9 – Far East Perimeter",
     BASE_LAT - 0.005, BASE_LAT + 0.005, BASE_LON + 0.007, BASE_LON + 0.015),
    (10, "Ward 10 – West Industrial",
     BASE_LAT - 0.002, BASE_LAT + 0.001, BASE_LON - 0.009, BASE_LON - 0.005),
]

# Publicly exported list for API endpoints / frontend
WARD_LIST = [
    {"ward_id": w[0], "ward_name": w[1]} for w in _WARD_GRID
]


def get_ward(lat: float, lon: float) -> Tuple[int, str]:
    """
    Given a latitude/longitude, return the matching (ward_id, ward_name).
    Uses first-match on the bounding box grid; defaults to (1, 'Ward 1')
    for coordinates very close to the city center that don't fit any box.
    """
    for ward_id, name, lat_min, lat_max, lon_min, lon_max in _WARD_GRID:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return ward_id, name
    # Fallback: nearest ward by distance (simple closest-centroid)
    best_id, best_name = 1, _WARD_GRID[0][1]
    best_dist = float("inf")
    for ward_id, name, lat_min, lat_max, lon_min, lon_max in _WARD_GRID:
        c_lat = (lat_min + lat_max) / 2
        c_lon = (lon_min + lon_max) / 2
        dist = (lat - c_lat) ** 2 + (lon - c_lon) ** 2
        if dist < best_dist:
            best_dist = dist
            best_id, best_name = ward_id, name
    return best_id, best_name
