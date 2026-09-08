from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.infrastructure import InfrastructureAsset
from app.models.hotspot import HotspotCluster
from app.models.complaint import Complaint
from app.models.audit import AuditLog
from app.models.department import Department
from app.models.field_crew import FieldCrew
from app.models.crew_assignment import CrewAssignment
from app.models.resolution_evidence import ResolutionEvidence
from app.models.citizen_feedback import CitizenFeedback
from app.models.preventive_maintenance import PreventiveMaintenanceOrder
from app.models.notification import Notification
from app.utils.ward_resolver import get_ward

# Metropolitan Center Base Coordinates (Metro Civic Center)
BASE_LAT = 19.0760
BASE_LON = 72.8777

CATEGORIES_SEED = [
    {
        "code": "ROADS",
        "name": "Roads & Potholes",
        "description": "Potholes, damaged tarmac, missing signage, dangerous road cave-ins, and speed breaker repairs.",
        "default_sla_hours": 36,
        "criticality_weight": 1.4,
        "icon": "traffic-cone"
    },
    {
        "code": "WATER",
        "name": "Water Supply & Leakage",
        "description": "Main pipeline bursts, low pressure, water contamination, unmetered leakages, and broken valves.",
        "default_sla_hours": 24,
        "criticality_weight": 1.8,
        "icon": "droplet"
    },
    {
        "code": "WASTE",
        "name": "Waste Management & Garbage",
        "description": "Garbage dump overflows, uncollected residential waste, illegal dumping, and hazardous littering.",
        "default_sla_hours": 48,
        "criticality_weight": 1.1,
        "icon": "trash-2"
    },
    {
        "code": "ELECTRICITY",
        "name": "Electrical & Street Lighting",
        "description": "Exposed sparking cables, dark streets, streetlight faults, transformer sparks, and power surges.",
        "default_sla_hours": 18,
        "criticality_weight": 1.9,
        "icon": "zap"
    },
    {
        "code": "SEWAGE",
        "name": "Sewage & Drainage",
        "description": "Blocked sewers, overflowing manholes, open drains, monsoon waterlogging, and toxic backflows.",
        "default_sla_hours": 24,
        "criticality_weight": 1.7,
        "icon": "waves"
    },
    {
        "code": "SAFETY",
        "name": "Public Safety & Traffic",
        "description": "Broken footpaths, non-functioning traffic signals, structural hazards, and fallen trees.",
        "default_sla_hours": 12,
        "criticality_weight": 2.0,
        "icon": "shield-alert"
    }
]

INFRASTRUCTURE_ASSETS_SEED = [
    {
        "name": "City Memorial Hospital",
        "asset_type": "HOSPITAL",
        "latitude": BASE_LAT + 0.0052,
        "longitude": BASE_LON + 0.0034,
        "impact_radius_meters": 600.0,
        "vulnerability_weight": 2.8,
        "description": "Primary Level-1 trauma care hospital with 24/7 ambulance emergency route.",
        "department_name": "Public Safety & Traffic Control",
        "installation_year": 2012,
        "last_maintenance_days_ago": 110,
        "last_inspection_days_ago": 25,
        "expected_lifespan_years": 40
    },
    {
        "name": "St. Jude Children's Medical Center",
        "asset_type": "HOSPITAL",
        "latitude": BASE_LAT - 0.0084,
        "longitude": BASE_LON + 0.0062,
        "impact_radius_meters": 500.0,
        "vulnerability_weight": 2.5,
        "description": "Pediatric specialized hospital and maternity clinic.",
        "department_name": "Public Safety & Traffic Control",
        "installation_year": 2016,
        "last_maintenance_days_ago": 90,
        "last_inspection_days_ago": 30,
        "expected_lifespan_years": 35
    },
    {
        "name": "Central Government High School",
        "asset_type": "SCHOOL",
        "latitude": BASE_LAT + 0.0028,
        "longitude": BASE_LON - 0.0041,
        "impact_radius_meters": 400.0,
        "vulnerability_weight": 2.2,
        "description": "Public school serving 2,500 daily students with heavy morning pedestrian traffic.",
        "department_name": "Public Safety & Traffic Control",
        "installation_year": 2014,
        "last_maintenance_days_ago": 75,
        "last_inspection_days_ago": 20,
        "expected_lifespan_years": 30
    },
    {
        "name": "Greenwood Public School",
        "asset_type": "SCHOOL",
        "latitude": BASE_LAT - 0.0045,
        "longitude": BASE_LON - 0.0055,
        "impact_radius_meters": 350.0,
        "vulnerability_weight": 2.0,
        "description": "Elementary and middle school zone.",
        "department_name": "Public Safety & Traffic Control",
        "installation_year": 2019,
        "last_maintenance_days_ago": 45,
        "last_inspection_days_ago": 15,
        "expected_lifespan_years": 30
    },
    {
        "name": "Central Water Distribution Reservoir",
        "asset_type": "WATER_FACILITY",
        "latitude": BASE_LAT + 0.0112,
        "longitude": BASE_LON + 0.0018,
        "impact_radius_meters": 750.0,
        "vulnerability_weight": 2.6,
        "description": "Municipal drinking water storage hub supplying North and Central sectors.",
        "department_name": "Water Supply & Drainage",
        "installation_year": 2010,
        "last_maintenance_days_ago": 160,
        "last_inspection_days_ago": 40,
        "expected_lifespan_years": 25
    },
    {
        "name": "Metro Transit Interchange Station",
        "asset_type": "TRANSIT_HUB",
        "latitude": BASE_LAT + 0.0004,
        "longitude": BASE_LON + 0.0008,
        "impact_radius_meters": 500.0,
        "vulnerability_weight": 2.4,
        "description": "Central metro rail and regional bus rapid transit terminal (85k daily commuters).",
        "department_name": "Roads & Infrastructure",
        "installation_year": 2018,
        "last_maintenance_days_ago": 60,
        "last_inspection_days_ago": 20,
        "expected_lifespan_years": 30
    },
    {
        "name": "North Grid Power Substation",
        "asset_type": "POWER_STATION",
        "latitude": BASE_LAT + 0.0089,
        "longitude": BASE_LON - 0.0072,
        "impact_radius_meters": 600.0,
        "vulnerability_weight": 2.7,
        "description": "High voltage transformer substation feeding commercial and residential zones.",
        "department_name": "Electrical & Power Grid",
        "installation_year": 2011,
        "last_maintenance_days_ago": 240,
        "last_inspection_days_ago": 70,
        "expected_lifespan_years": 25
    },
    {
        "name": "Railway Overpass Flyover Bridge",
        "asset_type": "BRIDGE",
        "latitude": BASE_LAT - 0.0062,
        "longitude": BASE_LON + 0.0011,
        "impact_radius_meters": 450.0,
        "vulnerability_weight": 2.3,
        "description": "Arterial four-lane vehicular overpass over central railway lines.",
        "department_name": "Roads & Infrastructure",
        "installation_year": 2009,
        "last_maintenance_days_ago": 210,
        "last_inspection_days_ago": 60,
        "expected_lifespan_years": 40
    },
    {
        "name": "Water Treatment Station WT-04",
        "asset_type": "WATER_FACILITY",
        "latitude": BASE_LAT + 0.0055,
        "longitude": BASE_LON + 0.0031,
        "impact_radius_meters": 650.0,
        "vulnerability_weight": 2.9,
        "description": "High-capacity municipal secondary water treatment filtration and pumping terminal supplying Ward 4.",
        "department_name": "Water Supply & Drainage",
        "installation_year": 2013,
        "last_maintenance_days_ago": 290,
        "last_inspection_days_ago": 95,
        "expected_lifespan_years": 20
    },
    {
        "name": "South Sector Transformer T-17",
        "asset_type": "POWER_STATION",
        "latitude": BASE_LAT + 0.0031,
        "longitude": BASE_LON - 0.0043,
        "impact_radius_meters": 450.0,
        "vulnerability_weight": 2.8,
        "description": "33kV step-down distribution transformer serving commercial streetlights and schools in Ward 2.",
        "department_name": "Electrical & Power Grid",
        "installation_year": 2012,
        "last_maintenance_days_ago": 265,
        "last_inspection_days_ago": 80,
        "expected_lifespan_years": 20
    }
]

