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
 */
export function useHistoricalEnrollment(
  schoolCode: string,
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

  useEffect(() => {
    if (!schoolCode || schoolCode.length !== 12) {
      setIsLoading(false);
      return;
    }

    if (!enabled) {
      setIsLoading(true);
      return;
    }

    if (!isInitialized) {
      return;
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
      await dataService.createSchoolMembershipHistoricalTable(schoolCode);
      setIsTableReady(true);

      const yearData = await dataService.getHistoricalEnrollmentByYear(schoolCode);
      setByYear(yearData);

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
