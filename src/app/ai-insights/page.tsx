'use client';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Bot } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/layout/page-header';
import { ChatMessage, Message } from '@/components/chat/chat-message';
import { sendChatMessage } from '@/ai/flows/chat';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AiInsightsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { from: 'bot', text: 'Hello! As a cricket store business assistant, I can help you with sales analysis, pricing strategies, and more. How can I help you today?' }
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
             console.error("Chat error:", error);
             const errorMessage: Message = { from: 'bot', text: 'Sorry, I encountered an error. Please try again.' };
             setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <>
      <PageHeader title="Gemini Chat" />
       <Card className="h-[75vh] flex flex-col">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Bot className="h-8 w-8 text-primary" />
                    <div>
                        <CardTitle>AI Business Assistant</CardTitle>
                        <CardDescription>Ask me about sales trends, product performance, or promotion ideas.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                     <div className="space-y-4">
                        {messages.map((msg, index) => (
                            <ChatMessage key={index} message={msg} />
                        ))}
                        {isLoading && <ChatMessage message={{ from: 'bot', text: 'Thinking...' }} />}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <form onSubmit={handleSend} className="flex w-full items-center space-x-2">
                    <Input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., Which products are selling the most this month?" 
                        disabled={isLoading} 
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    </>
  );
}
