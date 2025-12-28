import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PARENT_DIR = Path(__file__).parent.parent
SQL_DIR = PARENT_DIR / "sql"
SCHEMAS_DIR = PARENT_DIR / "schemas"

MEMBERSHIP_ALL_YEARS = [
    "sy2324",
    "sy2223",
    "sy2122",
    "sy2021",
    "sy1920",
    "sy1819",
    "sy1718",
    "sy1617",
    "sy1516",
    "sy1415",
]
DIRECTORY = os.environ.get("DIRECTORY")
BUCKET_NAME = os.environ.get("BUCKET_NAME")
MEMBERSHIP_PREFIX_FORMAT = "membership/year={year}/state={state}/ccd_sch.parquet"

IO_TYPE = "file"

CLICKHOUSE_ENV = os.environ.get("CLICKHOUSE_ENV", "development")
CLICKHOUSE_HOST = os.environ.get("CLICKHOUSE_HOST", "localhost")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ["CLICKHOUSE_PASSWORD"]
CLICKHOUSE_PORT: int = int(os.environ.get("CLICKHOUSE_PORT", 8123))
