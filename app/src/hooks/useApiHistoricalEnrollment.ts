import {useState, useEffect} from 'react';
import {apiService} from '../services/apiService';

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
}

/**
 * Hook to fetch historical enrollment data from the API
 */
export function useApiHistoricalEnrollment(schoolCode: string): HistoricalEnrollmentData {
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

  useEffect(() => {
    if (!schoolCode) {
      setIsLoading(false);
      return;
    }

    loadHistoricalData();
  }, [schoolCode]);

  const loadHistoricalData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all historical data in parallel
      const [byYearData, byRaceEthnicityData, bySexData] = await Promise.all([
        apiService.getHistoricalEnrollmentByYear(schoolCode),
        apiService.getHistoricalEnrollmentByRaceEthnicity(schoolCode),
        apiService.getHistoricalEnrollmentBySex(schoolCode),
      ]);

      setByYear(byYearData);
      setByRaceEthnicity(byRaceEthnicityData);
      setBySex(bySexData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load historical enrollment data';
      setError(errorMessage);
      console.error('API historical enrollment loading error:', err);
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
  };
}
