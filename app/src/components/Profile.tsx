import { useParams, useLocation } from "react-router-dom";
import { useDuckDB } from "../hooks/useDuckDB";
import { useProfileData } from "../hooks/useProfileData";

export default function Profile() {
  const { id } = useParams<{
    id: string;
  }>();
  const location = useLocation();
  const { isLoading: dbLoading, error: dbError, isInitialized } = useDuckDB();

  // Extract section from hash (e.g., #demographics, #enrollment)
  const section = location.hash.slice(1) || "overview";

  // Use the ID directly as the NCES code
  const ncesCode = id || "";

  // Auto-detect entity type based on ID length
  // 12 digits = school, 7 digits = district
  const entityType: "district" | "school" =
    ncesCode.length === 12 ? "school" : "district";

  // Load profile data using the new hook
  const {
    summary,
    membershipData,
    isLoading: dataLoading,
    error: dataError,
  } = useProfileData(
    entityType,
    ncesCode,
    {}, // Add filters here based on section if needed
  );

  if (!id) {
    return <div>Invalid profile URL</div>;
  }

  if (dbLoading) {
    return <div>Initializing database...</div>;
  }

  if (dbError) {
    return <div>Database error: {dbError}</div>;
  }

  if (!isInitialized) {
    return <div>Database not ready</div>;
  }

  const renderOverview = () => (
    <div>
      <h3>Overview</h3>
      {summary ? (
        <div>
          <p>
            <strong>Total Enrollment:</strong>{" "}
            {summary.totalEnrollment?.toLocaleString() || "N/A"}
          </p>
          <p>
            <strong>School Years Available:</strong>{" "}
            {summary.schoolYears?.join(", ") || "N/A"}
          </p>
          <p>
            <strong>Grades Served:</strong>{" "}
            {summary.grades?.join(", ") || "N/A"}
          </p>
          {entityType === "district" && (
            <p>
              <strong>Number of Schools:</strong> {summary.schoolCount || "N/A"}
            </p>
          )}
          <p>
            <strong>Latest Data Year:</strong> {summary.latestYear || "N/A"}
          </p>
        </div>
      ) : (
        <p>No overview data available</p>
      )}
    </div>
  );

  const renderDemographics = () => (
    <div>
      <h3>Demographics</h3>
      {summary?.demographics ? (
        <div>
          <h4>By Race/Ethnicity</h4>
          <ul>
            {Object.entries(summary.demographics.byRaceEthnicity).map(
              ([race, count]) => (
                <li key={race}>
                  {race}: {(count as number).toLocaleString()}
                </li>
              ),
            )}
          </ul>

          <h4>By Gender</h4>
          <ul>
            {Object.entries(summary.demographics.bySex).map(([sex, count]) => (
              <li key={sex}>
                {sex}: {(count as number).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p>No demographic data available</p>
      )}
    </div>
  );

  const renderEnrollment = () => (
    <div>
      <h3>Enrollment</h3>
      {summary?.demographics ? (
        <div>
          <h4>By Grade</h4>
          <ul>
            {Object.entries(summary.demographics.byGrade).map(
              ([grade, count]) => (
                <li key={grade}>
                  Grade {grade}: {(count as number).toLocaleString()}
                </li>
              ),
            )}
          </ul>
        </div>
      ) : (
        <p>No enrollment data available</p>
      )}
    </div>
  );

  const renderRawData = () => (
    <div>
      <h3>Raw Membership Data</h3>
      {membershipData.length > 0 ? (
        <div>
          <p>Showing {membershipData.length} records</p>
          <div style={{ maxHeight: "400px", overflow: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "12px",
              }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "#f5f5f5",
                  }}
                >
                  <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                    School Year
                  </th>
                  <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                    Grade
                  </th>
                  <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                    Race/Ethnicity
                  </th>
                  <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                    Sex
                  </th>
                  <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                    Student Count
                  </th>
                  {entityType === "district" && (
                    <th style={{ border: "1px solid #ddd", padding: "4px" }}>
                      School Code
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {membershipData.slice(0, 100).map((row, index) => (
                  <tr key={index}>
                    <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                      {row.school_year}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                      {row.grade}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                      {row.race_ethnicity}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                      {row.sex}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                      {(
                        row.student_count ||
                        row.total_student_count ||
                        0
                      ).toLocaleString()}
                    </td>
                    {entityType === "district" && (
                      <td style={{ border: "1px solid #ddd", padding: "4px" }}>
                        {row.ncessch}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {membershipData.length > 100 && (
            <p>
              <em>
                Showing first 100 rows of {membershipData.length} total records
              </em>
            </p>
          )}
        </div>
      ) : (
        <p>No membership data available</p>
      )}
    </div>
  );

  const renderSection = () => {
    switch (section) {
      case "demographics":
        return renderDemographics();
      case "enrollment":
        return renderEnrollment();
      case "data":
        return renderRawData();
      case "overview":
      default:
        return renderOverview();
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1>{entityType === "district" ? "District" : "School"} Profile</h1>
        <h2>NCES ID: {ncesCode}</h2>
      </header>

      <nav
        style={{
          marginBottom: "20px",
          borderBottom: "1px solid #ccc",
          paddingBottom: "10px",
        }}
      >
        <a href={`#overview`} style={{ marginRight: "15px" }}>
          Overview
        </a>
        <a href={`#demographics`} style={{ marginRight: "15px" }}>
          Demographics
        </a>
        <a href={`#enrollment`} style={{ marginRight: "15px" }}>
          Enrollment
        </a>
        <a href={`#data`} style={{ marginRight: "15px" }}>
          Raw Data
        </a>
      </nav>

      <main>
        {dataLoading ? (
          <div>
            <p>
              🔄 Loading {entityType} data for {ncesCode}...
            </p>
            <p>
              <em>Querying parquet files with hive partitioning...</em>
            </p>
          </div>
        ) : dataError ? (
          <div style={{ color: "red" }}>
            <h3>Error Loading Data</h3>
            <p>{dataError}</p>
            <details>
              <summary>Troubleshooting</summary>
              <ul>
                <li>Check that VITE_DATA_DIRECTORY is set correctly in .env</li>
                <li>Verify that parquet files exist at the expected path</li>
                <li>Ensure file permissions allow reading</li>
                <li>Check browser console for detailed error messages</li>
              </ul>
            </details>
          </div>
        ) : (
          renderSection()
        )}
      </main>
    </div>
  );
}
