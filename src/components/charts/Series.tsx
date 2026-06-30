import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { LabeledPoint } from '@/utils/progress';
import { useChartColors, type ChartColors } from '@/components/charts/useChartColors';

interface SeriesProps {
  data: LabeledPoint[];
  /** Formats the tooltip value, e.g. (v) => `${v} lbs`. */
  valueFormatter?: (value: number) => string;
  /** Whole-number Y axis (e.g. workout counts). */
  integer?: boolean;
}

const axisProps = (colors: ChartColors) => ({
  stroke: colors.axis,
  tick: { fill: colors.text, fontSize: 12 },
  tickLine: false,
  axisLine: false,
});

function tooltipStyle(colors: ChartColors) {
  return {
    contentStyle: {
      backgroundColor: colors.tooltipBg,
      border: `1px solid ${colors.tooltipBorder}`,
      borderRadius: 12,
      fontSize: 12,
      color: colors.tooltipText,
    },
    labelStyle: { color: colors.text, marginBottom: 4 },
    itemStyle: { color: colors.tooltipText },
  };
}

/** Bar chart for counts (workout frequency). */
export function BarSeries({ data, integer, valueFormatter }: SeriesProps) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axisProps(colors)} />
        <YAxis allowDecimals={!integer} {...axisProps(colors)} />
        <Tooltip
          {...tooltipStyle(colors)}
          formatter={(value: number) => [valueFormatter ? valueFormatter(value) : value, '']}
          cursor={{ fill: colors.flameSoft }}
        />
        <Bar dataKey="value" fill={colors.flame} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Filled area chart for cumulative/volume-style trends. */
export function AreaSeries({ data, valueFormatter }: SeriesProps) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="flameFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.flame} stopOpacity={0.35} />
            <stop offset="100%" stopColor={colors.flame} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axisProps(colors)} />
        <YAxis {...axisProps(colors)} />
        <Tooltip
          {...tooltipStyle(colors)}
          formatter={(value: number) => [valueFormatter ? valueFormatter(value) : value, '']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={colors.flame}
          strokeWidth={2}
          fill="url(#flameFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Line chart for progression and PR timelines. */
export function LineSeries({ data, valueFormatter }: SeriesProps) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" {...axisProps(colors)} />
        <YAxis {...axisProps(colors)} domain={['auto', 'auto']} />
        <Tooltip
          {...tooltipStyle(colors)}
          formatter={(value: number) => [valueFormatter ? valueFormatter(value) : value, '']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={colors.flame}
          strokeWidth={2}
          dot={{ r: 3, fill: colors.flame }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
