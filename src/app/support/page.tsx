'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataTable } from '@/components/data-table';
import { columns } from './columns';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { SupportTicket } from '@/lib/types';
import { useState, useMemo } from 'react';
import { toast } from '@/hooks/use-toast';
import { TicketDialog } from './ticket-dialog';

const STORE_ID = 'store_main';

export default function SupportPage() {
  const firestore = useFirestore();
  const ticketsRef = useMemoFirebase(() => firestore ? query(collection(firestore, 'stores', STORE_ID, 'supportTickets'), orderBy('createdAt', 'desc')) : null, [firestore]);
  const { data: ticketsData, isLoading: areTicketsLoading } = useCollection<SupportTicket>(ticketsRef);

  const customersRef = useMemoFirebase(() => firestore ? collection(firestore, 'stores', STORE_ID, 'customers') : null, [firestore]);
  const { data: customers } = useCollection<SupportTicket>(customersRef);

  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | undefined>();

  const tickets = useMemo(() => {
    if (!ticketsData || !customers) return [];
    return ticketsData.map(t => ({
      ...t,
      customerName: customers.find(c => c.id === t.customerId)?.name || 'Unknown Customer',
    }))
  }, [ticketsData, customers]);

  const handleCreateTicket = () => {
    setEditingTicket(undefined);
    setIsTicketDialogOpen(true);
  }
  
  const handleEditTicket = (ticket: SupportTicket) => {
    setEditingTicket(ticket);
    setIsTicketDialogOpen(true);
  }

  const handleSuccess = async (ticket: SupportTicket) => {
    if (!firestore) return;
    const isEditing = !!editingTicket;
    const message = isEditing ? 'Support ticket updated successfully.' : 'Support ticket created successfully.';

    try {
        const ticketDocRef = doc(firestore, 'stores', STORE_ID, 'supportTickets', ticket.id);
        await setDoc(ticketDocRef, ticket, { merge: true });

        setIsTicketDialogOpen(false);
        setEditingTicket(undefined);
        toast({ title: 'Success!', description: message });
    } catch (error) {
        console.error("Error saving ticket:", error);
        toast({ title: 'Error', description: "Could not save support ticket.", variant: "destructive" });
    }
  };

  return (
    <>
      <PageHeader title="Support Tickets">
        <Button onClick={handleCreateTicket}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Ticket
        </Button>
      </PageHeader>
      <TicketDialog
        open={isTicketDialogOpen}
        onOpenChange={setIsTicketDialogOpen}
        ticket={editingTicket}
        onSuccess={handleSuccess}
        allTickets={tickets || []}
      />
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              Manage customer support tickets and inquiries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns({onEdit: handleEditTicket})} data={tickets || []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
