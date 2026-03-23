import {useMemo} from 'react';
import {useSql} from '@sqlrooms/duckdb';
import {useHistoricalMembershipTable} from '../../hooks/useMembershipTable';
import HistoricalEnrollmentChart from '../charts/HistoricalEnrollmentChart';
import type {HistoricalEnrollmentData} from '../../hooks/useHistoricalEnrollment';

interface YearRow {
  school_year: string;
  total_enrollment: number;
}

interface RaceRow {
  school_year: string;
  native_american: number;
  asian: number;
  black: number;
  hispanic: number;
  pacific_islander: number;
  multiracial: number;
  white: number;
}

interface SexRow {
  school_year: string;
  male: number;
  female: number;
}

interface Props {
  schoolCode: string;
  enabled: boolean;
  currentYear: string;
}

export default function HistoricalSection({schoolCode, enabled, currentYear}: Props) {
  const {tableName, isReady, error: tableError} = useHistoricalMembershipTable(schoolCode, enabled);

  const byYearQuery = useMemo(
    () => `
    SELECT school_year, SUM(student_count)::INTEGER as total_enrollment
    FROM ${tableName}
    GROUP BY school_year
    ORDER BY school_year ASC
  `,
    [tableName]
  );

  const byRaceQuery = useMemo(
    () => `
    SELECT school_year,
      SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END)::INTEGER as native_american,
      SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END)::INTEGER as asian,
      SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END)::INTEGER as black,
      SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END)::INTEGER as hispanic,
      SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END)::INTEGER as pacific_islander,
      SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END)::INTEGER as multiracial,
      SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END)::INTEGER as white
    FROM ${tableName}
    GROUP BY school_year
    ORDER BY school_year ASC
  `,
    [tableName]
  );

  const bySexQuery = useMemo(
    () => `
    SELECT school_year,
      SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END)::INTEGER as male,
      SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END)::INTEGER as female
    FROM ${tableName}
    GROUP BY school_year
    ORDER BY school_year ASC
  `,
    [tableName]
  );

  const {data: yearData, isLoading: yearLoading} = useSql<YearRow>({
    query: byYearQuery,
    enabled: isReady,
  });

  const {data: raceData, isLoading: raceLoading} = useSql<RaceRow>({
    query: byRaceQuery,
    enabled: isReady,
  });

  const {data: sexData, isLoading: sexLoading} = useSql<SexRow>({
    query: bySexQuery,
    enabled: isReady,
  });

  const isLoading = !enabled || yearLoading || raceLoading || sexLoading || !isReady;

  const historicalData = useMemo<HistoricalEnrollmentData>(() => {
    return {
      byYear: yearData?.toArray() ?? [],
      byRaceEthnicity: raceData?.toArray() ?? [],
      bySex: sexData?.toArray() ?? [],
      isLoading,
      error: tableError,
      isTableReady: isReady,
    };
  }, [yearData, raceData, sexData, isLoading, tableError, isReady]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="animate-pulse">Loading historical enrollment data...</div>
        </div>
      </div>
    );
  }

  if (tableError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700">Failed to load historical enrollment data: {tableError}</p>
      </div>
    );
  }

  if (historicalData.byYear.length === 0) {
    return <p className="text-gray-600">No historical enrollment data available</p>;
  }

  return (
    <div className="rounded-lg">
      <HistoricalEnrollmentChart historicalData={historicalData} currentYear={currentYear} />
    </div>
  );
}
