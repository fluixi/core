import { createSignal, createEffect } from '@awc/kettlejs';
import type { MetricPoint } from '../../../domain/metrics/metrics.model.js';

interface LineChartProps {
  data:    MetricPoint[];
  metric:  keyof Pick<MetricPoint, 'impressions' | 'clicks' | 'conversions' | 'spend' | 'ctr' | 'roas'>;
  color?:  string;
  height?: number;
}

export function LineChart({ data, metric, color = '#6366f1', height = 200 }: LineChartProps) {
  const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement | null>(null);

  createEffect(() => {
    const canvas = canvasRef();
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const values = data.map(p => p[metric] as number);
    const min    = Math.min(...values);
    const max    = Math.max(...values);
    const range  = max - min || 1;

    const w = canvas.width;
    const h = canvas.height;
    const pad = 10;

    ctx.clearRect(0, 0, w, h);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(pad, h - pad - ((values[0] - min) / range) * (h - 2 * pad));
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(w - pad, h - pad);
    ctx.lineTo(pad, h - pad);
    ctx.closePath();
    ctx.fillStyle = `${color}22`;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    values.forEach((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      const y = h - pad - ((v - min) / range) * (h - 2 * pad);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
  });

  return (
    <canvas
      ref={setCanvasRef}
      width={600}
      height={height}
      class="line-chart"
      aria-label={`${metric} trend chart`}
    />
  );
}
