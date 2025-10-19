import os
import click
import duckdb
import yaml
import logging
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from elt.constants import SQL_DIR, SCHEMAS_DIR, MEMBERSHIP_ALL_YEARS, DIRECTORY
from pathlib import Path
from elt.utils import get_all_csvs_in_zip, clean_csv_to_utf8

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@click.group()
def cli():
    pass


@cli.command(name="directory")
@click.option(
    "-y",
    "--school-year",
    type=str,
    multiple=True,
    default=MEMBERSHIP_ALL_YEARS,
    required=False,
)
def directory(school_year: list[str]):
    conn = duckdb.connect(":memory:")

    env = Environment(loader=FileSystemLoader(SQL_DIR), undefined=StrictUndefined)
    template = env.get_template("directory.sql")

    with open(str(SCHEMAS_DIR / "config.yml")) as f:
        config = yaml.safe_load(f.read())

    for yr in school_year:
        logger.info(f"processing {yr}")
        year_config = config["directory"][yr]
        table_name = year_config["table_name"]
        zip_name = year_config["zip_name"]

        assert DIRECTORY is not None and os.path.exists(DIRECTORY), (
            f"Directory {DIRECTORY} does not exist"
        )
        source_data_directory = Path(DIRECTORY) / "raw" / "directory"

        zip_path = source_data_directory / zip_name
        logger.info(f"Processing zip file: {zip_path}")
        csvs = get_all_csvs_in_zip(zip_path)
        file_path = csvs[0]
        clean_csv_to_utf8(file_path)
        logger.info(f"Found CSV: {file_path}")

        # TODO: issues noticed
        # - sch level changes from code to text description in 1617
        data_prep_sql = template.render(
            file_path=file_path, school_year=yr, mapping=year_config["mapping"]
        )
        sql = f"CREATE OR REPLACE TABLE {table_name} AS\n{data_prep_sql}"
        conn.execute(sql)

        write_sql_template = f"""
        COPY (
            SELECT
                *,
                substr(ncessch, 1, 8) as leaid,
                substr(ncessch, 1, 2) as state_leaid,
            FROM {table_name}
            ORDER BY ncessch
        ) TO '{DIRECTORY}/directory/{table_name}.parquet' (
            FORMAT parquet,
            OVERWRITE_OR_IGNORE,
            COMPRESSION snappy
        );
        """
        conn.execute(write_sql_template)

    # TODO: combine into one table / file


@cli.command(name="membership")
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

    with open(str(SCHEMAS_DIR / "config.yml")) as f:
        config = yaml.safe_load(f.read())

    for yr in school_year:
        logger.info(f"processing {yr}")
        year_config = config["membership"][yr]
        table_name = year_config["table_name"]
        zip_name = year_config["zip_name"]

        assert DIRECTORY is not None and os.path.exists(DIRECTORY), (
            f"Directory {DIRECTORY} does not exist"
        )
        source_data_directory = Path(DIRECTORY) / "raw" / "membership"

        zip_path = source_data_directory / zip_name
        logger.info(f"Processing zip file: {zip_path}")
        csvs = get_all_csvs_in_zip(zip_path)
        file_path = csvs[0]
        clean_csv_to_utf8(file_path)
        logger.info(f"Found CSV: {file_path}")

        data_prep_sql = template.render(
            file_path=file_path, school_year=yr, mapping=year_config["mapping"]
        )
        sql = f"CREATE OR REPLACE TABLE {table_name} AS\n{data_prep_sql}"
        conn.execute(sql)

        write_hive_partition_sql = f"""
        COPY (
            SELECT
                * EXCLUDE(total_indicator, dms_flag),
                -- Example `020000100206` is state=02 alaska, district_id=00001, full leaid is `0200001`
                substr(ncessch, 1, 8) as leaid,
                substr(ncessch, 1, 2) as state_leaid,
            FROM {table_name}
            -- It's really hard for users to know that the data contains both aggregates
            -- and raw counts. To provide more analysis ready data, let's normalize the
            -- student_count column
            WHERE race_ethnicity <> 'No Category Codes'
                AND grade <> 'No Category Codes'
                AND sex <> 'No Category Codes'
                AND dms_flag = 'Reported'\
            -- Ordering should help with predicate pushdown in order of most queried for attributes
            ORDER BY ncessch, grade, race_ethnicity, sex
        ) TO '{DIRECTORY}/membership' (
            FORMAT parquet,
            PARTITION_BY (school_year, state_leaid),
            OVERWRITE_OR_IGNORE,
            COMPRESSION snappy
        );
        """
        conn.execute(write_hive_partition_sql)


if __name__ == "__main__":
    cli()
