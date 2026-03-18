'use client';
import { PageHeader } from '@/components/layout/page-header';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useMemo, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { collection, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Event } from '@/lib/types';
import { format, isSameDay, addMinutes, differenceInMilliseconds } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Clock, Edit, Trash2, Search, Download, PlusCircle } from 'lucide-react';
import { EventDialog } from './event-dialog';
import { useToast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog';
import { Input } from '@/components/ui/input';
import { exportToExcel } from '@/lib/actions';

export default function PlannerPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | undefined>();
    const [deletingEvent, setDeletingEvent] = useState<Event | undefined>();
    const [searchQuery, setSearchQuery] = useState('');
    
    const { currentUser } = useCurrentUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const eventsRef = useMemoFirebase(() => {
        if (!currentUser || !firestore) return null;
        return query(collection(firestore, 'users', currentUser.id, 'events'));
    }, [currentUser, firestore]);

    const { data: events } = useCollection<Event>(eventsRef);

    const searchedEvents = useMemo(() => {
        if (!events) return [];
        if (!searchQuery) return events;
        const low = searchQuery.toLowerCase();
        return events.filter(e => e.title.toLowerCase().includes(low) || e.description?.toLowerCase().includes(low))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, searchQuery]);

    const eventsToDisplay = useMemo(() => {
        if (searchQuery) return searchedEvents;
        if (!events || !date) return [];
        return events.filter(e => isSameDay(new Date(e.startTime), date))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, date, searchQuery, searchedEvents]);

    const daysWithEvents = useMemo(() => events?.map(e => new Date(e.startTime)) || [], [events]);

    const handleEventSuccess = async (event: Event) => {
        if (!firestore || !currentUser) return;
        try {
            await setDoc(doc(firestore, 'users', currentUser.id, 'events', event.id), event, { merge: true });
            toast({ title: 'Success', description: 'Schedule updated.' });
            setIsEventDialogOpen(false);
        } catch(e) { toast({ title: 'Error', variant: 'destructive' }); }
    }

    return (
        <div className="flex flex-col gap-6 min-w-0 max-w-full">
            <PageHeader title="Planner">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Button onClick={() => { setEditingEvent(undefined); setIsEventDialogOpen(true); }} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New Event</Button>
            </PageHeader>
            
            <EventDialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen} onSuccess={handleEventSuccess} event={editingEvent} selectedDate={date} />
            <DeleteConfirmationDialog open={!!deletingEvent} onOpenChange={() => setDeletingEvent(undefined)} onConfirm={async () => {
                if (firestore && currentUser && deletingEvent) {
                    await deleteDoc(doc(firestore, 'users', currentUser.id, 'events', deletingEvent.id));
                    setDeletingEvent(undefined);
                    toast({ title: 'Deleted' });
                }
            }} itemName={deletingEvent?.title || ''} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-2 shadow-sm">
                    <CardContent className="p-2 sm:p-6">
                        <Calendar mode="single" selected={date} onSelect={setDate} className="w-full flex justify-center" modifiers={{ highlighted: daysWithEvents }} modifiersStyles={{ highlighted: { border: "2px solid hsl(var(--primary))", borderRadius: '50%' } }} />
                    </CardContent>
                </Card>
                <Card className="border-2 shadow-sm">
                    <CardHeader className="border-b pb-4">
                        <CardTitle className="text-lg font-black uppercase tracking-tight">{searchQuery ? "Results" : format(date || new Date(), 'dd MMM yyyy')}</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest">{eventsToDisplay.length} Entries</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 px-2 sm:px-6">
                        <div className="space-y-4">
                            {eventsToDisplay.length > 0 ? eventsToDisplay.map(e => (
                                <div key={e.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-primary" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm truncate">{e.title}</p>
                                        <p className="text-[10px] font-black text-muted-foreground uppercase mt-0.5">{format(new Date(e.startTime), 'p')} - {format(new Date(e.endTime), 'p')}</p>
                                        {e.description && <p className="text-xs mt-2 text-muted-foreground line-clamp-2">{e.description}</p>}
                                    </div>
                                    <div className="flex flex-col gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingEvent(e); setIsEventDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingEvent(e)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                    </div>
                                </div>
                            )) : <div className="text-center py-12 text-muted-foreground italic text-sm">No plans for this day.</div>}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
