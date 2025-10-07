import os
import click
import duckdb
import yaml
import logging
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from elt.constants import SQL_DIR, SCHEMAS_DIR, MEMBERSHIP_ALL_YEARS, DIRECTORY
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@click.group()
def cli():
    pass


@cli.command()
@click.option(
    "-y",
    "--school-year",
    type=str,
    multiple=True,
    default=MEMBERSHIP_ALL_YEARS,
    required=False,
)
def membership(school_year: list[str]):
    conn = duckdb.connect(":memory:")

    env = Environment(loader=FileSystemLoader(SQL_DIR), undefined=StrictUndefined)
    template = env.get_template("membership.sql")

    with open(str(SCHEMAS_DIR / "membership.yml")) as f:
        config = yaml.safe_load(f.read())

    for yr in school_year:
        logger.info(f"processing {yr}")
        year_config = config["raw"][yr]
        table_name = year_config["table_name"]

        assert DIRECTORY is not None and os.path.exists(DIRECTORY), (
            f"Directory {DIRECTORY} does not exist"
        )
        directory = Path(DIRECTORY)
        file_path = directory / "raw" / "membership" / f"{table_name}.csv"

        data_prep_sql = template.render(
            file_path=file_path, school_year=yr, mapping=year_config["mapping"]
        )
        sql = f"CREATE OR REPLACE TABLE {table_name} AS\n{data_prep_sql}"
        conn.execute(sql)

        write_hive_partition_sql = f"""
        COPY (
            SELECT
                * EXCLUDE(total_indicator, dms_flag)
            FROM {table_name}
            -- It's really hard for users to know that the data contains both aggregates
            -- and raw counts. To provide more analysis ready data, let's normalize the
            -- student_count column
            WHERE race_ethnicity <> 'No Category Codes'
                AND grade <> 'No Category Codes'
                AND sex <> 'No Category Codes'
                AND dms_flag = 'Reported'
        ) TO '{DIRECTORY}/membership' (
            FORMAT parquet,
            PARTITION_BY (school_year, state_code),
            OVERWRITE_OR_IGNORE,
            COMPRESSION snappy
        );
        """
        conn.execute(write_hive_partition_sql)


if __name__ == "__main__":
    cli()
