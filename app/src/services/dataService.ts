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
  'Pre-Kindergarten',
  'Kindergarten',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 11',
  'Grade 12',
  'Grade 10',
  'Grade 13',
  'Ungraded',
  'Adult Education',
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
  private availableYears = [
    '2023-2024',
    '2022-2023',
    '2021-2022',
    '2020-2021',
    '2019-2020',
    '2018-2019',
    '2017-2018',
    '2016-2017',
    '2015-2016',
    '2014-2015',
  ];

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
        WITH grade_ordered AS (
          SELECT *,
            CASE grade
              WHEN 'Pre-Kindergarten' THEN -1
              WHEN 'Kindergarten' THEN 0
              WHEN 'Grade 1' THEN 1
              WHEN 'Grade 2' THEN 2
              WHEN 'Grade 3' THEN 3
              WHEN 'Grade 4' THEN 4
              WHEN 'Grade 5' THEN 5
              WHEN 'Grade 6' THEN 6
              WHEN 'Grade 7' THEN 7
              WHEN 'Grade 8' THEN 8
              WHEN 'Grade 9' THEN 9
              WHEN 'Grade 10' THEN 10
              WHEN 'Grade 11' THEN 11
              WHEN 'Grade 12' THEN 12
              WHEN 'Grade 13' THEN 13
              WHEN 'Ungraded' THEN 20
              WHEN 'Adult Education' THEN 21
              ELSE 99
            END as grade_order
          FROM school_membership_${schoolCode}
          ${options.grade ? `WHERE grade = '${options.grade}'` : ''}
          ${options.raceEthnicity ? `${options.grade ? 'AND' : 'WHERE'} race_ethnicity = '${options.raceEthnicity}'` : ''}
          ${options.sex ? `${options.grade || options.raceEthnicity ? 'AND' : 'WHERE'} sex = '${options.sex}'` : ''}
        )
        SELECT ncessch, leaid, school_year, grade, race_ethnicity, sex, student_count
        FROM grade_ordered
        ORDER BY school_year DESC, grade_order, race_ethnicity, sex
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
        WITH grade_ordered AS (
          SELECT *,
            CASE grade
              WHEN 'Pre-Kindergarten' THEN -1
              WHEN 'Kindergarten' THEN 0
              WHEN 'Grade 1' THEN 1
              WHEN 'Grade 2' THEN 2
              WHEN 'Grade 3' THEN 3
              WHEN 'Grade 4' THEN 4
              WHEN 'Grade 5' THEN 5
              WHEN 'Grade 6' THEN 6
              WHEN 'Grade 7' THEN 7
              WHEN 'Grade 8' THEN 8
              WHEN 'Grade 9' THEN 9
              WHEN 'Grade 10' THEN 10
              WHEN 'Grade 11' THEN 11
              WHEN 'Grade 12' THEN 12
              WHEN 'Grade 13' THEN 13
              WHEN 'Ungraded' THEN 20
              WHEN 'Adult Education' THEN 21
              ELSE 99
            END as grade_order
          FROM district_membership_${districtCode}
          ${options.grade ? `WHERE grade = '${options.grade}'` : ''}
          ${options.raceEthnicity ? `${options.grade ? 'AND' : 'WHERE'} race_ethnicity = '${options.raceEthnicity}'` : ''}
          ${options.sex ? `${options.grade || options.raceEthnicity ? 'AND' : 'WHERE'} sex = '${options.sex}'` : ''}
        )
        SELECT
          ncessch,
          school_year,
          grade,
          race_ethnicity,
          sex,
          SUM(student_count) as total_student_count
        FROM grade_ordered
        GROUP BY ncessch, school_year, grade, race_ethnicity, sex, grade_order
        ORDER BY school_year DESC, ncessch, grade_order, race_ethnicity, sex
      `;

      const table = await duckDBService.query(selectQuery);
      return duckDBService.tableToArray(table);
    } catch (error) {
      console.error(`Failed to query district membership for ${districtCode}:`, error);
      throw error;
    }
  }

  /**
   * Creates a reusable in-memory table for school membership data across all available years
   * This enables historical trend analysis and multi-year aggregations
   */
  async createSchoolMembershipHistoricalTable(schoolCode: string): Promise<void> {
    const stateLeaid = schoolCode.substring(0, 2);

    try {
      // Generate file paths for all available years
      // R2 doesn't support glob patterns, so we enumerate all years explicitly
      const filePaths = this.generateR2FilePaths([stateLeaid], this.availableYears);

      // Create a named table that can be reused
      const createTableQuery = `
        CREATE OR REPLACE TABLE school_membership_${schoolCode}_historical AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE ncessch = '${schoolCode}'
        ORDER BY school_year DESC
      `;

      await duckDBService.query(createTableQuery);
    } catch (error) {
      console.error(
        `Failed to create historical school membership table for ${schoolCode}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get enrollment totals by year for a school
   * This aggregates all students across all demographics for each year
   */
  async getHistoricalEnrollmentByYear(
    schoolCode: string
  ): Promise<{school_year: string; total_enrollment: number}[]> {
    try {
      // Ensure the historical table exists
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      // Query total enrollment by year
      const query = `
        SELECT
          school_year,
          SUM(student_count) as total_enrollment
        FROM school_membership_${schoolCode}_historical
        GROUP BY school_year
        ORDER BY school_year ASC
      `;

      const table = await duckDBService.query(query);

      const result: {school_year: string; total_enrollment: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          school_year: duckDBService.getScalarValue(table, i, 'school_year'),
          total_enrollment: duckDBService.getScalarValue(table, i, 'total_enrollment'),
        });
      }
      return result;
    } catch (error) {
      console.error(`Failed to get historical enrollment by year for ${schoolCode}:`, error);
      return [];
    }
  }

  /**
   * Get enrollment by year and race/ethnicity for a school
   * Returns data suitable for stacked bar charts
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
      // Ensure the historical table exists
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      // Query enrollment by year and race/ethnicity using CASE WHEN
      // This ensures we get a value for every race/ethnicity category in every year
      const query = `
        SELECT
          school_year,
          SUM(CASE WHEN race_ethnicity = 'American Indian or Alaska Native' THEN student_count ELSE 0 END) as native_american,
          SUM(CASE WHEN race_ethnicity = 'Asian' THEN student_count ELSE 0 END) as asian,
          SUM(CASE WHEN race_ethnicity = 'Black or African American' THEN student_count ELSE 0 END) as black,
          SUM(CASE WHEN race_ethnicity = 'Hispanic/Latino' THEN student_count ELSE 0 END) as hispanic,
          SUM(CASE WHEN race_ethnicity = 'Native Hawaiian or Other Pacific Islander' THEN student_count ELSE 0 END) as pacific_islander,
          SUM(CASE WHEN race_ethnicity = 'Two or more races' THEN student_count ELSE 0 END) as multiracial,
          SUM(CASE WHEN race_ethnicity = 'White' THEN student_count ELSE 0 END) as white
        FROM school_membership_${schoolCode}_historical
        GROUP BY school_year
        ORDER BY school_year ASC
      `;

      const table = await duckDBService.query(query);

      const result: {
        school_year: string;
        white: number;
        black: number;
        hispanic: number;
        asian: number;
        native_american: number;
        pacific_islander: number;
        multiracial: number;
      }[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          school_year: duckDBService.getScalarValue(table, i, 'school_year'),
          white: duckDBService.getScalarValue(table, i, 'white'),
          black: duckDBService.getScalarValue(table, i, 'black'),
          hispanic: duckDBService.getScalarValue(table, i, 'hispanic'),
          asian: duckDBService.getScalarValue(table, i, 'asian'),
          native_american: duckDBService.getScalarValue(table, i, 'native_american'),
          pacific_islander: duckDBService.getScalarValue(table, i, 'pacific_islander'),
          multiracial: duckDBService.getScalarValue(table, i, 'multiracial'),
        });
      }
      return result;
    } catch (error) {
      console.error(
        `Failed to get historical enrollment by race/ethnicity for ${schoolCode}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get enrollment by year and sex for a school
   * Returns data suitable for stacked bar charts
   */
  async getHistoricalEnrollmentBySex(
    schoolCode: string
  ): Promise<{school_year: string; male: number; female: number}[]> {
    try {
      // Ensure the historical table exists
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      // Query enrollment by year and sex using CASE WHEN
      // This ensures we get a value for both Male and Female in every year
      const query = `
        SELECT
          school_year,
          SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male,
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female
        FROM school_membership_${schoolCode}_historical
        GROUP BY school_year
        ORDER BY school_year ASC
      `;

      const table = await duckDBService.query(query);

      const result: {school_year: string; male: number; female: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          school_year: duckDBService.getScalarValue(table, i, 'school_year'),
          male: duckDBService.getScalarValue(table, i, 'male'),
          female: duckDBService.getScalarValue(table, i, 'female'),
        });
      }
      return result;
    } catch (error) {
      console.error(`Failed to get historical enrollment by sex for ${schoolCode}:`, error);
      return [];
    }
  }

  /**
   * Get student counts by grade for a school
   */
  async getStudentsByGrade(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<{grade: string; student_count: number}[]> {
    try {
      // Ensure the table exists first
      await this.createSchoolMembershipTable(schoolCode, options);

      // Query students by grade with proper ordering
      const gradeQuery = `
        WITH grade_data AS (
          SELECT
            grade,
            SUM(student_count) as student_count,
            CASE grade
              WHEN 'Pre-Kindergarten' THEN -1
              WHEN 'Kindergarten' THEN 0
              WHEN 'Grade 1' THEN 1
              WHEN 'Grade 2' THEN 2
              WHEN 'Grade 3' THEN 3
              WHEN 'Grade 4' THEN 4
              WHEN 'Grade 5' THEN 5
              WHEN 'Grade 6' THEN 6
              WHEN 'Grade 7' THEN 7
              WHEN 'Grade 8' THEN 8
              WHEN 'Grade 9' THEN 9
              WHEN 'Grade 10' THEN 10
              WHEN 'Grade 11' THEN 11
              WHEN 'Grade 12' THEN 12
              WHEN 'Grade 13' THEN 13
              WHEN 'Ungraded' THEN 20
              WHEN 'Adult Education' THEN 21
              ELSE 99
            END as grade_order
          FROM school_membership_${schoolCode}
          GROUP BY grade
        )
        SELECT grade, student_count
        FROM grade_data
        ORDER BY grade_order
      `;

      const table = await duckDBService.query(gradeQuery);

      // Properly extract values using getScalarValue to handle Arrow typed arrays
      const result: {grade: string; student_count: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          grade: duckDBService.getScalarValue(table, i, 'grade'),
          student_count: duckDBService.getScalarValue(table, i, 'student_count'),
        });
      }
      return result;
    } catch (error) {
      console.error(`Failed to get students by grade for ${schoolCode}:`, error);
      return [];
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
