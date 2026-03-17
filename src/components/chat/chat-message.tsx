'use client';

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export interface Message {
    from: 'user' | 'bot';
    text: string;
}

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isBot = message.from === 'bot';
    return (
        <div className={cn('flex items-end gap-2', { 'justify-end': !isBot })}>
            {isBot && (
                 <Avatar className="h-8 w-8">
                    <AvatarFallback><Bot size={18} /></AvatarFallback>
                </Avatar>
            )}
            <div
                className={cn('rounded-lg px-3 py-2 text-sm max-w-xs break-words', 
                    isBot ? 'bg-muted' : 'bg-primary text-primary-foreground'
                )}
            >
                {message.text}
            </div>
            {!isBot && (
                 <Avatar className="h-8 w-8">
                    <AvatarFallback><User size={18} /></AvatarFallback>
                </Avatar>
            )}
        </div>
    )
}
