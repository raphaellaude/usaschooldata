import { duckDBService } from './duckdb';

export interface MembershipQueryOptions {
  schoolCode?: string;
  districtCode?: string;
  schoolYear?: string;
  grade?: string;
  raceEthnicity?: string;
  sex?: string;
}

// Constants for unique values in the data
export const RACE_ETHNICITY_VALUES = [
  'Native Hawaiian or Other Pacific Islander',
  'Two or more races',
  'Asian',
  'Black or African American',
  'American Indian or Alaska Native',
  'Hispanic/Latino',
  'White'
] as const;

export const SEX_VALUES = [
  'Female',
  'Male'
] as const;

export const GRADE_VALUES = [
  'Grade 8',
  'Pre-Kindergarten',
  'Ungraded',
  'Grade 11',
  'Grade 9',
  'Grade 12',
  'Kindergarten',
  'Grade 6',
  'Grade 7',
  'Grade 5',
  'Adult Education',
  'Grade 1',
  'Grade 13',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 10'
] as const;

export class DataService {
  private dataDirectory: string;
  private availableYears = ['2023-2024']; // Start with just 2023-2024

  constructor() {
    this.dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';
  }

  /**
   * Generate R2 file paths for given state codes and years
   */
  private generateR2FilePaths(stateCodes: string[]): string[] {
    const filePaths: string[] = [];

    for (const year of this.availableYears) {
      for (const stateCode of stateCodes) {
        filePaths.push(`'${this.dataDirectory}/membership/school_year=${year}/state_leaid=${stateCode}/data_0.parquet'`);
      }
    }

    return filePaths;
  }

