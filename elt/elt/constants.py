import os
from pathlib import Path

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
BUCKET = os.environ.get("BUCKET_NAME")
MEMBERSHIP_PREFIX_FORMAT = "membership/year={year}/state={state}/ccd_sch.parquet"

IO_TYPE = "file"
