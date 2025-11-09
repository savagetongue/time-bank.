import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { BookingWithDetails } from "@shared/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { AlertCircle, CheckCircle, Star, User, Briefcase, Loader2, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { useAuthStore } from "@/lib/authStore";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { RatingForm } from "@/components/RatingForm";
import { DisputeForm } from "@/components/DisputeForm";
const BookingCard = ({ booking, role, onComplete, onRate, onDispute }: { booking: BookingWithDetails, role: 'provider' | 'requester', onComplete: (bookingId: number) => Promise<void>, onRate: (booking: BookingWithDetails) => void, onDispute: (booking: BookingWithDetails) => void }) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const otherParty = role === 'provider' ? booking.member : booking.provider;
  const handleComplete = async () => {
    setIsCompleting(true);
    await onComplete(booking.id);
    setIsCompleting(false);
  };
  const statusColors = {
    PENDING: 'secondary',
    COMPLETED: 'default',
    DISPUTED: 'destructive',
    CANCELLED: 'outline',
    IN_PROGRESS: 'secondary',
  } as const;
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{booking.offer.title}</CardTitle>
            <CardDescription>
              {role === 'provider' ? `With ${otherParty.name}` : `By ${otherParty.name}`}
            </CardDescription>
          </div>
          <Badge variant={statusColors[booking.status] || 'secondary'}>{booking.status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          <strong>Scheduled for:</strong> {format(new Date(booking.start_time), "MMMM d, yyyy 'at' h:mm a")}
        </p>
        <p className="text-sm">
          <strong>Duration:</strong> {booking.duration_minutes} minutes
        </p>
        <p className="text-xs text-muted-foreground mt-4">
          Booked {formatDistanceToNow(new Date(booking.created_at), { addSuffix: true })}
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {role === 'provider' && booking.status === 'PENDING' && (
          <Button onClick={handleComplete} disabled={isCompleting}>
            {isCompleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Mark as Complete
          </Button>
        )}
        {booking.status === 'COMPLETED' && !booking.rating_id && !booking.dispute_id && (
           <Button variant="outline" onClick={() => onRate(booking)}>
             <Star className="mr-2 h-4 w-4" />
             Leave a Review
           </Button>
        )}
        {booking.status === 'COMPLETED' && !booking.dispute_id && (
           <Button variant="destructive" onClick={() => onDispute(booking)}>
             <ShieldAlert className="mr-2 h-4 w-4" />
             Raise Dispute
           </Button>
        )}
      </CardFooter>
    </Card>
  );
};
const BookingList = ({ role, bookings, onComplete, onRate, onDispute }: { role: 'provider' | 'requester', bookings: BookingWithDetails[], onComplete: (bookingId: number) => Promise<void>, onRate: (booking: BookingWithDetails) => void, onDispute: (booking: BookingWithDetails) => void }) => {
  return bookings.length > 0 ? (
    <div className="space-y-4">
      {bookings.map(b => <BookingCard key={b.id} booking={b} role={role} onComplete={onComplete} onRate={onRate} onDispute={onDispute} />)}
    </div>
  ) : (
    <div className="text-center py-10 border-2 border-dashed rounded-lg">
      <h3 className="text-lg font-medium">No bookings found</h3>
      <p className="text-sm text-muted-foreground">You have no bookings as a {role}.</p>
    </div>
  );
};
export function BookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRatingFormOpen, setIsRatingFormOpen] = useState(false);
  const [isDisputeFormOpen, setIsDisputeFormOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const userId = useAuthStore(s => s.user?.id);
  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<BookingWithDetails[]>('/bookings');
    if (response.success) {
      setBookings(response.data);
    } else {
      setError(response.error || "Failed to fetch bookings.");
    }
    setIsLoading(false);
  }, []);
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  const handleCompleteBooking = async (bookingId: number) => {
    const response = await api.post(`/bookings/${bookingId}/complete`, {});
    if (response.success) {
      toast.success("Booking completed successfully!");
      fetchBookings();
    } else {
      toast.error(response.error || "Failed to complete booking.");
    }
  };
  const handleOpenRatingForm = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setIsRatingFormOpen(true);
  };
  const handleOpenDisputeForm = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setIsDisputeFormOpen(true);
  };
  const handleFormSuccess = () => {
    fetchBookings();
  };
  const providerBookings = bookings.filter(b => b.provider.id === userId);
  const requesterBookings = bookings.filter(b => b.member.id === userId);
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
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>View your past and upcoming service bookings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="requester">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="requester">
                <User className="mr-2 h-4 w-4" /> As Requester
              </TabsTrigger>
              <TabsTrigger value="provider">
                <Briefcase className="mr-2 h-4 w-4" /> As Provider
              </TabsTrigger>
            </TabsList>
            <TabsContent value="requester" className="pt-4">
              <BookingList role="requester" bookings={requesterBookings} onComplete={handleCompleteBooking} onRate={handleOpenRatingForm} onDispute={handleOpenDisputeForm} />
            </TabsContent>
            <TabsContent value="provider" className="pt-4">
              <BookingList role="provider" bookings={providerBookings} onComplete={handleCompleteBooking} onRate={handleOpenRatingForm} onDispute={handleOpenDisputeForm} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={isRatingFormOpen} onOpenChange={setIsRatingFormOpen}>
        {selectedBooking && (
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Review: {selectedBooking.offer.title}</DialogTitle>
              <DialogDescription>
                Share your feedback for the service provided by {selectedBooking.provider.name}.
              </DialogDescription>
            </DialogHeader>
            <RatingForm booking={selectedBooking} onSuccess={handleFormSuccess} setOpen={setIsRatingFormOpen} />
          </DialogContent>
        )}
      </Dialog>
      <Dialog open={isDisputeFormOpen} onOpenChange={setIsDisputeFormOpen}>
        {selectedBooking && (
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Dispute: {selectedBooking.offer.title}</DialogTitle>
              <DialogDescription>
                Please explain why you are disputing this completed service.
              </DialogDescription>
            </DialogHeader>
            <DisputeForm booking={selectedBooking} onSuccess={handleFormSuccess} setOpen={setIsDisputeFormOpen} />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}