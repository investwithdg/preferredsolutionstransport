'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/shared/PageHeader';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { Input } from '@/app/components/ui/input';
import { EmptyState } from '@/app/components/shared/EmptyState';
import { LoadingState } from '@/app/components/shared/LoadingState';
import { CreditCard, Download, ExternalLink, Search, Receipt } from 'lucide-react';
import { toast } from 'sonner';

type Payment = {
  orderId: string;
  paymentIntentId?: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: {
    type: string;
    last4?: string;
    brand?: string;
  } | null;
  receiptUrl: string | null;
  created: number;
  route: string;
  error?: string;
};

function getStatusColor(status: string): 'default' | 'success' | 'destructive' | 'secondary' {
  switch (status) {
    case 'succeeded':
      return 'success';
    case 'pending':
    case 'processing':
      return 'secondary';
    case 'failed':
    case 'canceled':
    case 'error':
      return 'destructive';
    default:
      return 'default';
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
}

function getPaymentMethodDisplay(paymentMethod: Payment['paymentMethod']): string {
  if (!paymentMethod) return 'N/A';

  const brand = paymentMethod.brand
    ? paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
    : paymentMethod.type;

  return paymentMethod.last4 ? `${brand} •••• ${paymentMethod.last4}` : brand;
}

export default function PaymentHistoryClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = payments.filter(
        (payment) =>
          payment.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payment.route.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (payment.paymentIntentId &&
            payment.paymentIntentId.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredPayments(filtered);
    } else {
      setFilteredPayments(payments);
    }
  }, [searchQuery, payments]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/customer/payments');

      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setFilteredPayments(data.payments || []);
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payment history', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadReceipt = (receiptUrl: string) => {
    window.open(receiptUrl, '_blank');
  };

  const totalPaid = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return <LoadingState message="Loading payment history..." />;
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Payment History"
        description="View all your payment transactions and receipts"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Dashboard', href: '/customer/dashboard' },
          { label: 'Payment History' },
        ]}
      />

      {/* Summary Cards */}
      {payments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Paid</CardDescription>
              <CardTitle className="text-2xl">
                {formatCurrency(totalPaid, payments[0]?.currency || 'usd')}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Transactions</CardDescription>
              <CardTitle className="text-2xl">{payments.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Successful Payments</CardDescription>
              <CardTitle className="text-2xl">
                {payments.filter((p) => p.status === 'succeeded').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Search */}
      {payments.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, route, or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={searchQuery ? 'No payments found' : 'No payment history'}
          description={
            searchQuery
              ? 'Try adjusting your search query'
              : "You haven't made any payments yet. Start by requesting a quote!"
          }
          action={
            !searchQuery ? (
              <Button asChild>
                <a href="/quote">Request a Quote</a>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Showing {filteredPayments.length} of {payments.length} transactions
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.orderId}>
                      <TableCell className="text-sm">{formatDate(payment.created)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.orderId.slice(-12)}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{payment.route}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          {getPaymentMethodDisplay(payment.paymentMethod)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {payment.receiptUrl && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => downloadReceipt(payment.receiptUrl!)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Receipt
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/track/${payment.orderId}`}>
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Track
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
