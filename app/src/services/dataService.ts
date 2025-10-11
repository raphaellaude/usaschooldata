import { duckDBService } from './duckdb';

export interface MembershipQueryOptions {
  schoolCode?: string;
  districtCode?: string;
  schoolYear?: string;
  grade?: string;
  raceEthnicity?: string;
  sex?: string;
}

export class DataService {
  private dataDirectory: string;

  constructor() {
    this.dataDirectory = import.meta.env.VITE_DATA_DIRECTORY || '/path/to/data';
  }

  /**
   * Creates and queries school membership data with optimized filter pushdown
   */
  async querySchoolMembership(schoolCode: string, options: MembershipQueryOptions = {}): Promise<any[]> {
    const stateLeaid = schoolCode.substring(0, 2);
    const tableName = `school_membership_${schoolCode.replace(/\W/g, '_')}`;

    try {
      // Drop table if it exists (for fresh data)
      await duckDBService.query(`DROP TABLE IF EXISTS ${tableName}`);

      const createTableQuery = `
        CREATE OR REPLACE TABLE ${tableName} AS
        SELECT * FROM read_parquet(
          '${this.dataDirectory}/membership/school_year=*/state_leaid=*/*.parquet',
          hive_partitioning=true
        )
        WHERE ncessch = '${schoolCode}'
        AND state_leaid = '${stateLeaid}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
        ${options.grade ? `AND grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `AND race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `AND sex = '${options.sex}'` : ''}
      `;

      await duckDBService.query(createTableQuery);

      // Query the created table
      const selectQuery = `
        SELECT * FROM ${tableName}
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
    const tableName = `district_membership_${districtCode.replace(/\W/g, '_')}`;

    try {
      // Drop table if it exists (for fresh data)
      await duckDBService.query(`DROP TABLE IF EXISTS ${tableName}`);

      const createTableQuery = `
        CREATE OR REPLACE TABLE ${tableName} AS
        SELECT * FROM read_parquet(
          '${this.dataDirectory}/membership/school_year=*/state_leaid=*/*.parquet',
          hive_partitioning=true
        )
        WHERE leaid = '${districtCode}'
        AND state_leaid = '${stateLeaid}'
        ${options.schoolYear ? `AND school_year = '${options.schoolYear}'` : ''}
        ${options.grade ? `AND grade = '${options.grade}'` : ''}
        ${options.raceEthnicity ? `AND race_ethnicity = '${options.raceEthnicity}'` : ''}
        ${options.sex ? `AND sex = '${options.sex}'` : ''}
      `;

      await duckDBService.query(createTableQuery);

      // Query the created table - aggregate by school for district view
      const selectQuery = `
        SELECT
          ncessch,
          school_year,
          grade,
          race_ethnicity,
          sex,
          SUM(student_count) as total_student_count
        FROM ${tableName}
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
   * Get summary statistics for a school
   */
  async getSchoolSummary(schoolCode: string): Promise<any> {
    try {
      const data = await this.querySchoolMembership(schoolCode);

      if (data.length === 0) {
        return null;
      }

      // Calculate summary statistics
      const summary = {
        schoolCode,
        totalEnrollment: data.reduce((sum, row) => sum + (row.student_count || 0), 0),
        schoolYears: [...new Set(data.map(row => row.school_year))].sort().reverse(),
        grades: [...new Set(data.map(row => row.grade))].sort(),
        demographics: this.calculateDemographics(data),
        latestYear: Math.max(...data.map(row => parseInt(row.school_year))),
      };

      return summary;
    } catch (error) {
      console.error(`Failed to get school summary for ${schoolCode}:`, error);
      return null;
    }
  }

  /**
   * Get summary statistics for a district
   */
  async getDistrictSummary(districtCode: string): Promise<any> {
    try {
      const data = await this.queryDistrictMembership(districtCode);

      if (data.length === 0) {
        return null;
      }

      // Calculate summary statistics
      const summary = {
        districtCode,
        totalEnrollment: data.reduce((sum, row) => sum + (row.total_student_count || 0), 0),
        schoolCount: new Set(data.map(row => row.ncessch)).size,
        schoolYears: [...new Set(data.map(row => row.school_year))].sort().reverse(),
        grades: [...new Set(data.map(row => row.grade))].sort(),
        demographics: this.calculateDemographics(data, 'total_student_count'),
        latestYear: Math.max(...data.map(row => parseInt(row.school_year))),
      };

      return summary;
    } catch (error) {
      console.error(`Failed to get district summary for ${districtCode}:`, error);
      return null;
    }
  }

  private calculateDemographics(data: any[], studentCountField = 'student_count'): any {
    const demographics = {
      byRaceEthnicity: {},
      bySex: {},
      byGrade: {},
    };

    data.forEach(row => {
      const studentCount = row[studentCountField] || 0;

      // By race/ethnicity
      if (!demographics.byRaceEthnicity[row.race_ethnicity]) {
        demographics.byRaceEthnicity[row.race_ethnicity] = 0;
      }
      demographics.byRaceEthnicity[row.race_ethnicity] += studentCount;

      // By sex
      if (!demographics.bySex[row.sex]) {
        demographics.bySex[row.sex] = 0;
      }
      demographics.bySex[row.sex] += studentCount;

      // By grade
      if (!demographics.byGrade[row.grade]) {
        demographics.byGrade[row.grade] = 0;
      }
      demographics.byGrade[row.grade] += studentCount;
    });

    return demographics;
  }
}

export const dataService = new DataService();
