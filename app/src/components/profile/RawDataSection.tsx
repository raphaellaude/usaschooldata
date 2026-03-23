import {useMemo} from 'react';
import {useSql} from '@sqlrooms/duckdb';
import CopyableWrapper from '../CopyableWrapper';
import {GRADE_ORDER_CASE} from '../../constants';

interface MembershipRow {
  ncessch: string;
  leaid: string;
  school_year: string;
  grade: string;
  race_ethnicity: string;
  sex: string;
  student_count: number;
  total_student_count?: number;
}

interface Props {
  tableName: string;
  isReady: boolean;
  entityType: 'school' | 'district';
}

export default function RawDataSection({tableName, isReady, entityType}: Props) {
  const query = useMemo(() => {
    if (entityType === 'district') {
      return `
        WITH grade_ordered AS (
          SELECT *, ${GRADE_ORDER_CASE} as grade_order
          FROM ${tableName}
        )
        SELECT
          ncessch, school_year, grade, race_ethnicity, sex,
          SUM(student_count)::INTEGER as total_student_count
        FROM grade_ordered
        GROUP BY ncessch, school_year, grade, race_ethnicity, sex, grade_order
        ORDER BY school_year DESC, ncessch, grade_order, race_ethnicity, sex
      `;
    }
    return `
      WITH grade_ordered AS (
        SELECT *, ${GRADE_ORDER_CASE} as grade_order
        FROM ${tableName}
      )
      SELECT ncessch, leaid, school_year, grade, race_ethnicity, sex, student_count
      FROM grade_ordered
      ORDER BY school_year DESC, grade_order, race_ethnicity, sex
    `;
  }, [tableName, entityType]);

  const {data, isLoading} = useSql<MembershipRow>({
    query,
    enabled: isReady,
  });

  const rows = useMemo(() => data?.toArray() ?? [], [data]);

  if (isLoading || rows.length === 0) {
    return <p className="text-gray-600">No membership data available</p>;
  }

  return (
    <div>
      <CopyableWrapper data={rows} filename="membership-data">
        <p className="text-gray-600 mb-4">Showing {rows.length} records</p>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 sticky top-0">
                  <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                    School Year
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                    Grade
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                    Race/Ethnicity
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                    Sex
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-900 border-b border-gray-200">
                    Student Count
                  </th>
                  {entityType === 'district' && (
                    <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                      School Code
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2 text-gray-900">{row.school_year}</td>
                    <td className="px-3 py-2 text-gray-900">{row.grade}</td>
                    <td className="px-3 py-2 text-gray-900">{row.race_ethnicity}</td>
                    <td className="px-3 py-2 text-gray-900">{row.sex}</td>
                    <td className="px-3 py-2 text-right text-gray-900">
                      {(row.student_count || row.total_student_count || 0).toLocaleString()}
                    </td>
                    {entityType === 'district' && (
                      <td className="px-3 py-2 text-gray-900">{row.ncessch}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CopyableWrapper>
      {rows.length > 100 && (
        <p className="text-gray-600 text-sm mt-4 italic">
          Showing first 100 rows of {rows.length} total records
        </p>
      )}
    </div>
  );
}
