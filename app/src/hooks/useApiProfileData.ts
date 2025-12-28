import {useState, useEffect} from 'react';
import {membershipClient} from '../services/apiClient';
import {transformTotalEnrollmentToSummary} from '../services/apiTransformers';
import type {SchoolSummary, DistrictSummary} from '../services/dataService';

export interface ApiProfileData {
  summary: SchoolSummary | DistrictSummary | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch profile summary data from the API
 * Currently only supports schools - district support to be added later
 */
export function useApiProfileData(
  entityType: 'district' | 'school',
  entityCode: string,
  schoolYear: string
): ApiProfileData {
  const [summary, setSummary] = useState<SchoolSummary | DistrictSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!entityCode) {
      setIsLoading(false);
      return;
    }

    if (entityType === 'district') {
      setIsLoading(false);
      setError('District profiles are not yet supported via API. This feature is coming soon.');
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await membershipClient.getMembershipSummary({
          ncessch: entityCode,
          schoolYear: schoolYear,
        });

        if (!response.summary) {
          setError('No data available for this school and year');
          setSummary(null);
          return;
        }

        const transformed = transformTotalEnrollmentToSummary(response.ncessch, response.summary);

        setSummary(transformed);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load profile data from API';
        setError(errorMessage);
        console.error('API profile data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [entityType, entityCode, schoolYear]);

  return {
    summary,
    isLoading,
    error,
  };
}
