
import { StorageFile, StorageFolder, StorageRecommendation, StorageFileType } from './types';

/**
 * Simulates a large directory tree and a list of heavy/redundant files.
 */

const EXTENSIONS: Record<StorageFileType, string[]> = {
  log: ['.log', '.txt', '.err'],
  backup: ['.zip', '.tar.gz', '.bak', '.sql'],
  media: ['.jpg', '.png', '.mp4', '.pdf'],
  temp: ['.tmp', '.cache', '.swp'],
  other: ['.json', '.js', '.ts', '.css'],
};

const FOLDERS = [
  '/var/log',
  '/var/www/uploads',
  '/var/www/backups',
  '/tmp',
  '/home/user/studio/src',
  '/home/user/studio/node_modules',
];

export function generateMockFiles(count: number = 150): StorageFile[] {
  const files: StorageFile[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const folder = FOLDERS[Math.floor(Math.random() * FOLDERS.length)];
    const typeKeys = Object.keys(EXTENSIONS) as StorageFileType[];
    const type = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const ext = EXTENSIONS[type][Math.floor(Math.random() * EXTENSIONS[type].length)];
    
    // Bias some files to be really large
    let size = Math.floor(Math.random() * 5 * 1024 * 1024); // Up to 5MB default
    if (i < 10) size = Math.floor(Math.random() * 500 * 1024 * 1024) + 100 * 1024 * 1024; // Top 10 are 100-600MB
    if (i < 2) size = Math.floor(Math.random() * 2000 * 1024 * 1024) + 1000 * 1024 * 1024; // Top 2 are 1-3GB

    const name = `file_${i}${ext}`;
    const daysAgo = Math.floor(Math.random() * 200);
    const modDate = new Date(now);
    modDate.setDate(modDate.getDate() - daysAgo);

    files.push({
      id: `f_${i}`,
      name,
      path: `${folder}/${name}`,
      size,
      type,
      extension: ext,
      lastModified: modDate.toISOString(),
      createdAt: new Date(modDate.getTime() - 1000000).toISOString(),
      isDuplicate: Math.random() > 0.9,
    });
  }

  return files;
}

export function buildFolderTree(files: StorageFile[]): StorageFolder {
  const root: StorageFolder = { path: '/', name: 'root', totalSize: 0, fileCount: 0, children: [] };

  files.forEach(file => {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;
    current.totalSize += file.size;
    current.fileCount++;

    let currentPath = '';
    parts.slice(0, -1).forEach(part => {
      currentPath += `/${part}`;
      let child = current.children?.find(c => c.name === part);
      if (!child) {
        child = { path: currentPath, name: part, totalSize: 0, fileCount: 0, children: [] };
        current.children?.push(child);
      }
      child.totalSize += file.size;
      child.fileCount++;
      current = child;
    });
  });

  return root;
}

export function generateRecommendations(files: StorageFile[]): StorageRecommendation[] {
  const recommendations: StorageRecommendation[] = [];
  const now = new Date();

  // 1. Old Log recommendation
  const oldLogs = files.filter(f => f.type === 'log' && (now.getTime() - new Date(f.lastModified).getTime()) > 90 * 24 * 60 * 60 * 1000);
  if (oldLogs.length > 0) {
    const totalSize = oldLogs.reduce((acc, f) => acc + f.size, 0);
    recommendations.push({
      id: 'rec_logs',
      title: 'Truncate Old Application Logs',
      description: `Detected ${oldLogs.length} log files older than 90 days. These are likely redundant.`,
      action: 'Truncate Logs',
      impact: `Saves ${(totalSize / (1024 * 1024)).toFixed(1)} MB`,
      confidence: 95,
      type: 'truncate',
      files: oldLogs.map(f => f.path),
    });
  }

  // 2. Huge media recommendation
  const hugeMedia = files.filter(f => f.type === 'media' && f.size > 500 * 1024 * 1024);
  if (hugeMedia.length > 0) {
    recommendations.push({
      id: 'rec_media',
      title: 'Compress Large Media Assets',
      description: `${hugeMedia.length} video/image files exceed 500MB. Compression could reduce size by up to 60%.`,
      action: 'Compress Files',
      impact: 'Estimated 1.2 GB savings',
      confidence: 80,
      type: 'compress',
      files: hugeMedia.map(f => f.path),
    });
  }

  // 3. Stale backups
  const staleBackups = files.filter(f => f.type === 'backup' && (now.getTime() - new Date(f.lastModified).getTime()) > 30 * 24 * 60 * 60 * 1000);
  if (staleBackups.length > 0) {
    recommendations.push({
      id: 'rec_backups',
      title: 'Archive Stale Backups',
      description: `Backups older than 30 days are occupying critical fast storage. Move them to cold storage.`,
      action: 'Archive Now',
      impact: 'Saves 4.5 GB of hot tier storage',
      confidence: 100,
      type: 'archive',
      files: staleBackups.map(f => f.path),
    });
  }

  return recommendations;
}
