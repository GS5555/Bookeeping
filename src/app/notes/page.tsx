
'use client';
import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2, Edit, Save, X, Notebook, Search, Download } from 'lucide-react';
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

    const { data: notes, isLoading: areNotesLoading } = useCollection<Note>(notesCollectionRef);

    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor' || currentUser?.role === 'data-entry';
    const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'editor';

    const filteredNotes = useMemo(() => {
        if (!notes) return [];
        if (!searchQuery) return notes;
        return notes.filter(note =>
            note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            note.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [notes, searchQuery]);

    useEffect(() => {
        if (selectedNote) {
            setTitle(selectedNote.title);
            setContent(selectedNote.content);
            setIsEditing(false);
        } else {
            setTitle('');
            setContent('');
            setIsEditing(false);
        }
    }, [selectedNote]);

    const handleSelectNote = (note: Note) => {
        if (isEditing && selectedNote) {
            toast({
                title: 'Unsaved Changes',
                description: 'Please save or cancel your current note before switching.',
                variant: 'destructive',
            });
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
    };

    const handleSaveNote = async () => {
        if (!canEdit || !firestore || !currentUser || !title) {
            toast({ title: 'Error', description: 'Title is required.', variant: 'destructive' });
            return;
        }

        const noteId = selectedNote?.id || doc(collection(firestore, 'users', currentUser.id, 'notes')).id;
        const noteRef = doc(firestore, 'users', currentUser.id, 'notes', noteId);

        const newNoteData: Partial<Note> = {
            title,
            content,
            userId: currentUser.id,
            updatedAt: new Date().toISOString(),
        };

        if (!selectedNote) {
            newNoteData.createdAt = new Date().toISOString();
        }

        try {
            await setDoc(noteRef, newNoteData, { merge: true });
            toast({ title: 'Success!', description: 'Note saved successfully.' });
            setIsEditing(false);
            if (!selectedNote) {
                // If it was a new note, we need to "select" it to show the content
                setSelectedNote({ ...newNoteData, id: noteId } as Note);
            } else {
                setSelectedNote({ ...selectedNote, ...newNoteData });
            }
        } catch (error) {
            console.error('Error saving note:', error);
            toast({ title: 'Error', description: 'Could not save note.', variant: 'destructive' });
        }
    };

    const handleDeleteNote = async () => {
        if (!canDelete || !firestore || !currentUser || !selectedNote) return;

        const noteRef = doc(firestore, 'users', currentUser.id, 'notes', selectedNote.id);
        try {
            await deleteDoc(noteRef);
            toast({ title: 'Success!', description: 'Note deleted.' });
            setSelectedNote(null);
            setTitle('');
            setContent('');
            setIsEditing(false);
        } catch (error) {
            console.error('Error deleting note:', error);
            toast({ title: 'Error', description: 'Could not delete note.', variant: 'destructive' });
        }
    };

    const handleExport = () => {
        if (!notes || notes.length === 0) {
            toast({
                title: "No Data",
                description: "There are no notes to export.",
            });
            return;
        }
        const dataToExport = notes.map(note => ({
            title: note.title,
            content: note.content,
            updatedAt: format(new Date(note.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
            createdAt: format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        }));
        exportToExcel(dataToExport, 'notes_export');
    };

    return (
        <>
            <PageHeader title="My Notes">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search notes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" onClick={handleExport} disabled={!notes || notes.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Export All
                </Button>
                {canEdit && (
                    <Button onClick={handleNewNote}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Note
                    </Button>
                )}
            </PageHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
                <Card className="col-span-1 flex flex-col">
                    <CardHeader>
                        <CardTitle>All Notes</CardTitle>
                        <CardDescription>Your personal notes.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="space-y-2">
                                {filteredNotes?.map(note => (
                                    <Button
                                        key={note.id}
                                        variant="ghost"
                                        className={cn(
                                            "w-full justify-start h-auto p-2 flex flex-col items-start",
                                            selectedNote?.id === note.id && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => handleSelectNote(note)}
                                    >
                                        <p className="font-semibold truncate w-full text-left">{note.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Updated {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                                        </p>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2 lg:col-span-3 flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between">
                        {isEditing ? (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="text-2xl font-bold p-0 border-0 shadow-none focus-visible:ring-0 h-auto"
                            />
                        ) : (
                            <CardTitle>{selectedNote ? selectedNote.title : 'Select a note'}</CardTitle>
                        )}
                        <div className="flex items-center gap-2">
                            {selectedNote && !isEditing && canEdit && (
                                <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            {isEditing && (
                                <>
                                    <Button variant="outline" size="icon" onClick={() => { setIsEditing(false); if(selectedNote) {setTitle(selectedNote.title); setContent(selectedNote.content); }}}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" onClick={handleSaveNote}>
                                        <Save className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                            {selectedNote && canDelete && (
                                <Button variant="destructive" size="icon" onClick={handleDeleteNote}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                        {selectedNote || isEditing ? (
                            isEditing ? (
                                <Textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Start writing your note here..."
                                    className="flex-1 text-base resize-none"
                                />
                            ) : (
                                <ScrollArea className="flex-1">
                                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                                        {selectedNote?.content || <p className="text-muted-foreground">This note is empty.</p>}
                                    </div>
                                </ScrollArea>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <Notebook className="h-16 w-16 mb-4" />
                                <p>
                                    {searchQuery 
                                        ? `No notes found matching your search.`
                                        : "Select a note from the list to view it, or create a new one."
                                    }
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