HOTSPOT_CLUSTERS_SEED = [
    {
        "cluster_code": "HS-NORTH-WATER-01",
        "category_code": "WATER",
        "centroid_lat": BASE_LAT + 0.0056,
        "centroid_lon": BASE_LON + 0.0031,
        "radius_meters": 220.0,
        "complaint_count": 6,
        "avg_severity": 0.88,
        "aggregate_priority_score": 92.4,
        "status": "ACTIVE",
        "ai_summary": "Major pipeline rupture detected 110m from City Memorial Hospital. Water gushing onto ambulance corridor with localized flooding.",
        "ai_recommendation": "URGENT: Deploy Emergency Valve Squad to isolate Sector 3 pipeline valve. Coordinate with Traffic Police for hospital emergency lane diversion."
    },
    {
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "category_code": "ELECTRICITY",
        "centroid_lat": BASE_LAT + 0.0029,
        "centroid_lon": BASE_LON - 0.0044,
        "radius_meters": 180.0,
        "complaint_count": 5,
        "avg_severity": 0.82,
        "aggregate_priority_score": 87.1,
        "status": "ACTIVE",
        "ai_summary": "Multiple overhead electrical cables snapped and sparking on pavement directly adjacent to Central Government High School main gate.",
        "ai_recommendation": "HIGH PRIORITY: Shut down feeder line 4B immediately. Dispatch line repairs team before morning school opening."
    },
    {
        "cluster_code": "HS-CENTRAL-ROADS-03",
        "category_code": "ROADS",
        "centroid_lat": BASE_LAT + 0.0006,
        "centroid_lon": BASE_LON + 0.0010,
        "radius_meters": 250.0,
        "complaint_count": 8,
        "avg_severity": 0.68,
        "aggregate_priority_score": 79.5,
        "status": "ACTIVE",
        "ai_summary": "Cluster of deep potholes on Metro Interchange bus loop causing heavy traffic jams and vehicle axle damage.",
        "ai_recommendation": "Schedule rapid cold-mix asphalt resurfacing during 11 PM - 4 AM maintenance window."
    },
    {
        "cluster_code": "HS-SOUTH-SEWAGE-04",
        "category_code": "SEWAGE",
        "centroid_lat": BASE_LAT - 0.0081,
        "centroid_lon": BASE_LON + 0.0059,
        "radius_meters": 200.0,
        "complaint_count": 4,
        "avg_severity": 0.74,
        "aggregate_priority_score": 81.3,
        "status": "ACTIVE",
        "ai_summary": "Sewage overflow and open manhole chamber 80m from St. Jude Children's Medical Center emitting toxic odor.",
        "ai_recommendation": "Deploy high-pressure jetting vacuum tanker to clear subterranean main block. Secure open chamber with heavy-duty cast iron lid."
    }
]

