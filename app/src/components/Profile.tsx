import React from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {useDuckDB} from '../hooks/useDuckDB';
import {useProfileData} from '../hooks/useProfileData';
import {useSchoolDirectory} from '../hooks/useSchoolDirectory';
import {useHistoricalEnrollment} from '../hooks/useHistoricalEnrollment';
import {dataService} from '../services/dataService';
import DoughnutChart from './charts/DoughnutChart';
import BarChart from './charts/BarChart';
import HistoricalEnrollmentChart from './charts/HistoricalEnrollmentChart';
import CopyableWrapper from './CopyableWrapper';
import GradeBand from './GradeBand';
import {DEFAULT_SCHOOL_YEAR} from '../constants';
import {Link1Icon} from '@radix-ui/react-icons';

export default function Profile() {
  const {id} = useParams<{
    id: string;
  }>();
  const [searchParams] = useSearchParams();
  const {isLoading: dbLoading, error: dbError, isInitialized} = useDuckDB();
  const urlRequestedYear = searchParams.get('year') || DEFAULT_SCHOOL_YEAR;
  const [fallbackToDefault, setFallbackToDefault] = React.useState(false);
  const year = fallbackToDefault ? DEFAULT_SCHOOL_YEAR : urlRequestedYear;
  const ncesCode = id || '';
  const entityType: 'district' | 'school' = ncesCode.length === 12 ? 'school' : 'district';
  const [gradeData, setGradeData] = React.useState<{grade: string; student_count: number}[]>([]);
  const [copiedLink, setCopiedLink] = React.useState<string | null>(null);

  const {
    summary,
    membershipData,
    isLoading: dataLoading,
    error: dataError,
    yearNotAvailable,
    requestedYear,
    availableYears,
  } = useProfileData(entityType, ncesCode, {schoolYear: year});

  const {
    directoryInfo,
    isLoading: directoryLoading,
    error: directoryError,
  } = useSchoolDirectory(ncesCode, year);

  // Load historical enrollment data for schools only AFTER summary data loads
  // This prevents the slow historical query (which hits S3) from blocking fast summary queries
  // since DuckDB WASM executes queries serially
  const historicalEnrollmentData = useHistoricalEnrollment(
    entityType === 'school' ? ncesCode : '',
    !dataLoading && !directoryLoading // Only start loading after summary and directory complete
  );

  // Handle automatic fallback to default year when requested year is not available
  React.useEffect(() => {
    if (yearNotAvailable && requestedYear !== DEFAULT_SCHOOL_YEAR && !fallbackToDefault) {
      setFallbackToDefault(true);
    }
  }, [yearNotAvailable, requestedYear, fallbackToDefault]);

  // Load grade data for schools only
  React.useEffect(() => {
    if (entityType === 'school' && ncesCode && isInitialized && !dbError && !dataLoading) {
      loadGradeData();
    }
  }, [entityType, ncesCode, year, isInitialized, dbError, dataLoading]);

  const loadGradeData = async () => {
    try {
      const data = await dataService.getStudentsByGrade(ncesCode, {schoolYear: year});
      setGradeData(data);
    } catch (error) {
      console.error('Failed to load grade data:', error);
      setGradeData([]);
    }
  };

  const copyLinkToClipboard = async (hash: string) => {
    try {
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(hash);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (!id) {
    return <div>Invalid profile URL</div>;
  }

  // Don't show database initialization states - handle them transparently
  const isSystemReady = !dbLoading && !dbError && isInitialized;

  // Handle scrolling to hash anchor on initial load and when data finishes loading
  React.useEffect(() => {
    // Wait for data to finish loading before attempting to scroll
    if (!dataLoading && !directoryLoading && isSystemReady) {
      const hash = window.location.hash;
      if (hash) {
        // Use setTimeout to ensure the DOM has been updated with the content
        setTimeout(() => {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            element.scrollIntoView({behavior: 'smooth', block: 'start'});
          }
        }, 100);
      }
    }
  }, [dataLoading, directoryLoading, isSystemReady]);

  const renderOverview = () => {
    // Prepare grade data for the bar chart
    const gradeChartData = gradeData.map(item => ({
      label: item.grade,
      value: item.student_count,
    }));

    return (
      <div>
        {summary ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="rounded-lg">
              <div className="text-lg font-medium text-gray-900 mb-4">Total enrollment</div>
              <div className="text-6xl font-bold text-gray-900">
                {summary.totalEnrollment?.toLocaleString() || 'N/A'}
              </div>
            </div>

            {entityType === 'district' && (
              <div className="text-center py-4 bg-white border border-gray-200 rounded-lg">
                <div className="font-medium text-gray-700">Number of Schools</div>
                <div className="text-gray-900">{(summary as any)?.schoolCount || 'N/A'}</div>
              </div>
            )}

            {entityType === 'school' && gradeChartData.length > 0 && (
              <CopyableWrapper
                data={gradeChartData}
                filename="students-by-grade"
                className="lg:col-span-2"
              >
                <div className="rounded-lg">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Students by grade</h4>
                  <div className="h-[400px]">
                    <BarChart data={gradeChartData} />
                  </div>
                </div>
              </CopyableWrapper>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No overview data available</p>
        )}
      </div>
    );
  };

  const renderDemographics = () => {
    if (!summary?.demographics) {
      return (
        <div>
          <h3>Demographics</h3>
          <p>No demographic data available</p>
        </div>
      );
    }

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
        <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
          <a
            href="#demographics"
            className="hover:text-gray-900 inline-flex items-center gap-2"
            onClick={e => {
              e.preventDefault();
              copyLinkToClipboard('#demographics');
              window.location.hash = 'demographics';
            }}
          >
            Demographics
            <Link1Icon
              className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '#demographics' ? 'text-green-600' : ''}`}
            />
          </a>
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sex Demographics - Doughnut Chart */}
          <CopyableWrapper data={sexData} filename="gender-demographics">
            <div className="rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Sex</h4>
              <div className="flex flex-col">
                <DoughnutChart data={sexData} width={280} height={240} />
              </div>
            </div>
          </CopyableWrapper>

          {/* Race/Ethnicity Demographics - Bar Chart */}
          <CopyableWrapper
            data={raceData}
            filename="race-ethnicity-demographics"
            className="lg:col-span-2"
          >
            <div className="rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Race & ethnicity</h4>
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
      <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
        <a
          href="#data"
          className="hover:text-gray-900 inline-flex items-center gap-2"
          onClick={e => {
            e.preventDefault();
            copyLinkToClipboard('#data');
            window.location.hash = 'data';
          }}
        >
          Raw Membership Data
          <Link1Icon
            className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '#data' ? 'text-green-600' : ''}`}
          />
        </a>
      </h3>
      {membershipData.length > 0 ? (
        <div>
          <CopyableWrapper data={membershipData} filename="membership-data">
            <p className="text-gray-600 mb-4">Showing {membershipData.length} records</p>
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

  const renderHistoricalEnrollment = () => {
    // Only show for schools, not districts
    if (entityType !== 'school') {
      return null;
    }

    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-600 mb-6 group">
          <a
            href="#historical-enrollment"
            className="hover:text-gray-900 inline-flex items-center gap-2"
            onClick={e => {
              e.preventDefault();
              copyLinkToClipboard('#historical-enrollment');
              window.location.hash = 'historical-enrollment';
            }}
          >
            Historical Enrollment
            <Link1Icon
              className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '#historical-enrollment' ? 'text-green-600' : ''}`}
            />
          </a>
        </h3>
        {historicalEnrollmentData.isLoading ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="animate-pulse">Loading historical enrollment data...</div>
            </div>
          </div>
        ) : historicalEnrollmentData.error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-700">
              Failed to load historical enrollment data: {historicalEnrollmentData.error}
            </p>
          </div>
        ) : historicalEnrollmentData.byYear.length > 0 ? (
          <div className="rounded-lg">
            <HistoricalEnrollmentChart
              historicalData={historicalEnrollmentData}
              currentYear={year}
            />
          </div>
        ) : (
          <p className="text-gray-600">No historical enrollment data available</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white w-full">
      <header className="border-b border-gray-200 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <h1 className="text-4xl font-display font-semibold text-gray-900 flex items-center gap-3 mb-2 group">
            {directoryLoading ? (
              <span className="text-gray-400">Loading...</span>
            ) : directoryInfo ? (
              <a
                href="#"
                className="hover:text-gray-600 inline-flex items-center gap-2"
                onClick={e => {
                  e.preventDefault();
                  copyLinkToClipboard('');
                }}
              >
                {directoryInfo.sch_name}
                <Link1Icon
                  className={`w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity ${copiedLink === '' ? 'text-green-600' : ''}`}
                />
              </a>
            ) : (
              `${entityType === 'district' ? 'District' : 'School'} Profile`
            )}
          </h1>
          <div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 text-sm text-gray-500">
            <span>NCES ID: {ncesCode}</span>
            <span>School Year: {year}</span>
            {/* Directory Stats Grid */}
            {directoryInfo?.sch_type && <span>School Type: {directoryInfo.sch_type || 'N/A'}</span>}
            {directoryInfo?.sch_level && (
              <span>School Level: {directoryInfo.sch_level || 'N/A'}</span>
            )}
            {directoryInfo?.charter && (
              <span>Charter School: {directoryInfo.charter || 'N/A'}</span>
            )}
            {directoryInfo?.sy_status && <span>Status: {directoryInfo.sy_status || 'N/A'}</span>}
            {directoryInfo && directoryInfo.city && directoryInfo.state_name && (
              <span>
                Location: {directoryInfo.city}, {directoryInfo.state_name}
              </span>
            )}
          </div>

          {/* Grade Band Visualization */}
          {entityType === 'school' && directoryInfo && (
            <div className="mt-4">
              <GradeBand directoryInfo={directoryInfo} />
            </div>
          )}

          {/* Navigation */}
          <nav className="mt-4 flex space-x-6">
            <a href="#demographics" className="text-blue-600 hover:text-blue-800 text-sm">
              &rarr; Demographics
            </a>
            <a href="#data" className="text-blue-600 hover:text-blue-800 text-sm">
              &rarr; Raw Data
            </a>
            {entityType === 'school' && (
              <a
                href="#historical-enrollment"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                &rarr; Historical Enrollment
              </a>
            )}
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

      {/* Placeholder content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {!isSystemReady || dataLoading || directoryLoading ? (
          <div className="space-y-12">
            <section id="overview">
              <div>
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-lg font-medium text-gray-900 mb-4">
                        Total enrollment
                      </span>
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
            <section id="demographics">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-6">Demographics</h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">By Gender</h4>
                    <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                      <div className="animate-pulse">Loading chart...</div>
                    </div>
                  </div>
                  <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">By Race/Ethnicity</h4>
                    <div className="flex items-center justify-center h-[300px] text-gray-400">
                      <div className="animate-pulse">Loading chart...</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section id="data">
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-6">Raw Membership Data</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-center h-32 text-gray-400">
                    <div className="animate-pulse">Loading data...</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : (dataError && !yearNotAvailable) || directoryError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            {dataError && <p className="text-red-700 mb-2">{dataError}</p>}
            {directoryError && (
              <p className="text-red-700 mb-2">Directory error: {directoryError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            <section id="overview">{renderOverview()}</section>
            <section id="demographics">{renderDemographics()}</section>
            <section id="data">{renderRawData()}</section>
            {entityType === 'school' && (
              <section id="historical-enrollment">{renderHistoricalEnrollment()}</section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
