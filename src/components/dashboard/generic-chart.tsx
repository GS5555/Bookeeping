"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

interface GenericChartProps {
  title: string;
  description: string;
  data: any[];
  dataKeyX: string;
  dataKeysY: string[];
  chartConfig: ChartConfig;
  chartType: ChartType;
  yAxisFormatter?: (value: any) => string;
  categorical?: boolean;
}

const CHART_COLORS = [
    'hsl(var(--chart-1))', 
    'hsl(var(--chart-2))', 
    'hsl(var(--chart-3))', 
    'hsl(var(--chart-4))', 
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6))',
    'hsl(var(--chart-7))',
    'hsl(var(--chart-8))',
    'hsl(var(--chart-9))',
    'hsl(var(--chart-10))',
];

export function GenericChart({ title, description, data, dataKeyX, dataKeysY, chartConfig, chartType, yAxisFormatter = (value) => value.toString(), categorical = false }: GenericChartProps) {
  
  const commonXAxis = (
    <XAxis 
      dataKey={dataKeyX} 
      tickLine={false} 
      axisLine={false} 
      tickMargin={8} 
      fontSize={10} 
      angle={data.length > 5 ? -45 : 0}
      textAnchor={data.length > 5 ? "end" : "middle"}
      height={data.length > 5 ? 60 : 30}
    />
  );

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: data.length > 5 ? 30 : 12 }}>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            {dataKeysY.map((key) => (
              <Line key={key} type="monotone" dataKey={key} stroke={`var(--color-${key})`} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: data.length > 5 ? 30 : 12 }}>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {dataKeysY.map((key) => (
              <defs key={`def-${key}`}>
                  <linearGradient id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                          offset="5%"
                          stopColor={`var(--color-${key})`}
                          stopOpacity={0.8}
                      />
                      <stop
                          offset="95%"
                          stopColor={`var(--color-${key})`}
                          stopOpacity={0.1}
                      />
                  </linearGradient>
              </defs>
            ))}
            {dataKeysY.map((key) => (
              <Area key={key} dataKey={key} type="natural" fill={`url(#fill${key})`} stroke={`var(--color-${key})`} stackId="a" />
            ))}
          </AreaChart>
        );
       case 'pie':
        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, percent, index, name, value }: any) => {
            const radius = outerRadius * 1.2; 
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            const sin = Math.sin(-RADIAN * midAngle);
            const cos = Math.cos(-RADIAN * midAngle);
            const sx = cx + outerRadius * cos;
            const sy = cy + outerRadius * sin;
            const mx = cx + (outerRadius + 10) * cos;
            const my = cy + (outerRadius + 10) * sin;
            const ex = mx + (cos >= 0 ? 1 : -1) * 12;
            const ey = my;
            const textAnchor = cos >= 0 ? 'start' : 'end';
            const percentage = (percent * 100).toFixed(0);
            const sliceColor = CHART_COLORS[index % CHART_COLORS.length];

            return (
                <g>
                    <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={sliceColor} fill="none" />
                    <circle cx={ex} cy={ey} r={2} fill={sliceColor} stroke="none" />
                    <text x={ex + (cos >= 0 ? 1 : -1) * 4} y={ey} textAnchor={textAnchor} fill={sliceColor} dy={4} fontSize={9}>
                        {`${name} (${value})`}
                    </text>
                </g>
            );
        };
        return (
          <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel={false} />}
              />
              <Pie
                data={data}
                dataKey={dataKeysY[0]}
                nameKey={dataKeyX}
                cx="50%"
                cy="50%"
                outerRadius="60%"
                labelLine={false}
                label={renderCustomizedLabel}
              >
                 {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
          </PieChart>
        );
      case 'bar':
      default:
        return (
          <BarChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: data.length > 5 ? 30 : 12 }}>
            <CartesianGrid vertical={false} />
            {commonXAxis}
            <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            {dataKeysY.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={4}>
                 {(categorical || chartType === 'bar') && data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
              </Bar>
            ))}
          </BarChart>
        );
    }
  };
  
  const content = (
    <div className="w-full h-[350px] min-w-0">
        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
            </ResponsiveContainer>
        </ChartContainer>
    </div>
  );

  if(!title && !description) {
      return content;
  }

  return (
    <Card className="h-full flex flex-col min-w-0 w-full overflow-hidden border-2 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row items-start justify-between pb-2 border-b">
        <div>
          <CardTitle className="text-lg sm:text-xl font-black uppercase tracking-tight">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-6 px-2 sm:px-6">
        {content}
      </CardContent>
    </Card>
  );
}
