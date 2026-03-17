
'use client';

import { useState, useMemo } from 'react';
import { Customer, Vendor, Company } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { format, addDays, getDayOfYear, parseISO } from 'date-fns';
import { generateBirthdayGreetingEmailBody, generateAnniversaryGreetingEmailBody } from '@/lib/actions';
import { Cake, Gift } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

type EventType = 'Birthday' | 'Anniversary';
type Person = (Customer | Vendor) & { type: 'Customer' | 'Vendor' };

interface Event {
    person: Person;
    date: Date;
    type: EventType;
}

const EventListItem = ({ event, companyDetails }: { event: Event, companyDetails: Company }) => {
    const handleSendGreeting = () => {
        const mailtoLink = event.type === 'Birthday'
            ? generateBirthdayGreetingEmailBody(event.person.name, companyDetails)
            : generateAnniversaryGreetingEmailBody(event.person.name, companyDetails);
        window.location.href = mailtoLink.replace('?', `?to=${event.person.email}&`);
    };

    return (
        <div className="flex items-center gap-4 py-2">
            <Avatar>
                <AvatarFallback>{event.person.name.split(' ').map(n => n[0]).join('').substring(0,2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="font-medium">{event.person.name}</p>
                <p className="text-sm text-muted-foreground">{event.person.type} - {format(event.date, 'MMMM do')}</p>
            </div>
            <Button size="sm" onClick={handleSendGreeting}>Send Greeting</Button>
        </div>
    );
};

export function EventReminders({ customers, vendors }: { customers: Customer[]; vendors: Vendor[] }) {
    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const upcomingEvents = useMemo((): Event[] => {
        const allPeople: Person[] = [
            ...customers.map(c => ({ ...c, type: 'Customer' as const })),
            ...vendors.map(v => ({ ...v, type: 'Vendor' as const }))
        ];

        const events: Event[] = [];
        const today = new Date();
        const todayDayOfYear = getDayOfYear(today);
        const next30Days = addDays(today, 30);

        allPeople.forEach(person => {
            if (person.birthday) {
                const birthday = parseISO(person.birthday);
                birthday.setFullYear(today.getFullYear());
                let dayOfYear = getDayOfYear(birthday);
                
                // Handle year wrap around for dates in the past this year (e.g. today is Dec, birthday is Jan)
                if (dayOfYear < todayDayOfYear) {
                    birthday.setFullYear(today.getFullYear() + 1);
                    dayOfYear = getDayOfYear(birthday);
                }

                if (birthday >= today && birthday <= next30Days) {
                    events.push({ person, date: birthday, type: 'Birthday' });
                }
            }
            if (person.anniversary) {
                const anniversary = parseISO(person.anniversary);
                anniversary.setFullYear(today.getFullYear());
                let dayOfYear = getDayOfYear(anniversary);

                if (dayOfYear < todayDayOfYear) {
                    anniversary.setFullYear(today.getFullYear() + 1);
                    dayOfYear = getDayOfYear(anniversary);
                }

                if (anniversary >= today && anniversary <= next30Days) {
                    events.push({ person, date: anniversary, type: 'Anniversary' });
                }
            }
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [customers, vendors]);

    const upcomingBirthdays = upcomingEvents.filter(e => e.type === 'Birthday');
    const upcomingAnniversaries = upcomingEvents.filter(e => e.type === 'Anniversary');

    if (!companyDetails) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Event Reminders</CardTitle>
                <CardDescription>Upcoming birthdays and anniversaries in the next 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="birthdays">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="birthdays">
                            <Cake className="mr-2 h-4 w-4" /> Birthdays ({upcomingBirthdays.length})
                        </TabsTrigger>
                        <TabsTrigger value="anniversaries">
                            <Gift className="mr-2 h-4 w-4" /> Anniversaries ({upcomingAnniversaries.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="birthdays">
                        {upcomingBirthdays.length > 0 ? (
                            <div className="divide-y">
                                {upcomingBirthdays.map(event => <EventListItem key={`${event.person.id}-bday`} event={event} companyDetails={companyDetails} />)}
                            </div>
                        ) : (
                            <p className="py-8 text-center text-muted-foreground">No upcoming birthdays.</p>
                        )}
                    </TabsContent>
                    <TabsContent value="anniversaries">
                         {upcomingAnniversaries.length > 0 ? (
                             <div className="divide-y">
                                {upcomingAnniversaries.map(event => <EventListItem key={`${event.person.id}-anniv`} event={event} companyDetails={companyDetails} />)}
                            </div>
                        ) : (
                            <p className="py-8 text-center text-muted-foreground">No upcoming anniversaries.</p>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
