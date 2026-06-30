import { useTheme } from '@/hooks/useTheme';

/** Theme-aware colors for Recharts (it doesn't read CSS variables). */
export function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return {
    flame: '#f03d09',
    flameSoft: dark ? 'rgba(240, 61, 9, 0.22)' : 'rgba(240, 61, 9, 0.14)',
    grid: dark ? '#292524' : '#e7e5e4',
    axis: dark ? '#78716c' : '#a8a29e',
    text: dark ? '#a8a29e' : '#78716c',
    tooltipBg: dark ? '#1c1917' : '#ffffff',
    tooltipBorder: dark ? '#292524' : '#e7e5e4',
    tooltipText: dark ? '#f5f5f4' : '#1c1917',
  };
}

export type ChartColors = ReturnType<typeof useChartColors>;
