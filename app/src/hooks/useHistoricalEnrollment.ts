import {useState, useEffect} from 'react';
import {dataService} from '../services/dataService';
import {useDuckDB} from './useDuckDB';

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

/**
 * Hook for fetching historical enrollment data for a school
 * Creates a historical membership table on mount and provides data for different breakdowns
 *
 * @param schoolCode - The NCES school code (12 characters)
 * @param enabled - Whether to start loading data (default: true). Set to false to defer loading.
 */
export function useHistoricalEnrollment(schoolCode: string, enabled: boolean = true): HistoricalEnrollmentData {
  const [byYear, setByYear] = useState<{school_year: string; total_enrollment: number}[]>([]);
  const [byRaceEthnicity, setByRaceEthnicity] = useState<
    {
      school_year: string;
      white: number;
      black: number;
      hispanic: number;
      asian: number;
      native_american: number;
      pacific_islander: number;
      multiracial: number;
    }[]
  >([]);
  const [bySex, setBySex] = useState<{school_year: string; male: number; female: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTableReady, setIsTableReady] = useState(false);
  const {isInitialized, error: dbError} = useDuckDB();

  useEffect(() => {
    if (!schoolCode || schoolCode.length !== 12) {
      setIsLoading(false);
      return;
    }

    if (!enabled) {
      setIsLoading(true); // Keep loading state until enabled
      return;
    }

    if (!isInitialized) {
      return; // Wait for DuckDB to be initialized
    }

    if (dbError) {
      setError(`Database error: ${dbError}`);
      setIsLoading(false);
      return;
    }

    loadHistoricalData();
  }, [schoolCode, enabled, isInitialized, dbError]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);
    setIsTableReady(false);

    try {
      // First, create the historical table with all years
      // This is the expensive operation that loads all the data
      await dataService.createSchoolMembershipHistoricalTable(schoolCode);
      setIsTableReady(true);

      // Now fetch the default view (total enrollment by year)
      // This is fast because it's querying from the in-memory table
      const yearData = await dataService.getHistoricalEnrollmentByYear(schoolCode);
      setByYear(yearData);

      // Pre-fetch the breakdown data as well since the table is already loaded
      // This makes switching between views instant
      const [raceData, sexData] = await Promise.all([
        dataService.getHistoricalEnrollmentByRaceEthnicity(schoolCode),
        dataService.getHistoricalEnrollmentBySex(schoolCode),
      ]);

      setByRaceEthnicity(raceData);
      setBySex(sexData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load historical enrollment data';
      setError(errorMessage);
      console.error('Historical enrollment loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    byYear,
    byRaceEthnicity,
    bySex,
    isLoading,
    error,
    isTableReady,
  };
}
