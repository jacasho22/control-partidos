'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  ChartDataLabels
);


interface StatisticsChartProps {
  type: 'bar' | 'pie';
  data: ChartData<'bar'> | ChartData<'pie'>;
  options?: ChartOptions<'bar'> | ChartOptions<'pie'>;
}

export default function StatisticsChart({ type, data, options }: StatisticsChartProps) {
  if (type === 'bar') {
    return <Bar data={data as ChartData<'bar'>} options={options as ChartOptions<'bar'>} />;
  }
  if (type === 'pie') {
    return <Pie data={data as ChartData<'pie'>} options={options as ChartOptions<'pie'>} />;
  }
  return null;
}
