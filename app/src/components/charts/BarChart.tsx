import {Group} from '@visx/group';
import {Bar} from '@visx/shape';
import {scaleLinear, scaleBand} from '@visx/scale';
import {AxisBottom, AxisLeft} from '@visx/axis';
import {ParentSize} from '@visx/responsive';

// Default color palette
const DEFAULT_COLORS = [
  '#87789c', // American Indian or Alaska Native
  '#5eab46', // Asian
  '#ffd400', // Black or African American
  '#f181b3', // Hispanic/Latino
  '#f04e23', // Native Hawaiian or Other Pacific Islander
  '#6b4725', // Two or more races
  '#2b87c8', // White
];

interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  width?: number;
  height?: number;
  colorMapping?: {[key: string]: string};
}

const BarChartInner = ({data, width = 600, height = 400, colorMapping}: BarChartProps) => {
  const margin = {top: 20, right: 20, bottom: 80, left: 60};
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Keep all data (including zeros) - data should already be in alphabetical order
  const filteredData = data;

  if (filteredData.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p>No data available</p>
      </div>
    );
  }

  // Scales
  const xScale = scaleBand({
    domain: filteredData.map(d => d.label),
    range: [0, innerWidth],
    padding: 0.1,
  });

  const maxValue = Math.max(...filteredData.map(d => d.value));
  const yScale = scaleLinear({
    domain: [0, maxValue || 1], // Handle case where all values are 0
    range: [innerHeight, 0],
    nice: true,
  });

  // Color function - use colorMapping if provided, otherwise cycle through default colors
  const getColor = (label: string, index: number) => {
    if (colorMapping && colorMapping[label]) {
      return colorMapping[label];
    }
    return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
  };

  // Shorten labels for display
  const shortenLabel = (label: string) => {
    const labelMap: {[key: string]: string} = {
      White: 'White',
      'Black or African American': 'Black',
      'Hispanic/Latino': 'Hispanic',
      Asian: 'Asian',
      'American Indian or Alaska Native': 'Native Am.',
      'Native Hawaiian or Other Pacific Islander': 'Pacific Isl.',
      'Two or more races': 'Multiracial',
      'Pre-Kindergarten': 'Pre-K',
      Kindergarten: 'K',
      'Grade 1': '1',
      'Grade 2': '2',
      'Grade 3': '3',
      'Grade 4': '4',
      'Grade 5': '5',
      'Grade 6': '6',
      'Grade 7': '7',
      'Grade 8': '8',
      'Grade 9': '9',
      'Grade 10': '10',
      'Grade 11': '11',
      'Grade 12': '12',
      'Grade 13': '13',
      Ungraded: 'Ungr.',
      'Adult Education': 'Adult Ed.',
    };
    return labelMap[label] || label;
  };

  return (
    <div style={{position: 'relative'}}>
      <svg width={width} height={height}>
        <Group top={margin.top} left={margin.left}>
          {/* Bars */}
          {filteredData.map((d, index) => {
            const barWidth = xScale.bandwidth();
            const barHeight = Math.max(0, innerHeight - yScale(d.value));
            const barX = xScale(d.label) || 0;
            const barY = yScale(d.value);

            return (
              <Group key={d.label}>
                <Bar
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  fill={getColor(d.label, index)}
                  rx={2}
                />
                {/* Value labels on top of bars (only show if value > 0) */}
                {d.value > 0 && (
                  <text
                    x={barX + barWidth / 2}
                    y={barY - 5}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="bold"
                    fill="#333"
                  >
                    {d.value.toLocaleString()}
                  </text>
                )}
              </Group>
            );
          })}

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
            tickFormat={value => value.toLocaleString()}
          />

          {/* X Axis */}
          <AxisBottom
            top={innerHeight}
            scale={xScale}
            stroke="#333"
            tickStroke="#333"
            tickLabelProps={{
              fontSize: 11,
              textAnchor: 'middle',
              dy: '0.33em',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
            tickFormat={value => shortenLabel(value as string)}
          />
        </Group>
      </svg>
    </div>
  );
};

export default function BarChart({data, width, height, colorMapping}: BarChartProps) {
  if (width && height) {
    return <BarChartInner data={data} width={width} height={height} colorMapping={colorMapping} />;
  }

  return (
    <ParentSize>
      {({width, height}) => (
        <BarChartInner
          data={data}
          width={Math.min(width, 800)}
          height={Math.min(height, 400)}
          colorMapping={colorMapping}
        />
      )}
    </ParentSize>
  );
}
