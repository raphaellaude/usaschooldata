/** Types for historical enrollment data, used by HistoricalSection and HistoricalEnrollmentChart */

export type BreakdownType = 'none' | 'race_ethnicity' | 'sex';

export interface HistoricalEnrollmentData {
  byYear: {school_year: string; total_enrollment: number}[];
  byRaceEthnicity: {
    school_year: string;
    white: number;
    black: number;
    hispanic: number;
    asian: number;
    native_american: number;
    pacific_islander: number;
    multiracial: number;
  }[];
  bySex: {school_year: string; male: number; female: number}[];
  isLoading: boolean;
  error: string | null;
  isTableReady: boolean;
}
