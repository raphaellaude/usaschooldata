// import { useDuckDB } from "../hooks/useDuckDB";
// import { DEFAULT_SCHOOL_YEAR } from "../constants";

export default function Home() {
  // const { isLoading, error, isInitialized } = useDuckDB();

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          School Data Explorer
        </h1>
        <p className="text-lg text-gray-600">
          Welcome to the school data explorer. Search for districts and schools
          by NCES ID.
        </p>
      </header>
    </div>
  );
}
