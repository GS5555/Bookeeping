

import { ActivityLog } from './types';

export const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const countries = ["Australia", "Bangladesh", "India", "South Africa", "Sri Lanka", "United Kingdom", "United States"];

// Mock data for ActivityLog
export const mockActivityLogs: ActivityLog[] = [
  {
    id: 'log1',
    userId: 'admin_user_id',
    username: 'Admin User',
    timestamp: new Date('2024-07-29T10:00:00Z').toISOString(),
    action: 'Created Sale #INV-2024-00101',
    ipAddress: '192.168.1.1',
  },
  {
    id: 'log2',
    userId: 'editor_user_id',
    username: 'Editor User',
    timestamp: new Date('2024-07-29T10:05:00Z').toISOString(),
    action: 'Updated Product SKU: KB-BAT-001',
    ipAddress: '10.0.0.5',
  },
  {
    id: 'log3',
    userId: 'admin_user_id',
    username: 'Admin User',
    timestamp: new Date('2024-07-29T11:20:00Z').toISOString(),
    action: 'Deleted Customer: Rohan Sharma',
    ipAddress: '192.168.1.1',
  },
  {
    id: 'log4',
    userId: 'data_entry_user_id',
    username: 'Data Entry User',
    timestamp: new Date('2024-07-29T12:15:00Z').toISOString(),
    action: 'Added new Customer: New Customer Name',
    ipAddress: '172.16.0.10',
  },
    {
    id: 'log5',
    userId: 'editor_user_id',
    username: 'Editor User',
    timestamp: new Date('2024-07-28T14:30:00Z').toISOString(),
    action: 'Received stock for PO #PO-2024-0005',
    ipAddress: '10.0.0.5',
  },
];
