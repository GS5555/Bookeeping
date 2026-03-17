
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
import { PlusCircle, Clock, Edit, Trash2, Search, Download } from 'lucide-react';
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
    const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(new Set());

    const eventsRef = useMemoFirebase(() => {
        if (!currentUser || !firestore) return null;
        return query(
            collection(firestore, 'users', currentUser.id, 'events')
        );
    }, [currentUser, firestore]);

    const { data: events, isLoading: areEventsLoading } = useCollection<Event>(eventsRef);

    const searchedEvents = useMemo(() => {
        if (!events) return [];
        if (!searchQuery) return events;
        return events.filter(event => 
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            event.description?.toLowerCase().includes(searchQuery.toLowerCase())
        ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, searchQuery]);

    const eventsToDisplay = useMemo(() => {
        if (searchQuery) return searchedEvents;
        if (!events || !date) return [];
        return events
            .filter(event => isSameDay(new Date(event.startTime), date))
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [events, date, searchQuery, searchedEvents]);

    const daysWithEvents = useMemo(() => {
        if (!searchedEvents) return [];
        return searchedEvents.map(event => new Date(event.startTime));
    }, [searchedEvents]);

    const handleCreateEvent = () => {
        setEditingEvent(undefined);
        setIsEventDialogOpen(true);
    }
    
    const handleEditEvent = (event: Event) => {
        setEditingEvent(event);
        setIsEventDialogOpen(true);
    };

    const handleDeleteRequest = (event: Event) => {
        setDeletingEvent(event);
    };

    const handleDeleteConfirm = async () => {
        if (!firestore || !currentUser || !deletingEvent) return;
        const eventRef = doc(firestore, 'users', currentUser.id, 'events', deletingEvent.id);
        try {
            await deleteDoc(eventRef);
            toast({ title: 'Success!', description: 'Event deleted.' });
            setDeletingEvent(undefined);
        } catch (error) {
            console.error('Error deleting event:', error);
            toast({ title: 'Error', description: 'Could not delete event.', variant: 'destructive' });
        }
    };
    
    useEffect(() => {
        if (!events) return;

        const timeouts = events.map(event => {
            const startTime = new Date(event.startTime);
            const notificationTime = addMinutes(startTime, -10);
            const now = new Date();

            if (notificationTime > now && !notifiedEventIds.has(event.id)) {
                const timeoutMs = differenceInMilliseconds(notificationTime, now);
                if (timeoutMs > 2147483647) return null; // setTimeout has a max value

                const timeoutId = setTimeout(() => {
                    toast({
                        title: `Reminder: ${event.title}`,
                        description: `Starts at ${format(startTime, 'p')}`,
                    });
                    setNotifiedEventIds(prev => new Set(prev).add(event.id));
                }, timeoutMs);
                return timeoutId;
            }
            return null;
        }).filter(Boolean);

        return () => {
            timeouts.forEach(timeoutId => {
                if(timeoutId) clearTimeout(timeoutId);
            });
        };
    }, [events, toast, notifiedEventIds]);

    const handleEventSuccess = async (event: Event) => {
        if (!firestore || !currentUser) return;
        const isEditing = !!editingEvent;
        const eventRef = doc(firestore, 'users', currentUser.id, 'events', event.id);
        try {
            await setDoc(eventRef, event, { merge: true });
            toast({
                title: 'Success!',
                description: `Your event has been ${isEditing ? 'updated' : 'saved'}.`,
            });
            setIsEventDialogOpen(false);
            setEditingEvent(undefined);
        } catch(error) {
            console.error("Error saving event:", error);
            toast({
                title: 'Error',
                description: 'Could not save your event. Please try again.',
                variant: 'destructive',
            });
        }
    }

    const handleExport = () => {
        if (!events || events.length === 0) {
            toast({
                title: "No Data",
                description: "There are no events to export.",
            });
            return;
        }
        const dataToExport = events.map(event => ({
            title: event.title,
            description: event.description || '',
            startTime: format(new Date(event.startTime), 'yyyy-MM-dd HH:mm:ss'),
            endTime: format(new Date(event.endTime), 'yyyy-MM-dd HH:mm:ss'),
        }));
        exportToExcel(dataToExport, 'planner_export');
    };

    return (
        <>
            <PageHeader title="Planner">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search events..." 
                        className="pl-8" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" onClick={handleExport} disabled={!events || events.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                </Button>
                <Button onClick={handleCreateEvent}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                </Button>
            </PageHeader>
            
            <EventDialog 
                open={isEventDialogOpen}
                onOpenChange={setIsEventDialogOpen}
                onSuccess={handleEventSuccess}
                event={editingEvent}
                selectedDate={date}
            />

            <DeleteConfirmationDialog
                open={!!deletingEvent}
                onOpenChange={() => setDeletingEvent(undefined)}
                onConfirm={handleDeleteConfirm}
                itemName={deletingEvent?.title || 'this event'}
            />

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                         <CardContent className="p-0 sm:p-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md w-full"
                                modifiers={{ highlighted: daysWithEvents }}
                                modifiersStyles={{ highlighted: { border: "2px solid hsl(var(--primary))" } }}
                            />
                        </CardContent>
                    </Card>
                </div>
                 <div>
                     <Card>
                        <CardHeader>
                            <CardTitle>
                                {searchQuery 
                                    ? `Search Results (${searchedEvents.length})` 
                                    : `Schedule for ${date ? format(date, 'PPP') : '...'}`
                                }
                            </CardTitle>
                            <CardDescription>
                                {searchQuery
                                    ? `Found ${searchedEvents.length} event(s) matching your search.`
                                    : `You have ${eventsToDisplay.length} event(s) today.`
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[400px] overflow-y-auto">
                           {eventsToDisplay.length > 0 ? (
                               <div className="space-y-1">
                                   {eventsToDisplay.map(event => (
                                       <div key={event.id} className="group flex items-start gap-3 rounded-md p-2 hover:bg-muted">
                                           <Clock className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                           <div className="flex-1">
                                                <p className="font-semibold">{event.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(event.startTime), 'p')} - {format(new Date(event.endTime), 'p')}
                                                </p>
                                                {event.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{event.description}</p>}
                                           </div>
                                            <div className="ml-auto flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEvent(event)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteRequest(event)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                       </div>
                                   ))}
                               </div>
                           ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    {searchQuery ? "No events found." : "No events scheduled for this day."}
                                </div>
                           )}
                        </CardContent>
                    </Card>
                 </div>
            </div>
        </>
    );
}
