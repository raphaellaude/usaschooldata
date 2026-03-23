import DoughnutChart from '../charts/DoughnutChart';
import BarChart from '../charts/BarChart';
import CopyableWrapper from '../CopyableWrapper';
import type {SummaryData} from './OverviewSection';

const ALL_RACES = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic/Latino',
  'Native Hawaiian or Other Pacific Islander',
  'Two or more races',
  'White',
];

interface Props {
  summary: SummaryData | null;
}

export default function DemographicsSection({summary}: Props) {
  if (!summary?.demographics) {
    return <p className="text-gray-600">No demographic data available</p>;
  }

  const raceData = ALL_RACES.map(race => ({
    label: race,
    value: (summary.demographics.byRaceEthnicity[race] as number) || 0,
  }));

  const sexData = Object.entries(summary.demographics.bySex).map(([label, value]) => ({
    label,
    value: value as number,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <CopyableWrapper data={sexData} filename="gender-demographics">
        <div className="rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Sex</h4>
          <div className="flex flex-col">
            <DoughnutChart data={sexData} width={280} height={240} />
          </div>
        </div>
      </CopyableWrapper>

      <CopyableWrapper data={raceData} filename="race-ethnicity-demographics" className="lg:col-span-2">
        <div className="rounded-lg">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Race & ethnicity</h4>
          <div className="h-[300px]">
            <BarChart data={raceData} />
          </div>
        </div>
      </CopyableWrapper>
    </div>
  );
}
