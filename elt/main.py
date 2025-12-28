import os
import click
import duckdb
import yaml
import logging
import clickhouse_connect as ch
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from elt.constants import (
    SQL_DIR,
    SCHEMAS_DIR,
    MEMBERSHIP_ALL_YEARS,
    DIRECTORY,
    CLICKHOUSE_PASSWORD,
    CLICKHOUSE_HOST,
    CLICKHOUSE_PORT,
    CLICKHOUSE_USER,
    CLICKHOUSE_ENV,
)
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

    # Combine into one table
    combine_sql = f"""
    COPY (
        SELECT
            *,
            -- TODO: clean up grade labels (e.g. grade_pk) maps to true, false, Yes, Y, Not reported, No, and N
            ROW_NUMBER() OVER (PARTITION BY ncessch ORDER BY school_year DESC) as school_year_no
        FROM '{DIRECTORY}/directory/*.parquet'
        ORDER BY school_year DESC, ncessch
    ) TO '{DIRECTORY}/directory.parquet'
    """
    conn.execute(combine_sql)


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


def _get_clickhouse_client():
    if CLICKHOUSE_ENV == "production":
        client = ch.get_client(
            host=CLICKHOUSE_HOST,
            username=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
            secure=True,
        )
    else:
        assert isinstance(CLICKHOUSE_PORT, int)
        client = ch.get_client(
            host=CLICKHOUSE_HOST,
            port=CLICKHOUSE_PORT,
            username=CLICKHOUSE_USER,
            password=CLICKHOUSE_PASSWORD,
        )

    if client.ping():
        print("Connection successful")

    return client


@cli.command("load_membership")
def load_membership():
    client = _get_clickhouse_client()

    client.query(
        """
        CREATE OR REPLACE TABLE membership (
            state_code VARCHAR(2),
            ncessch VARCHAR(12),
            race_ethnicity VARCHAR(52),
            grade VARCHAR(16),
            sex VARCHAR(6),
            student_count INT,
            leaid VARCHAR(8),
            school_year VARCHAR(9),
            state_leaid VARCHAR(2)
        )
        ENGINE = MergeTree
        PRIMARY KEY (school_year, ncessch)
        ORDER BY (school_year, ncessch, grade, race_ethnicity, sex);
        """
    )

    assert DIRECTORY is not None

    conn = duckdb.connect(":memory:")

    query = f"""
        SELECT * FROM read_parquet('{DIRECTORY}/membership/school_year=*/state_leaid=*/*.parquet', hive_partitioning=True)
    """

    arrow_reader = conn.execute(query).fetch_record_batch(rows_per_batch=100_000)

    for idx, batch in enumerate(arrow_reader):
        df = batch.to_pandas()
        client.insert_df("membership", df)
        logger.info(f"Inserted batch {idx}")

    result = client.query("SELECT COUNT(*) FROM membership")
    print(f"Loaded {result.result_set[0][0]} rows")


@cli.command("load_directory")
def load_directory():
    client = _get_clickhouse_client()

    # client.query("SET enable_full_text_index = true;")

    client.query(
        """
        CREATE OR REPLACE TABLE directory (
            school_year_no INT,
            school_year VARCHAR(9),
            ncessch VARCHAR(12),
            sch_name VARCHAR(60),
            sch_type INT,
            sch_level VARCHAR(15),
            charter VARCHAR(14),
            sy_status INT,
            sy_status_updated INT,
            state_code VARCHAR(2),
            state_leaid VARCHAR(2),
            leaid VARCHAR(8),
            INDEX sch_name_idx sch_name TYPE tokenbf_v1(10240, 3, 0) GRANULARITY 4
            -- Available in CH 25.12. Currently CH cloud on 25.8
            -- INDEX idx(sch_name) TYPE text(tokenizer = 'splitByNonAlpha', preprocessor = lower(sch_name))
        )
        ENGINE = MergeTree
        PRIMARY KEY (school_year_no, sch_type, sch_level, ncessch)
        ORDER BY (school_year_no, sch_type, sch_level, ncessch, sch_name);
        """
    )

    assert DIRECTORY is not None

    conn = duckdb.connect(":memory:")

    query = f"""
        SELECT
            * EXCLUDE(
                grade_pk, grade_kg, grade_01, grade_02, grade_03, grade_04,
                grade_05, grade_06, grade_07, grade_08, grade_09, grade_10,
                grade_11, grade_12, grade_13, grade_ug, grade_ae
            )
        FROM read_parquet('{DIRECTORY}/directory.parquet')
    """

    arrow_reader = conn.execute(query).fetch_record_batch(rows_per_batch=100_000)

    for idx, batch in enumerate(arrow_reader):
        df = batch.to_pandas()
        client.insert_df("directory", df)
        logger.info(f"Inserted batch {idx}")

    result = client.query("SELECT COUNT(*) FROM directory")
    print(f"Loaded {result.result_set[0][0]} rows")


if __name__ == "__main__":
    cli()