COMPLAINTS_SEED = [
    # Cluster 1: Water Main Near Hospital (High Priority)
    {
        "tracking_id": "CP-2026-W101",
        "citizen_name": "Dr. Rajesh Sharma",
        "citizen_contact": "+91-98201-11223",
        "source_channel": "WHATSAPP",
        "external_message_id": "WA-9101",
        "raw_text": "City Hospital road pe bada water pipe phat gaya hai, pani hospital ke gate ke andar ghus raha hai aur ambulance aane me problem ho rahi hai.",
        "detected_language": "hi",
        "translated_text": "A major water pipe has burst on City Hospital road, water is entering the hospital gate and causing severe obstruction for incoming ambulances.",
        "latitude": BASE_LAT + 0.0054,
        "longitude": BASE_LON + 0.0032,
        "address": "Opposite City Memorial Hospital Gate 2, Main Avenue",
        "category_code": "WATER",
        "subcategory": "Main Pipeline Burst",
        "severity_score": 0.94,
        "severity_level": "CRITICAL",
        "priority_score": 95.5,
        "status": "RECEIVED",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 3
    },
    {
        "tracking_id": "CP-2026-W102",
        "citizen_name": "Sunita Patil",
        "citizen_contact": "+91-98700-44551",
        "source_channel": "WHATSAPP",
        "external_message_id": "WA-9102",
        "raw_text": "हॉस्पिटल समोरील मुख्य रस्त्यावर पाण्याचा पाईप फुटून लाखो लिटर पाणी वाया जात आहे आणि रस्ता खचला आहे.",
        "detected_language": "mr",
        "translated_text": "Water pipe burst on the main road in front of the hospital, wasting thousands of liters of water and causing road subsidence.",
        "latitude": BASE_LAT + 0.0057,
        "longitude": BASE_LON + 0.0030,
        "address": "Hospital Road Junction, Sector 3",
        "category_code": "WATER",
        "subcategory": "Pipeline Leak",
        "severity_score": 0.88,
        "severity_level": "CRITICAL",
        "priority_score": 91.2,
        "status": "INVESTIGATING",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 5
    },
    {
        "tracking_id": "CP-2026-W103",
        "citizen_name": "Arun Verma",
        "citizen_contact": "+91-91234-56789",
        "source_channel": "SMS",
        "external_message_id": "SMS-9103",
        "raw_text": "Drinking water supply has completely stopped in our block due to the main road pipeline burst near Memorial Hospital.",
        "detected_language": "en",
        "translated_text": "Drinking water supply has completely stopped in our block due to the main road pipeline burst near Memorial Hospital.",
        "latitude": BASE_LAT + 0.0055,
        "longitude": BASE_LON + 0.0035,
        "address": "Block B-4, Near City Hospital Staff Quarters",
        "category_code": "WATER",
        "subcategory": "Supply Outage",
        "severity_score": 0.82,
        "severity_level": "HIGH",
        "priority_score": 88.0,
        "status": "INVESTIGATING",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 6
    },
    {
        "tracking_id": "CP-2026-W104",
        "citizen_name": "Carlos Gomez",
        "citizen_contact": "+1-555-0192",
        "source_channel": "SMS",
        "external_message_id": "SMS-9104",
        "raw_text": "Fuga masiva de agua en la avenida principal inundando la calle frente al hospital.",
        "detected_language": "es",
        "translated_text": "Massive water leak on the main avenue flooding the street in front of the hospital.",
        "latitude": BASE_LAT + 0.0056,
        "longitude": BASE_LON + 0.0029,
        "address": "Corner of 4th Street & Hospital Avenue",
        "category_code": "WATER",
        "subcategory": "Street Flooding",
        "severity_score": 0.86,
        "severity_level": "CRITICAL",
        "priority_score": 90.5,
        "status": "RECEIVED",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 2
    },
    {
        "tracking_id": "CP-2026-W105",
        "citizen_name": "Priya Nair",
        "citizen_contact": "+91-98450-99881",
        "source_channel": "WEBHOOK",
        "external_message_id": "EXT-9105",
        "raw_text": "Water gushing with high pressure near hospital entrance, creating huge crater in the road.",
        "detected_language": "en",
        "translated_text": "Water gushing with high pressure near hospital entrance, creating huge crater in the road.",
        "latitude": BASE_LAT + 0.0058,
        "longitude": BASE_LON + 0.0033,
        "address": "Main Gate 1, Memorial Hospital",
        "category_code": "WATER",
        "subcategory": "Main Pipeline Burst",
        "severity_score": 0.92,
        "severity_level": "CRITICAL",
        "priority_score": 94.0,
        "status": "RECEIVED",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 1
    },
    {
        "tracking_id": "CP-2026-W106",
        "citizen_name": "Anil Deshmukh",
        "citizen_contact": "+91-98111-22334",
        "raw_text": "Pipeline leakage has reduced water pressure for entire Sector 3 residential area.",
        "detected_language": "en",
        "translated_text": "Pipeline leakage has reduced water pressure for entire Sector 3 residential area.",
        "latitude": BASE_LAT + 0.0053,
        "longitude": BASE_LON + 0.0028,
        "address": "Sector 3 Road behind Hospital",
        "category_code": "WATER",
        "subcategory": "Low Pressure",
        "severity_score": 0.70,
        "severity_level": "HIGH",
        "priority_score": 82.0,
        "status": "RECEIVED",
        "cluster_code": "HS-NORTH-WATER-01",
        "hours_ago": 8
    },

    # Cluster 2: Electrical Hazard Near School (High Priority)
    {
        "tracking_id": "CP-2026-E201",
        "citizen_name": "Principal K. Raman",
        "citizen_contact": "+91-94440-12345",
        "raw_text": "School ke gate ke bahar electric wire toot kar gir gaya hai aur spark ho raha hai. Bachhon ki safety ke liye bahut bada danger hai!",
        "detected_language": "hi",
        "translated_text": "An electric wire has snapped and fallen outside the school gate and is sparking actively. Extreme safety hazard for children!",
        "latitude": BASE_LAT + 0.0027,
        "longitude": BASE_LON - 0.0042,
        "address": "Outside Central High School Pedestrian Crossing",
        "category_code": "ELECTRICITY",
        "subcategory": "Live Wire Sparking",
        "severity_score": 0.96,
        "severity_level": "CRITICAL",
        "priority_score": 96.0,
        "status": "IN_PROGRESS",
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "hours_ago": 4
    },
    {
        "tracking_id": "CP-2026-E202",
        "citizen_name": "Meera Joshi",
        "citizen_contact": "+91-97654-32109",
        "raw_text": "शाळेजवळील डीपी बॉक्स उघडा असून त्यातून ठिणग्या पडत आहेत. तातडीने दुरुस्त करा.",
        "detected_language": "mr",
        "translated_text": "The transformer distribution box near the school is wide open and emitting sparks. Please repair immediately.",
        "latitude": BASE_LAT + 0.0030,
        "longitude": BASE_LON - 0.0040,
        "address": "Opposite School Playground East Wall",
        "category_code": "ELECTRICITY",
        "subcategory": "Open Transformer Box",
        "severity_score": 0.90,
        "severity_level": "CRITICAL",
        "priority_score": 92.0,
        "status": "INVESTIGATING",
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "hours_ago": 7
    },
    {
        "tracking_id": "CP-2026-E203",
        "citizen_name": "Suresh Gupta",
        "citizen_contact": "+91-98222-33445",
        "raw_text": "Street lights in the whole school lane are completely pitch black at night, encouraging anti-social elements.",
        "detected_language": "en",
        "translated_text": "Street lights in the whole school lane are completely pitch black at night, encouraging anti-social elements.",
        "latitude": BASE_LAT + 0.0028,
        "longitude": BASE_LON - 0.0045,
        "address": "School Road 3rd Cross",
        "category_code": "ELECTRICITY",
        "subcategory": "Streetlight Failure",
        "severity_score": 0.72,
        "severity_level": "HIGH",
        "priority_score": 80.5,
        "status": "RECEIVED",
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "hours_ago": 12
    },
    {
        "tracking_id": "CP-2026-E204",
        "citizen_name": "Rohan Bhatia",
        "citizen_contact": "+91-99887-76655",
        "raw_text": "Transformer making loud humming explosion noise and frequent power surges in school zone.",
        "detected_language": "en",
        "translated_text": "Transformer making loud humming explosion noise and frequent power surges in school zone.",
        "latitude": BASE_LAT + 0.0031,
        "longitude": BASE_LON - 0.0046,
        "address": "Junction near High School Gate 3",
        "category_code": "ELECTRICITY",
        "subcategory": "Transformer Fault",
        "severity_score": 0.85,
        "severity_level": "HIGH",
        "priority_score": 86.0,
        "status": "RECEIVED",
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "hours_ago": 10
    },
    {
        "tracking_id": "CP-2026-E205",
        "citizen_name": "Sneha Sen",
        "citizen_contact": "+91-91678-55443",
        "raw_text": "Cable insulation burnt and exposed over the sidewalk where children walk daily.",
        "detected_language": "en",
        "translated_text": "Cable insulation burnt and exposed over the sidewalk where children walk daily.",
        "latitude": BASE_LAT + 0.0026,
        "longitude": BASE_LON - 0.0043,
        "address": "Central School Footpath",
        "category_code": "ELECTRICITY",
        "subcategory": "Exposed Cable",
        "severity_score": 0.88,
        "severity_level": "CRITICAL",
        "priority_score": 89.0,
        "status": "RECEIVED",
        "cluster_code": "HS-WEST-ELECTRICAL-02",
        "hours_ago": 5
    },

    # Cluster 3: Pothole & Road Breakdown Near Metro Transit Hub
    {
        "tracking_id": "CP-2026-R301",
        "citizen_name": "Amitabh Roy",
        "citizen_contact": "+91-98300-11224",
        "raw_text": "Metro station ke saamne 2 feet gehra gaddha hai, do bikers gir chuke hain aaj subah.",
        "detected_language": "hi",
        "translated_text": "There is a 2-foot deep pothole directly in front of the metro station, two bikers have already fallen this morning.",
        "latitude": BASE_LAT + 0.0005,
        "longitude": BASE_LON + 0.0009,
        "address": "Metro Interchange Entry Gate A",
        "category_code": "ROADS",
        "subcategory": "Severe Pothole",
        "severity_score": 0.85,
        "severity_level": "HIGH",
        "priority_score": 85.0,
        "status": "IN_PROGRESS",
        "cluster_code": "HS-CENTRAL-ROADS-03",
        "hours_ago": 8
    },
    {
        "tracking_id": "CP-2026-R302",
        "citizen_name": "Vikram Sethi",
        "citizen_contact": "+91-98210-99887",
        "raw_text": "Multiple huge potholes on bus feeder lane at central transit terminal causing severe traffic bottleneck.",
        "detected_language": "en",
        "translated_text": "Multiple huge potholes on bus feeder lane at central transit terminal causing severe traffic bottleneck.",
        "latitude": BASE_LAT + 0.0007,
        "longitude": BASE_LON + 0.0011,
        "address": "BRTS Bus Terminal Lane 1",
        "category_code": "ROADS",
        "subcategory": "Road Surface Damage",
        "severity_score": 0.76,
        "severity_level": "HIGH",
        "priority_score": 81.5,
        "status": "INVESTIGATING",
        "cluster_code": "HS-CENTRAL-ROADS-03",
        "hours_ago": 16
    },
    {
        "tracking_id": "CP-2026-R303",
        "citizen_name": "Kavita Rao",
        "citizen_contact": "+91-98401-22334",
        "raw_text": "Tarmac completely eroded after rains, sharp stones causing vehicle punctures near metro gate.",
        "detected_language": "en",
        "translated_text": "Tarmac completely eroded after rains, sharp stones causing vehicle punctures near metro gate.",
        "latitude": BASE_LAT + 0.0003,
        "longitude": BASE_LON + 0.0007,
        "address": "Metro South Parking Exit",
        "category_code": "ROADS",
        "subcategory": "Eroded Tarmac",
        "severity_score": 0.65,
        "severity_level": "MEDIUM",
        "priority_score": 75.0,
        "status": "RECEIVED",
        "cluster_code": "HS-CENTRAL-ROADS-03",
        "hours_ago": 24
    },
    {
        "tracking_id": "CP-2026-R304",
        "citizen_name": "Tariq Khan",
        "citizen_contact": "+91-99300-88776",
        "raw_text": "Speed breaker near transit hub has collapsed on one side creating a dangerous ramp.",
        "detected_language": "en",
        "translated_text": "Speed breaker near transit hub has collapsed on one side creating a dangerous ramp.",
        "latitude": BASE_LAT + 0.0008,
        "longitude": BASE_LON + 0.0013,
        "address": "Main Transit Boulevard",
        "category_code": "ROADS",
        "subcategory": "Broken Speed Breaker",
        "severity_score": 0.70,
        "severity_level": "MEDIUM",
        "priority_score": 77.0,
        "status": "RECEIVED",
        "cluster_code": "HS-CENTRAL-ROADS-03",
        "hours_ago": 30
    },

    # Cluster 4: Sewage Overflow Near Children's Medical Center
    {
        "tracking_id": "CP-2026-S401",
        "citizen_name": "Geeta Menon",
        "citizen_contact": "+91-98711-22445",
        "raw_text": "St. Jude Hospital ke pass gutter ka dhabba overflow ho raha hai aur ganda pani raste par phail gaya hai.",
        "detected_language": "hi",
        "translated_text": "Gutter manhole is overflowing near St. Jude Hospital and filthy sewage water has spread all over the roadway.",
        "latitude": BASE_LAT - 0.0083,
        "longitude": BASE_LON + 0.0060,
        "address": "St. Jude Hospital Approach Road",
        "category_code": "SEWAGE",
        "subcategory": "Manhole Overflow",
        "severity_score": 0.88,
        "severity_level": "CRITICAL",
        "priority_score": 90.0,
        "status": "IN_PROGRESS",
        "cluster_code": "HS-SOUTH-SEWAGE-04",
        "hours_ago": 6
    },
    {
        "tracking_id": "CP-2026-S402",
        "citizen_name": "Ashok Reddy",
        "citizen_contact": "+91-98490-33221",
        "raw_text": "Open sewer chamber lid broken, huge safety risk for pediatric hospital visitors.",
        "detected_language": "en",
        "translated_text": "Open sewer chamber lid broken, huge safety risk for pediatric hospital visitors.",
        "latitude": BASE_LAT - 0.0080,
        "longitude": BASE_LON + 0.0058,
        "address": "Pediatric Clinic East Wing Road",
        "category_code": "SEWAGE",
        "subcategory": "Missing Manhole Cover",
        "severity_score": 0.92,
        "severity_level": "CRITICAL",
        "priority_score": 93.0,
        "status": "INVESTIGATING",
        "cluster_code": "HS-SOUTH-SEWAGE-04",
        "hours_ago": 9
    },
    {
        "tracking_id": "CP-2026-S403",
        "citizen_name": "Farhan Ansari",
        "citizen_contact": "+91-99201-88990",
        "raw_text": "Severe sewage blockage causing foul toxic smell and backflow into residential basements.",
        "detected_language": "en",
        "translated_text": "Severe sewage blockage causing foul toxic smell and backflow into residential basements.",
        "latitude": BASE_LAT - 0.0085,
        "longitude": BASE_LON + 0.0063,
        "address": "South Sector Lane 6",
        "category_code": "SEWAGE",
        "subcategory": "Underground Blockage",
        "severity_score": 0.78,
        "severity_level": "HIGH",
        "priority_score": 83.5,
        "status": "RECEIVED",
        "cluster_code": "HS-SOUTH-SEWAGE-04",
        "hours_ago": 18
    },

    # Isolated / Resolved Complaints across City (Demonstrating complete distribution)
    {
        "tracking_id": "CP-2026-G501",
        "citizen_name": "Ritu Agarwal",
        "citizen_contact": "+91-98200-55667",
        "raw_text": "Kachra dumper pichhle 4 din se nahi aaya hai, pura corner kachre se bhar gaya hai.",
        "detected_language": "hi",
        "translated_text": "Garbage pickup truck has not arrived for the last 4 days, the entire corner is overflowing with garbage.",
        "latitude": BASE_LAT + 0.0095,
        "longitude": BASE_LON - 0.0020,
        "address": "Sector 7 Market Complex Corner",
        "category_code": "WASTE",
        "subcategory": "Uncollected Garbage",
        "severity_score": 0.58,
        "severity_level": "MEDIUM",
        "priority_score": 62.0,
        "status": "RECEIVED",
        "cluster_code": None,
        "hours_ago": 28
    },
    {
        "tracking_id": "CP-2026-G502",
        "citizen_name": "Deepak Chawla",
        "citizen_contact": "+91-98100-33441",
        "raw_text": "Illegal debris dumped on footpath blocking pedestrian walkway.",
        "detected_language": "en",
        "translated_text": "Illegal debris dumped on footpath blocking pedestrian walkway.",
        "latitude": BASE_LAT - 0.0035,
        "longitude": BASE_LON - 0.0015,
        "address": "West Ring Road Footpath",
        "category_code": "WASTE",
        "subcategory": "Illegal Construction Debris",
        "severity_score": 0.45,
        "severity_level": "LOW",
        "priority_score": 48.0,
        "status": "RESOLVED",
        "cluster_code": None,
        "hours_ago": 48,
        "resolved_hours_ago": 12
    },
    {
        "tracking_id": "CP-2026-T601",
        "citizen_name": "Manoj Tiwari",
        "citizen_contact": "+91-98205-66778",
        "raw_text": "Traffic signal light at 5-point intersection is stuck on red in all directions, causing chaos.",
        "detected_language": "en",
        "translated_text": "Traffic signal light at 5-point intersection is stuck on red in all directions, causing chaos.",
        "latitude": BASE_LAT - 0.0020,
        "longitude": BASE_LON + 0.0040,
        "address": "5-Point Central Circle",
        "category_code": "SAFETY",
        "subcategory": "Traffic Signal Malfunction",
        "severity_score": 0.80,
        "severity_level": "HIGH",
        "priority_score": 84.0,
        "status": "RESOLVED",
        "cluster_code": None,
        "hours_ago": 20,
        "resolved_hours_ago": 4
    },
    {
        "tracking_id": "CP-2026-R701",
        "citizen_name": "Nandini Ghosh",
        "citizen_contact": "+91-98311-77889",
        "raw_text": "Large dead tree branch hanging precariously over railway overpass bridge.",
        "detected_language": "en",
        "translated_text": "Large dead tree branch hanging precariously over railway overpass bridge.",
        "latitude": BASE_LAT - 0.0060,
        "longitude": BASE_LON + 0.0012,
        "address": "Railway Overpass Flyover Approach",
        "category_code": "SAFETY",
        "subcategory": "Hazardous Tree Branch",
        "severity_score": 0.75,
        "severity_level": "HIGH",
        "priority_score": 78.0,
        "status": "INVESTIGATING",
        "cluster_code": None,
        "hours_ago": 14
    }
]


