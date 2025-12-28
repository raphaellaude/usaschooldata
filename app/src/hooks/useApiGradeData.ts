import {useState, useEffect} from 'react';
import {membershipClient} from '../services/apiClient';
import {transformGradeData} from '../services/apiTransformers';

export interface GradeData {
  gradeData: {grade: string; student_count: number}[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch grade-level enrollment data from the API
 */
export function useApiGradeData(
  schoolCode: string,
  schoolYear: string,
  enabled: boolean = true
): GradeData {
  const [gradeData, setGradeData] = useState<{grade: string; student_count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolCode || !enabled) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await membershipClient.getMembershipSummary({
          ncessch: schoolCode,
          schoolYear: schoolYear,
        });

        if (!response.summary) {
          setError('No grade data available');
          setGradeData([]);
          return;
        }

        const transformed = transformGradeData(response.summary);
        setGradeData(transformed);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load grade data from API';
        setError(errorMessage);
        console.error('API grade data loading error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [schoolCode, schoolYear, enabled]);

  return {
    gradeData,
    isLoading,
    error,
  };
}
