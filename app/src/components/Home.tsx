import { useDuckDB } from "../hooks/useDuckDB";

export default function Home() {
  const { isLoading, error, isInitialized } = useDuckDB();
  const dataDirectory = import.meta.env.VITE_DATA_DIRECTORY;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">School Data Explorer</h1>
        <p className="text-lg text-gray-600">
          Welcome to the school data explorer. Search for districts and schools by NCES ID.
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Status</h2>

        <div className="space-y-3">
          {isLoading && (
            <div className="flex items-center text-blue-600">
              <span className="mr-2">🔄</span>
              <span>Initializing DuckDB WASM...</span>
            </div>
          )}
          {error && (
            <div className="flex items-center text-red-600">
              <span className="mr-2">❌</span>
              <span>Error: {error}</span>
            </div>
          )}
          {isInitialized && (
            <div className="flex items-center text-green-600">
              <span className="mr-2">✅</span>
              <span>DuckDB ready!</span>
            </div>
          )}

          <div className="border-t border-gray-200 pt-3">
            <p className="text-gray-700">
              <span className="font-medium">Data Directory:</span>{" "}
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {dataDirectory || "Not configured"}
              </code>
            </p>

            {!dataDirectory && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-3">
                <div className="flex items-start">
                  <span className="mr-2">⚠️</span>
                  <div>
                    <p className="font-medium text-yellow-800">Setup Required:</p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Update <code className="bg-yellow-100 px-1 rounded">.env</code> file with your data directory path:
                    </p>
                    <code className="block bg-yellow-100 px-2 py-1 rounded text-sm mt-2 text-yellow-900">
                      VITE_DATA_DIRECTORY=/path/to/your/parquet/files
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">URL Pattern</h2>
        <p className="text-gray-700 mb-4">
          Profiles follow the pattern:{" "}
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            /profiles/&#123;ncesId&#125;#&#123;section&#125;
          </code>
        </p>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-gray-900">ncesId:</h3>
            <p className="text-gray-700 text-sm ml-4">
              NCES identifier (7 digits for districts, 12 for schools)
              <br />
              Examples: <code className="bg-gray-100 px-1 rounded">0100005</code> (district),
              <code className="bg-gray-100 px-1 rounded ml-2">010000500870</code> (school)
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">section:</h3>
            <p className="text-gray-700 text-sm ml-4">
              <code className="bg-gray-100 px-1 rounded">overview</code>,
              <code className="bg-gray-100 px-1 rounded ml-2">demographics</code>,
              <code className="bg-gray-100 px-1 rounded ml-2">data</code>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Example URLs</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">District Examples (7 digits)</h3>
            <ul className="space-y-2">
              <li>
                <a href="/profiles/0100005" className="text-blue-600 hover:text-blue-800 text-sm">
                  District 0100005 Overview
                </a>
              </li>
              <li>
                <a href="/profiles/0100005#demographics" className="text-blue-600 hover:text-blue-800 text-sm">
                  District 0100005 Demographics
                </a>
              </li>
              <li>
                <a href="/profiles/0100005#data" className="text-blue-600 hover:text-blue-800 text-sm">
                  District 0100005 Raw Data
                </a>
              </li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">School Examples (12 digits)</h3>
            <ul className="space-y-2">
              <li>
                <a href="/profiles/010000500870" className="text-blue-600 hover:text-blue-800 text-sm">
                  School 010000500870 Overview
                </a>
              </li>
              <li>
                <a href="/profiles/010000500870#demographics" className="text-blue-600 hover:text-blue-800 text-sm">
                  School 010000500870 Demographics
                </a>
              </li>
              <li>
                <a href="/profiles/010000500870#data" className="text-blue-600 hover:text-blue-800 text-sm">
                  School 010000500870 Raw Data
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">How It Works</h3>
        <p className="text-blue-800 mb-4">
          This app uses DuckDB WASM to query parquet files with hive partitioning for optimal performance:
        </p>
        <ul className="space-y-3 text-blue-800">
          <li className="flex items-start">
            <span className="font-medium min-w-fit mr-2">Hive Partitioning:</span>
            <span>Files organized by <code className="bg-blue-100 px-1 rounded text-sm">school_year=*/state_leaid=*/*.parquet</code></span>
          </li>
          <li className="flex items-start">
            <span className="font-medium min-w-fit mr-2">Filter Pushdown:</span>
            <span>Only relevant partitions are scanned based on state and entity ID</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium min-w-fit mr-2">Row Group Pruning:</span>
            <span>Files ordered by <code className="bg-blue-100 px-1 rounded text-sm">ncessch, grade, race_ethnicity, sex</code> for efficient scanning</span>
          </li>
          <li className="flex items-start">
            <span className="font-medium min-w-fit mr-2">Client-side Processing:</span>
            <span>All queries run in your browser for cost efficiency</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
