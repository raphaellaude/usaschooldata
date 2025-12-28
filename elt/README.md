# ELT

## Raw data

`data/raw`

- Directories: `029` (school and LEA)
- FRL: `033`
- Membership: `052` (school and LEA)
- School comparision: `129`

### Membership

Transformations:

- Unzip (some require 7z)
- Glob unzipped dirs to find target CSVs
- Clean up invalid UTF-8 CSVs
- Standardize schemas across years
- Normalize `student_count` field

### Dev set up

Set the following env vars

```
DIRECTORY=../data # or path to your data mout
SOURCE_DATA={path to your downloaded data}

# Clickhouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=your_strong_password
CLICKHOUSE_PORT=8123 # Not needed for production
CLICKHOUSE_ENV="development"
```
