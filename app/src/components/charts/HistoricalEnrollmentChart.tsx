import {useState, useMemo} from 'react';
import {Group} from '@visx/group';
import {Bar, BarStack} from '@visx/shape';
import {scaleLinear, scaleBand, scaleOrdinal} from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import {LegendOrdinal} from '@visx/legend';
import {ParentSize} from '@visx/responsive';
import CopyableWrapper from '../CopyableWrapper';
import type {HistoricalEnrollmentData} from '../../hooks/useHistoricalEnrollment';

interface HistoricalEnrollmentChartProps {
  historicalData: HistoricalEnrollmentData;
  currentYear?: string;
  width?: number;
  height?: number;
}

type BreakdownType = 'none' | 'race_ethnicity' | 'sex';

// Define the canonical order for race/ethnicity categories (matching Profile.tsx)
const RACE_ETHNICITY_ORDER = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Hispanic/Latino',
  'Native Hawaiian or Other Pacific Islander',
  'Two or more races',
  'White',
];

// Default color palette (based on historical race/ethnicity colors)
const DEFAULT_COLORS = [
  '#87789c', // American Indian or Alaska Native
  '#5eab46', // Asian
  '#ffd400', // Black or African American
  '#f181b3', // Hispanic/Latino
  '#f04e23', // Native Hawaiian or Other Pacific Islander
  '#6b4725', // Two or more races
  '#2b87c8', // White
];

// Color palettes for different demographics
const RACE_ETHNICITY_COLORS: Record<string, string> = {
  'American Indian or Alaska Native': '#87789c',
  Asian: '#5eab46',
  'Black or African American': '#ffd400',
  'Hispanic/Latino': '#f181b3',
  'Native Hawaiian or Other Pacific Islander': '#f04e23',
  'Two or more races': '#6b4725',
  White: '#2b87c8',
};

interface StackedDataPoint {
  year: string;
  [key: string]: string | number;
}

interface SimpleBarData {
  year: string;
  total: number;
}

