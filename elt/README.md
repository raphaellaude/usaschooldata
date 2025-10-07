# ELT

## Raw data

`data/raw`

- Directories: `029` (school and LEA)
- FRL: `033`
- Membership: `052` (school and LEA)
- School comparision: `129`

### Membership

Manual transformations applied to raw data before processing (that honestly aren't worth coding up):

- Unzip
- Use 7z on some zipfiles
- Glob unzipped dirs to find target CSV
- Clean up invalid UTF-8 CSVs
- Standardize filenames
