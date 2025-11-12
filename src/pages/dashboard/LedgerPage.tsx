import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { LedgerEntry, Balance } from "@shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, FileText, Wallet } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
export function LedgerPage() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchLedgerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ledgerRes, balanceRes] = await Promise.all([
        api.get<LedgerEntry[]>('/ledger'),
        api.get<Balance>('/balance')
      ]);
      if (!ledgerRes.success) {
        throw new Error(('error' in ledgerRes && ledgerRes.error) || "Failed to fetch ledger.");
      }
      if (!balanceRes.success) {
        throw new Error(('error' in balanceRes && balanceRes.error) || "Failed to fetch balance.");
      }
      setLedger(ledgerRes.data);
      setBalance(balanceRes.data.balance);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchLedgerData();
  }, [fetchLedgerData]);
  const getTxnTypeDetails = (type: LedgerEntry['txn_type']) => {
    switch (type) {
      case 'CREDIT': return { icon: ArrowUpCircle, color: 'text-green-500', label: 'Credit' };
      case 'DEBIT': return { icon: ArrowDownCircle, color: 'text-red-500', label: 'Debit' };
      case 'ADJUSTMENT': return { icon: FileText, color: 'text-blue-500', label: 'Adjustment' };
      case 'REFUND': return { icon: FileText, color: 'text-yellow-500', label: 'Refund' };
      default: return { icon: FileText, color: 'text-muted-foreground', label: 'Unknown' };
    }
  };
  const renderContent = () => {
    if (isLoading) {
      return (
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={4}><Skeleton className="h-6 w-full" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      );
    }
    if (error) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className="text-center text-red-600">
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    if (ledger.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <Wallet className="h-12 w-12 text-gray-400" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here.</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    return (
      <TableBody>
        {ledger.map((entry) => {
          const { icon: Icon, color, label } = getTxnTypeDetails(entry.txn_type);
          return (
            <TableRow key={entry.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5", color)} />
                  <div>
                    <p className="font-medium">{entry.notes || label}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={entry.amount > 0 ? "default" : "destructive"} className="font-mono">
                  {entry.amount > 0 ? '+' : ''}{entry.amount.toFixed(2)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">{entry.balance_after.toFixed(2)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    );
  };
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>My Ledger</CardTitle>
            <CardDescription>
              View your time credit balance and transaction history.
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            {isLoading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <p className="text-2xl font-bold">{balance?.toFixed(2) ?? '0.00'}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          {renderContent()}
        </Table>
      </CardContent>
    </Card>
  );
}