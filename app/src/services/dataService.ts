export interface MembershipQueryOptions {
  schoolCode?: string;
  districtCode?: string;
  schoolYear?: string;
  grade?: string;
  raceEthnicity?: string;
  sex?: string;
}

export interface DemographicsData {
  byRaceEthnicity: Record<string, number>;
  bySex: Record<string, number>;
}

export interface SchoolSummary {
  schoolCode: string;
  totalEnrollment: number;
  earliestYear: string;
  latestYear: string;
  demographics: DemographicsData;
}

export interface DistrictSummary {
  districtCode: string;
  totalEnrollment: number;
  schoolCount: number;
  earliestYear: string;
  latestYear: string;
  demographics: DemographicsData;
}

// Constants for unique values in the data
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
  'Grade 11',
  'Grade 12',
  'Grade 10',
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
