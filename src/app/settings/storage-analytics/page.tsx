
'use client';

import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  HardDrive, 
  RefreshCw, 
  AlertTriangle, 
  Trash2, 
  Archive, 
  FileSearch, 
  PieChart as PieChartIcon, 
  FolderTree as FolderTreeIcon,
  Search,
  CheckCircle2,
  FileBox,
  FileWarning
} from 'lucide-react';
import { 
  generateMockFiles, 
  buildFolderTree, 
  generateRecommendations 
} from '@/lib/mock-storage-data';
import { StorageFile, StorageFolder, StorageRecommendation } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis
} from 'recharts';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useCurrentUser } from '@/hooks/use-current-user';
import { FullPageLoader } from '@/components/full-page-loader';

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
    // Simulate scan delay
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
    if (currentUser?.role === 'admin') {
        handleScan();
    }
  }, [currentUser]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const stats = useMemo(() => {
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    const byType = files.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + f.size;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSize,
      totalSizeGB: (totalSize / (1024 * 1024 * 1024)).toFixed(2),
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      fileCount: files.length,
    };
  }, [files]);

  const fileColumns: ColumnDef<StorageFile>[] = [
    {
      accessorKey: 'name',
      header: 'File Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium truncate max-w-[200px]">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{row.original.path}</span>
        </div>
      )
    },
    {
      accessorKey: 'size',
      header: 'Size',
      cell: ({ row }) => {
        const bytes = row.original.size;
        if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      }
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant="outline" className="capitalize">{row.original.type}</Badge>
    },
    {
      accessorKey: 'lastModified',
      header: 'Last Modified',
      cell: ({ row }) => <span className="text-xs whitespace-nowrap">{formatDistanceToNow(new Date(row.original.lastModified), { addSuffix: true })}</span>
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const handleDelete = (file: StorageFile) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast({ title: "File Deleted", description: `${file.name} has been removed from the server.` });
  };

  const handleBulkDelete = (selected: StorageFile[]) => {
    const ids = new Set(selected.map(s => s.id));
    setFiles(prev => prev.filter(f => !ids.has(f.id)));
    toast({ title: "Bulk Cleanup Complete", description: `${selected.length} files removed.` });
  };

  if (isUserLoading) return <FullPageLoader />;
  if (currentUser?.role !== 'admin') return <div className="p-8 text-center"><FileWarning className="mx-auto h-12 w-12 text-destructive mb-4"/><h2 className="text-xl font-bold">Access Denied</h2><p>You must be an administrator to access storage analytics.</p></div>;

  return (
    <div className="space-y-8 p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader title="Storage Analytics">
        <div className="flex items-center gap-4">
          {lastScan && <span className="text-xs text-muted-foreground hidden sm:inline">Last scan: {lastScan.toLocaleTimeString()}</span>}
          <Button onClick={handleScan} disabled={isScanning} variant={isScanning ? "secondary" : "default"}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")} />
            {isScanning ? "Scanning System..." : "Deep Scan Now"}
          </Button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Consumption Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Disk Utilization
                </CardTitle>
                <CardDescription>Server-wide storage footprint analysis.</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black tracking-tighter">{stats.totalSizeGB} GB</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Total Monitored Space</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Capacity Usage</span>
                <span className="text-muted-foreground">84% of 100GB limit</span>
              </div>
              <Progress value={84} className="h-3 bg-muted" />
              <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                <span>Optimized</span>
                <span className="text-destructive">Critical ( &gt; 80% )</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="h-[250px]">
                <p className="text-xs font-bold uppercase text-center mb-2 tracking-widest">Usage by Category</p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.byType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: number) => `${(value / (1024 * 1024)).toFixed(1)} MB`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FileBox className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-widest">Index Snapshot</span>
                  </div>
                  <p className="text-xl font-black">{stats.fileCount.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">Files Indexed</span></p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-xs font-bold uppercase tracking-widest text-orange-600">Growth Rate</span>
                  </div>
                  <p className="text-xl font-black text-orange-700">+1.2 GB <span className="text-sm font-normal text-orange-600/70">/ month</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Recommendations */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Optimization Insights
            </CardTitle>
            <CardDescription>AI-driven storage recovery suggestions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.length > 0 ? recommendations.map(rec => (
              <div key={rec.id} className="p-4 rounded-lg border-2 border-primary/10 bg-primary/5 space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-sm">{rec.title}</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{rec.impact}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Confidence: {rec.confidence}%</span>
                  <Button size="sm" variant="outline" className="h-7 text-[10px] uppercase font-black" onClick={() => toast({ title: "Simulated Action", description: `Performed: ${rec.action}`})}>
                    {rec.action}
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-muted-foreground italic">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20 text-green-600" />
                <p>System is fully optimized.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Explorer Section */}
      <Tabs defaultValue="heavy" className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <TabsList className="grid grid-cols-2 sm:w-[400px]">
            <TabsTrigger value="heavy">Heavy Files Registry</TabsTrigger>
            <TabsTrigger value="directory">Directory Tree</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files by name..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="heavy">
              <DataTable 
                columns={fileColumns} 
                data={filteredFiles.sort((a, b) => b.size - a.size).slice(0, 50)} 
                onDeleteSelected={handleBulkDelete}
              />
            </TabsContent>
            <TabsContent value="directory">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">Recursive folder breakdown by total consumed space.</p>
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
    const bytes = folder.totalSize;
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [folder.totalSize]);

  const hasChildren = folder.children && folder.children.length > 0;

  return (
    <div className={cn("border-l-2 border-muted pl-4", level === 0 && "border-none pl-0")}>
      <div className="flex items-center gap-3 py-2 group hover:bg-muted/30 rounded-md px-2 transition-colors">
        <FolderTreeIcon className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 flex items-center justify-between min-w-0">
          <span className="font-mono text-sm truncate">{folder.name}</span>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">{folder.fileCount} Files</span>
            <Badge variant="secondary" className="font-mono text-xs">{sizeText}</Badge>
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="mt-1 space-y-1">
          {folder.children!.sort((a, b) => b.totalSize - a.totalSize).map(child => (
            <FolderNode key={child.path} folder={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
