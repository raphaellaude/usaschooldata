import type {TotalEnrollment} from '../gen/membership/v1/membership_pb';
import type {SchoolSummary} from './dataService';

/**
 * Transform API TotalEnrollment to UI SchoolSummary format
 * Converts flat structure with camelCase fields to nested structure with display names
 */
export function transformTotalEnrollmentToSummary(
  ncessch: string,
  enrollment: TotalEnrollment
): SchoolSummary {
  return {
    schoolCode: ncessch,
    totalEnrollment: enrollment.totalEnrollment,
    earliestYear: enrollment.schoolYear,
    latestYear: enrollment.schoolYear,
    demographics: {
      byRaceEthnicity: {
        'American Indian or Alaska Native': enrollment.nativeAmerican,
        Asian: enrollment.asian,
        'Black or African American': enrollment.black,
        'Hispanic/Latino': enrollment.hispanic,
        'Native Hawaiian or Other Pacific Islander': enrollment.pacificIslander,
        'Two or more races': enrollment.multiracial,
        White: enrollment.white,
      },
      bySex: {
        Male: enrollment.male,
        Female: enrollment.female,
      },
    },
  };
}

/**
 * Transform grade data from API format to UI format
 * Converts grade_01 -> { grade: 'Grade 1', student_count: X }
 */
export function transformGradeData(
  enrollment: TotalEnrollment
): {grade: string; student_count: number}[] {
  const gradeMapping = [
    {field: 'gradePk', label: 'Pre-Kindergarten'},
    {field: 'gradeK', label: 'Kindergarten'},
    {field: 'grade01', label: 'Grade 1'},
    {field: 'grade02', label: 'Grade 2'},
    {field: 'grade03', label: 'Grade 3'},
    {field: 'grade04', label: 'Grade 4'},
    {field: 'grade05', label: 'Grade 5'},
    {field: 'grade06', label: 'Grade 6'},
    {field: 'grade07', label: 'Grade 7'},
    {field: 'grade08', label: 'Grade 8'},
    {field: 'grade09', label: 'Grade 9'},
    {field: 'grade10', label: 'Grade 10'},
    {field: 'grade11', label: 'Grade 11'},
    {field: 'grade12', label: 'Grade 12'},
    {field: 'grade13', label: 'Grade 13'},
    {field: 'ungraded', label: 'Ungraded'},
    {field: 'adultEducation', label: 'Adult Education'},
  ];

  return gradeMapping
    .map(({field, label}) => ({
      grade: label,
      student_count: (enrollment[field as keyof TotalEnrollment] as number) || 0,
    }))
    .filter(item => item.student_count > 0); // Only include grades with students
}

/**
 * Transform historical enrollment data for charts
 * Converts API byYear array to chart-ready format
 */
export function transformHistoricalEnrollment(byYear: TotalEnrollment[]) {
  return {
    byYear: byYear.map(e => ({
      school_year: e.schoolYear,
      total_enrollment: e.totalEnrollment,
    })),
    byRaceEthnicity: byYear.map(e => ({
      school_year: e.schoolYear,
      white: e.white,
      black: e.black,
      hispanic: e.hispanic,
      asian: e.asian,
      native_american: e.nativeAmerican,
      pacific_islander: e.pacificIslander,
      multiracial: e.multiracial,
    })),
    bySex: byYear.map(e => ({
      school_year: e.schoolYear,
      male: e.male,
      female: e.female,
    })),
    byGrade: byYear.map(e => ({
      school_year: e.schoolYear,
      grade_pk: e.gradePk,
      grade_k: e.gradeK,
      grade_01: e.grade01,
      grade_02: e.grade02,
      grade_03: e.grade03,
      grade_04: e.grade04,
      grade_05: e.grade05,
      grade_06: e.grade06,
      grade_07: e.grade07,
      grade_08: e.grade08,
      grade_09: e.grade09,
      grade_10: e.grade10,
      grade_11: e.grade11,
      grade_12: e.grade12,
      grade_13: e.grade13,
      ungraded: e.ungraded,
      adult_education: e.adultEducation,
    })),
  };
}
