import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { scaleOrdinal } from '@visx/scale';
import { ParentSize } from '@visx/responsive';

interface DoughnutData {
  label: string;
  value: number;
}

interface DoughnutChartProps {
  data: DoughnutData[];
  width?: number;
  height?: number;
}

const DoughnutChartInner = ({ data, width = 300, height = 300 }: DoughnutChartProps) => {
  const margin = { top: 20, right: 20, bottom: 20, left: 20 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const radius = Math.min(innerWidth, innerHeight) / 2;
  const centerY = innerHeight / 2;
  const centerX = innerWidth / 2;
  const donutThickness = 50;

  // Filter out zero values
  const filteredData = data.filter(d => d.value > 0);

  if (filteredData.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>No data available</p>
      </div>
    );
  }

  // Colors for sex data (similar to Census Reporter)
  const colorScale = scaleOrdinal({
    domain: filteredData.map(d => d.label),
    range: ['#2563eb', '#dc2626'], // Blue for Male, Red for Female
  });

  const total = filteredData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height}>
        <Group top={centerY + margin.top} left={centerX + margin.left}>
          <Pie
            data={filteredData}
            pieValue={(d) => d.value}
            outerRadius={radius}
            innerRadius={radius - donutThickness}
            cornerRadius={3}
            padAngle={0.005}
          >
            {(pie) => {
              return pie.arcs.map((arc, index) => {
                const { label, value } = arc.data;
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;
                const arcPath = pie.path(arc) || '';
                const percentage = ((value / total) * 100).toFixed(1);

                return (
                  <g key={`arc-${label}`}>
                    <path
                      d={arcPath}
                      fill={colorScale(label)}
                      stroke="white"
                      strokeWidth={2}
                    />
                    {hasSpaceForLabel && (
                      <text
                        x={centroidX}
                        y={centroidY}
                        dy=".33em"
                        fontSize={12}
                        fontWeight="bold"
                        fill="white"
                        textAnchor="middle"
                        pointerEvents="none"
                      >
                        {percentage}%
                      </text>
                    )}
                  </g>
                );
              });
            }}
          </Pie>
          {/* Center total */}
          <text
            x={0}
            y={0}
            dy=".33em"
            fontSize={16}
            fontWeight="bold"
            textAnchor="middle"
            pointerEvents="none"
          >
            {total.toLocaleString()}
          </text>
          <text
            x={0}
            y={18}
            dy=".33em"
            fontSize={12}
            textAnchor="middle"
            pointerEvents="none"
            fill="#666"
          >
            Total
          </text>
        </Group>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '20px' }}>
        {filteredData.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: colorScale(label),
                borderRadius: '2px',
              }}
            />
            <span style={{ fontSize: '14px' }}>
              {label}: {value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DoughnutChart({ data, width, height }: DoughnutChartProps) {
  if (width && height) {
    return <DoughnutChartInner data={data} width={width} height={height} />;
  }

  return (
    <ParentSize>
      {({ width, height }) => (
        <DoughnutChartInner
          data={data}
          width={Math.min(width, 400)}
          height={Math.min(height, 300)}
        />
      )}
    </ParentSize>
  );
}