'use client';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Edit, Save, X, Notebook, Search, Download, ArrowLeft } from 'lucide-react';
import { Note } from '@/lib/types';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { exportToExcel } from '@/lib/actions';

export default function NotesPage() {
    const firestore = useFirestore();
    const { currentUser } = useCurrentUser();

    const notesCollectionRef = useMemoFirebase(() => {
        if (!firestore || !currentUser) return null;
        return query(collection(firestore, 'users', currentUser.id, 'notes'), orderBy('updatedAt', 'desc'));
    }, [firestore, currentUser]);

    const { data: notes } = useCollection<Note>(notesCollectionRef);

    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isListView, setIsListView] = useState(true);

    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor' || currentUser?.role === 'data-entry';
    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'editor';

    const filteredNotes = useMemo(() => {
        if (!notes) return [];
        if (!searchQuery) return notes;
        const low = searchQuery.toLowerCase();
        return notes.filter(note => note.title.toLowerCase().includes(low) || note.content.toLowerCase().includes(low));
    }, [notes, searchQuery]);

    useEffect(() => {
        if (selectedNote) {
            setTitle(selectedNote.title);
            setContent(selectedNote.content);
            setIsEditing(false);
            setIsListView(false);
        } else {
            setTitle('');
            setContent('');
            setIsEditing(false);
        }
    }, [selectedNote]);

    const handleSelectNote = (note: Note) => {
        if (isEditing && selectedNote) {
            toast({ title: 'Unsaved Changes', variant: 'destructive' });
            return;
        }
        setSelectedNote(note);
    };

    const handleNewNote = () => {
        if (!canEdit) return;
        setSelectedNote(null);
        setTitle('New Note');
        setContent('');
        setIsEditing(true);
        setIsListView(false);
    };

    const handleSaveNote = async () => {
        if (!canEdit || !firestore || !currentUser || !title) return;
        const noteId = selectedNote?.id || doc(collection(firestore, 'users', currentUser.id, 'notes')).id;
        const noteRef = doc(firestore, 'users', currentUser.id, 'notes', noteId);
        const now = new Date().toISOString();
        const data: Partial<Note> = { title, content, userId: currentUser.id, updatedAt: now };
        if (!selectedNote) data.createdAt = now;

        try {
            await setDoc(noteRef, data, { merge: true });
            toast({ title: 'Note Saved' });
            setIsEditing(false);
            if (!selectedNote) setSelectedNote({ ...data, id: noteId } as Note);
        } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
    };

    const handleDeleteNote = async () => {
        if (!canDelete || !firestore || !currentUser || !selectedNote) return;
        try {
            await deleteDoc(doc(firestore, 'users', currentUser.id, 'notes', selectedNote.id));
            toast({ title: 'Note Deleted' });
            setSelectedNote(null);
            setIsListView(true);
        } catch (e) { toast({ title: 'Error', variant: 'destructive' }); }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-12rem)] min-w-0 max-w-full">
            <PageHeader title="My Notes">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <Button onClick={handleNewNote} size="sm"><PlusCircle className="mr-2 h-4 w-4" /> New</Button>
            </PageHeader>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 min-h-0 overflow-hidden">
                <Card className={cn("flex flex-col min-h-0", !isListView && "hidden md:flex")}>
                    <CardHeader className="py-4 border-b">
                        <CardTitle className="text-base font-black uppercase tracking-widest">Register</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="divide-y">
                                {filteredNotes.map(note => (
                                    <button
                                        key={note.id}
                                        className={cn(
                                            "w-full text-left p-4 transition-colors hover:bg-muted/50",
                                            selectedNote?.id === note.id && "bg-primary/5"
                                        )}
                                        onClick={() => handleSelectNote(note)}
                                    >
                                        <p className="font-bold text-sm truncate">{note.title}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase font-medium mt-1">
                                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <Card className={cn("md:col-span-2 lg:col-span-3 flex flex-col min-h-0 border-2 shadow-sm", isListView && "hidden md:flex")}>
                    <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsListView(true)}><ArrowLeft className="h-4 w-4" /></Button>
                            {isEditing ? (
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-black text-lg border-none p-0 focus-visible:ring-0 bg-transparent h-auto" />
                            ) : (
                                <CardTitle className="text-lg font-black truncate">{selectedNote?.title || 'Editor'}</CardTitle>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedNote && !isEditing && canEdit && <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4" /></Button>}
                            {isEditing && (
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => { setIsEditing(false); if(selectedNote) { setTitle(selectedNote.title); setContent(selectedNote.content); } }}><X className="h-4 w-4" /></Button>
                                    <Button size="icon" onClick={handleSaveNote}><Save className="h-4 w-4" /></Button>
                                </div>
                            )}
                            {selectedNote && canDelete && <Button variant="destructive" size="icon" onClick={handleDeleteNote}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 p-0 overflow-hidden relative">
                        {selectedNote || isEditing ? (
                            isEditing ? (
                                <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Start typing..." className="h-full border-none resize-none rounded-none focus-visible:ring-0 p-6 text-base leading-relaxed" />
                            ) : (
                                <ScrollArea className="h-full p-6">
                                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap font-medium leading-relaxed">
                                        {selectedNote?.content || <p className="text-muted-foreground italic">No content.</p>}
                                    </div>
                                </ScrollArea>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-12 text-center">
                                <Notebook className="h-16 w-16 mb-4 opacity-10" />
                                <p className="text-xs font-black uppercase tracking-widest">Select a note to view its contents</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
