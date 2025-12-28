import {membershipClient} from './apiClient';
import {create} from '@bufbuild/protobuf';
import {
  GetMembershipRequestSchema,
  GetMembershipSummaryRequestSchema,
  type TotalEnrollment,
} from '../gen/membership/v1/membership_pb';
import type {SchoolSummary, DemographicsData} from './dataService';

/**
 * API Service for fetching membership data from the backend API
 * This service transforms protobuf messages to application data structures
 */
export class ApiService {
  /**
   * Transform a TotalEnrollment protobuf message to DemographicsData
   */
  private transformToDemographics(enrollment: TotalEnrollment): DemographicsData {
    return {
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
    };
  }

  /**
   * Get full historical enrollment data for a school
   */
  async getMembership(schoolCode: string): Promise<TotalEnrollment[]> {
    const request = create(GetMembershipRequestSchema, {
      ncessch: schoolCode,
    });

    const response = await membershipClient.getMembership(request);
    return response.byYear;
  }

  /**
   * Get membership summary for a specific school year
   */
  async getMembershipSummary(
    schoolCode: string,
    schoolYear: string
  ): Promise<TotalEnrollment | null> {
    const request = create(GetMembershipSummaryRequestSchema, {
      ncessch: schoolCode,
      schoolYear: schoolYear,
    });

    const response = await membershipClient.getMembershipSummary(request);
    return response.summary || null;
  }

  /**
   * Get school summary data (aggregated across all years or a specific year)
   * This provides a compatible interface with the existing dataService
   */
  async getSchoolSummary(
    schoolCode: string,
    schoolYear?: string
  ): Promise<SchoolSummary | null> {
    try {
      if (schoolYear) {
        // Get summary for specific year
        const summary = await this.getMembershipSummary(schoolCode, schoolYear);
        if (!summary) return null;

        return {
          schoolCode,
          totalEnrollment: summary.totalEnrollment,
          earliestYear: summary.schoolYear,
          latestYear: summary.schoolYear,
          demographics: this.transformToDemographics(summary),
        };
      } else {
        // Get all historical data and aggregate
        const membership = await this.getMembership(schoolCode);
        if (!membership || membership.length === 0) return null;

        // Sort by year to find earliest and latest
        const sortedByYear = [...membership].sort((a, b) =>
          a.schoolYear.localeCompare(b.schoolYear)
        );

        // Aggregate all demographics across all years
        const totalEnrollment = membership.reduce(
          (sum, year) => sum + year.totalEnrollment,
          0
        );

        // Aggregate demographics
        const demographics: DemographicsData = {
          byRaceEthnicity: {
            'American Indian or Alaska Native': 0,
            Asian: 0,
            'Black or African American': 0,
            'Hispanic/Latino': 0,
            'Native Hawaiian or Other Pacific Islander': 0,
            'Two or more races': 0,
            White: 0,
          },
          bySex: {
            Male: 0,
            Female: 0,
          },
        };

        for (const year of membership) {
          demographics.byRaceEthnicity['American Indian or Alaska Native'] +=
            year.nativeAmerican;
          demographics.byRaceEthnicity['Asian'] += year.asian;
          demographics.byRaceEthnicity['Black or African American'] += year.black;
          demographics.byRaceEthnicity['Hispanic/Latino'] += year.hispanic;
          demographics.byRaceEthnicity['Native Hawaiian or Other Pacific Islander'] +=
            year.pacificIslander;
          demographics.byRaceEthnicity['Two or more races'] += year.multiracial;
          demographics.byRaceEthnicity['White'] += year.white;
          demographics.bySex['Male'] += year.male;
          demographics.bySex['Female'] += year.female;
        }

        return {
          schoolCode,
          totalEnrollment,
          earliestYear: sortedByYear[0].schoolYear,
          latestYear: sortedByYear[sortedByYear.length - 1].schoolYear,
          demographics,
        };
      }
    } catch (error) {
      console.error(`Failed to get school summary for ${schoolCode}:`, error);
      return null;
    }
  }

