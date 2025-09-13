'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { ProcessedLead, LeadStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format, setHours, setMinutes } from 'date-fns';

const formSchema = z.object({
  leadStatus: z.enum(['new', 'contacted', 'no-answer', 'not-interested', 'call-back', 'wrong-number', 'meeting-scheduled']),
  notes: z.string().optional(),
  meetingDate: z.date().optional(),
  meetingTime: z.string().optional(),
});

interface LeadInteractionFormProps {
  lead: ProcessedLead;
  onSave: (lead: ProcessedLead) => void;
}

const statusOptions: { value: LeadStatus; label: string }[] = [
    { value: 'meeting-scheduled', label: 'Scheduled a meeting' },
    { value: 'no-answer', label: 'No answer' },
    { value: 'not-interested', label: 'Not interested' },
    { value: 'call-back', label: 'Needs a call back' },
    { value: 'wrong-number', label: 'Wrong number' },
    { value: 'contacted', label: 'Contacted (no outcome)' },
];

export function LeadInteractionForm({ lead, onSave }: LeadInteractionFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leadStatus: lead.leadStatus || 'new',
      notes: lead.notes || '',
      meetingDate: lead.meetingTime ? new Date(lead.meetingTime) : new Date(),
      meetingTime: lead.meetingTime ? format(new Date(lead.meetingTime), 'HH:mm') : '09:00',
    },
  });

  const watchStatus = form.watch('leadStatus');

  function onSubmit(values: z.infer<typeof formSchema>) {
    let meetingTime: string | undefined = undefined;
    if (values.leadStatus === 'meeting-scheduled' && values.meetingDate && values.meetingTime) {
      const [hours, minutes] = values.meetingTime.split(':');
      let combinedDate = setHours(values.meetingDate, parseInt(hours, 10));
      combinedDate = setMinutes(combinedDate, parseInt(minutes, 10));
      meetingTime = combinedDate.toISOString();
    }
    
    onSave({ 
      ...lead, 
      leadStatus: values.leadStatus, 
      notes: values.notes,
      meetingTime,
    });
  }
  
  // When lead changes, reset form
  React.useEffect(() => {
    form.reset({
      leadStatus: lead.leadStatus || 'new',
      notes: lead.notes || '',
      meetingDate: lead.meetingTime ? new Date(lead.meetingTime) : new Date(),
      meetingTime: lead.meetingTime ? format(new Date(lead.meetingTime), 'HH:mm') : '09:00',
    })
  }, [lead, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="leadStatus"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>What was the outcome?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-2 gap-2"
                >
                  {statusOptions.map(option => (
                    <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value={option.value} id={`${lead.id}-${option.value}`}/>
                      </FormControl>
                      <FormLabel htmlFor={`${lead.id}-${option.value}`} className="font-normal">
                        {option.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {watchStatus === 'meeting-scheduled' && (
            <div className='space-y-4 p-4 border rounded-md bg-muted/50'>
                <FormField
                control={form.control}
                name="meetingDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Meeting Date</FormLabel>
                    <Popover>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button
                            variant={"outline"}
                            className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                            )}
                            >
                            {field.value ? (
                                format(field.value, "PPP")
                            ) : (
                                <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                    control={form.control}
                    name="meetingTime"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meeting Time</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
          </div>
        )}


        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any relevant notes here..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
            <Button type="submit">Save Interaction</Button>
        </div>
      </form>
    </Form>
  );
}

    
