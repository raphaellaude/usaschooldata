"""CLI entry point for facility events collection and analysis.

Usage:
    python -m collect.cli consolidate   # Merge YAML files -> CSV
    python -m collect.cli analyze       # Print analysis of CSV
    python -m collect.cli targets       # Show priority districts for research
"""

from pathlib import Path

import click

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"


@click.group()
def main() -> None:
    """Collect, consolidate, and analyze school facility events."""


@main.command()
def consolidate() -> None:
    """Merge all YAML research files into events.csv + sources.csv."""
    from .consolidate import consolidate as do_consolidate

    do_consolidate(DATA_DIR, DATA_DIR)


@main.command()
def analyze() -> None:
    """Print analysis of the consolidated events CSV."""
    from .analyze import main as do_analyze

    do_analyze()


@main.command()
def targets() -> None:
    """Show priority districts for the next round of research.

    Identifies large districts with enrollment changes that may have
    unreported facility events.
    """
    try:
        import duckdb
    except ImportError:
        click.echo("duckdb required: pip install duckdb", err=True)
        raise SystemExit(1)

    parquet = Path("/tmp/directory.parquet")
    if not parquet.exists():
        click.echo("Downloading directory.parquet from R2...")
        import subprocess

        subprocess.run(
            [
                "curl",
                "-sL",
                "-o",
                str(parquet),
                "https://data.usaschooldata.org/directory.parquet",
            ],
            check=True,
        )

    con = duckdb.connect()
    con.execute(f"CREATE TABLE d AS SELECT * FROM '{parquet}'")

    click.echo("\nDistricts with most NCES-reported closures (2019-2024) but few researched events:\n")

    csv_path = DATA_DIR / "facility_events.csv"
    if csv_path.exists():
        con.execute(
            f"CREATE TABLE events AS SELECT * FROM read_csv_auto('{csv_path}', all_varchar=true)"
        )
        result = con.execute("""
            WITH nces AS (
                SELECT leaid, state_code,
                       COUNT(*) FILTER (WHERE sy_status = 2) as closed,
                       COUNT(*) FILTER (WHERE sy_status = 1 AND school_year = '2023-2024') as open_2024
                FROM d
                WHERE school_year >= '2019-2020'
                GROUP BY leaid, state_code
                HAVING COUNT(*) FILTER (WHERE sy_status = 2) >= 5
            ),
            researched AS (
                SELECT leaid, COUNT(*) as event_count
                FROM events
                WHERE leaid IS NOT NULL AND leaid != ''
                GROUP BY leaid
            )
            SELECT n.leaid, n.state_code, n.closed, n.open_2024,
                   COALESCE(r.event_count, 0) as researched
            FROM nces n
            LEFT JOIN researched r ON n.leaid = r.leaid
            WHERE COALESCE(r.event_count, 0) < 3
            ORDER BY n.closed DESC
            LIMIT 30
        """).fetchall()

        click.echo(f"  {'LEA ID':<12} {'State':>5} {'NCES Closed':>12} {'Open 2024':>10} {'Researched':>11}")
        click.echo("  " + "-" * 55)
        for r in result:
            click.echo(
                f"  {r[0]:<12} {r[1]:>5} {r[2]:>12} {r[3]:>10} {r[4]:>11}"
            )
    else:
        click.echo("No events CSV found. Run 'consolidate' first.")


if __name__ == "__main__":
    main()
