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
 * Hook for fetching historical enrollment data for a school or district
 * Creates a historical membership table on mount and provides data for different breakdowns
 *
 * @param code - The NCES code (12 characters for school, 8 characters for district)
 * @param entityType - Whether this is a 'school' or 'district'
 * @param enabled - Whether to start loading data (default: true). Set to false to defer loading.
 */
export function useHistoricalEnrollment(
  code: string,
  entityType: 'school' | 'district' = 'school',
  enabled: boolean = true
): HistoricalEnrollmentData {
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

  const expectedLength = entityType === 'school' ? 12 : 8;

  useEffect(() => {
    if (!code || code.length !== expectedLength) {
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
  }, [code, entityType, enabled, isInitialized, dbError, expectedLength]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);
    setIsTableReady(false);

    try {
      if (entityType === 'school') {
        // First, create the historical table with all years
        await dataService.createSchoolMembershipHistoricalTable(code);
        setIsTableReady(true);

        // Fetch historical data
        const yearData = await dataService.getHistoricalEnrollmentByYear(code);
        setByYear(yearData);

        const [raceData, sexData] = await Promise.all([
          dataService.getHistoricalEnrollmentByRaceEthnicity(code),
          dataService.getHistoricalEnrollmentBySex(code),
        ]);

        setByRaceEthnicity(raceData);
        setBySex(sexData);
      } else {
        // District historical data
        await dataService.createDistrictMembershipHistoricalTable(code);
        setIsTableReady(true);

        const yearData = await dataService.getDistrictHistoricalEnrollmentByYear(code);
        setByYear(yearData);

        const [raceData, sexData] = await Promise.all([
          dataService.getDistrictHistoricalEnrollmentByRaceEthnicity(code),
          dataService.getDistrictHistoricalEnrollmentBySex(code),
        ]);

        setByRaceEthnicity(raceData);
        setBySex(sexData);
      }
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
