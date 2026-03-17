
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Event } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, setHours, setMinutes } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  startDate: z.date({ required_error: "Start date is required." }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)."),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)."),
}).refine(data => {
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    return startHour < endHour || (startHour === endHour && startMinute < endMinute);
}, {
    message: "End time must be after start time.",
    path: ["endTime"],
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event;
  selectedDate?: Date;
  onSuccess: (event: Event) => void;
}

export function EventDialog({ open, onOpenChange, event, selectedDate, onSuccess }: EventDialogProps) {
  const { currentUser } = useCurrentUser();
  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (open) {
      const now = new Date();
      const defaultStartTime = format(now, 'HH:00');
      const defaultEndTime = format(setHours(now, now.getHours() + 1), 'HH:00');

      if (event) {
        const startDate = new Date(event.startTime);
        form.reset({
          title: event.title,
          description: event.description || '',
          startDate: startDate,
          startTime: format(startDate, 'HH:mm'),
          endTime: format(new Date(event.endTime), 'HH:mm'),
        });
      } else {
        form.reset({
          title: '',
          description: '',
          startDate: selectedDate || new Date(),
          startTime: defaultStartTime,
          endTime: defaultEndTime,
        });
      }
    }
  }, [open, event, selectedDate, form]);

  const onSubmit = (data: EventFormValues) => {
    if (!currentUser) return;
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    
    const startTime = setMinutes(setHours(data.startDate, startHour), startMinute);
    const endTime = setMinutes(setHours(data.startDate, endHour), endMinute);

    const submittedEvent: Event = {
      id: event?.id || `evt_${Date.now()}`,
      userId: currentUser.id,
      title: data.title,
      description: data.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      createdAt: event?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSuccess(submittedEvent);
  };
  
  const dialogTitle = event ? "Edit Event" : "Create New Event";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            Plan your schedule and set reminders.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Meeting with Vendor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Discuss new product line." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Save Event</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
