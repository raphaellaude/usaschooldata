"""Analyze consolidated facility events data.

Reads the CSV produced by consolidate.py and prints summary statistics,
cross-references with NCES directory data, and identifies trends.

Usage:
    python -m collect.analyze [--directory-parquet PATH]
"""

import csv
import re
import sys
from collections import Counter
from pathlib import Path

try:
    import duckdb

    HAS_DUCKDB = True
except ImportError:
    HAS_DUCKDB = False


def load_events(csv_path: Path) -> list[dict]:
    with open(csv_path) as f:
        return list(csv.DictReader(f))


def print_section(title: str) -> None:
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}")


def analyze_categories(events: list[dict]) -> None:
    print_section("EVENTS BY CATEGORY")
    counts = Counter(e["event_type"] for e in events)
    total = len(events)
    for et, cnt in counts.most_common():
        pct = 100 * cnt / total
        bar = "#" * int(pct / 2)
        print(f"  {et:<25} {cnt:>3} ({pct:>5.1f}%) {bar}")


def analyze_by_year(events: list[dict]) -> None:
    print_section("EVENTS BY YEAR")
    year_events: dict[int, list[dict]] = {}
    for e in events:
        try:
            y = int(e["year"])
        except (ValueError, KeyError):
            continue
        year_events.setdefault(y, []).append(e)

    header = f"  {'Year':<6} {'Total':>6} {'Close':>6} {'Expand':>7} {'Bond':>5} {'Reno':>5} {'Redistr':>8}"
    print(header)
    print("  " + "-" * len(header))

    for year in sorted(year_events):
        evts = year_events[year]
        types = Counter(e["event_type"] for e in evts)
        print(
            f"  {year:<6} {len(evts):>6} "
            f"{types.get('closure', 0):>6} "
            f"{types.get('expansion', 0) + types.get('new_construction', 0):>7} "
            f"{types.get('bond', 0):>5} "
            f"{types.get('renovation', 0):>5} "
            f"{types.get('redistricting', 0):>8}"
        )


def analyze_bonds(events: list[dict]) -> None:
    print_section("BOND ELECTION OUTCOMES")
    bond_events = [e for e in events if e["event_type"] == "bond"]
    approved = 0
    rejected = 0
    total_approved_value = 0.0

    for e in sorted(bond_events, key=lambda x: x.get("year", "")):
        desc = (e.get("description", "") or "").lower()
        amounts = re.findall(
            r"\$([0-9,.]+)\s*(billion|million|b|m)", desc, re.IGNORECASE
        )
        amount = 0.0
        for val_str, unit in amounts:
            val = float(val_str.replace(",", ""))
            if unit.lower() in ("billion", "b"):
                amount = max(amount, val * 1e9)
            else:
                amount = max(amount, val * 1e6)

        if "approved" in desc or "passed" in desc or "approve" in desc:
            status = "APPROVED"
            approved += 1
            total_approved_value += amount
        elif "reject" in desc or "fail" in desc or "defeated" in desc:
            status = "REJECTED"
            rejected += 1
        else:
            status = "PROPOSED/UNK"

        amt_str = (
            f"${amount / 1e9:.1f}B"
            if amount >= 1e9
            else f"${amount / 1e6:.0f}M"
            if amount >= 1e6
            else "N/A"
        )
        print(
            f"  {e['district_name'][:35]:<36} {e.get('year', '?'):>5} "
            f"{amt_str:>8} {status}"
        )

    print(f"\n  Approved: {approved}  |  Rejected: {rejected}  |  Total: {len(bond_events)}")
    print(f"  Approved bond value: ~${total_approved_value / 1e9:.1f}B")


def analyze_closures(events: list[dict]) -> None:
    print_section("CLOSURES BY DISTRICT")
    closures = [e for e in events if e["event_type"] == "closure"]
    by_district = Counter(e["district_name"] for e in closures)
    for name, cnt in by_district.most_common():
        state = next(
            (e["state"] for e in closures if e["district_name"] == name), ""
        )
        print(f"  {name[:42]:<44} ({state}) {cnt} event(s)")
    print(f"\n  Total: {len(closures)} closure events across {len(by_district)} districts")


def analyze_expansions(events: list[dict]) -> None:
    print_section("EXPANSIONS BY DISTRICT")
    expansions = [
        e for e in events if e["event_type"] in ("expansion", "new_construction")
    ]
    by_district = Counter(e["district_name"] for e in expansions)
    for name, cnt in by_district.most_common():
        state = next(
            (e["state"] for e in expansions if e["district_name"] == name), ""
        )
        print(f"  {name[:42]:<44} ({state}) {cnt} event(s)")
    print(f"\n  Total: {len(expansions)} expansion events across {len(by_district)} districts")


