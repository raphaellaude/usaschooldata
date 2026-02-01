/**
 * SQL query generators for displaying to users.
 * These queries are designed to be run against the public data at data.usaschooldata.com
 */

const DATA_DOMAIN = 'https://data.usaschooldata.com';

/**
 * Generate the parquet file URL for a given state and year
 */
function getParquetUrl(stateCode: string, schoolYear: string): string {
  return `${DATA_DOMAIN}/membership/school_year=${schoolYear}/state_leaid=${stateCode}/data_0.parquet`;
}

/**
 * SQL to get students by grade for a school
 */
export function getStudentsByGradeSQL(ncessch: string, schoolYear: string): string {
  const stateCode = ncessch.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  grade,
  SUM(student_count) AS student_count
FROM read_parquet('${url}')
WHERE ncessch = '${ncessch}'
GROUP BY grade
ORDER BY
  CASE grade
    WHEN 'Pre-Kindergarten' THEN -1
    WHEN 'Kindergarten' THEN 0
    WHEN 'Grade 1' THEN 1
    WHEN 'Grade 2' THEN 2
    WHEN 'Grade 3' THEN 3
    WHEN 'Grade 4' THEN 4
    WHEN 'Grade 5' THEN 5
    WHEN 'Grade 6' THEN 6
    WHEN 'Grade 7' THEN 7
    WHEN 'Grade 8' THEN 8
    WHEN 'Grade 9' THEN 9
    WHEN 'Grade 10' THEN 10
    WHEN 'Grade 11' THEN 11
    WHEN 'Grade 12' THEN 12
    WHEN 'Grade 13' THEN 13
    WHEN 'Ungraded' THEN 20
    WHEN 'Adult Education' THEN 21
    ELSE 99
  END`;
}

/**
 * SQL to get demographics by sex for a school
 */
export function getDemographicsBySexSQL(ncessch: string, schoolYear: string): string {
  const stateCode = ncessch.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  sex,
  SUM(student_count) AS student_count
FROM read_parquet('${url}')
WHERE ncessch = '${ncessch}'
GROUP BY sex`;
}

/**
 * SQL to get demographics by race/ethnicity for a school
 */
export function getDemographicsByRaceSQL(ncessch: string, schoolYear: string): string {
  const stateCode = ncessch.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  race_ethnicity,
  SUM(student_count) AS student_count
FROM read_parquet('${url}')
WHERE ncessch = '${ncessch}'
GROUP BY race_ethnicity
ORDER BY race_ethnicity`;
}

/**
 * SQL to get raw membership data for a school
 */
export function getRawMembershipDataSQL(ncessch: string, schoolYear: string): string {
  const stateCode = ncessch.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  school_year,
  grade,
  race_ethnicity,
  sex,
  student_count
FROM read_parquet('${url}')
WHERE ncessch = '${ncessch}'
ORDER BY
  school_year DESC,
  CASE grade
    WHEN 'Pre-Kindergarten' THEN -1
    WHEN 'Kindergarten' THEN 0
    WHEN 'Grade 1' THEN 1
    WHEN 'Grade 2' THEN 2
    WHEN 'Grade 3' THEN 3
    WHEN 'Grade 4' THEN 4
    WHEN 'Grade 5' THEN 5
    WHEN 'Grade 6' THEN 6
    WHEN 'Grade 7' THEN 7
    WHEN 'Grade 8' THEN 8
    WHEN 'Grade 9' THEN 9
    WHEN 'Grade 10' THEN 10
    WHEN 'Grade 11' THEN 11
    WHEN 'Grade 12' THEN 12
    WHEN 'Grade 13' THEN 13
    WHEN 'Ungraded' THEN 20
    WHEN 'Adult Education' THEN 21
    ELSE 99
  END,
  race_ethnicity,
  sex`;
}

/**
 * SQL to get historical enrollment by year for a school
 */
export function getHistoricalEnrollmentByYearSQL(ncessch: string): string {
  const stateCode = ncessch.substring(0, 2);

  // Generate URLs for all available years
  const years = [
    '2023-2024',
    '2022-2023',
    '2021-2022',
    '2020-2021',
    '2019-2020',
    '2018-2019',
    '2017-2018',
    '2016-2017',
    '2015-2016',
    '2014-2015',
  ];

  const urls = years.map(year => `'${getParquetUrl(stateCode, year)}'`).join(',\n  ');

  return `SELECT
  school_year,
  SUM(student_count) AS total_enrollment
FROM read_parquet([
  ${urls}
])
WHERE ncessch = '${ncessch}'
GROUP BY school_year
ORDER BY school_year ASC`;
}