  /**
   * Creates and queries school membership data with optimized filter pushdown
   */
  async querySchoolMembership(schoolCode: string, options: MembershipQueryOptions = {}): Promise<any[]> {
    const stateLeaid = schoolCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state
      const filePaths = this.generateR2FilePaths([stateLeaid]);

      // Query directly with filtering - no need for intermediate table
      const selectQuery = `
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE ncessch = '${schoolCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
        ${options.grade ? `AND grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `AND race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `AND sex = '${options.sex}'` : ''}
        ORDER BY school_year DESC, grade, race_ethnicity, sex
      `;

      return await duckDBService.query(selectQuery);
    } catch (error) {
      console.error(`Failed to query school membership for ${schoolCode}:`, error);
      throw error;
    }
  }

  /**
   * Creates and queries district membership data with optimized filter pushdown
   */
  async queryDistrictMembership(districtCode: string, options: MembershipQueryOptions = {}): Promise<any[]> {
    const stateLeaid = districtCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state
      const filePaths = this.generateR2FilePaths([stateLeaid]);

      // Query directly with filtering and aggregation in DuckDB
      const selectQuery = `
        SELECT
          ncessch,
          school_year,
          grade,
          race_ethnicity,
          sex,
          SUM(student_count) as total_student_count
        FROM read_parquet([${filePaths.join(', ')}])
        WHERE leaid = '${districtCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
        ${options.grade ? `AND grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `AND race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `AND sex = '${options.sex}'` : ''}
        GROUP BY ncessch, school_year, grade, race_ethnicity, sex
        ORDER BY school_year DESC, ncessch, grade, race_ethnicity, sex
      `;

      return await duckDBService.query(selectQuery);
    } catch (error) {
      console.error(`Failed to query district membership for ${districtCode}:`, error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a school - all aggregated in DuckDB
   */
  async getSchoolSummary(schoolCode: string): Promise<any> {
    const stateLeaid = schoolCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state
      const filePaths = this.generateR2FilePaths([stateLeaid]);

      // Get all summary stats in a single DuckDB query
      const summaryQuery = `
        WITH school_data AS (
          SELECT * FROM read_parquet([${filePaths.join(', ')}])
          WHERE ncessch = '${schoolCode}'
        )
        SELECT
          -- Basic stats
          SUM(student_count) as total_enrollment,
          MIN(school_year) as earliest_year,
          MAX(school_year) as latest_year,
          SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) as white_count,
          SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) as black_count,
          SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) as hispanic_count,
          SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) as asian_count,
          SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) as native_american_count,
          SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) as pacific_islander_count,
          SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) as multiracial_count,
          SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male_count,
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female_count,
        FROM school_data
        GROUP BY school_year, ncessch
        ORDER BY 1 DESC, 2 ASC
      `;

      console.log(summaryQuery);

      const result = await duckDBService.query(summaryQuery);
      console.log('Raw DuckDB result:', result[0]);

      if (result.length === 0 || result[0].total_enrollment === 0) {
        return null;
      }

      const summary = result[0];

      // Helper function to extract scalar values from potential arrays
      const extractValue = (val: any) => {
        if (val instanceof Uint32Array) {
          return val[0] || 0;
        }
        return val || 0;
      };

      return {
        schoolCode,
        totalEnrollment: extractValue(summary.total_enrollment),
        schoolYears: summary.school_years,
        grades: summary.grades,
        latestYear: summary.latest_year,
        demographics: {
          byRaceEthnicity: {
            'White': extractValue(summary.white_count),
            'Black or African American': extractValue(summary.black_count),
            'Hispanic/Latino': extractValue(summary.hispanic_count),
            'Asian': extractValue(summary.asian_count),
            'American Indian or Alaska Native': extractValue(summary.native_american_count),
            'Native Hawaiian or Other Pacific Islander': extractValue(summary.pacific_islander_count),
            'Two or more races': extractValue(summary.multiracial_count),
          },
          bySex: {
            'Male': extractValue(summary.male_count),
            'Female': extractValue(summary.female_count),
          },
        }
      };
    } catch (error) {
      console.error(`Failed to get school summary for ${schoolCode}:`, error);
      return null;
    }
  }

  /**
   * Get summary statistics for a district - all aggregated in DuckDB
   */
  async getDistrictSummary(districtCode: string): Promise<any> {
    const stateLeaid = districtCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state
      const filePaths = this.generateR2FilePaths([stateLeaid]);

      // Get all summary stats in a single DuckDB query
      const summaryQuery = `
        WITH district_data AS (
          SELECT * FROM read_parquet([${filePaths.join(', ')}])
          WHERE leaid = '${districtCode}'
        )
        SELECT
          SUM(student_count) as total_enrollment,
          MIN(school_year) as earliest_year,
          MAX(school_year) as latest_year,
          SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) as white_count,
          SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) as black_count,
          SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) as hispanic_count,
          SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) as asian_count,
          SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) as native_american_count,
          SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) as pacific_islander_count,
          SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) as multiracial_count,
          SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male_count,
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female_count,
        FROM district_data
        GROUP BY school_year, leaid
        ORDER BY 1 DESC, 2 ASC
      `;

      const result = await duckDBService.query(summaryQuery);

      if (result.length === 0 || result[0].total_enrollment === 0) {
        return null;
      }

      const summary = result[0];

      // Helper function to extract scalar values from potential arrays
      const extractValue = (val: any) => {
        if (Array.isArray(val)) {
          return val[0] || 0;
        }
        return val || 0;
      };

      return {
        districtCode,
        totalEnrollment: extractValue(summary.total_enrollment),
        schoolCount: extractValue(summary.school_count),
        schoolYears: summary.school_years,
        grades: summary.grades,
        latestYear: summary.latest_year,
        demographics: {
          byRaceEthnicity: {
            'White': extractValue(summary.white_count),
            'Black or African American': extractValue(summary.black_count),
            'Hispanic/Latino': extractValue(summary.hispanic_count),
            'Asian': extractValue(summary.asian_count),
            'American Indian or Alaska Native': extractValue(summary.native_american_count),
            'Native Hawaiian or Other Pacific Islander': extractValue(summary.pacific_islander_count),
            'Two or more races': extractValue(summary.multiracial_count),
          },
          bySex: {
            'Male': extractValue(summary.male_count),
            'Female': extractValue(summary.female_count),
          },
        }
      };
    } catch (error) {
      console.error(`Failed to get district summary for ${districtCode}:`, error);
      return null;
    }
  }
}

export const dataService = new DataService();
