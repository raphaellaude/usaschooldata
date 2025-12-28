import {useState, useEffect} from 'react';
import {membershipClient} from '../services/apiClient';
import {transformHistoricalEnrollment} from '../services/apiTransformers';
import type {HistoricalEnrollmentData} from './useHistoricalEnrollment';

/**
 * Hook for fetching historical enrollment data from the API
 * Fetches all years at once via GetMembership endpoint
 *
 * @param schoolCode - The NCES school code (12 characters)
 * @param enabled - Whether to start loading data (default: true). Set to false to defer loading.
 */
export function useApiHistoricalEnrollment(
  schoolCode: string,
  enabled: boolean = true
): HistoricalEnrollmentData {
  const [data, setData] = useState<
    Omit<HistoricalEnrollmentData, 'isLoading' | 'error' | 'isTableReady'>
  >({
    byYear: [],
    byRaceEthnicity: [],
    bySex: [],
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