DEPARTMENTS_SEED = [
    {
        "name": "Water Supply & Drainage",
        "description": "Municipal pipeline infrastructure, leakage repairs, water pressure, and sewer/drainage clearance.",
        "active": True
    },
    {
        "name": "Roads & Infrastructure",
        "description": "Pothole repair, road resurfacing, footpaths, traffic signs, and municipal civil works.",
        "active": True
    },
    {
        "name": "Sanitation & Waste Management",
        "description": "Solid waste logistics, garbage dump collection, street sweeping, and sanitary hygiene.",
        "active": True
    },
    {
        "name": "Electrical & Power Grid",
        "description": "Streetlights, transformer maintenance, exposed wiring, and power grid safety.",
        "active": True
    },
    {
        "name": "Public Safety & Traffic Control",
        "description": "Traffic signal maintenance, emergency road clearance, hazardous tree removal, and pedestrian safety.",
        "active": True
    },
]

FIELD_CREWS_SEED = [
    {
        "name": "Ward 4 Water Repair Crew",
        "department_name": "Water Supply & Drainage",
        "ward_id": 4,
        "ward_name": "Ward 4 – East Industrial",
        "crew_leader": "Vikram Salve",
        "contact_number": "+91-98200-11223",
        "active": True,
        "current_status": "ON_DUTY"
    },
    {
        "name": "Ward 2 Electrical Rapid Response",
        "department_name": "Electrical & Power Grid",
        "ward_id": 2,
        "ward_name": "Ward 2 – Central Commercial",
        "crew_leader": "Rajesh Patil",
        "contact_number": "+91-98200-22334",
        "active": True,
        "current_status": "AVAILABLE"
    },
    {
        "name": "Ward 3 Pothole & Road Repair Team",
        "department_name": "Roads & Infrastructure",
        "ward_id": 3,
        "ward_name": "Ward 3 – North East",
        "crew_leader": "Suresh Shinde",
        "contact_number": "+91-98200-33445",
        "active": True,
        "current_status": "BUSY"
    },
    {
        "name": "Ward 5 Sanitation Unit Alpha",
        "department_name": "Sanitation & Waste Management",
        "ward_id": 5,
        "ward_name": "Ward 5 – North West Sector",
        "crew_leader": "Ramesh Gaikwad",
        "contact_number": "+91-98200-44556",
        "active": True,
        "current_status": "AVAILABLE"
    },
    {
        "name": "Ward 1 Sewage Clearance Squad",
        "department_name": "Water Supply & Drainage",
        "ward_id": 1,
        "ward_name": "Ward 1 – North Zone",
        "crew_leader": "Deepak Jadhav",
        "contact_number": "+91-98200-55667",
        "active": True,
        "current_status": "AVAILABLE"
    },
    {
        "name": "Ward 6 Traffic & Signals Crew",
        "department_name": "Public Safety & Traffic Control",
        "ward_id": 6,
        "ward_name": "Ward 6 – South Central",
        "crew_leader": "Amit More",
        "contact_number": "+91-98200-66778",
        "active": True,
        "current_status": "AVAILABLE"
    },
    {
        "name": "Ward 7 Drainage Quick Response",
        "department_name": "Water Supply & Drainage",
        "ward_id": 7,
        "ward_name": "Ward 7 – South West",
        "crew_leader": "Manoj Kadam",
        "contact_number": "+91-98200-77889",
        "active": True,
        "current_status": "AVAILABLE"
    },
    {
        "name": "Ward 8 Multi-Utility Response Team",
        "department_name": "Roads & Infrastructure",
        "ward_id": 8,
        "ward_name": "Ward 8 – South Bridge Zone",
        "crew_leader": "Sanjay Pawar",
        "contact_number": "+91-98200-88990",
        "active": True,
        "current_status": "AVAILABLE"
    }
]


