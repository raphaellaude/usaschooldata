import type {Table} from 'apache-arrow';
import {roomStore} from '../store';

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

/**
 * Coerce an Arrow cell value to a plain JS value.
 *
 * DuckDB SUM() on integer columns returns HUGEINT, which Arrow represents as
 * Decimal(38,0,128). Arrow's col.get(i) for Decimal returns a DecimalBigNum —
 * a Uint32Array subclass — whose toString() gives the correct string.
 * Without this conversion, values leak as raw buffers like "498,0,0,0".
 */
function coerceArrowValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === 'bigint') return Number(value);
  if (ArrayBuffer.isView(value)) return Number(String(value));
  return value;
}

/**
 * Safely convert an Arrow Table to an array of plain JS objects using
 * columnar access. This avoids the stack overflow caused by Arrow's
 * proxy-based toArray() + toJSON() pattern.
 */
function tableToRows(table: Table): Record<string, unknown>[] {
  const fields = table.schema.fields;
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < table.numRows; i++) {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      const col = table.getChild(field.name);
      if (col) {
        row[field.name] = coerceArrowValue(col.get(i));
      }
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Extract a scalar value from an Arrow Table using columnar access.
 */
function getScalar(table: Table, rowIndex: number, columnName: string): any {
  if (table.numRows === 0) return null;
  const col = table.getChild(columnName);
  if (!col) return null;
  return coerceArrowValue(col.get(rowIndex));
}

/** Execute a SQL query via the SQLRooms connector */
async function query(sql: string): Promise<Table> {
  const connector = roomStore.getState().db.connector;
  return await connector.query(sql);
}

export class DataService {
  private dataDirectory: string;
  /** Cache of in-flight table creation promises to prevent write-write conflicts */
  private tableCreationCache = new Map<string, Promise<void>>();
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
   * Creates a reusable in-memory table for school membership data.
   * Uses a promise cache to prevent concurrent CREATE TABLE write-write conflicts.
   */
  async createSchoolMembershipTable(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<void> {
    const cacheKey = `school_${schoolCode}_${options.schoolYear || 'all'}`;
    const existing = this.tableCreationCache.get(cacheKey);
    if (existing) return existing;

    const promise = (async () => {
      const stateLeaid = schoolCode.substring(0, 2);
      const years = options.schoolYear ? [options.schoolYear] : undefined;
      const filePaths = this.generateR2FilePaths([stateLeaid], years);

      await query(`
        CREATE OR REPLACE TABLE school_membership_${schoolCode} AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE ncessch = '${schoolCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
      `);
    })();

    this.tableCreationCache.set(cacheKey, promise);

    try {
      await promise;
    } catch (error) {
      this.tableCreationCache.delete(cacheKey);
      console.error(`Failed to create school membership table for ${schoolCode}:`, error);

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
      await this.createSchoolMembershipTable(schoolCode, options);

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

      const table = await query(selectQuery);
      return tableToRows(table);
    } catch (error) {
      console.error(`Failed to query school membership for ${schoolCode}:`, error);
      throw error;
    }
  }

  /**
   * Creates a reusable in-memory table for district membership data.
   * Uses a promise cache to prevent concurrent CREATE TABLE write-write conflicts.
   */
  async createDistrictMembershipTable(
    districtCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<void> {
    const cacheKey = `district_${districtCode}_${options.schoolYear || 'all'}`;
    const existing = this.tableCreationCache.get(cacheKey);
    if (existing) return existing;

    const promise = (async () => {
      const stateLeaid = districtCode.substring(0, 2);
      const years = options.schoolYear ? [options.schoolYear] : undefined;
      const filePaths = this.generateR2FilePaths([stateLeaid], years);

      await query(`
        CREATE OR REPLACE TABLE district_membership_${districtCode} AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE leaid = '${districtCode}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
      `);
    })();

    this.tableCreationCache.set(cacheKey, promise);

    try {
      await promise;
    } catch (error) {
      this.tableCreationCache.delete(cacheKey);
      console.error(`Failed to create district membership table for ${districtCode}:`, error);

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
      await this.createDistrictMembershipTable(districtCode, options);

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

      const table = await query(selectQuery);
      return tableToRows(table);
    } catch (error) {
      console.error(`Failed to query district membership for ${districtCode}:`, error);
      throw error;
    }
  }

  /**
   * Creates a reusable in-memory table for school membership data across all available years.
   * Uses a promise cache to prevent concurrent CREATE TABLE write-write conflicts.
   */
  async createSchoolMembershipHistoricalTable(schoolCode: string): Promise<void> {
    const cacheKey = `school_historical_${schoolCode}`;
    const existing = this.tableCreationCache.get(cacheKey);
    if (existing) return existing;

    const promise = (async () => {
      const stateLeaid = schoolCode.substring(0, 2);
      const filePaths = this.generateR2FilePaths([stateLeaid], this.availableYears);

      await query(`
        CREATE OR REPLACE TABLE school_membership_${schoolCode}_historical AS
        SELECT * FROM read_parquet([${filePaths.join(', ')}])
        WHERE ncessch = '${schoolCode}'
        ORDER BY school_year DESC
      `);
    })();

    this.tableCreationCache.set(cacheKey, promise);

    try {
      await promise;
    } catch (error) {
      this.tableCreationCache.delete(cacheKey);
      console.error(
        `Failed to create historical school membership table for ${schoolCode}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get enrollment totals by year for a school
   */
  async getHistoricalEnrollmentByYear(
    schoolCode: string
  ): Promise<{school_year: string; total_enrollment: number}[]> {
    try {
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      const sql = `
        SELECT
          school_year,
          SUM(student_count) as total_enrollment
        FROM school_membership_${schoolCode}_historical
        GROUP BY school_year
        ORDER BY school_year ASC
      `;

      const table = await query(sql);

      const result: {school_year: string; total_enrollment: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          school_year: getScalar(table, i, 'school_year'),
          total_enrollment: getScalar(table, i, 'total_enrollment'),
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
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      const sql = `
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

      const table = await query(sql);

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
          school_year: getScalar(table, i, 'school_year'),
          white: getScalar(table, i, 'white'),
          black: getScalar(table, i, 'black'),
          hispanic: getScalar(table, i, 'hispanic'),
          asian: getScalar(table, i, 'asian'),
          native_american: getScalar(table, i, 'native_american'),
          pacific_islander: getScalar(table, i, 'pacific_islander'),
          multiracial: getScalar(table, i, 'multiracial'),
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
   */
  async getHistoricalEnrollmentBySex(
    schoolCode: string
  ): Promise<{school_year: string; male: number; female: number}[]> {
    try {
      await this.createSchoolMembershipHistoricalTable(schoolCode);

      const sql = `
        SELECT
          school_year,
          SUM(CASE WHEN sex = 'Male' THEN student_count ELSE 0 END) as male,
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female
        FROM school_membership_${schoolCode}_historical
        GROUP BY school_year
        ORDER BY school_year ASC
      `;

      const table = await query(sql);

      const result: {school_year: string; male: number; female: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          school_year: getScalar(table, i, 'school_year'),
          male: getScalar(table, i, 'male'),
          female: getScalar(table, i, 'female'),
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
      await this.createSchoolMembershipTable(schoolCode, options);

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

      const table = await query(gradeQuery);

      const result: {grade: string; student_count: number}[] = [];
      for (let i = 0; i < table.numRows; i++) {
        result.push({
          grade: getScalar(table, i, 'grade'),
          student_count: getScalar(table, i, 'student_count'),
        });
      }
      return result;
    } catch (error) {
      console.error(`Failed to get students by grade for ${schoolCode}:`, error);
      return [];
    }
  }

  /**
   * Get summary statistics for a school
   */
  async getSchoolSummary(
    schoolCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<SchoolSummary | null> {
    try {
      await this.createSchoolMembershipTable(schoolCode, options);

      const summaryQuery = `
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
          SUM(CASE WHEN sex = 'Female' THEN student_count ELSE 0 END) as female_count
        FROM school_membership_${schoolCode}
      `;

      const table = await query(summaryQuery);

      if (table.numRows === 0 || getScalar(table, 0, 'total_enrollment') === 0) {
        return null;
      }

      return {
        schoolCode,
        totalEnrollment: getScalar(table, 0, 'total_enrollment'),
        earliestYear: getScalar(table, 0, 'earliest_year'),
        latestYear: getScalar(table, 0, 'latest_year'),
        demographics: {
          byRaceEthnicity: {
            White: getScalar(table, 0, 'white_count'),
            'Black or African American': getScalar(table, 0, 'black_count'),
            'Hispanic/Latino': getScalar(table, 0, 'hispanic_count'),
            Asian: getScalar(table, 0, 'asian_count'),
            'American Indian or Alaska Native': getScalar(table, 0, 'native_american_count'),
            'Native Hawaiian or Other Pacific Islander': getScalar(
              table,
              0,
              'pacific_islander_count'
            ),
            'Two or more races': getScalar(table, 0, 'multiracial_count'),
          },
          bySex: {
            Male: getScalar(table, 0, 'male_count'),
            Female: getScalar(table, 0, 'female_count'),
          },
        },
      };
    } catch (error) {
      console.error(`Failed to get school summary for ${schoolCode}:`, error);

      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      return null;
    }
  }

  /**
   * Get summary statistics for a district
   */
  async getDistrictSummary(
    districtCode: string,
    options: MembershipQueryOptions = {}
  ): Promise<DistrictSummary | null> {
    try {
      await this.createDistrictMembershipTable(districtCode, options);

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

      const table = await query(summaryQuery);

      if (table.numRows === 0 || getScalar(table, 0, 'total_enrollment') === 0) {
        return null;
      }

      return {
        districtCode,
        totalEnrollment: getScalar(table, 0, 'total_enrollment'),
        schoolCount: getScalar(table, 0, 'school_count'),
        earliestYear: getScalar(table, 0, 'earliest_year'),
        latestYear: getScalar(table, 0, 'latest_year'),
        demographics: {
          byRaceEthnicity: {
            White: getScalar(table, 0, 'white_count'),
            'Black or African American': getScalar(table, 0, 'black_count'),
            'Hispanic/Latino': getScalar(table, 0, 'hispanic_count'),
            Asian: getScalar(table, 0, 'asian_count'),
            'American Indian or Alaska Native': getScalar(table, 0, 'native_american_count'),
            'Native Hawaiian or Other Pacific Islander': getScalar(
              table,
              0,
              'pacific_islander_count'
            ),
            'Two or more races': getScalar(table, 0, 'multiracial_count'),
          },
          bySex: {
            Male: getScalar(table, 0, 'male_count'),
            Female: getScalar(table, 0, 'female_count'),
          },
        },
      };
    } catch (error) {
      console.error(`Failed to get district summary for ${districtCode}:`, error);

      if (this.isYearNotAvailableError(error) && options.schoolYear) {
        throw new YearNotAvailableError(options.schoolYear, this.availableYears);
      }

      return null;
    }
  }
}

export const dataService = new DataService();