  /**
   * Get student counts by grade for a school (from a specific year's data)
   */
  async getStudentsByGrade(
    schoolCode: string,
    schoolYear?: string
  ): Promise<{grade: string; student_count: number}[]> {
    try {
      let enrollment: TotalEnrollment | null;

      if (schoolYear) {
        enrollment = await this.getMembershipSummary(schoolCode, schoolYear);
      } else {
        // Get the most recent year's data
        const membership = await this.getMembership(schoolCode);
        if (!membership || membership.length === 0) return [];

        // Sort by year descending to get most recent
        const sortedByYear = [...membership].sort((a, b) =>
          b.schoolYear.localeCompare(a.schoolYear)
        );
        enrollment = sortedByYear[0];
      }

      if (!enrollment) return [];

      // Map grade fields to grade labels
      const gradeMapping: {grade: string; count: number}[] = [
        {grade: 'Pre-Kindergarten', count: enrollment.gradePk},
        {grade: 'Kindergarten', count: enrollment.gradeK},
        {grade: 'Grade 1', count: enrollment.grade01},
        {grade: 'Grade 2', count: enrollment.grade02},
        {grade: 'Grade 3', count: enrollment.grade03},
        {grade: 'Grade 4', count: enrollment.grade04},
        {grade: 'Grade 5', count: enrollment.grade05},
        {grade: 'Grade 6', count: enrollment.grade06},
        {grade: 'Grade 7', count: enrollment.grade07},
        {grade: 'Grade 8', count: enrollment.grade08},
        {grade: 'Grade 9', count: enrollment.grade09},
        {grade: 'Grade 10', count: enrollment.grade10},
        {grade: 'Grade 11', count: enrollment.grade11},
        {grade: 'Grade 12', count: enrollment.grade12},
        {grade: 'Grade 13', count: enrollment.grade13},
        {grade: 'Ungraded', count: enrollment.ungraded},
        {grade: 'Adult Education', count: enrollment.adultEducation},
      ];

      // Filter out grades with zero students
      return gradeMapping
        .filter((g) => g.count > 0)
        .map((g) => ({
          grade: g.grade,
          student_count: g.count,
        }));
    } catch (error) {
      console.error(`Failed to get students by grade for ${schoolCode}:`, error);
      return [];
    }
  }

  /**
   * Get historical enrollment by year
   */
  async getHistoricalEnrollmentByYear(
    schoolCode: string
  ): Promise<{school_year: string; total_enrollment: number}[]> {
    try {
      const membership = await this.getMembership(schoolCode);
      if (!membership) return [];

      return membership
        .map((year) => ({
          school_year: year.schoolYear,
          total_enrollment: year.totalEnrollment,
        }))
        .sort((a, b) => a.school_year.localeCompare(b.school_year));
    } catch (error) {
      console.error(`Failed to get historical enrollment by year for ${schoolCode}:`, error);
      return [];
    }
  }

  /**
   * Get historical enrollment by race/ethnicity
   */
  async getHistoricalEnrollmentByRaceEthnicity(schoolCode: string): Promise<
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
  > {
    try {
      const membership = await this.getMembership(schoolCode);
      if (!membership) return [];

      return membership
        .map((year) => ({
          school_year: year.schoolYear,
          white: year.white,
          black: year.black,
          hispanic: year.hispanic,
          asian: year.asian,
          native_american: year.nativeAmerican,
          pacific_islander: year.pacificIslander,
          multiracial: year.multiracial,
        }))
        .sort((a, b) => a.school_year.localeCompare(b.school_year));
    } catch (error) {
      console.error(
        `Failed to get historical enrollment by race/ethnicity for ${schoolCode}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get historical enrollment by sex
   */
  async getHistoricalEnrollmentBySex(
    schoolCode: string
  ): Promise<{school_year: string; male: number; female: number}[]> {
    try {
      const membership = await this.getMembership(schoolCode);
      if (!membership) return [];

      return membership
        .map((year) => ({
          school_year: year.schoolYear,
          male: year.male,
          female: year.female,
        }))
        .sort((a, b) => a.school_year.localeCompare(b.school_year));
    } catch (error) {
      console.error(`Failed to get historical enrollment by sex for ${schoolCode}:`, error);
      return [];
    }
  }
}

export const apiService = new ApiService();