/**
 * SQL to get historical enrollment by race/ethnicity for a school
 */
export function getHistoricalEnrollmentByRaceSQL(ncessch: string): string {
  const stateCode = ncessch.substring(0, 2);

  const years = [
    '2023-2024',
    '2022-2023',
    '2021-2022',
    '2020-2021',
    '2019-2020',
    '2018-2019',
    '2017-2018',
    '2016-2017',
    '2015-2016',
    '2014-2015',
  ];

  const urls = years.map(year => `'${getParquetUrl(stateCode, year)}'`).join(',\n  ');

  return `SELECT
  school_year,
  SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) AS native_american,
  SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) AS asian,
  SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) AS black,
  SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) AS hispanic,
  SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) AS pacific_islander,
  SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) AS multiracial,
  SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) AS white
FROM read_parquet([
  ${urls}
])
WHERE ncessch = '${ncessch}'
GROUP BY school_year
ORDER BY school_year ASC`;
}

/**
 * SQL to get historical enrollment by sex for a school
 */
export function getHistoricalEnrollmentBySexSQL(ncessch: string): string {
  const stateCode = ncessch.substring(0, 2);

  const years = [
    '2023-2024',
    '2022-2023',
    '2021-2022',
    '2020-2021',
    '2019-2020',
    '2018-2019',
    '2017-2018',
    '2016-2017',
    '2015-2016',
    '2014-2015',
  ];

  const urls = years.map(year => `'${getParquetUrl(stateCode, year)}'`).join(',\n  ');

  return `SELECT
  school_year,
  SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) AS male,
  SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) AS female
FROM read_parquet([
  ${urls}
])
WHERE ncessch = '${ncessch}'
GROUP BY school_year
ORDER BY school_year ASC`;
}

/**
 * SQL to get raw membership data for a district
 */
export function getDistrictRawMembershipDataSQL(leaid: string, schoolYear: string): string {
  const stateCode = leaid.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  ncessch,
  school_year,
  grade,
  race_ethnicity,
  sex,
  SUM(student_count) AS total_student_count
FROM read_parquet('${url}')
WHERE leaid = '${leaid}'
GROUP BY ncessch, school_year, grade, race_ethnicity, sex
ORDER BY
  school_year DESC,
  ncessch,
  CASE grade
    WHEN 'Pre-Kindergarten' THEN -1
    WHEN 'Kindergarten' THEN 0
    WHEN 'Grade 1' THEN 1
    WHEN 'Grade 2' THEN 2
    WHEN 'Grade 3' THEN 3
    WHEN 'Grade 4' THEN 4
    WHEN 'Grade 5' THEN 5
    WHEN 'Grade 6' THEN 6
    WHEN 'Grade 7' THEN 7
    WHEN 'Grade 8' THEN 8
    WHEN 'Grade 9' THEN 9
    WHEN 'Grade 10' THEN 10
    WHEN 'Grade 11' THEN 11
    WHEN 'Grade 12' THEN 12
    WHEN 'Grade 13' THEN 13
    WHEN 'Ungraded' THEN 20
    WHEN 'Adult Education' THEN 21
    ELSE 99
  END,
  race_ethnicity,
  sex`;
}

/**
 * SQL to get demographics by sex for a district
 */
export function getDistrictDemographicsBySexSQL(leaid: string, schoolYear: string): string {
  const stateCode = leaid.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  sex,
  SUM(student_count) AS student_count
FROM read_parquet('${url}')
WHERE leaid = '${leaid}'
GROUP BY sex`;
}

/**
 * SQL to get demographics by race/ethnicity for a district
 */
export function getDistrictDemographicsByRaceSQL(leaid: string, schoolYear: string): string {
  const stateCode = leaid.substring(0, 2);
  const url = getParquetUrl(stateCode, schoolYear);

  return `SELECT
  race_ethnicity,
  SUM(student_count) AS student_count
FROM read_parquet('${url}')
WHERE leaid = '${leaid}'
GROUP BY race_ethnicity
ORDER BY race_ethnicity`;
}
