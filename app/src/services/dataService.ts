import {duckDBService} from './duckdb';

export interface MembershipQueryOptions {
  schoolCode?: string;
  districtCode?: string;
  schoolYear?: string;
  grade?: string;
  raceEthnicity?: string;
  sex?: string;
}

export interface DemographicsData {
  byRaceEthnicity: Record<string, number>;
  bySex: Record<string, number>;
}

export interface SchoolSummary {
  schoolCode: string;
  totalEnrollment: number;
  earliestYear: string;
  latestYear: string;
  demographics: DemographicsData;
}

export interface DistrictSummary {
  districtCode: string;
  totalEnrollment: number;
  schoolCount: number;
  earliestYear: string;
  latestYear: string;
  demographics: DemographicsData;
}

// Constants for unique values in the data
export const RACE_ETHNICITY_VALUES = [
  'Native Hawaiian or Other Pacific Islander',
  'Two or more races',
  'Asian',
  'Black or African American',
  'American Indian or Alaska Native',
  'Hispanic/Latino',
  'White',
] as const;

export const SEX_VALUES = ['Female', 'Male'] as const;

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
  'Grade 10',
] as const;

export class YearNotAvailableError extends Error {
  public requestedYear: string;
  public availableYears: string[];

  constructor(requestedYear: string, availableYears: string[]) {
    super(
      `Data for school year ${requestedYear} is not available. Available years: ${availableYears.join(', ')}`
    );
    this.name = 'YearNotAvailableError';
    this.requestedYear = requestedYear;
    this.availableYears = availableYears;
  }
}

export class DataService {
  private dataDirectory: string;
  private availableYears = ['2023-2024']; // Start with just 2023-2024

