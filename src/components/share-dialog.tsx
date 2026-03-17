
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: { title: string; text: string };
}

export function ShareDialog({ open, onOpenChange, shareData }: ShareDialogProps) {
  const { title, text } = shareData;

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleTelegramShare = () => {
    const telegramUrl = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "The message has been copied to your clipboard." });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Your browser does not support native sharing. Use an option below.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 py-4">
            <Button onClick={handleCopy} variant="secondary" className="justify-start gap-2">
                <Copy className="h-5 w-5" />
                Copy Message to Clipboard
            </Button>
            <Button onClick={handleWhatsAppShare} variant="outline" className="justify-start gap-2">
                <MessageSquare className="h-5 w-5 text-green-500" />
                Share on WhatsApp
            </Button>
            <Button onClick={handleTelegramShare} variant="outline" className="justify-start gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Share on Telegram
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
