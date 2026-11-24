'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, paymentStatusVariant } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Maintenance, PaymentLog } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, FileText } from 'lucide-react';
import { generateReceiptPDF } from '@/lib/generateReceipt';

export default function MaintenancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentMaintenance, setCurrentMaintenance] = useState<Maintenance | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<Maintenance[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [currentRes, historyRes, paymentRes] = await Promise.all([
        api.get('/maintenance/current'),
        api.get('/maintenance?status='),
        api.get('/maintenance/history'),
      ]);

      if (currentRes.data.success) {
        setCurrentMaintenance(currentRes.data.data);
      }
      if (historyRes.data.success) {
        setMaintenanceHistory(historyRes.data.data);
      }
      if (paymentRes.data.success) {
        setPaymentHistory(paymentRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load maintenance data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1] || 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReceipt = (payment: PaymentLog) => {
    generateReceiptPDF({
      transactionId: payment.transaction_id,
      amount: payment.amount,
      month: payment.month,
      year: payment.year,
      flatNo: user?.flat_no || '',
      paymentDate: payment.payment_date,
      userName: user?.name || '',
    });
    
    toast({
      title: 'Receipt Downloaded',
      description: 'Your payment receipt has been downloaded successfully.',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-600 mt-1">View your maintenance dues</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-32"></div>
                <div className="h-12 bg-gray-200 rounded w-24"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
        <p className="text-gray-600 mt-1">View your maintenance dues</p>
      </div>

      {/* Current Month Card */}
      {currentMaintenance && (
        <Card className={currentMaintenance.status === 'overdue' ? 'border-red-200 bg-red-50/50' : currentMaintenance.status === 'paid' ? 'border-green-200 bg-green-50/50' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {getMonthName(currentMaintenance.month)} {currentMaintenance.year}
              </CardTitle>
              <StatusBadge variant={paymentStatusVariant[currentMaintenance.status]} dot>
                {currentMaintenance.status === 'paid' ? 'Paid' : currentMaintenance.status === 'overdue' ? 'Overdue' : 'Pending'}
              </StatusBadge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className={`text-3xl font-bold ${
                  currentMaintenance.status === 'paid' ? 'text-green-600' : 
                  currentMaintenance.status === 'overdue' ? 'text-red-600' : 'text-primary'
                }`}>
                  {formatAmount(currentMaintenance.total_amount)}
                </p>
                {currentMaintenance.late_fee > 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Includes {formatAmount(currentMaintenance.late_fee)} late fee
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Flat No.</p>
                <p className="text-2xl font-semibold text-gray-900">{currentMaintenance.flat_no}</p>
              </div>
            </div>

            {currentMaintenance.status !== 'paid' && (
              <div className="flex items-center justify-between py-2 border-t">
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className={`font-medium ${currentMaintenance.status === 'overdue' ? 'text-red-600' : ''}`}>
                    {formatDate(currentMaintenance.due_date)}
                  </p>
                </div>
                <p className="text-sm text-gray-600 text-right max-w-xs">
                  Please contact the society administrator to pay your maintenance dues.
                </p>
              </div>
            )}

            {currentMaintenance.status === 'paid' && currentMaintenance.paid_date && (
              <div className="flex items-center gap-2 text-green-600 text-sm pt-2 border-t">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Paid on {formatDate(currentMaintenance.paid_date)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {maintenanceHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No payment history yet</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceHistory.map((maintenance) => (
                  <TableRow key={maintenance._id}>
                    <TableCell className="font-medium">
                      {getMonthName(maintenance.month)} {maintenance.year}
                    </TableCell>
                    <TableCell>
                      {formatAmount(maintenance.total_amount)}
                      {maintenance.late_fee > 0 && (
                        <span className="text-xs text-red-600 block">
                          +{formatAmount(maintenance.late_fee)} late fee
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(maintenance.due_date)}</TableCell>
                    <TableCell>
                      <StatusBadge variant={paymentStatusVariant[maintenance.status]} dot>
                        {maintenance.status === 'paid' ? 'Paid' : maintenance.status === 'overdue' ? 'Overdue' : 'Pending'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      {maintenance.status !== 'paid' ? (
                        <span className="text-sm text-gray-500">Contact admin for payment</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm text-gray-500">
                            {maintenance.paid_date && formatDate(maintenance.paid_date)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              generateReceiptPDF({
                                transactionId: 'Manual payment',
                                amount: maintenance.total_amount,
                                month: maintenance.month,
                                year: maintenance.year,
                                flatNo: maintenance.flat_no,
                                paymentDate: maintenance.paid_date || new Date().toISOString(),
                                userName: user?.name || '',
                                lateFee: maintenance.late_fee,
                              });
                              toast({
                                title: 'Receipt Downloaded',
                                description: 'Your payment receipt has been downloaded.',
                              });
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment._id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {payment.transaction_id}
                    </TableCell>
                    <TableCell>
                      {getMonthName(payment.month)} {payment.year}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatAmount(payment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadReceipt(payment)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </Button>
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