  /**
   * Check if an error indicates missing year data
   */
  private isYearNotAvailableError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    return (
      errorMessage.includes('No files found that match the pattern') &&
      errorMessage.includes('school_year=')
    );
  }

  constructor() {
    this.dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';
  }

  /**
   * Generate R2 file paths for given state codes and years
   */
  private generateR2FilePaths(stateCodes: string[], years?: string[]): string[] {
    const filePaths: string[] = [];
    const yearsToUse = years || this.availableYears;

    for (const year of yearsToUse) {
      for (const stateCode of stateCodes) {
        filePaths.push(
          `'${this.dataDirectory}/membership/school_year=${year}/state_leaid=${stateCode}/data_0.parquet'`
        );
      }
    }

    return filePaths;
  }

  /**
   * Creates a reusable in-memory table for school membership data
   * This table can then be used by summary functions without hitting storage again
   */
  async createSchoolMembershipTable(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<void> {
    const stateLeaid = schoolCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state and year (if specified)
      const years = options.schoolYear ? [options.schoolYear] : undefined;
      const filePaths = this.generateR2FilePaths([stateLeaid], years);

      // Create a named table that can be reused
      const createTableQuery = `
        CREATE OR REPLACE TABLE school_membership_${schoolCode} AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE ncessch = '${schoolCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
      `;

      await duckDBService.query(createTableQuery);
    } catch (error) {
      console.error(`Failed to create school membership table for ${schoolCode}:`, error);

      // Check if this is a "year not available" error
      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      throw error;
    }
  }

  /**
   * Queries school membership data from the in-memory table with optional filtering
   */
  async querySchoolMembership(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<any[]> {
    try {
      // First ensure the table exists
      await this.createSchoolMembershipTable(schoolCode, options);

      // Query the in-memory table with additional filters
      const selectQuery = `
        SELECT * FROM school_membership_${schoolCode}
        ${options.grade ? `WHERE grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `${options.grade ? 'AND' : 'WHERE'} race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `${options.grade || options.raceEthnicity ? 'AND' : 'WHERE'} sex = '${options.sex}'` : ''}
        ORDER BY school_year DESC, grade, race_ethnicity, sex
      `;

      const table = await duckDBService.query(selectQuery);
      return duckDBService.tableToArray(table);
    } catch (error) {
      console.error(`Failed to query school membership for ${schoolCode}:`, error);
      throw error;
    }
  }

  /**
   * Creates a reusable in-memory table for district membership data
   * This table can then be used by summary functions without hitting storage again
   */
  async createDistrictMembershipTable(
    districtCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<void> {
    const stateLeaid = districtCode.substring(0, 2);

    try {
      // Generate file paths for the relevant state and year (if specified)
      const years = options.schoolYear ? [options.schoolYear] : undefined;
      const filePaths = this.generateR2FilePaths([stateLeaid], years);

      // Create a named table that can be reused
      const createTableQuery = `
        CREATE OR REPLACE TABLE district_membership_${districtCode} AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE leaid = '${districtCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
      `;

      await duckDBService.query(createTableQuery);
    } catch (error) {
      console.error(`Failed to create district membership table for ${districtCode}:`, error);

      // Check if this is a "year not available" error
      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      throw error;
    }
  }

  /**
   * Queries district membership data from the in-memory table with optional filtering and aggregation
   */
  async queryDistrictMembership(
    districtCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<any[]> {
    try {
      // First ensure the table exists
      await this.createDistrictMembershipTable(districtCode, options);

      // Query the in-memory table with additional filters and aggregation
      const selectQuery = `
        SELECT
          ncessch,
          school_year,
          grade,
          race_ethnicity,
          sex,
          SUM(student_count) as total_student_count
        FROM district_membership_${districtCode}
        ${options.grade ? `WHERE grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `${options.grade ? 'AND' : 'WHERE'} race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `${options.grade || options.raceEthnicity ? 'AND' : 'WHERE'} sex = '${options.sex}'` : ''}
        GROUP BY ncessch, school_year, grade, race_ethnicity, sex
        ORDER BY school_year DESC, ncessch, grade, race_ethnicity, sex
      `;

      const table = await duckDBService.query(selectQuery);
      return duckDBService.tableToArray(table);
    } catch (error) {
      console.error(`Failed to query district membership for ${districtCode}:`, error);
      throw error;
    }
  }

  /**
   * Get summary statistics for a school - all aggregated in DuckDB
   */
  async getSchoolSummary(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<SchoolSummary | null> {
    try {
      // Ensure the table exists first
      await this.createSchoolMembershipTable(schoolCode, options);

      // Get all summary stats from the in-memory table
      const summaryQuery = `
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
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female_count
        FROM school_membership_${schoolCode}
      `;

      console.log(summaryQuery);

      const table = await duckDBService.query(summaryQuery);

      if (table.numRows === 0 || duckDBService.getScalarValue(table, 0, 'total_enrollment') === 0) {
        return null;
      }

      return {
        schoolCode,
        totalEnrollment: duckDBService.getScalarValue(table, 0, 'total_enrollment'),
        earliestYear: duckDBService.getScalarValue(table, 0, 'earliest_year'),
        latestYear: duckDBService.getScalarValue(table, 0, 'latest_year'),
        demographics: {
          byRaceEthnicity: {
            White: duckDBService.getScalarValue(table, 0, 'white_count'),
            'Black or African American': duckDBService.getScalarValue(table, 0, 'black_count'),
            'Hispanic/Latino': duckDBService.getScalarValue(table, 0, 'hispanic_count'),
            Asian: duckDBService.getScalarValue(table, 0, 'asian_count'),
            'American Indian or Alaska Native': duckDBService.getScalarValue(
              table,
              0,
              'native_american_count'
            ),
            'Native Hawaiian or Other Pacific Islander': duckDBService.getScalarValue(
              table,
              0,
              'pacific_islander_count'
            ),
            'Two or more races': duckDBService.getScalarValue(table, 0, 'multiracial_count'),
          },
          bySex: {
            Male: duckDBService.getScalarValue(table, 0, 'male_count'),
            Female: duckDBService.getScalarValue(table, 0, 'female_count'),
          },
        },
      };
    } catch (error) {
      console.error(`Failed to get school summary for ${schoolCode}:`, error);

      // Check if this is a "year not available" error
      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      return null;
    }
  }

  /**
   * Get summary statistics for a district - all aggregated in DuckDB
   */
  async getDistrictSummary(
    districtCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<DistrictSummary | null> {
    try {
      // Ensure the table exists first
      await this.createDistrictMembershipTable(districtCode, options);

      // Get all summary stats from the in-memory table
      const summaryQuery = `
        SELECT
          SUM(student_count) as total_enrollment,
          MIN(school_year) as earliest_year,
          MAX(school_year) as latest_year,
          COUNT(DISTINCT ncessch) as school_count,
          SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) as white_count,
          SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) as black_count,
          SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) as hispanic_count,
          SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) as asian_count,
          SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) as native_american_count,
          SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) as pacific_islander_count,
          SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) as multiracial_count,
          SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male_count,
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female_count
        FROM district_membership_${districtCode}
      `;

      const table = await duckDBService.query(summaryQuery);

      if (table.numRows === 0 || duckDBService.getScalarValue(table, 0, 'total_enrollment') === 0) {
        return null;
      }

      return {
        districtCode,
        totalEnrollment: duckDBService.getScalarValue(table, 0, 'total_enrollment'),
        schoolCount: duckDBService.getScalarValue(table, 0, 'school_count'),
        earliestYear: duckDBService.getScalarValue(table, 0, 'earliest_year'),
        latestYear: duckDBService.getScalarValue(table, 0, 'latest_year'),
        demographics: {
          byRaceEthnicity: {
            White: duckDBService.getScalarValue(table, 0, 'white_count'),
            'Black or African American': duckDBService.getScalarValue(table, 0, 'black_count'),
            'Hispanic/Latino': duckDBService.getScalarValue(table, 0, 'hispanic_count'),
            Asian: duckDBService.getScalarValue(table, 0, 'asian_count'),
            'American Indian or Alaska Native': duckDBService.getScalarValue(
              table,
              0,
              'native_american_count'
            ),
            'Native Hawaiian or Other Pacific Islander': duckDBService.getScalarValue(
              table,
              0,
              'pacific_islander_count'
            ),
            'Two or more races': duckDBService.getScalarValue(table, 0, 'multiracial_count'),
          },
          bySex: {
            Male: duckDBService.getScalarValue(table, 0, 'male_count'),
            Female: duckDBService.getScalarValue(table, 0, 'female_count'),
          },
        },
      };
    } catch (error) {
      console.error(`Failed to get district summary for ${districtCode}:`, error);

      // Check if this is a "year not available" error
      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      return null;
    }
  }
}

export const dataService = new DataService();
