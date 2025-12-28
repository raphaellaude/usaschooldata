import {useState, useEffect} from 'react';
import {membershipClient} from '../services/apiClient';
import {transformHistoricalEnrollment} from '../services/apiTransformers';

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
  byGrade: {
    school_year: string;
    grade_pk: number;
    grade_k: number;
    grade_01: number;
    grade_02: number;
    grade_03: number;
    grade_04: number;
    grade_05: number;
    grade_06: number;
    grade_07: number;
    grade_08: number;
    grade_09: number;
    grade_10: number;
    grade_11: number;
    grade_12: number;
    grade_13: number;
    ungraded: number;
    adult_education: number;
  }[];
  isLoading: boolean;
  error: string | null;
  isTableReady: boolean;
}

/**
 * Hook for fetching historical enrollment data from the API
 * Fetches all years at once via GetMembership endpoint
 *
 * @param schoolCode - The NCES school code (12 characters)
 * @param enabled - Whether to start loading data (default: true). Set to false to defer loading.
 */
export function useHistoricalEnrollment(
  schoolCode: string,
  enabled: boolean = true
): HistoricalEnrollmentData {
  const [data, setData] = useState<
    Omit<HistoricalEnrollmentData, 'isLoading' | 'error' | 'isTableReady'>
  >({
    byYear: [],
    byRaceEthnicity: [],
    bySex: [],
    byGrade: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolCode || schoolCode.length !== 12) {
      setIsLoading(false);
      return;
    }

    if (!enabled) {
      setIsLoading(true); // Keep loading state until enabled
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await membershipClient.getMembership({
          ncessch: schoolCode,
        });

        if (!response.byYear || response.byYear.length === 0) {
          setError('No historical data available');
          return;
        }

        const transformed = transformHistoricalEnrollment(response.byYear);
        setData(transformed);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load historical enrollment data from API';
        setError(errorMessage);
        console.error('API historical enrollment loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [schoolCode, enabled]);

  return {
    ...data,
    isLoading,
    error,
    isTableReady: !isLoading && !error, // API doesn't need table creation, so this is simple
  };
}
