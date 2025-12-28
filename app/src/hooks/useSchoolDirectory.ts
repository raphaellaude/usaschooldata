import {useState, useEffect} from 'react';
import {directoryClient} from '../services/apiClient';
import type {School} from '../gen/directory/v1/directory_pb';

const SY_STATUS_VALUES = [
  'Open', // 1
  'Closed', // 2
  'New', // 3
  'Added', // 4
  'Changed Boundary/Agency', // 5
  'Inactive', // 6
  'Future', // 7
  'Reopened', // 8
];

const SCH_TYPE_VALUES = [
  'Regular School', // 1
  'Special Education School', // 2
  'Career and Technical School', // 3
  'Alternative Education School', // 4
];

export interface SchoolDirectoryInfo {
  ncessch: string;
  sch_name: string;
  school_year: string;
  sch_level: string;
  sch_type: string;
  sy_status: string;
  sy_status_updated: string;
  charter: string;
  state_code: string;
  state_leaid: string;
  grade_pk?: string | number | boolean | null;
  grade_kg?: string | number | boolean | null;
  grade_01?: string | number | boolean | null;
  grade_02?: string | number | boolean | null;
  grade_03?: string | number | boolean | null;
  grade_04?: string | number | boolean | null;
  grade_05?: string | number | boolean | null;
  grade_06?: string | number | boolean | null;
  grade_07?: string | number | boolean | null;
  grade_08?: string | number | boolean | null;
  grade_09?: string | number | boolean | null;
  grade_10?: string | number | boolean | null;
  grade_11?: string | number | boolean | null;
  grade_12?: string | number | boolean | null;
  grade_13?: string | number | boolean | null;
  grade_ug?: string | number | boolean | null;
  grade_ae?: string | number | boolean | null;
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Transform API School response to SchoolDirectoryInfo format
 */
function transformSchoolToDirectoryInfo(school: School): SchoolDirectoryInfo {
  return {
    ncessch: school.ncessch,
    sch_name: school.schName,
    school_year: school.schoolYear,
    sch_level: school.schLevel,
    sch_type: SCH_TYPE_VALUES[school.schType - 1] || 'Unknown',
    sy_status: SY_STATUS_VALUES[school.syStatus - 1] || 'Unknown',
    sy_status_updated: SY_STATUS_VALUES[school.syStatusUpdated - 1] || 'Unknown',
    charter: school.charter,
    state_code: school.stateCode,
    state_leaid: school.stateLeaid,
    grade_pk: school.gradePk,
    grade_kg: school.gradeK,
    grade_01: school.grade01,
    grade_02: school.grade02,
    grade_03: school.grade03,
    grade_04: school.grade04,
    grade_05: school.grade05,
    grade_06: school.grade06,
    grade_07: school.grade07,
    grade_08: school.grade08,
    grade_09: school.grade09,
    grade_10: school.grade10,
    grade_11: school.grade11,
    grade_12: school.grade12,
    grade_13: school.grade13,
    grade_ug: school.ungraded,
    grade_ae: school.adultEducation,
  };
}

export function useSchoolDirectory(ncessch: string | undefined, schoolYear: string | undefined) {
  const [directoryInfo, setDirectoryInfo] = useState<SchoolDirectoryInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when inputs change
    setDirectoryInfo(null);
    setError(null);

    // Don't fetch if we don't have required parameters
    if (!ncessch || !schoolYear) {
      return;
    }

    async function fetchDirectoryInfo() {
      // Double-check parameters inside async function
      if (!ncessch || !schoolYear) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await directoryClient.getSchool({
          ncessch,
          schoolYear,
        });

        if (response.school) {
          setDirectoryInfo(transformSchoolToDirectoryInfo(response.school));
        } else {
          setDirectoryInfo(null);
        }
      } catch (err) {
        console.error('Error fetching directory info:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch directory information');
        setDirectoryInfo(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDirectoryInfo();
  }, [ncessch, schoolYear]);

  return {
    directoryInfo,
    isLoading,
    error,
  };
}
