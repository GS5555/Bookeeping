"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { Button } from "./button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

function ToastItem({ id, title, description, action, ...props }: ToasterToast) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `${title ? `${title}\n` : ''}${description || ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Toast key={id} {...props}>
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && (
          <ToastDescription>{description}</ToastDescription>
        )}
      </div>
      {action}
      {props.variant === 'destructive' && (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 shrink-0 text-destructive-foreground hover:bg-destructive-foreground/10" 
          onClick={handleCopy}
          title="Copy error message"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      )}
      <ToastClose />
    </Toast>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function (toast) {
        return <ToastItem key={toast.id} {...toast} />
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
