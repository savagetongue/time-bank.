import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { DisputeWithDetails, TopProviderReport } from "@shared/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShieldCheck, Star, Trophy, PlusCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ResolveDisputeForm } from "@/components/ResolveDisputeForm";
import { LedgerAdjustmentForm } from "@/components/LedgerAdjustmentForm";
import { Badge } from "@/components/ui/badge";
export function AdminPage() {
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([]);
  const [topProviders, setTopProviders] = useState<TopProviderReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResolveFormOpen, setIsResolveFormOpen] = useState(false);
  const [isLedgerFormOpen, setIsLedgerFormOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null);
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [disputesRes, providersRes] = await Promise.all([
        api.get<DisputeWithDetails[]>('/disputes'),
        api.get<TopProviderReport[]>('/reports/top-providers')
      ]);
      if (disputesRes.success) {
        setDisputes(disputesRes.data);
      } else {
        throw new Error(disputesRes.error || "Failed to fetch disputes.");
      }
      if (providersRes.success) {
        setTopProviders(providersRes.data);
      } else {
        throw new Error(providersRes.error || "Failed to fetch top providers.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  const handleOpenResolveForm = (dispute: DisputeWithDetails) => {
    setSelectedDispute(dispute);
    setIsResolveFormOpen(true);
  };
  const handleFormSuccess = () => {
    fetchData();
  };
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12 space-y-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-muted-foreground">Platform oversight and management tools.</p>
            </div>
            <Dialog open={isLedgerFormOpen} onOpenChange={setIsLedgerFormOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Adjust Ledger</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Manual Ledger Adjustment</DialogTitle>
                  <DialogDescription>Credit or debit a member's account. This action is irreversible.</DialogDescription>
                </DialogHeader>
                <LedgerAdjustmentForm onSuccess={handleFormSuccess} setOpen={setIsLedgerFormOpen} />
              </DialogContent>
            </Dialog>
          </div>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
              <div className="flex items-center gap-3"><AlertCircle className="h-5 w-5 text-red-400" /><p className="text-sm text-red-700">{error}</p></div>
            </div>
          )}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader><CardTitle>Open Disputes</CardTitle><CardDescription>Review and resolve open disputes between members.</CardDescription></CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead className="w-[100px]">Booking</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead className="w-[100px]">Action</TableHead></TableRow></TableHeader>
                    {isLoading ? <TableBody>{Array.from({ length: 3 }).map((_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>)}</TableBody> :
                      disputes.length === 0 ? <TableBody><TableRow><TableCell colSpan={4} className="text-center py-12"><ShieldCheck className="mx-auto h-12 w-12 text-green-500" /><p className="mt-2 font-medium">No open disputes</p></TableCell></TableRow></TableBody> :
                      <TableBody>{disputes.map((d) => <TableRow key={d.id}><TableCell className="font-medium">#{d.booking_id}</TableCell><TableCell><div className="font-medium">{d.requester.name} vs {d.provider.name}</div><div className="text-sm text-muted-foreground truncate max-w-xs">{d.reason}</div></TableCell><TableCell>{format(new Date(d.created_at), "MMM d, yyyy")}</TableCell><TableCell><Button variant="outline" size="sm" onClick={() => handleOpenResolveForm(d)}>Resolve</Button></TableCell></TableRow>)}</TableBody>}
                  </Table>
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader><CardTitle>Top Providers</CardTitle><CardDescription>Providers with the most completed bookings.</CardDescription></CardHeader>
                <CardContent>
                  {isLoading ? <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
                    topProviders.length === 0 ? <div className="text-center py-8"><Trophy className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-2 text-sm">No provider data yet.</p></div> :
                    <div className="space-y-4">{topProviders.map(p => <div key={p.id} className="flex items-center justify-between"><div className="truncate"><p className="font-medium truncate">{p.name}</p><p className="text-sm text-muted-foreground">{p.completed_bookings} bookings</p></div>{p.average_rating && <Badge variant="secondary" className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> {Number(p.average_rating).toFixed(1)}</Badge>}</div>)}</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isResolveFormOpen} onOpenChange={setIsResolveFormOpen}>
        {selectedDispute && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader><DialogTitle>Resolve Dispute for Booking #{selectedDispute.booking_id}</DialogTitle><DialogDescription>Review the details and take action. Your decision is final.</DialogDescription></DialogHeader>
            <ResolveDisputeForm dispute={selectedDispute} onSuccess={handleFormSuccess} setOpen={setIsResolveFormOpen} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}