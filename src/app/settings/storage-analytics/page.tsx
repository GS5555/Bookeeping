'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { HardDrive, RefreshCw, Trash2, FolderTree as FolderTreeIcon, Search, CheckCircle2, FileBox, FileWarning, AlertTriangle } from 'lucide-react';
import { generateMockFiles, buildFolderTree, generateRecommendations } from '@/lib/mock-storage-data';
import { StorageFile, StorageFolder, StorageRecommendation } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/use-current-user';
import { FullPageLoader } from '@/components/full-page-loader';
import { cn } from '@/lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function StorageAnalyticsPage() {
  const { currentUser, isLoading: isUserLoading } = useCurrentUser();
  const [isScanning, setIsScanning] = useState(false);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [folderTree, setFolderTree] = useState<StorageFolder | null>(null);
  const [recommendations, setRecommendations] = useState<StorageRecommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const mockFiles = generateMockFiles(200);
      setFiles(mockFiles);
      setFolderTree(buildFolderTree(mockFiles));
      setRecommendations(generateRecommendations(mockFiles));
      setIsScanning(false);
      setLastScan(new Date());
      toast({ title: "System Scan Complete", description: "Storage analytics data has been refreshed." });
    }, 2000);
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') handleScan();
  }, [currentUser]);

  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const byType = files.reduce((acc, f) => { acc[f.type] = (acc[f.type] || 0) + f.size; return acc; }, {} as Record<string, number>);
    return { totalSize, totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2), byType: Object.entries(byType).map(([name, value]) => ({ name, value })), fileCount: files.length };
  }, [files]);

  const fileColumns: ColumnDef<StorageFile>[] = [
    { accessorKey: 'name', header: 'File Name', cell: ({ row }) => (<div className="flex flex-col min-w-0"><span className="font-medium truncate max-w-[120px] sm:max-w-[250px]">{row.original.name}</span><span className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-[250px]">{row.original.path}</span></div>) },
    { accessorKey: 'size', header: 'Size', cell: ({ row }) => { const b = row.original.size; return b > 1024 * 1024 * 1024 ? `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB` : `${(b / (1024 * 1024)).toFixed(1)} MB`; } },
    { id: 'actions', cell: ({ row }) => <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setFiles(prev => prev.filter(f => f.id !== row.original.id)); toast({ title: "Deleted" }); }}><Trash2 className="h-4 w-4" /></Button> }
  ];

  if (isUserLoading) return <FullPageLoader />;
  if (currentUser?.role !== 'admin') return <div className="flex flex-col items-center py-20 px-4 text-center"><FileWarning className="mx-auto h-12 w-12 text-destructive mb-4" /><h2 className="text-xl font-bold">Access Denied</h2></div>;

  return (
    <div className="flex flex-col gap-6 pb-8 min-w-0 w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Storage Analytics</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button onClick={handleScan} disabled={isScanning} className="flex-1 sm:flex-none h-10"><RefreshCw className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")} />{isScanning ? "Scanning..." : "Deep Scan"}</Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        <Card className="lg:col-span-2 min-w-0 border-2 shadow-sm">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1"><CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><HardDrive className="h-5 w-5 text-primary shrink-0" />Disk Utilization</CardTitle><CardDescription className="text-xs">Storage footprint analysis.</CardDescription></div>
              <div className="text-right"><p className="text-2xl sm:text-3xl font-black tracking-tighter leading-none">{stats.totalSizeGB} GB</p><p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mt-1">Total Monitored</p></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6 min-w-0">
            <div className="space-y-3"><div className="flex justify-between text-xs sm:text-sm"><span className="font-semibold">Capacity Usage</span><span className="text-muted-foreground">84% Capacity</span></div><Progress value={84} className="h-3" /><div className="flex justify-between text-[9px] uppercase font-black tracking-widest"><span className="text-green-600">Healthy</span><span className="text-destructive">Critical &gt; 80%</span></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0">
              <div className="h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.byType} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">{stats.byType.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><RechartsTooltip formatter={(v: number) => `${(v / (1024 * 1024)).toFixed(1)} MB`} /><Legend iconSize={8} wrapperStyle={{ fontSize: '9px' }} /></PieChart></ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center gap-4 min-w-0">
                <div className="p-4 rounded-xl bg-muted/50 border"><div className="flex items-center gap-2 mb-1"><FileBox className="h-4 w-4 text-primary" /><span className="text-[10px] font-black uppercase tracking-widest">Index Snapshot</span></div><p className="text-xl font-black">{stats.fileCount.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground uppercase">Files</span></p></div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100"><div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-orange-600" /><span className="text-[10px] font-black uppercase tracking-widest text-orange-600">Growth Rate</span></div><p className="text-xl font-black text-orange-700">+1.2 GB / Mo</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 h-full border-2 shadow-sm flex flex-col">
          <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-green-600" />Optimization</CardTitle><CardDescription className="text-xs">Recovery suggestions.</CardDescription></CardHeader>
          <CardContent className="space-y-4 pt-6 flex-1 min-w-0">
            {recommendations.map(rec => (
              <div key={rec.id} className="p-4 rounded-lg border-2 border-primary/10 bg-primary/5 space-y-2">
                <Badge className="bg-green-100 text-green-700 text-[9px] uppercase font-black border-none">{rec.impact}</Badge>
                <h4 className="font-bold text-sm leading-tight">{rec.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{rec.description}</p>
                <Button size="sm" variant="outline" className="w-full h-7 text-[9px] uppercase font-black mt-2" onClick={() => toast({ title: "Task Scheduled" })}>{rec.action}</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="heavy" className="w-full min-w-0">
        <TabsList className="grid grid-cols-2 w-full sm:w-[300px] mb-4"><TabsTrigger value="heavy" className="text-[11px] uppercase font-bold">Registry</TabsTrigger><TabsTrigger value="directory" className="text-[11px] uppercase font-bold">Tree</TabsTrigger></TabsList>
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="p-0 sm:pt-6 min-w-0 overflow-x-auto">
            <TabsContent value="heavy" className="m-0 min-w-0"><DataTable columns={fileColumns} data={files.sort((a,b) => b.size - a.size).slice(0, 50)} /></TabsContent>
            <TabsContent value="directory" className="m-0 p-4 sm:p-6 min-w-0 overflow-x-auto">
              <div className="min-w-[300px]">
                {folderTree && <FolderNode folder={folderTree} level={0} />}
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

function FolderNode({ folder, level }: { folder: StorageFolder, level: number }) {
  const sizeText = useMemo(() => {
    const b = folder.totalSize;
    return b > 1024 * 1024 * 1024 ? `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }, [folder.totalSize]);
  return (
    <div className={cn("border-l ml-3 sm:ml-4", level === 0 && "border-none ml-0")}>
      <div className="flex items-center gap-2 py-2 group hover:bg-muted/30 rounded-md px-2 min-w-0">
        <FolderTreeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
          <span className="font-mono text-[11px] truncate flex-1">{folder.name}</span>
          <Badge variant="secondary" className="font-mono text-[9px] shrink-0">{sizeText}</Badge>
        </div>
      </div>
      {folder.children?.map(child => <FolderNode key={child.path} folder={child} level={level + 1} />)}
    </div>
  );
}
