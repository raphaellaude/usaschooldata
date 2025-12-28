SELECT
    school_year_no,
    school_year,
    ncessch,
    sch_name,
    sch_type,
    sch_level,
    charter,
    sy_status,
    sy_status_updated,
    state_code,
    state_leaid,
    leaid
FROM directory
WHERE ncessch = ? AND school_year = ?;
