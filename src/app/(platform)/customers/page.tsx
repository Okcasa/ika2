'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProcessedLead } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TrendingUp, Phone, Calendar, User } from 'lucide-react';

const LEADS_KEY = 'leadsorter_leads';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<ProcessedLead[]>([]);

  useEffect(() => {
    const storedLeads = localStorage.getItem(LEADS_KEY);
    if (storedLeads) {
      const allLeads: ProcessedLead[] = JSON.parse(storedLeads);
      const sales = allLeads.filter(l => l.leadStatus === 'sale-made');
      setCustomers(sales);
    }
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-0">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Leads you have successfully converted into customers.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>You have {customers.length} total customers.</CardDescription>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No sales made yet. Go to "My Leads" to start closing!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Date Acquired</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer, i) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div>{customer.correctedBusinessName}</div>
                      <div className="text-sm text-muted-foreground">{customer.ownerName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" /> {customer.correctedPhoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                       <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        {/* Assuming we don't store sale date yet, just showing Today or N/A */}
                        {format(new Date(), 'PP')}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        $99.00
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
