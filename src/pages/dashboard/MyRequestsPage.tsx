import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { RequestWithDetails } from "@shared/types";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CalendarPlus, Inbox, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { CreateBookingForm } from "@/components/CreateBookingForm";
import { useAuthStore } from "@/lib/authStore";
const RequestCard = ({ request, type, onAccept }: { request: RequestWithDetails, type: 'incoming' | 'outgoing', onAccept: (request: RequestWithDetails) => void }) => {
  const title = type === 'incoming' ? `Request from ${request.member.name}` : `Request for "${request.offer.title}"`;
  const description = type === 'incoming' ? `For your offer: "${request.offer.title}"` : `Status: ${request.status}`;
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {request.note && (
          <blockquote className="mt-2 border-l-2 pl-4 italic text-sm">
            "{request.note}"
          </blockquote>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
        </p>
      </CardContent>
      {type === 'incoming' && request.status === 'OPEN' && (
        <div className="p-6 pt-0">
          <Button onClick={() => onAccept(request)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Accept & Book
          </Button>
        </div>
      )}
    </Card>
  );
};
const RequestList = ({ type, onAccept, refetchTrigger }: { type: 'incoming' | 'outgoing', onAccept: (request: RequestWithDetails) => void, refetchTrigger: number }) => {
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<RequestWithDetails[]>(`/requests?type=${type}`);
    if (response.success) {
      setRequests(response.data);
    } else {
      const errorMessage = 'error' in response && response.error ? response.error : `Failed to fetch ${type} requests.`;
      setError(errorMessage);
    }
    setIsLoading(false);
  }, [type]);
  useEffect(() => {
    fetchRequests();
  }, [type, fetchRequests, refetchTrigger]);
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-5 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-4 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-red-600 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
      </div>
    );
  }
  return requests.length > 0 ? (
    <div className="space-y-4">
      {requests.map(req => <RequestCard key={req.id} request={req} type={type} onAccept={onAccept} />)}
    </div>
  ) : (
    <div className="text-center py-10 border-2 border-dashed rounded-lg">
      <h3 className="text-lg font-medium">No {type} requests</h3>
      <p className="text-sm text-muted-foreground">You currently have no {type} requests.</p>
    </div>
  );
};
export function MyRequestsPage() {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestWithDetails | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const isProvider = useAuthStore(s => s.user?.is_provider);
  const handleAcceptRequest = (request: RequestWithDetails) => {
    setSelectedRequest(request);
    setIsBookingFormOpen(true);
  };
  const handleBookingSuccess = () => {
    setIsBookingFormOpen(false);
    setRefetchTrigger(c => c + 1); // Trigger a refetch in the RequestList
  };
  return (
    <Dialog open={isBookingFormOpen} onOpenChange={setIsBookingFormOpen}>
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Manage your incoming and outgoing service requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isProvider ? "incoming" : "outgoing"}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="incoming" disabled={!isProvider}>
                <Inbox className="mr-2 h-4 w-4" /> Incoming
              </TabsTrigger>
              <TabsTrigger value="outgoing">
                <Send className="mr-2 h-4 w-4" /> Outgoing
              </TabsTrigger>
            </TabsList>
            <TabsContent value="incoming" className="pt-4">
              {isProvider ? <RequestList type="incoming" onAccept={handleAcceptRequest} refetchTrigger={refetchTrigger} /> : <p>You must be a provider to receive requests.</p>}
            </TabsContent>
            <TabsContent value="outgoing" className="pt-4">
              <RequestList type="outgoing" onAccept={() => {}} refetchTrigger={refetchTrigger} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {selectedRequest && (
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Create Booking</DialogTitle>
            <DialogDescription>
              Confirm the details to book this service for {selectedRequest.member.name}.
            </DialogDescription>
          </DialogHeader>
          <CreateBookingForm request={selectedRequest} onSuccess={handleBookingSuccess} setOpen={setIsBookingFormOpen} />
        </DialogContent>
      )}
    </Dialog>
  );
}