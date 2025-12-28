SELECT
    ncessch,
    sch_name,
    school_year
FROM "directory"
WHERE school_year_no = 1 AND
    hasTokenCaseInsensitive(sch_name, ?)
LIMIT 10 OFFSET 0;
