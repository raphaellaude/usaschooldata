import {useMemo} from 'react';
import {useSql} from '@sqlrooms/duckdb';
import BarChart from '../charts/BarChart';
import CopyableWrapper from '../CopyableWrapper';
import {GRADE_ORDER_CASE} from '../../constants';

/** Shared summary type used by Overview and Demographics */
export interface SummaryData {
  totalEnrollment: number;
  schoolCount?: number;
  earliestYear: string;
  latestYear: string;
  demographics: {
    byRaceEthnicity: Record<string, number>;
    bySex: Record<string, number>;
  };
}

interface SummaryRow {
  total_enrollment: number;
  earliest_year: string;
  latest_year: string;
  school_count: number;
  white_count: number;
  black_count: number;
  hispanic_count: number;
  asian_count: number;
  native_american_count: number;
  pacific_islander_count: number;
  multiracial_count: number;
  male_count: number;
  female_count: number;
}

/** Hook for the summary query — called from Profile, shared with Demographics */
export function useSummary(tableName: string, isReady: boolean, entityType: 'school' | 'district') {
  const query = useMemo(
    () => `
    SELECT
      SUM(student_count)::INTEGER as total_enrollment,
      MIN(school_year) as earliest_year,
      MAX(school_year) as latest_year,
      COUNT(DISTINCT ncessch)::INTEGER as school_count,
      SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END)::INTEGER as white_count,
      SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END)::INTEGER as black_count,
      SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END)::INTEGER as hispanic_count,
      SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END)::INTEGER as asian_count,
      SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END)::INTEGER as native_american_count,
      SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END)::INTEGER as pacific_islander_count,
      SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END)::INTEGER as multiracial_count,
      SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END)::INTEGER as male_count,
      SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END)::INTEGER as female_count
    FROM ${tableName}
  `,
    [tableName]
  );

  const {data, isLoading, error} = useSql<SummaryRow>({
    query,
    enabled: isReady,
  });

  const summary = useMemo<SummaryData | null>(() => {
    if (!data || data.length === 0) return null;
    const row = data.toArray()[0];
    if (!row || row.total_enrollment === 0) return null;
    return {
      totalEnrollment: row.total_enrollment,
      schoolCount: entityType === 'district' ? row.school_count : undefined,
      earliestYear: row.earliest_year,
      latestYear: row.latest_year,
      demographics: {
        byRaceEthnicity: {
          White: row.white_count,
          'Black or African American': row.black_count,
          'Hispanic/Latino': row.hispanic_count,
          Asian: row.asian_count,
          'American Indian or Alaska Native': row.native_american_count,
          'Native Hawaiian or Other Pacific Islander': row.pacific_islander_count,
          'Two or more races': row.multiracial_count,
        },
        bySex: {
          Male: row.male_count,
          Female: row.female_count,
        },
      },
    };
  }, [data, entityType]);

  return {summary, isLoading, error};
}

interface GradeRow {
  grade: string;
  student_count: number;
}

interface OverviewProps {
  summary: SummaryData | null;
  tableName: string;
  isReady: boolean;
  entityType: 'school' | 'district';
}

export default function OverviewSection({summary, tableName, isReady, entityType}: OverviewProps) {
  const gradeQuery = useMemo(
    () => `
    WITH grade_data AS (
      SELECT
        grade,
        SUM(student_count)::INTEGER as student_count,
        ${GRADE_ORDER_CASE} as grade_order
      FROM ${tableName}
      GROUP BY grade
    )
    SELECT grade, student_count
    FROM grade_data
    ORDER BY grade_order
  `,
    [tableName]
  );

  const {data: gradeData} = useSql<GradeRow>({
    query: gradeQuery,
    enabled: isReady && entityType === 'school',
  });

  const gradeChartData = useMemo(() => {
    if (!gradeData) return [];
    return gradeData.toArray().map(row => ({
      label: row.grade,
      value: row.student_count,
    }));
  }, [gradeData]);

  if (!summary) {
    return <p className="text-gray-600">No overview data available</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="rounded-lg">
        <div className="text-lg font-medium text-gray-900 mb-4">Total enrollment</div>
        <div className="text-6xl font-bold text-gray-900">
          {summary.totalEnrollment?.toLocaleString() || 'N/A'}
        </div>
      </div>

      {entityType === 'district' && (
        <div className="text-center py-4 bg-white border border-gray-200 rounded-lg">
          <div className="font-medium text-gray-700">Number of Schools</div>
          <div className="text-gray-900">{summary.schoolCount || 'N/A'}</div>
        </div>
      )}

      {entityType === 'school' && gradeChartData.length > 0 && (
        <CopyableWrapper data={gradeChartData} filename="students-by-grade" className="lg:col-span-2">
          <div className="rounded-lg">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Students by grade</h4>
            <div className="h-[400px]">
              <BarChart data={gradeChartData} />
            </div>
          </div>
        </CopyableWrapper>
      )}
    </div>
  );
}
