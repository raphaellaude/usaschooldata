"""Consolidate YAML research files into events.csv and sources.csv.

Reads all YAML files from data/ directory, normalizes event types,
cross-references with the NCES district lookup, and outputs two CSVs
with a relational model: events have stable IDs, sources reference
events via foreign key.

Usage:
    python -m collect.consolidate
"""

import csv
import re
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
    "new construction": "expansion",
    "new_construction": "expansion",
    "modernization": "renovation",
    "upgrade": "renovation",
    "repair": "renovation",
    "boundary": "redistricting",
    "rezoning": "redistricting",
    "takeover": "intervention",
    "restructuring": "intervention",
    "grade_reconfiguration": "renovation",
    "security": "safety",
    "bond_referendum": "bond",
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


def schools_to_str(schools) -> str:
    """Flatten schools_affected to a semicolon-delimited string for CSV."""
    if not schools:
        return ""
    if isinstance(schools, str):
        return schools
    if isinstance(schools, list):
        names = []
        for s in schools:
            if isinstance(s, dict):
                names.append(s.get("name", ""))
            elif isinstance(s, str):
                names.append(s)
        return "; ".join(n for n in names if n)
    return str(schools)


def load_yaml_file(path: Path) -> tuple[list[dict], list[dict]]:
    """Load a YAML file and return (events, sources) rows."""
    with open(path) as f:
        data = yaml.safe_load(f)

    raw_events = data.get("events", [])
    events = []
    sources = []

    for event in raw_events:
        if not event:
            continue

        event_id = event.get("event_id", "")
        district = event.get("district", event.get("district_name", ""))
        event_type_raw = event.get("event_type", "")
        date = str(event.get("date", ""))
        title = event.get("title", "")
        description = str(event.get("description", "")).strip()
        state = event.get("state", "")
        schools = event.get("schools_affected", [])
        leaid = event.get("leaid", "")
        causes = event.get("causes", [])

        # Resolve LEA ID if not set
        if not leaid:
            leaid = find_lea_id(district) or ""
        if leaid and leaid in DISTRICTS and not state:
            state = DISTRICTS[leaid]["state"]

        causes_str = "; ".join(causes) if isinstance(causes, list) else str(causes)

        events.append(
            {
                "event_id": event_id,
                "district": district,
                "leaid": leaid,
                "state": state,
                "event_type": normalize_event_type(event_type_raw),
                "date": date,
                "year": parse_year(date) or "",
                "title": title,
                "schools_affected": schools_to_str(schools),
                "causes": causes_str,
                "description": description,
            }
        )

        # Extract sources from the event
        event_sources = event.get("sources", [])
        if not event_sources:
            # Fall back to legacy single-source fields
            url = event.get("source", event.get("source_url", ""))
            if url:
                event_sources = [{"url": url}]

        for src in event_sources:
            if not src:
                continue
            sources.append(
                {
                    "event_id": event_id,
                    "url": src.get("url", ""),
                    "date_accessed": src.get("date_accessed", ""),
                    "title": src.get("title", ""),
                    "notes": src.get("notes", ""),
                }
            )

    # Also load top-level standalone sources (added later without touching events)
    for src in data.get("sources", []):
        if not src:
            continue
        sources.append(
            {
                "event_id": src.get("event_id", ""),
                "url": src.get("url", ""),
                "date_accessed": src.get("date_accessed", ""),
                "title": src.get("title", ""),
                "notes": src.get("notes", ""),
            }
        )

    return events, sources


EVENT_FIELDS = [
    "event_id",
    "district",
    "leaid",
    "state",
    "event_type",
    "date",
    "year",
    "title",
    "schools_affected",
    "causes",
    "description",
]

SOURCE_FIELDS = [
    "source_id",
    "event_id",
    "url",
    "date_accessed",
    "title",
    "notes",
]


def consolidate(
    data_dir: Path, output_dir: Path
) -> tuple[list[dict], list[dict]]:
    all_events: list[dict] = []
    all_sources: list[dict] = []

    for yaml_file in sorted(data_dir.glob("*.yaml")) + sorted(
        data_dir.glob("*.yml")
    ):
        events, sources = load_yaml_file(yaml_file)
        print(
            f"  Loaded {len(events)} events, {len(sources)} sources"
            f" from {yaml_file.name}"
        )
        all_events.extend(events)
        all_sources.extend(sources)

    # Check for duplicate event_ids
    seen_ids: set[str] = set()
    dupes = 0
    for e in all_events:
        eid = e["event_id"]
        if eid in seen_ids:
            dupes += 1
            print(f"  WARNING: duplicate event_id: {eid}")
        seen_ids.add(eid)
    if dupes:
        print(f"  {dupes} duplicate event_id(s) found!")

    # Validate source foreign keys
    orphans = 0
    for s in all_sources:
        if s["event_id"] not in seen_ids:
            orphans += 1
            print(
                f"  WARNING: source references unknown event_id: {s['event_id']}"
            )
    if orphans:
        print(f"  {orphans} orphan source(s) found!")

    # Write events.csv
    events_path = output_dir / "events.csv"
    with open(events_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=EVENT_FIELDS)
        writer.writeheader()
        writer.writerows(all_events)

    # Write sources.csv with auto-incrementing source_id
    sources_path = output_dir / "sources.csv"
    with open(sources_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=SOURCE_FIELDS)
        writer.writeheader()
        for i, src in enumerate(all_sources, start=1):
            src["source_id"] = i
            writer.writerow(src)

    print(f"\n  Total: {len(all_events)} events -> {events_path}")
    print(f"  Total: {len(all_sources)} sources -> {sources_path}")
    return all_events, all_sources


if __name__ == "__main__":
    root = Path(__file__).parent.parent
    data_dir = root / "data"
    consolidate(data_dir, data_dir)
