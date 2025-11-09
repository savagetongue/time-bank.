import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { DisputeWithDetails } from "@shared/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ResolveDisputeForm } from "@/components/ResolveDisputeForm";
export function AdminPage() {
  const [disputes, setDisputes] = useState<DisputeWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isResolveFormOpen, setIsResolveFormOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<DisputeWithDetails | null>(null);
  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<DisputeWithDetails[]>('/disputes');
    if (response.success) {
      setDisputes(response.data);
    } else {
      setError(response.error || "Failed to fetch disputes.");
    }
    setIsLoading(false);
  }, []);
  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);
  const handleOpenResolveForm = (dispute: DisputeWithDetails) => {
    setSelectedDispute(dispute);
    setIsResolveFormOpen(true);
  };
  const handleResolutionSuccess = () => {
    fetchDisputes();
  };
  const renderContent = () => {
    if (isLoading) {
      return (
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-12" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-24" /></TableCell>
              <TableCell><Skeleton className="h-9 w-24" /></TableCell>
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
    if (disputes.length === 0) {
      return (
        <TableBody>
          <TableRow>
            <TableCell colSpan={4} className="text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <ShieldCheck className="h-12 w-12 text-green-500" />
                <p className="font-medium">No open disputes</p>
                <p className="text-sm">All is well in the community!</p>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }
    return (
      <TableBody>
        {disputes.map((dispute) => (
          <TableRow key={dispute.id}>
            <TableCell className="font-medium">{dispute.booking_id}</TableCell>
            <TableCell>
              <div className="font-medium">{dispute.requester.name} vs {dispute.provider.name}</div>
              <div className="text-sm text-muted-foreground truncate max-w-md">{dispute.reason}</div>
            </TableCell>
            <TableCell>{format(new Date(dispute.created_at), "MMM d, yyyy")}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => handleOpenResolveForm(dispute)}>Resolve</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    );
  };
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <Card>
            <CardHeader>
              <CardTitle>Dispute Management</CardTitle>
              <CardDescription>
                Review and resolve open disputes between members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Booking ID</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[150px]">Date Raised</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                {renderContent()}
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={isResolveFormOpen} onOpenChange={setIsResolveFormOpen}>
        {selectedDispute && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Resolve Dispute for Booking #{selectedDispute.booking_id}</DialogTitle>
              <DialogDescription>
                Review the details and take action. Your decision is final.
              </DialogDescription>
            </DialogHeader>
            <ResolveDisputeForm
              dispute={selectedDispute}
              onSuccess={handleResolutionSuccess}
              setOpen={setIsResolveFormOpen}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}