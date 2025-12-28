import {useState, useEffect} from 'react';
import {apiService} from '../services/apiService';
import {dataService, type SchoolSummary, type DistrictSummary} from '../services/dataService';
import {useDuckDB} from './useDuckDB';

export interface BlendedProfileData {
  summary: SchoolSummary | DistrictSummary | null;
  gradeData: {grade: string; student_count: number}[];
  isLoading: boolean;
  error: string | null;
  dataSource: 'api' | 'duckdb' | null;
}

/**
 * Blended hook that uses API for schools and DuckDB for districts
 * This provides a migration path to eventually remove DuckDB entirely
 */
export function useBlendedProfileData(
  entityType: 'district' | 'school',
  entityCode: string,
  schoolYear?: string
): BlendedProfileData {
  const [summary, setSummary] = useState<SchoolSummary | DistrictSummary | null>(null);
  const [gradeData, setGradeData] = useState<{grade: string; student_count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'duckdb' | null>(null);
  const {isInitialized, error: dbError} = useDuckDB();

  useEffect(() => {
    if (!entityCode) {
      setIsLoading(false);
      return;
    }

    // For districts, wait for DuckDB to be initialized
    if (entityType === 'district' && !isInitialized) {
      return;
    }

    if (entityType === 'district' && dbError) {
      setError(`Database error: ${dbError}`);
      setIsLoading(false);
      return;
    }

    loadProfileData();
  }, [entityType, entityCode, schoolYear, isInitialized, dbError]);

  const loadProfileData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (entityType === 'school') {
        // Try API first for schools
        try {
          const [summaryData, gradeDataResult] = await Promise.all([
            apiService.getSchoolSummary(entityCode, schoolYear),
            apiService.getStudentsByGrade(entityCode, schoolYear),
          ]);
          setSummary(summaryData);
          setGradeData(gradeDataResult);
          setDataSource('api');
        } catch (apiError) {
          console.warn('API fetch failed, falling back to DuckDB:', apiError);

          // Fall back to DuckDB if API fails
          if (isInitialized && !dbError) {
            const options = schoolYear ? {schoolYear} : {};
            const [summaryData, gradeDataResult] = await Promise.all([
              dataService.getSchoolSummary(entityCode, options),
              dataService.getStudentsByGrade(entityCode, options),
            ]);
            setSummary(summaryData);
            setGradeData(gradeDataResult);
            setDataSource('duckdb');
          } else {
            throw apiError;
          }
        }
      } else {
        // Use DuckDB for districts
        const options = schoolYear ? {schoolYear} : {};
        const summaryData = await dataService.getDistrictSummary(entityCode, options);
        setSummary(summaryData);
        setDataSource('duckdb');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile data';
      setError(errorMessage);
      console.error('Profile data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    summary,
    gradeData,
    isLoading,
    error,
    dataSource,
  };
}
