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
  data: any;
  options?: any;
}

export default function StatisticsChart({ type, data, options }: StatisticsChartProps) {
  if (type === 'bar') {
    return <Bar data={data} options={options} />;
  }
  if (type === 'pie') {
    return <Pie data={data} options={options} />;
  }
  return null;
}
