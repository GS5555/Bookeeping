'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, writeBatch, deleteDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/full-page-loader';
import { ShieldAlert, PlusCircle, ShieldCheck, Activity, Users2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { AddUserDialog } from './add-user-dialog';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { columns as logColumns } from './log-columns';
import { ActivityLog } from '@/lib/types';
import { mockActivityLogs } from '@/lib/mock-data';

interface AppUser {
    id: string;
    displayName: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer' | 'data-entry';
    isApproved: boolean;
}

const AccessDenied = () => (
    <>
        <PageHeader title="User Management" />
        <div className="flex flex-col items-center justify-center text-center py-16">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
    </>
);

function AdminUserList({ currentUser }: { currentUser: AppUser }) {
    const firestore = useFirestore();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [rowsToDelete, setRowsToDelete] = useState<AppUser[]>([]);

    const allUsersCollectionRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);

    const { data: allUsersData, isLoading: areAllUsersLoading } = useCollection<AppUser>(allUsersCollectionRef);

     const handleRoleChange = async (userId: string, newRole: 'admin' | 'editor' | 'viewer' | 'data-entry') => {
        if (!firestore || currentUser.id === userId) {
            toast({
                title: "Error",
                description: "You cannot change your own role.",
                variant: "destructive"
            });
            return;
        };

        const userToUpdate = allUsersData?.find(u => u.id === userId);
        const adminCount = allUsersData?.filter(u => u.role === 'admin').length || 0;
        if(userToUpdate?.role === 'admin' && adminCount <= 1 && newRole !== 'admin') {
             toast({
                title: "Action Denied",
                description: "Cannot remove the last administrator.",
                variant: "destructive"
            });
            return;
        }
        try {
          const userDocRef = doc(firestore, 'users', userId);
          await setDoc(userDocRef, { role: newRole }, { merge: true });
          toast({
              title: "Success",
              description: `User role has been updated to ${newRole}. The user may need to re-login for the change to take full effect.`
          });
        } catch (error) {
          console.error("Error updating role:", error);
          toast({ title: "Error", description: "Could not update user role.", variant: "destructive" });
        }
    };

    const handleApprovalChange = async (userId: string, isApproved: boolean) => {
        if (!firestore || currentUser.id === userId) {
             toast({
                title: "Error",
                description: "You cannot change your own approval status.",
                variant: "destructive"
            });
            return;
        }
        try {
          const userDocRef = doc(firestore, 'users', userId);
          await setDoc(userDocRef, { isApproved: isApproved }, { merge: true });
          toast({
              title: "Success",
              description: `User has been ${isApproved ? 'approved' : 'unapproved'}.`
          });
        } catch (error) {
           console.error("Error updating approval:", error);
           toast({ title: "Error", description: "Could not update approval status.", variant: "destructive" });
        }
    };
    
    const handleDeleteRequest = (selectedRows: AppUser[]) => {
        setRowsToDelete(selectedRows);
        setIsDeleteDialogOpen(true);
    }
    
    const confirmDelete = async () => {
        if (!firestore || rowsToDelete.length === 0) return;
        
        const batch = writeBatch(firestore);
        let deletedCount = 0;

        rowsToDelete.forEach(user => {
            if(user.id === currentUser.id) {
                toast({ title: "Action Skipped", description: "You cannot delete your own account.", variant: "destructive" });
                return;
            }
            if(user.role === 'admin') {
                const adminCount = allUsersData?.filter(r => r.role === 'admin').length || 0;
                if(adminCount - rowsToDelete.filter(r => r.role === 'admin').length < 1) {
                     toast({ title: "Action Skipped", description: `Cannot delete the last admin: ${user.displayName}.`, variant: "destructive" });
                     return;
                }
            }
            const docRef = doc(firestore, 'users', user.id);
            batch.delete(docRef);
            deletedCount++;
        });

        try {
            await batch.commit();
            if (deletedCount > 0) {
                 toast({
                    title: "Users Deleted",
                    description: `${deletedCount} user(s) have been deleted. It may take some time for authentication records to be cleared.`,
                });
            }
        } catch (error) {
             toast({
                title: "Error",
                description: "Could not delete users. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setRowsToDelete([]);
        }
    }
    
    const activityLogs: ActivityLog[] = mockActivityLogs;

    if (areAllUsersLoading) {
        return <FullPageLoader />;
    }

    return (
        <>
            <AddUserDialog 
                open={isAddUserDialogOpen}
                onOpenChange={setIsAddUserDialogOpen}
            />
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {rowsToDelete.length} user(s). Admin users cannot be deleted if they are the last one.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete}>
                        Continue
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <PageHeader title="User Management">
                <Button variant="outline" asChild>
                    <Link href="/make-admin">
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        First-Time Admin Setup
                    </Link>
                </Button>
                <Button onClick={() => setIsAddUserDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </PageHeader>
            <Tabs defaultValue="users">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="users">
                        <Users2 className="mr-2 h-4 w-4" /> Users
                    </TabsTrigger>
                    <TabsTrigger value="logs">
                        <Activity className="mr-2 h-4 w-4" /> Activity Logs
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Users</CardTitle>
                            <CardDescription>View, approve, and manage user roles in your application.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable 
                                columns={columns({
                                    onRoleChange: handleRoleChange,
                                    onApprovalChange: handleApprovalChange,
                                    currentUserId: currentUser.id
                                })} 
                                data={allUsersData || []} 
                                onDeleteSelected={handleDeleteRequest}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="logs">
                    <Card className="mt-4">
                         <CardHeader>
                            <CardTitle>Activity Logs</CardTitle>
                            <CardDescription>A record of all actions performed by users in the system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DataTable columns={logColumns} data={activityLogs} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </>
    );
}


export default function UsersPageContainer() {
    const { currentUser, isLoading, error } = useCurrentUser();
    
    if (isLoading) {
        return <FullPageLoader />;
    }

    if (error) {
        return <AccessDenied />;
    }

    if (currentUser?.role === 'admin') {
        return <AdminUserList currentUser={currentUser as any} />;
    }

    return <AccessDenied />;
}
