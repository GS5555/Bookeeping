
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
  Trash2, 
  FolderTree as FolderTreeIcon,
  Search,
  CheckCircle2,
  FileBox,
  FileWarning,
  AlertTriangle
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
  Legend
} from 'recharts';
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
          <span className="font-medium truncate max-w-[150px] sm:max-w-[250px]">{row.original.name}</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[250px]">{row.original.path}</span>
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
      header: 'Modified',
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
    toast({ title: "File Deleted", description: `${file.name} has been removed.` });
  };

  const handleBulkDelete = (selected: StorageFile[]) => {
    const ids = new Set(selected.map(s => s.id));
    setFiles(prev => prev.filter(f => !ids.has(f.id)));
    toast({ title: "Bulk Cleanup Complete", description: `${selected.length} files removed.` });
  };

  if (isUserLoading) return <FullPageLoader />;
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <FileWarning className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to access storage analytics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight">Storage Analytics</h2>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {lastScan && <span className="text-[10px] uppercase font-bold text-muted-foreground hidden sm:inline">Last scan: {lastScan.toLocaleTimeString()}</span>}
          <Button onClick={handleScan} disabled={isScanning} className="w-full sm:w-auto" variant={isScanning ? "secondary" : "default"}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isScanning && "animate-spin")} />
            {isScanning ? "Scanning..." : "Deep Scan"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Consumption Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  Disk Utilization
                </CardTitle>
                <CardDescription>Server-wide storage footprint analysis.</CardDescription>
              </div>
              <div className="sm:text-right">
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
                <span className="text-destructive">Critical (> 80%)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
              <div className="h-[250px] w-full min-w-0">
                <p className="text-[10px] font-bold uppercase text-center mb-4 tracking-widest text-muted-foreground">Usage by Category</p>
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
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <FileBox className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Index Snapshot</span>
                  </div>
                  <p className="text-xl font-black">{stats.fileCount.toLocaleString()} <span className="text-xs font-normal text-muted-foreground uppercase">Files Indexed</span></p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-orange-600">Growth Rate</span>
                  </div>
                  <p className="text-xl font-black text-orange-700">+1.2 GB <span className="text-xs font-normal text-orange-600/70 uppercase">/ month</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Smart Recommendations */}
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Optimization Insights
            </CardTitle>
            <CardDescription>AI-driven storage recovery suggestions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {recommendations.length > 0 ? recommendations.map(rec => (
              <div key={rec.id} className="p-4 rounded-lg border-2 border-primary/10 bg-primary/5 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                  <h4 className="font-bold text-sm leading-tight">{rec.title}</h4>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] shrink-0">{rec.impact}</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Safety: {rec.confidence}%</span>
                  <Button size="sm" variant="outline" className="h-7 px-2 text-[9px] uppercase font-black" onClick={() => toast({ title: "Action Applied", description: `Performed: ${rec.action}`})}>
                    {rec.action}
                  </Button>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-muted-foreground italic h-full flex flex-col justify-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20 text-green-600" />
                <p className="text-sm">System is fully optimized.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Explorer Section */}
      <Tabs defaultValue="heavy" className="w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-4">
          <TabsList className="grid grid-cols-2 w-full sm:w-[400px]">
            <TabsTrigger value="heavy" className="text-xs">Heavy Registry</TabsTrigger>
            <TabsTrigger value="directory" className="text-xs">Directory Tree</TabsTrigger>
          </TabsList>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-8 text-sm h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0 sm:pt-6">
            <TabsContent value="heavy" className="m-0">
              <DataTable 
                columns={fileColumns} 
                data={filteredFiles.sort((a, b) => b.size - a.size).slice(0, 50)} 
                onDeleteSelected={handleBulkDelete}
              />
            </TabsContent>
            <TabsContent value="directory" className="m-0 p-4 sm:p-6 overflow-x-auto">
              <div className="min-w-[300px]">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Recursive Storage Consumption</p>
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
    <div className={cn("border-l border-muted/50 ml-2 sm:ml-4", level === 0 && "border-none ml-0")}>
      <div className="flex items-center gap-2 py-2 group hover:bg-muted/30 rounded-md px-2 transition-colors">
        <FolderTreeIcon className="h-3.5 w-3.5 text-primary shrink-0" />
        <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
          <span className="font-mono text-xs truncate flex-1">{folder.name}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9px] font-bold text-muted-foreground uppercase hidden sm:inline">{folder.fileCount} Files</span>
            <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5">{sizeText}</Badge>
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="mt-1 space-y-0.5">
          {folder.children!.sort((a, b) => b.totalSize - a.totalSize).map(child => (
            <FolderNode key={child.path} folder={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
