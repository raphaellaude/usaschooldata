export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to USA School Data
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Search for schools and districts by name or location using the search bar above
        </p>

        <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Getting Started
          </h2>
          <div className="text-left space-y-4 text-gray-600">
            <p>
              Use the search bar in the header to find schools across the United States.
            </p>
            <p>
              You can search by:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-2">
              <li>School name</li>
              <li>District name</li>
              <li>City or location</li>
            </ul>
            <p>
              Click on any school in the search results to view detailed information and data visualizations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
