"""Consolidate YAML research files into a single CSV.

Reads all YAML files from data/ directory, normalizes event types,
cross-references with the NCES district lookup, and outputs a combined CSV.

Usage:
    python -m collect.consolidate
"""

import csv
import re
import sys
from pathlib import Path

import yaml

from .districts import DISTRICTS, find_lea_id

EVENT_TYPES = {
    "closure",
    "expansion",
    "bond",
    "renovation",
    "redistricting",
    "intervention",
    "new_construction",
    "safety",
    "facilities_plan",
    "merger",
    "policy",
}

NORMALIZE_MAP: dict[str, str] = {
    "consolidation": "closure",
    "close": "closure",
    "closure_planned": "closure",
    "opening": "expansion",
    "new school": "expansion",
    "new construction": "new_construction",
    "modernization": "renovation",
    "upgrade": "renovation",
    "repair": "renovation",
    "boundary": "redistricting",
    "rezoning": "redistricting",
    "takeover": "intervention",
    "restructuring": "intervention",
    "grade_reconfiguration": "renovation",
    "security": "safety",
}


def normalize_event_type(raw: str) -> str:
    et = raw.lower().strip()
    if et in EVENT_TYPES:
        return et
    for keyword, normalized in NORMALIZE_MAP.items():
        if keyword in et:
            return normalized
    return et


def parse_year(date_str: str | None) -> int | None:
    if not date_str:
        return None
    match = re.search(r"20\d{2}", str(date_str))
    return int(match.group()) if match else None


def load_yaml_events(path: Path) -> list[dict]:
    with open(path) as f:
        data = yaml.safe_load(f)
    raw_events = data.get("events", [])
    events = []
    for event in raw_events:
        if not event:
            continue

        district = event.get("district", event.get("district_name", ""))
        event_type_raw = event.get("event_type", "")
        date = str(event.get("date", ""))
        schools = event.get("schools_affected", [])
        if isinstance(schools, list):
            schools_str = "; ".join(str(s) for s in schools)
        else:
            schools_str = str(schools)
        description = str(event.get("description", "")).strip()
        source = event.get("source", event.get("source_url", ""))
        title = event.get("title", "")
        state = event.get("state", "")

        lea_id = find_lea_id(district)
        if lea_id and lea_id in DISTRICTS and not state:
            state = DISTRICTS[lea_id]["state"]

        events.append(
            {
                "district_name": district,
                "leaid": lea_id or "",
                "state": state,
                "event_type": normalize_event_type(event_type_raw),
                "date": date,
                "year": parse_year(date) or "",
                "title": title,
                "schools_affected": schools_str,
                "description": description,
                "source_url": source,
            }
        )
    return events


def consolidate(data_dir: Path, output_path: Path) -> list[dict]:
    all_events = []
    for yaml_file in sorted(data_dir.glob("*.yaml")) + sorted(data_dir.glob("*.yml")):
        events = load_yaml_events(yaml_file)
        print(f"  Loaded {len(events)} events from {yaml_file.name}")
        all_events.extend(events)

    fieldnames = [
        "district_name",
        "leaid",
        "state",
        "event_type",
        "date",
        "year",
        "title",
        "schools_affected",
        "description",
        "source_url",
    ]
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_events)

    print(f"\n  Total: {len(all_events)} events -> {output_path}")
    return all_events


if __name__ == "__main__":
    root = Path(__file__).parent.parent
    data_dir = root / "data"
    output = data_dir / "facility_events.csv"
    consolidate(data_dir, output)
