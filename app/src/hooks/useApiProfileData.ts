import {useState, useEffect} from 'react';
import {apiService} from '../services/apiService';
import type {SchoolSummary, DistrictSummary} from '../services/dataService';

export interface ApiProfileData {
  summary: SchoolSummary | DistrictSummary | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch profile data from the API
 * Currently only supports schools (districts will use DuckDB fallback)
 */
export function useApiProfileData(
  entityType: 'district' | 'school',
  entityCode: string,
  schoolYear?: string
): ApiProfileData {
  const [summary, setSummary] = useState<SchoolSummary | DistrictSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityCode) {
      setIsLoading(false);
      return;
    }

    // Only schools are supported by the API for now
    if (entityType !== 'school') {
      setIsLoading(false);
      setError('Districts not yet supported by API');
      return;
    }

    loadProfileData();
  }, [entityType, entityCode, schoolYear]);

  const loadProfileData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (entityType === 'school') {
        const summaryData = await apiService.getSchoolSummary(entityCode, schoolYear);
        setSummary(summaryData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
      setError(errorMessage);
      console.error('API profile data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    summary,
    isLoading,
    error,
  };
}