def analyze_sources(events: list[dict]) -> None:
    print_section("SOURCE COVERAGE")
    has_source = sum(1 for e in events if e.get("source_url"))
    print(f"  Events with source URLs: {has_source}/{len(events)} ({100 * has_source // len(events)}%)")

    domains: Counter[str] = Counter()
    for e in events:
        url = e.get("source_url", "")
        if not url:
            continue
        match = re.search(r"https?://(?:www\.)?([^/]+)", url)
        if match:
            domains[match.group(1)] += 1
    print(f"\n  Top source domains:")
    for domain, cnt in domains.most_common(15):
        print(f"    {domain:<40} {cnt:>3}")


def cross_reference_nces(events: list[dict], parquet_path: str) -> None:
    if not HAS_DUCKDB:
        print("\n  [skipped: duckdb not installed]")
        return

    print_section("CROSS-REFERENCE WITH NCES DIRECTORY")

    con = duckdb.connect()
    con.execute(f"CREATE TABLE directory AS SELECT * FROM '{parquet_path}'")

    leas_with_events = set(e["leaid"] for e in events if e["leaid"])
    lea_list = ", ".join(f"'{lea}'" for lea in leas_with_events)

    result = con.execute(f"""
        SELECT leaid,
               COUNT(*) FILTER (WHERE sy_status = 1 AND school_year = '2023-2024') as open_2024,
               COUNT(*) FILTER (WHERE sy_status = 1 AND school_year = '2019-2020') as open_2019,
               COUNT(*) FILTER (WHERE sy_status = 2 AND school_year >= '2019-2020') as nces_closed
        FROM directory
        WHERE leaid IN ({lea_list})
        GROUP BY leaid
    """).fetchall()

    nces_data = {r[0]: {"open_2024": r[1], "open_2019": r[2], "nces_closed": r[3]} for r in result}

    event_counts: dict[str, dict[str, int]] = {}
    for e in events:
        lea = e["leaid"]
        if not lea:
            continue
        if lea not in event_counts:
            event_counts[lea] = {"total": 0, "closure": 0, "expansion": 0}
        event_counts[lea]["total"] += 1
        if e["event_type"] == "closure":
            event_counts[lea]["closure"] += 1
        elif e["event_type"] in ("expansion", "new_construction"):
            event_counts[lea]["expansion"] += 1

    matched = len(leas_with_events & set(nces_data.keys()))
    print(f"  Districts with events matched to NCES: {matched}/{len(leas_with_events)}")
    print(
        f"\n  {'District':<35} {'Open19':>7} {'Open24':>7} {'Chg':>5} "
        f"{'NCESCls':>8} {'Events':>7} {'RptCls':>7}"
    )
    print("  " + "-" * 80)

    district_names = {}
    for e in events:
        if e["leaid"]:
            district_names[e["leaid"]] = e["district_name"]

    for lea in sorted(nces_data, key=lambda x: nces_data[x]["nces_closed"], reverse=True):
        nd = nces_data[lea]
        ec = event_counts.get(lea, {"total": 0, "closure": 0})
        name = district_names.get(lea, lea)[:34]
        change = nd["open_2024"] - nd["open_2019"]
        print(
            f"  {name:<35} {nd['open_2019']:>7} {nd['open_2024']:>7} {change:>+5} "
            f"{nd['nces_closed']:>8} {ec['total']:>7} {ec['closure']:>7}"
        )


def main() -> None:
    root = Path(__file__).parent.parent
    csv_path = root / "data" / "facility_events.csv"

    if not csv_path.exists():
        print(f"Error: {csv_path} not found. Run consolidate.py first.", file=sys.stderr)
        sys.exit(1)

    events = load_events(csv_path)
    print(f"Loaded {len(events)} events from {csv_path.name}")

    analyze_categories(events)
    analyze_by_year(events)
    analyze_bonds(events)
    analyze_closures(events)
    analyze_expansions(events)
    analyze_sources(events)

    parquet_path = "/tmp/directory.parquet"
    if Path(parquet_path).exists():
        cross_reference_nces(events, parquet_path)
    else:
        print("\n  [NCES cross-reference skipped: download directory.parquet first]")
        print("  curl -o /tmp/directory.parquet https://data.usaschooldata.org/directory.parquet")


if __name__ == "__main__":
    main()
