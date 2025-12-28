SELECT
  school_year,
  -- Grade breakdown
  SUM(CASE WHEN grade = 'Pre-Kindergarten' THEN student_count ELSE 0 END) as grade_pk,
  SUM(CASE WHEN grade = 'Kindergarten' THEN student_count ELSE 0 END) as grade_k,
  SUM(CASE WHEN grade = 'Grade 1' THEN student_count ELSE 0 END) as grade_01,
  SUM(CASE WHEN grade = 'Grade 2' THEN student_count ELSE 0 END) as grade_02,
  SUM(CASE WHEN grade = 'Grade 3' THEN student_count ELSE 0 END) as grade_03,
  SUM(CASE WHEN grade = 'Grade 4' THEN student_count ELSE 0 END) as grade_04,
  SUM(CASE WHEN grade = 'Grade 5' THEN student_count ELSE 0 END) as grade_05,
  SUM(CASE WHEN grade = 'Grade 6' THEN student_count ELSE 0 END) as grade_06,
  SUM(CASE WHEN grade = 'Grade 7' THEN student_count ELSE 0 END) as grade_07,
  SUM(CASE WHEN grade = 'Grade 8' THEN student_count ELSE 0 END) as grade_08,
  SUM(CASE WHEN grade = 'Grade 9' THEN student_count ELSE 0 END) as grade_09,
  SUM(CASE WHEN grade = 'Grade 10' THEN student_count ELSE 0 END) as grade_10,
  SUM(CASE WHEN grade = 'Grade 11' THEN student_count ELSE 0 END) as grade_11,
  SUM(CASE WHEN grade = 'Grade 12' THEN student_count ELSE 0 END) as grade_12,
  SUM(CASE WHEN grade = 'Grade 13' THEN student_count ELSE 0 END) as grade_13,
  SUM(CASE WHEN grade = 'Ungraded' THEN student_count ELSE 0 END) as ungraded,
  SUM(CASE WHEN grade = 'Adult Education' THEN student_count ELSE 0 END) as adult_education,
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
WHERE ncessch = ? AND school_year = ?
GROUP BY school_year
