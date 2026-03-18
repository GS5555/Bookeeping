"use client"

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export type ChartType = 'bar' | 'line' | 'area' | 'pie';

interface GenericChartProps {
  title?: string;
  description?: string;
  data: any[];
  dataKeyX: string;
  dataKeysY: string[];
  chartConfig: ChartConfig;
  chartType?: ChartType;
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

export function GenericChart({ 
    title, 
    description, 
    data, 
    dataKeyX, 
    dataKeysY, 
    chartConfig, 
    chartType = 'bar', 
    yAxisFormatter = (value) => value.toString(), 
    categorical = false 
}: GenericChartProps) {
  
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
    if (!data || data.length === 0) return <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs">No data available</div>;

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data} margin={{ left: 12, right: 12, top: 12, bottom: data.length > 5 ? 30 : 12 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
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
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
            {commonXAxis}
            <YAxis tickFormatter={yAxisFormatter} tickLine={false} axisLine={false} fontSize={10} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {dataKeysY.map((key) => (
              <defs key={`def-${key}`}>
                  <linearGradient id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                  </linearGradient>
              </defs>
            ))}
            {dataKeysY.map((key) => (
              <Area key={key} dataKey={key} type="natural" fill={`url(#fill${key})`} stroke={`var(--color-${key})`} stackId="a" />
            ))}
          </AreaChart>
        );
       case 'pie':
        return (
          <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel={false} />} />
              <Pie
                data={data}
                dataKey={dataKeysY[0]}
                nameKey={dataKeyX}
                cx="50%"
                cy="50%"
                outerRadius="70%"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={true}
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
            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
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
      <CardHeader className="flex flex-col sm:flex-row items-start justify-between pb-2 border-b gap-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base sm:text-lg font-black uppercase tracking-tight truncate">{title}</CardTitle>
          <CardDescription className="text-[10px] uppercase font-bold text-muted-foreground">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-6 px-2 sm:px-6 overflow-hidden">
        {content}
      </CardContent>
    </Card>
  );
}
