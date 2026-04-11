'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from '@/hooks/use-toast';

const issueTypes = ['Billing', 'Technical Support', 'Sales Inquiry', 'General Question', 'Other'];

export default function OfflineForm() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [captcha, setCaptcha] = useState('');
    const [userInput, setUserInput] = useState('');

    const generateCaptcha = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let captchaText = '';
        for (let i = 0; i < 6; i++) {
            captchaText += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setCaptcha(captchaText);
    }

    useEffect(() => {
        generateCaptcha();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (userInput.toLowerCase() !== captcha.toLowerCase()) {
            toast({
                title: "Error",
                description: "CAPTCHA does not match. Please try again.",
                variant: "destructive",
            });
            generateCaptcha();
            setUserInput('');
            return;
        }
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="font-semibold">Message Sent!</h3>
                <p className="text-sm text-muted-foreground">Thanks for reaching out. We'll get back to you as soon as possible.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-muted-foreground">
                We're currently offline. Please leave a message and we'll get back to you.
            </p>
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your Name" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Your Email" required />
            </div>
             <div className="space-y-2">
                <Label htmlFor="issue">Issue</Label>
                 <Select required>
                    <SelectTrigger id="issue">
                        <SelectValue placeholder="Select an issue" />
                    </SelectTrigger>
                    <SelectContent>
                        {issueTypes.map(issue => (
                            <SelectItem key={issue} value={issue.toLowerCase().replace(' ', '-')}>{issue}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" placeholder="Your Message" required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="captcha">CAPTCHA</Label>
                <div className="flex items-center gap-2">
                    <div className="px-4 py-2 rounded-md bg-muted font-mono tracking-widest select-none w-full text-center">
                        {captcha}
                    </div>
                     <Button type="button" variant="ghost" size="icon" onClick={generateCaptcha}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                <Input
                    id="captcha"
                    placeholder="Enter the text above"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    required
                />
            </div>
            <Button type="submit" className="w-full">Send Message</Button>
        </form>
    );
}
