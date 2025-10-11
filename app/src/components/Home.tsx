import { useDuckDB } from "../hooks/useDuckDB";

export default function Home() {
  const { isLoading, error, isInitialized } = useDuckDB();
  const dataDirectory = import.meta.env.VITE_DATA_DIRECTORY;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>School Data Explorer</h1>
      <p>
        Welcome to the school data explorer. Search for districts and schools by
        NCES ID.
      </p>

      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px",
        }}
      >
        <h2>Database Status:</h2>
        {isLoading && <p>🔄 Initializing DuckDB WASM...</p>}
        {error && <p style={{ color: "red" }}>❌ Error: {error}</p>}
        {isInitialized && <p style={{ color: "green" }}>✅ DuckDB ready!</p>}

        <p>
          <strong>Data Directory:</strong>{" "}
          <code>{dataDirectory || "Not configured"}</code>
        </p>

        {!dataDirectory && (
          <div
            style={{
              backgroundColor: "#fff3cd",
              padding: "10px",
              borderRadius: "3px",
              marginTop: "10px",
            }}
          >
            <strong>⚠️ Setup Required:</strong> Update <code>.env</code> file
            with your data directory path:
            <br />
            <code>VITE_DATA_DIRECTORY=/path/to/your/parquet/files</code>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>URL Pattern:</h2>
        <p>
          Profiles follow the pattern:{" "}
          <code>/profiles/&#123;ncesId&#125;#&#123;section&#125;</code>
        </p>
        <ul>
          <li>
            <strong>ncesId:</strong> NCES identifier (7 digits for districts, 12
            for schools)
            <br />
            Examples: <code>0100005</code> (district), <code>010000500870</code>{" "}
            (school)
          </li>
          <li>
            <strong>section:</strong> <code>overview</code>,{" "}
            <code>demographics</code>, <code>enrollment</code>,{" "}
            <code>data</code>
          </li>
        </ul>
      </div>

      <div>
        <h2>Example URLs:</h2>
        <div style={{ display: "grid", gap: "15px" }}>
          <div
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            <h3>District Examples (7 digits)</h3>
            <ul>
              <li>
                <a href="/profiles/0100005">District 0100005 Overview</a>
              </li>
              <li>
                <a href="/profiles/0100005#demographics">
                  District 0100005 Demographics
                </a>
              </li>
              <li>
                <a href="/profiles/0100005#enrollment">
                  District 0100005 Enrollment
                </a>
              </li>
              <li>
                <a href="/profiles/0100005#data">District 0100005 Raw Data</a>
              </li>
            </ul>
          </div>

          <div
            style={{
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            <h3>School Examples (12 digits)</h3>
            <ul>
              <li>
                <a href="/profiles/010000500870">
                  School 010000500870 Overview
                </a>
              </li>
              <li>
                <a href="/profiles/010000500870#demographics">
                  School 010000500870 Demographics
                </a>
              </li>
              <li>
                <a href="/profiles/010000500870#enrollment">
                  School 010000500870 Enrollment
                </a>
              </li>
              <li>
                <a href="/profiles/010000500870#data">
                  School 010000500870 Raw Data
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#e7f3ff",
          borderRadius: "5px",
        }}
      >
        <h3>How It Works</h3>
        <p>
          This app uses DuckDB WASM to query parquet files with hive
          partitioning for optimal performance:
        </p>
        <ul>
          <li>
            <strong>Hive Partitioning:</strong> Files organized by{" "}
            <code>school_year=*/state_leaid=*/*.parquet</code>
          </li>
          <li>
            <strong>Filter Pushdown:</strong> Only relevant partitions are
            scanned based on state and entity ID
          </li>
          <li>
            <strong>Row Group Pruning:</strong> Files ordered by{" "}
            <code>ncessch, grade, race_ethnicity, sex</code> for efficient
            scanning
          </li>
          <li>
            <strong>Client-side Processing:</strong> All queries run in your
            browser for cost efficiency
          </li>
        </ul>
      </div>
    </div>
  );
}
