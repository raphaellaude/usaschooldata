import React from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {useDuckDB} from '../hooks/useDuckDB';
import {useProfileData} from '../hooks/useProfileData';
import {useSchoolDirectory} from '../hooks/useSchoolDirectory';
import DoughnutChart from './charts/DoughnutChart';
import BarChart from './charts/BarChart';
import CopyableWrapper from './CopyableWrapper';
import {DEFAULT_SCHOOL_YEAR} from '../constants';

export default function Profile() {
  const {id} = useParams<{
    id: string;
  }>();
  const [searchParams] = useSearchParams();
  const {isLoading: dbLoading, error: dbError, isInitialized} = useDuckDB();

  // Extract year from URL parameters, default to 2023-2024
  const urlRequestedYear = searchParams.get('year') || DEFAULT_SCHOOL_YEAR;
  const [fallbackToDefault, setFallbackToDefault] = React.useState(false);

  // Use fallback year if requested year is not available
  const year = fallbackToDefault ? DEFAULT_SCHOOL_YEAR : urlRequestedYear;

  // Use the ID directly as the NCES code
  const ncesCode = id || '';

  // Auto-detect entity type based on ID length
  // 12 digits = school, 7 digits = district
  const entityType: 'district' | 'school' = ncesCode.length === 12 ? 'school' : 'district';

  // Load profile data using the new hook with year filter
  const {
    summary,
    membershipData,
    isLoading: dataLoading,
    error: dataError,
    yearNotAvailable,
    requestedYear,
    availableYears,
  } = useProfileData(
    entityType,
    ncesCode,
    {schoolYear: year} // Pass year as filter
  );

  // Fetch directory information (school name, etc.) for this school and year
  const {directoryInfo, isLoading: directoryLoading} = useSchoolDirectory(ncesCode, year);

  // Handle automatic fallback to default year when requested year is not available
  React.useEffect(() => {
    if (yearNotAvailable && requestedYear !== DEFAULT_SCHOOL_YEAR && !fallbackToDefault) {
      setFallbackToDefault(true);
    }
  }, [yearNotAvailable, requestedYear, fallbackToDefault]);

  if (!id) {
    return <div>Invalid profile URL</div>;
  }

  // Don't show database initialization states - handle them transparently
  const isSystemReady = !dbLoading && !dbError && isInitialized;

  const renderOverview = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Overview</h3>
      {summary ? (
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between py-2 border-b border-gray-200">
              <span className="font-medium text-gray-700">Total Enrollment:</span>
              <span className="text-gray-900">
                {summary.totalEnrollment?.toLocaleString() || 'N/A'}
              </span>
            </div>
            {entityType === 'district' && (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="font-medium text-gray-700">Number of Schools:</span>
                <span className="text-gray-900">{(summary as any)?.schoolCount || 'N/A'}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No overview data available</p>
      )}
    </div>
  );

  const renderDemographics = () => {
    if (!summary?.demographics) {
      return (
        <div>
          <h3>Demographics</h3>
          <p>No demographic data available</p>
        </div>
      );
    }

    // Prepare data for charts - always show all races alphabetically
    const allRaces = [
      'American Indian or Alaska Native',
      'Asian',
      'Black or African American',
      'Hispanic/Latino',
      'Native Hawaiian or Other Pacific Islander',
      'Two or more races',
      'White',
    ];

    const raceData = allRaces.map(race => ({
      label: race,
      value: (summary.demographics.byRaceEthnicity[race] as number) || 0,
    }));

    const sexData = Object.entries(summary.demographics.bySex).map(([label, value]) => ({
      label,
      value: value as number,
    }));

    return (
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Demographics</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sex Demographics - Doughnut Chart */}
          <CopyableWrapper data={sexData} filename="gender-demographics">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">By Gender</h4>
              <div className="flex flex-col">
                <DoughnutChart
                  data={sexData}
                  width={280}
                  height={240}
                  colorMapping={{
                    Male: '#525252',
                    Female: '#9e9e9e',
                  }}
                />
              </div>
            </div>
          </CopyableWrapper>

          {/* Race/Ethnicity Demographics - Bar Chart */}
          <CopyableWrapper
            data={raceData}
            filename="race-ethnicity-demographics"
            className="lg:col-span-2"
          >
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">By Race/Ethnicity</h4>
              <div className="h-[300px]">
                <BarChart data={raceData} />
              </div>
            </div>
          </CopyableWrapper>
        </div>
      </div>
    );
  };

  const renderRawData = () => (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Raw Membership Data</h3>
      {membershipData.length > 0 ? (
        <div>
          <p className="text-gray-600 mb-4">Showing {membershipData.length} records</p>
          <CopyableWrapper data={membershipData} filename="membership-data">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 sticky top-0">
                      <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                        School Year
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                        Grade
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                        Race/Ethnicity
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                        Sex
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-gray-900 border-b border-gray-200">
                        Student Count
                      </th>
                      {entityType === 'district' && (
                        <th className="px-3 py-2 text-left font-medium text-gray-900 border-b border-gray-200">
                          School Code
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {membershipData.slice(0, 100).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-900">{row.school_year}</td>
                        <td className="px-3 py-2 text-gray-900">{row.grade}</td>
                        <td className="px-3 py-2 text-gray-900">{row.race_ethnicity}</td>
                        <td className="px-3 py-2 text-gray-900">{row.sex}</td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {(row.student_count || row.total_student_count || 0).toLocaleString()}
                        </td>
                        {entityType === 'district' && (
                          <td className="px-3 py-2 text-gray-900">{row.ncessch}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CopyableWrapper>
          {membershipData.length > 100 && (
            <p className="text-gray-600 text-sm mt-4 italic">
              Showing first 100 rows of {membershipData.length} total records
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600">No membership data available</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white w-full">
      {/* Fixed Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <img src="/usaschooldata.svg" alt="USA School Data" className="w-8 h-8" />
            {directoryLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : directoryInfo ? (
              directoryInfo.sch_name
            ) : (
              `${entityType === 'district' ? 'District' : 'School'} Profile`
            )}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>NCES ID: {ncesCode}</span>
            <span>School Year: {year}</span>
            {directoryInfo && directoryInfo.lea_name && (
              <span>District: {directoryInfo.lea_name}</span>
            )}
            {directoryInfo && directoryInfo.city && directoryInfo.state_name && (
              <span>Location: {directoryInfo.city}, {directoryInfo.state_name}</span>
            )}
          </div>

          {/* Navigation */}
          <nav className="mt-4 flex space-x-6">
            <a href="#overview" className="text-blue-600 hover:text-blue-800 font-medium">
              Overview
            </a>
            <a href="#demographics" className="text-blue-600 hover:text-blue-800 font-medium">
              Demographics
            </a>
            <a href="#data" className="text-blue-600 hover:text-blue-800 font-medium">
              Raw Data
            </a>
          </nav>
        </div>
      </header>

      {/* Year Fallback Notification */}
      {fallbackToDefault && urlRequestedYear !== DEFAULT_SCHOOL_YEAR && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  <span className="font-medium">Note:</span> Data for school year {urlRequestedYear}{' '}
                  is not available. Showing data for {DEFAULT_SCHOOL_YEAR} instead.
                  {availableYears && availableYears.length > 0 && (
                    <span> Available years: {availableYears.join(', ')}.</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {!isSystemReady || dataLoading ? (
          <div className="space-y-12">
            {/* Overview Section - Loading Placeholder */}
            <section id="overview">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Overview</h3>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="font-medium text-gray-700">Total Enrollment:</span>
                      <span className="text-gray-400">Loading...</span>
                    </div>
                    {entityType === 'district' && (
                      <div className="flex justify-between py-2 border-b border-gray-200">
                        <span className="font-medium text-gray-700">Number of Schools:</span>
                        <span className="text-gray-400">Loading...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Demographics Section - Loading Placeholder */}
            <section id="demographics">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Demographics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sex Demographics Placeholder */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">By Gender</h4>
                    <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                      <div className="animate-pulse">Loading chart...</div>
                    </div>
                  </div>

                  {/* Race/Ethnicity Demographics Placeholder */}
                  <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">By Race/Ethnicity</h4>
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      <div className="animate-pulse">Loading chart...</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Raw Data Section - Loading Placeholder */}
            <section id="data">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Raw Membership Data</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <div className="animate-pulse">Loading data...</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : dataError && !yearNotAvailable ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-700 mb-4">{dataError}</p>
            <details className="text-sm">
              <summary className="font-medium text-red-800 cursor-pointer">Troubleshooting</summary>
              <ul className="mt-2 text-red-700 space-y-1">
                <li>• Check that VITE_DATA_DIRECTORY is set correctly in .env</li>
                <li>• Verify that parquet files exist at the expected path</li>
                <li>• Ensure file permissions allow reading</li>
                <li>• Check browser console for detailed error messages</li>
              </ul>
            </details>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Overview Section */}
            <section id="overview">{renderOverview()}</section>

            {/* Demographics Section */}
            <section id="demographics">{renderDemographics()}</section>

            {/* Raw Data Section */}
            <section id="data">{renderRawData()}</section>
          </div>
        )}
      </main>
    </div>
  );
}
