export const DEFAULT_SCHOOL_YEAR = '2023-2024';

export const AVAILABLE_YEARS = [
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
] as const;

export const RACE_ETHNICITY_VALUES = [
  'Native Hawaiian or Other Pacific Islander',
  'Two or more races',
  'Asian',
  'Black or African American',
  'American Indian or Alaska Native',
  'Hispanic/Latino',
  'White',
] as const;

export const SEX_VALUES = ['Female', 'Male'] as const;

export const GRADE_VALUES = [
  'Pre-Kindergarten',
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Grade 13',
  'Ungraded',
  'Adult Education',
] as const;

export class YearNotAvailableError extends Error {
  public requestedYear: string;
  public availableYears: string[];

  constructor(requestedYear: string, availableYears: string[]) {
    super(
      `Data for school year ${requestedYear} is not available. Available years: ${availableYears.join(', ')}`
    );
    this.name = 'YearNotAvailableError';
    this.requestedYear = requestedYear;
    this.availableYears = availableYears;
  }
}

/** SQL CASE expression for grade ordering, reused across queries */
export const GRADE_ORDER_CASE = `
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