const HistoricalEnrollmentChartInner = ({
  historicalData,
  currentYear,
  width = 800,
  height = 500,
}: HistoricalEnrollmentChartProps) => {
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('none');
  const [isPercentStacked, setIsPercentStacked] = useState(false);

  const margin = {top: 20, right: 0, bottom: 80, left: 80};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Transform data based on current breakdown type
  const {chartData, demographicKeys, colorScale} = useMemo<{
    chartData: SimpleBarData[] | StackedDataPoint[];
    demographicKeys: string[];
    colorScale: any;
  }>(() => {
    if (breakdownType === 'none') {
      // Simple bar chart data
      const data: SimpleBarData[] = historicalData.byYear.map(d => ({
        year: d.school_year,
        total: d.total_enrollment,
      }));
      return {
        chartData: data,
        demographicKeys: [],
        colorScale: scaleOrdinal<string, string>({
          domain: [],
          range: [],
        }),
      };
    } else if (breakdownType === 'race_ethnicity') {
      // Transform the wide-format data into chart format
      const data: StackedDataPoint[] = historicalData.byRaceEthnicity.map(d => ({
        year: d.school_year,
        'American Indian or Alaska Native': d.native_american,
        Asian: d.asian,
        'Black or African American': d.black,
        'Hispanic/Latino': d.hispanic,
        'Native Hawaiian or Other Pacific Islander': d.pacific_islander,
        'Two or more races': d.multiracial,
        White: d.white,
      }));

      // Use the canonical race/ethnicity order (matching Profile.tsx)
      // Only include categories that have data
      const keys = RACE_ETHNICITY_ORDER.filter(cat => data.some(d => (d[cat] as number) > 0));

      // If using percent stacked, normalize the data
      if (isPercentStacked) {
        data.forEach(d => {
          const total = keys.reduce((sum, key) => sum + ((d[key] as number) || 0), 0);
          if (total > 0) {
            keys.forEach(key => {
              const value = d[key] as number | undefined;
              d[key] = ((value || 0) / total) * 100;
            });
          }
        });
      }

      return {
        chartData: data,
        demographicKeys: keys,
        colorScale: scaleOrdinal<string, string>({
          domain: keys,
          range: keys.map(k => RACE_ETHNICITY_COLORS[k] || DEFAULT_COLORS[0]),
        }),
      };
    } else {
      // Sex breakdown - transform the wide-format data into chart format
      const data: StackedDataPoint[] = historicalData.bySex.map(d => ({
        year: d.school_year,
        Male: d.male,
        Female: d.female,
      }));

      const keys = ['Male', 'Female'].filter(cat => data.some(d => (d[cat] as number) > 0));

      // If using percent stacked, normalize the data
      if (isPercentStacked) {
        data.forEach(d => {
          const total = keys.reduce((sum, key) => sum + ((d[key] as number) || 0), 0);
          if (total > 0) {
            keys.forEach(key => {
              const value = d[key] as number | undefined;
              d[key] = ((value || 0) / total) * 100;
            });
          }
        });
      }

      return {
        chartData: data,
        demographicKeys: keys,
        colorScale: scaleOrdinal<string, string>({
          domain: keys,
          range: keys.map((_, i) => DEFAULT_COLORS[i % DEFAULT_COLORS.length]),
        }),
      };
    }
  }, [historicalData, breakdownType, isPercentStacked]);

  if (chartData.length === 0) {
    return (
      <div>
        <div className="mb-4 flex gap-2">
          <ControlButtons
            breakdownType={breakdownType}
            setBreakdownType={setBreakdownType}
            isPercentStacked={isPercentStacked}
            setIsPercentStacked={setIsPercentStacked}
          />
        </div>
        <div
          style={{
            width,
            height,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p>No historical enrollment data available</p>
        </div>
      </div>
    );
  }

  // Scales
  const xScale = scaleBand({
    domain: chartData.map(d => d.year),
    range: [0, innerWidth],
    padding: 0.2,
  });

  const maxValue = useMemo(() => {
    if (breakdownType === 'none') {
      return Math.max(...(chartData as SimpleBarData[]).map(d => d.total || 0));
    } else if (isPercentStacked) {
      return 100;
    } else {
      // Calculate stack totals
      return Math.max(
        ...(chartData as StackedDataPoint[]).map(d => {
          return demographicKeys.reduce((sum, key) => {
            const value = d[key];
            return sum + (typeof value === 'number' ? value : 0);
          }, 0);
        })
      );
    }
  }, [chartData, breakdownType, isPercentStacked, demographicKeys]);

  const yScale = scaleLinear({
    domain: [0, maxValue || 1],
    range: [innerHeight, 0],
    nice: true,
  });

  // Determine the data to export based on current view
  const exportData = useMemo(() => {
    if (breakdownType === 'none') {
      return historicalData.byYear;
    } else if (breakdownType === 'race_ethnicity') {
      return historicalData.byRaceEthnicity;
    } else {
      return historicalData.bySex;
    }
  }, [breakdownType, historicalData]);

  const exportFilename = useMemo(() => {
    if (breakdownType === 'none') {
      return 'historical-enrollment';
    } else if (breakdownType === 'race_ethnicity') {
      return 'historical-enrollment-by-race-ethnicity';
    } else {
      return 'historical-enrollment-by-sex';
    }
  }, [breakdownType]);

  return (
    <div>
      {/* Control buttons */}
      <div className="mb-4 flex gap-2 flex-wrap items-center">
        <ControlButtons
          breakdownType={breakdownType}
          setBreakdownType={setBreakdownType}
          isPercentStacked={isPercentStacked}
          setIsPercentStacked={setIsPercentStacked}
        />
      </div>

      <CopyableWrapper data={exportData} filename={exportFilename}>
        <div className="pb-8">
          {/* Chart */}
          <div style={{minHeight: '500px'}}>
            <svg width={width} height={height}>
            <Group top={margin.top} left={margin.left}>
          {breakdownType === 'none' ? (
            // Simple bars for default view
            (chartData as SimpleBarData[]).map(d => {
              const barWidth = xScale.bandwidth();
              const barHeight = Math.max(0, innerHeight - yScale(d.total || 0));
              const barX = xScale(d.year) || 0;
              const barY = yScale(d.total || 0);

              return (
                <Group key={d.year}>
                  <Bar
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    fill={DEFAULT_COLORS[0]}
                  />
                  {/* Value label */}
                  {d.total > 0 && (
                    <text
                      x={barX + barWidth / 2}
                      y={barY - 5}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={d.year === currentYear ? 'bold' : 'normal'}
                      fill="#333"
                    >
                      {d.total.toLocaleString()}
                    </text>
                  )}
                </Group>
              );
            })
          ) : (
            // Stacked bars for breakdown views
            <BarStack
              data={chartData as StackedDataPoint[]}
              keys={demographicKeys}
              x={d => d.year}
              xScale={xScale}
              yScale={yScale}
              color={colorScale}
            >
              {barStacks =>
                barStacks.map(barStack =>
                  barStack.bars.map(bar => {
                    // Calculate total for this year to determine percentage
                    const yearData = chartData[bar.index] as StackedDataPoint;
                    const yearTotal = demographicKeys.reduce((sum, key) => {
                      const value = yearData[key];
                      return sum + (typeof value === 'number' ? value : 0);
                    }, 0);

                    // Get the value for this segment
                    const segmentValue = typeof bar.bar[1] === 'number' && typeof bar.bar[0] === 'number'
                      ? bar.bar[1] - bar.bar[0]
                      : 0;

                    // Calculate percentage
                    const percentage = yearTotal > 0 ? (segmentValue / yearTotal) * 100 : 0;

                    // Only show label if >= 7%
                    const shouldShowLabel = percentage >= 7;

                    return (
                      <Group key={`bar-stack-${barStack.index}-${bar.index}`}>
                        <rect
                          x={bar.x}
                          y={bar.y}
                          height={bar.height}
                          width={bar.width}
                          fill={bar.color}
                        />
                        {shouldShowLabel && bar.height > 15 && (
                          <text
                            x={bar.x + bar.width / 2}
                            y={bar.y + bar.height / 2}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize={11}
                            fontWeight="bold"
                            fill="white"
                            pointerEvents="none"
                          >
                            {isPercentStacked
                              ? `${segmentValue.toFixed(1)}%`
                              : segmentValue.toLocaleString()}
                          </text>
                        )}
                      </Group>
                    );
                  })
                )
              }
            </BarStack>
          )}

          {/* Y Axis */}
          <AxisLeft
            scale={yScale}
            stroke="#333"
            tickStroke="#333"
            tickLabelProps={{
              fontSize: 12,
              textAnchor: 'end',
              dy: '0.33em',
              dx: '-0.25em',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
            tickFormat={value => {
              if (isPercentStacked) {
                return `${value}%`;
              }
              return value.toLocaleString();
            }}
          />

          {/* X Axis */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="#333"
            tickStroke="#333"
            tickLabelProps={tickValue => ({
              fontSize: 11,
              textAnchor: 'middle',
              dy: '0.33em',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              // Bold the current year
              fontWeight: tickValue === currentYear ? 'bold' : 'normal',
            })}
            tickFormat={value => {
              // Show shortened year format (e.g., "2023-2024" -> "23-24")
              const parts = (value as string).split('-');
              if (parts.length === 2) {
                return `${parts[0].slice(2)}-${parts[1].slice(2)}`;
              }
              return value as string;
            }}
          />
        </Group>
            </svg>
          </div>

          {/* Legend (only show for breakdown views) */}
          {breakdownType !== 'none' && demographicKeys.length > 0 && (
            <div className="mt-4 flex justify-center">
              <LegendOrdinal scale={colorScale} direction="row" labelMargin="0 20px 0 0">
                {labels => (
                  <div className="flex flex-wrap gap-4 text-sm">
                    {labels.map((label, i) => (
                      <div key={`legend-${i}`} className="flex items-center gap-2">
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            backgroundColor: label.value,
                            borderRadius: 2,
                          }}
                        />
                        <span>{label.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </LegendOrdinal>
            </div>
          )}
        </div>
      </CopyableWrapper>
    </div>
  );
};

// Control buttons component
interface ControlButtonsProps {
  breakdownType: BreakdownType;
  setBreakdownType: (type: BreakdownType) => void;
  isPercentStacked: boolean;
  setIsPercentStacked: (value: boolean) => void;
}

const ControlButtons = ({
  breakdownType,
  setBreakdownType,
  isPercentStacked,
  setIsPercentStacked,
}: ControlButtonsProps) => {
  const buttonClass = (isActive: boolean) =>
    `px-3 py-1.5 text-sm rounded border transition-colors ${
      isActive
        ? 'bg-gray-800 text-white border-gray-800'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
    }`;

  return (
    <>
      <div className="flex gap-2">
        <button
          className={buttonClass(breakdownType === 'none')}
          onClick={() => setBreakdownType('none')}
        >
          Total
        </button>
        <button
          className={buttonClass(breakdownType === 'race_ethnicity')}
          onClick={() => setBreakdownType('race_ethnicity')}
        >
          By Race/Ethnicity
        </button>
        <button
          className={buttonClass(breakdownType === 'sex')}
          onClick={() => setBreakdownType('sex')}
        >
          By Gender
        </button>
      </div>

      {/* Show 100% stacked toggle only when breakdown is active */}
      {breakdownType !== 'none' && (
        <div className="flex items-center gap-2 ml-4">
          <input
            type="checkbox"
            id="percent-stacked"
            checked={isPercentStacked}
            onChange={e => setIsPercentStacked(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-gray-800 focus:ring-gray-500"
          />
          <label htmlFor="percent-stacked" className="text-sm text-gray-700 cursor-pointer">
            Show as 100% stacked
          </label>
        </div>
      )}
    </>
  );
};

// Wrapper component with responsive sizing
export default function HistoricalEnrollmentChart({
  historicalData,
  currentYear,
  width,
  height,
}: HistoricalEnrollmentChartProps) {
  if (width && height) {
    return (
      <HistoricalEnrollmentChartInner
        historicalData={historicalData}
        currentYear={currentYear}
        width={width}
        height={height}
      />
    );
  }

  return (
    <ParentSize>
      {({width, height}) => (
        <HistoricalEnrollmentChartInner
          historicalData={historicalData}
          currentYear={currentYear}
          width={Math.min(width, 1000)}
          height={Math.min(height, 500)}
        />
      )}
    </ParentSize>
  );
}
