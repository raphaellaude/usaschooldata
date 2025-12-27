SELECT
  school_year,
  SUM(student_count) as total_enrollment
FROM membership
WHERE ncessch = ?
GROUP BY school_year
ORDER BY school_year ASC
