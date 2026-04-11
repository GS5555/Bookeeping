'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Send, Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ChatMessage, Message } from './chat-message';
import OfflineForm from './offline-form';
import { sendChatMessage } from '@/ai/flows/chat';

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { from: 'bot', text: 'Hello! How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { from: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const botReply = await sendChatMessage(input);
            const botMessage: Message = { from: 'bot', text: botReply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
             const errorMessage: Message = { from: 'bot', text: 'Sorry, something went wrong.' };
             setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50">
                <Button onClick={() => setIsOpen(!isOpen)} size="icon" className="rounded-full w-14 h-14 shadow-lg">
                    {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                </Button>
            </div>
            
            {isOpen && (
                <div className="fixed bottom-20 right-4 z-50">
                    <Card className="w-80 h-[30rem] flex flex-col shadow-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="h-6 w-6 text-primary" />
                                <div>
                                    <CardTitle>AI Assistant</CardTitle>
                                    <CardDescription className={cn("text-xs", isOnline ? 'text-green-500' : 'text-muted-foreground')}>
                                        {isOnline ? 'Online' : 'We are away'}
                                    </CardDescription>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOnline(!isOnline)}>
                                <div className={cn("w-2 h-2 rounded-full", isOnline ? 'bg-green-500' : 'bg-gray-400')}></div>
                            </Button>
                        </CardHeader>
                        
                        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isOnline ? (
                                <>
                                    {messages.map((msg, index) => (
                                        <ChatMessage key={index} message={msg} />
                                    ))}
                                    {isLoading && <ChatMessage message={{ from: 'bot', text: 'Typing...' }} />}
                                    <div ref={messagesEndRef} />
                                </>
                            ) : (
                                <OfflineForm />
                            )}
                        </CardContent>

                        {isOnline && (
                             <CardFooter>
                                <form onSubmit={handleSend} className="flex w-full items-center space-x-2">
                                    <Input 
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Type a message..." 
                                        disabled={isLoading} 
                                    />
                                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </CardFooter>
                        )}
                    </Card>
                </div>
            )}
        </>
    )
}