def seed_database(db: Session, force: bool = False):
    """Seeds the database with standard civic categories, departments, field crews, infrastructure assets, and realistic complaints."""
    existing_cat_count = db.query(Category).count()
    if existing_cat_count > 0 and not force:
        return {"status": "already_seeded", "categories": existing_cat_count}

    if force:
        db.query(Notification).delete()
        db.query(PreventiveMaintenanceOrder).delete()
        db.query(CitizenFeedback).delete()
        db.query(ResolutionEvidence).delete()
        db.query(CrewAssignment).delete()
        db.query(AuditLog).delete()
        db.query(Complaint).delete()
        db.query(HotspotCluster).delete()
        db.query(InfrastructureAsset).delete()
        db.query(FieldCrew).delete()
        db.query(Department).delete()
        db.query(Category).delete()
        db.commit()

    now = datetime.now(timezone.utc)

    # 1. Seed Departments
    dept_map = {}
    for d_data in DEPARTMENTS_SEED:
        dept = Department(
            name=d_data["name"],
            description=d_data["description"],
            active=d_data["active"],
            created_at=now - timedelta(days=60)
        )
        db.add(dept)
        db.flush()
        dept_map[dept.name] = dept

    # 2. Seed Field Crews
    crew_map = {}
    for c_data in FIELD_CREWS_SEED:
        dept = dept_map.get(c_data["department_name"])
        crew = FieldCrew(
            name=c_data["name"],
            department_id=dept.id if dept else 1,
            ward_id=c_data["ward_id"],
            ward_name=c_data["ward_name"],
            crew_leader=c_data["crew_leader"],
            contact_number=c_data["contact_number"],
            active=c_data["active"],
            current_status=c_data["current_status"],
            created_at=now - timedelta(days=45)
        )
        db.add(crew)
        db.flush()
        crew_map[crew.name] = crew

    # 3. Seed Categories
    category_map = {}
    for cat_data in CATEGORIES_SEED:
        cat = Category(
            code=cat_data["code"],
            name=cat_data["name"],
            description=cat_data["description"],
            default_sla_hours=cat_data["default_sla_hours"],
            criticality_weight=cat_data["criticality_weight"],
            icon=cat_data["icon"]
        )
        db.add(cat)
        db.flush()
        category_map[cat.code] = cat

    # 4. Seed Critical Infrastructure Assets
    for asset_data in INFRASTRUCTURE_ASSETS_SEED:
        w_id, w_name = get_ward(asset_data["latitude"], asset_data["longitude"])
        dept_name = asset_data.get("department_name")
        dept_id = dept_map.get(dept_name).id if dept_name and dept_name in dept_map else None

        maint_days = asset_data.get("last_maintenance_days_ago", 90)
        insp_days = asset_data.get("last_inspection_days_ago", 30)

        asset = InfrastructureAsset(
            name=asset_data["name"],
            asset_type=asset_data["asset_type"],
            latitude=asset_data["latitude"],
            longitude=asset_data["longitude"],
            ward_id=w_id,
            ward_name=w_name,
            impact_radius_meters=asset_data["impact_radius_meters"],
            vulnerability_weight=asset_data["vulnerability_weight"],
            description=asset_data["description"],
            installation_year=asset_data.get("installation_year", 2015),
            last_maintenance_date=now - timedelta(days=maint_days),
            last_inspection_date=now - timedelta(days=insp_days),
            expected_lifespan_years=asset_data.get("expected_lifespan_years", 25),
            department_id=dept_id,
            created_at=now - timedelta(days=60)
        )
        db.add(asset)

    db.flush()

    # 5. Seed Hotspot Clusters
    cluster_map = {}
    for cl_data in HOTSPOT_CLUSTERS_SEED:
        cat = category_map.get(cl_data["category_code"])
        w_id, w_name = get_ward(cl_data["centroid_lat"], cl_data["centroid_lon"])
        cluster = HotspotCluster(
            cluster_code=cl_data["cluster_code"],
            category_id=cat.id if cat else 1,
            centroid_lat=cl_data["centroid_lat"],
            centroid_lon=cl_data["centroid_lon"],
            ward_id=w_id,
            ward_name=w_name,
            radius_meters=cl_data["radius_meters"],
            complaint_count=cl_data["complaint_count"],
            avg_severity=cl_data["avg_severity"],
            aggregate_priority_score=cl_data["aggregate_priority_score"],
            status=cl_data["status"],
            ai_summary=cl_data["ai_summary"],
            ai_recommendation=cl_data["ai_recommendation"],
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(hours=1)
        )
        db.add(cluster)
        db.flush()
        cluster_map[cluster.cluster_code] = cluster

    # 6. Seed Complaints & Audit Trails
    complaint_map = {}
    for c_data in COMPLAINTS_SEED:
        cat = category_map.get(c_data["category_code"])
        cluster = cluster_map.get(c_data["cluster_code"]) if c_data["cluster_code"] else None
        
        created_time = now - timedelta(hours=c_data.get("hours_ago", 10))
        resolved_time = (
            now - timedelta(hours=c_data["resolved_hours_ago"])
            if "resolved_hours_ago" in c_data
            else None
        )

        w_id, w_name = get_ward(c_data["latitude"], c_data["longitude"])
        channel = c_data.get("source_channel", "WEB")
        complaint = Complaint(
            tracking_id=c_data["tracking_id"],
            source_channel=channel,
            external_message_id=c_data.get("external_message_id"),
            external_sender_id=c_data["citizen_contact"],
            ingestion_timestamp=created_time,
            citizen_name=c_data["citizen_name"],
            citizen_contact=c_data["citizen_contact"],
            raw_text=c_data["raw_text"],
            detected_language=c_data["detected_language"],
            translated_text=c_data["translated_text"],
            latitude=c_data["latitude"],
            longitude=c_data["longitude"],
            address=c_data["address"],
            ward_id=w_id,
            ward_name=w_name,
            category_id=cat.id if cat else 1,
            subcategory=c_data.get("subcategory"),
            severity_score=c_data["severity_score"],
            severity_level=c_data["severity_level"],
            priority_score=c_data["priority_score"],
            status=c_data["status"],
            cluster_id=cluster.id if cluster else None,
            is_duplicate=False,
            created_at=created_time,
            updated_at=now - timedelta(hours=1),
            resolved_at=resolved_time
        )
        db.add(complaint)
        db.flush()
        complaint_map[complaint.tracking_id] = complaint

        # Audit trail: initial
        audit_initial = AuditLog(
            complaint_id=complaint.id,
            previous_status=None,
            new_status="RECEIVED",
            changed_by=f"Citizen Submission ({channel})",
            notes=f"Complaint registered via {channel} channel in {c_data['detected_language'].upper()}.",
            created_at=created_time
        )
        db.add(audit_initial)

        # Omnichannel Status Notifications: Received & Analyzed
        cat_name = cat.name if cat else "Civic Issue"
        n1 = Notification(
            complaint_id=complaint.id,
            citizen_identifier=complaint.citizen_contact or "Citizen",
            channel=channel,
            event_type="COMPLAINT_RECEIVED",
            message=f"Your CivicPulse complaint {complaint.tracking_id} has been received via {channel}. Category: {cat_name}. Priority: {complaint.severity_level}.",
            status="SENT",
            created_at=created_time,
            sent_at=created_time,
        )
        db.add(n1)

        n2 = Notification(
            complaint_id=complaint.id,
            citizen_identifier=complaint.citizen_contact or "Citizen",
            channel=channel,
            event_type="AI_ANALYZED",
            message=f"AI analysis completed for {complaint.tracking_id}. Priority Score: {complaint.priority_score}/100. Zone: {w_name}.",
            status="SENT",
            created_at=created_time + timedelta(seconds=20),
            sent_at=created_time + timedelta(seconds=20),
        )
        db.add(n2)

        # Audit trail for progressed or resolved
        if complaint.status in ["INVESTIGATING", "IN_PROGRESS", "RESOLVED"]:
            audit_progress = AuditLog(
                complaint_id=complaint.id,
                previous_status="RECEIVED",
                new_status=complaint.status,
                changed_by="Municipal Central Operations",
                notes=f"Status transitioned to {complaint.status} based on infrastructure priority.",
                created_at=created_time + timedelta(hours=1)
            )
            db.add(audit_progress)

            n_status = Notification(
                complaint_id=complaint.id,
                citizen_identifier=complaint.citizen_contact or "Citizen",
                channel=channel,
                event_type="RESOLVED" if complaint.status == "RESOLVED" else "ASSIGNED",
                message=f"Status update for {complaint.tracking_id}: {complaint.status}. Municipal dispatch active.",
                status="SENT",
                created_at=created_time + timedelta(hours=1),
                sent_at=created_time + timedelta(hours=1),
            )
            db.add(n_status)

    # 7. Seed Sample Crew Assignments, Resolution Evidence, and Feedback
    # (a) Active In-Progress Assignment (Water Pipe Burst)
    water_c = complaint_map.get("CP-2026-W101")
    water_crew = crew_map.get("Ward 4 Water Repair Crew")
    if water_c and water_crew:
        assign_w = CrewAssignment(
            complaint_id=water_c.id,
            crew_id=water_crew.id,
            assigned_by="Municipal Emergency Dispatch",
            assigned_at=now - timedelta(hours=2),
            accepted_at=now - timedelta(hours=1, minutes=45),
            started_at=now - timedelta(hours=1),
            assignment_status="IN_PROGRESS",
            notes="Emergency isolation valve closed. Excavation and pipe clamp replacement in progress."
        )
        db.add(assign_w)

    # (b) Resolved Complaint 1 (Road Pothole CP-2026-R102)
    road_c = complaint_map.get("CP-2026-R102")
    road_crew = crew_map.get("Ward 8 Multi-Utility Response Team")
    if road_c and road_crew:
        assign_r = CrewAssignment(
            complaint_id=road_c.id,
            crew_id=road_crew.id,
            assigned_by="Municipal Central Operations",
            assigned_at=now - timedelta(hours=18),
            accepted_at=now - timedelta(hours=17),
            started_at=now - timedelta(hours=15),
            completed_at=now - timedelta(hours=8),
            assignment_status="COMPLETED",
            notes="Bitumen cold mix compaction complete. Street clear."
        )
        db.add(assign_r)
        db.flush()

        evidence_r = ResolutionEvidence(
            complaint_id=road_c.id,
            uploaded_by="Sanjay Pawar (Crew Leader)",
            before_photo="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600",
            after_photo="https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600",
            description="Filled 1.2m deep crater with aggregate base and hot asphalt sealant. Rolled flat and restored road gradient.",
            uploaded_at=now - timedelta(hours=8)
        )
        db.add(evidence_r)

        feedback_r = CitizenFeedback(
            complaint_id=road_c.id,
            citizen_name=road_c.citizen_name or "Citizen",
            rating=5,
            feedback="Excellent repair turnaround! The pothole was fixed cleanly within 12 hours of reporting.",
            created_at=now - timedelta(hours=6)
        )
        db.add(feedback_r)

    # (c) Resolved Complaint 2 (Streetlight CP-2026-E102)
    elec_c = complaint_map.get("CP-2026-E102")
    elec_crew = crew_map.get("Ward 2 Electrical Rapid Response")
    if elec_c and elec_crew:
        assign_e = CrewAssignment(
            complaint_id=elec_c.id,
            crew_id=elec_crew.id,
            assigned_by="Central Power Dispatch",
            assigned_at=now - timedelta(hours=22),
            accepted_at=now - timedelta(hours=21),
            started_at=now - timedelta(hours=20),
            completed_at=now - timedelta(hours=14),
            assignment_status="COMPLETED",
            notes="Streetlight LED fixture replaced and tested."
        )
        db.add(assign_e)
        db.flush()

        evidence_e = ResolutionEvidence(
            complaint_id=elec_c.id,
            uploaded_by="Rajesh Patil (Crew Leader)",
            before_photo="https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600",
            after_photo="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600",
            description="Replaced blown capacitor in LED luminaire and restored junction box wiring insulation.",
            uploaded_at=now - timedelta(hours=14)
        )
        db.add(evidence_e)

        feedback_e = CitizenFeedback(
            complaint_id=elec_c.id,
            citizen_name=elec_c.citizen_name or "Citizen",
            rating=5,
            feedback="Street is well-lit and safe now. Appreciate the fast response!",
            created_at=now - timedelta(hours=12)
        )
        db.add(feedback_e)

    # (d) Resolved Complaint 3 (Debris CP-2026-G502)
    san_c = complaint_map.get("CP-2026-G502")
    san_crew = crew_map.get("Ward 5 Sanitation Unit Alpha")
    if san_c and san_crew:
        assign_s = CrewAssignment(
            complaint_id=san_c.id,
            crew_id=san_crew.id,
            assigned_by="Sanitation Division",
            assigned_at=now - timedelta(hours=28),
            accepted_at=now - timedelta(hours=26),
            started_at=now - timedelta(hours=24),
            completed_at=now - timedelta(hours=18),
            assignment_status="COMPLETED",
            notes="Debris carted away by municipal tipper truck."
        )
        db.add(assign_s)
        db.flush()

        evidence_s = ResolutionEvidence(
            complaint_id=san_c.id,
            uploaded_by="Ramesh Gaikwad (Crew Leader)",
            before_photo="https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
            after_photo="https://images.unsplash.com/photo-1518481612222-68bbe828ecd1?w=600",
            description="Removed 2.5 metric tonnes of illegal construction debris and pressure washed pavement.",
            uploaded_at=now - timedelta(hours=18)
        )
        db.add(evidence_s)

        feedback_s = CitizenFeedback(
            complaint_id=san_c.id,
            citizen_name=san_c.citizen_name or "Deepak Chawla",
            rating=4,
            feedback="Footpath cleared and walkable again. Thank you!",
            created_at=now - timedelta(hours=10)
        )
        db.add(feedback_s)

    # 8. Seed Initial Preventive Maintenance Orders
    wt_asset = db.query(InfrastructureAsset).filter(InfrastructureAsset.name.like("%Water Treatment Station WT-04%")).first()
    water_dept = dept_map.get("Water Supply & Drainage")
    water_crew = crew_map.get("Ward 4 Water Repair Crew")
    if wt_asset and water_dept:
        pm_order = PreventiveMaintenanceOrder(
            order_code="PM-2026-0001",
            infrastructure_id=wt_asset.id,
            department_id=water_dept.id,
            crew_id=water_crew.id if water_crew else None,
            priority="CRITICAL",
            recommended_action="Emergency ultrasonic leak detection squad to test pipeline joints and replace degrading pressure valve seals.",
            notes="Assigned via Predictive Infrastructure Intelligence. High complaint velocity and overdue servicing flagged.",
            target_completion_date=now + timedelta(days=2),
            status="ASSIGNED",
            assigned_by="Predictive Intelligence Dispatch",
            created_at=now - timedelta(hours=6)
        )
        db.add(pm_order)

    db.commit()
    return {
        "status": "seeded_successfully",
        "departments_count": len(DEPARTMENTS_SEED),
        "crews_count": len(FIELD_CREWS_SEED),
        "categories_count": len(CATEGORIES_SEED),
        "assets_count": len(INFRASTRUCTURE_ASSETS_SEED),
        "hotspots_count": len(HOTSPOT_CLUSTERS_SEED),
        "complaints_count": len(COMPLAINTS_SEED)
    }

