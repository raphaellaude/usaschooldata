SELECT
  school_year,
  -- Race/ethnic breakdown
  SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) as native_american,
  SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) as asian,
  SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) as black,
  SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) as hispanic,
  SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) as pacific_islander,
  SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) as multiracial,
  SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) as white,
  -- Gender breakdown
  SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male,
  SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female,
  -- Total enrollment
  SUM(student_count) as total_enrollment
FROM membership
WHERE ncessch = ?
GROUP BY school_year
ORDER BY school_year ASC
