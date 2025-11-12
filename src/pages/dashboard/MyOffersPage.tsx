import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Offer } from "@shared/types";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CreateOfferForm } from "@/components/CreateOfferForm";
const OfferListItem = ({ offer }: { offer: Offer }) => (
  <div className="border-b py-4 flex justify-between items-center">
    <div>
      <h3 className="font-semibold">{offer.title}</h3>
      <p className="text-sm text-muted-foreground">
        {offer.rate_per_hour} credits/hr - {offer.is_active ? <Badge variant="secondary">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
      </p>
    </div>
    <Button variant="outline" size="sm">Manage</Button>
  </div>
);
const OfferListSkeleton = () => (
    <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border-b py-4 flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-9 w-20" />
            </div>
        ))}
    </div>
);
export function MyOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const fetchMyOffers = async () => {
    setIsLoading(true);
    setError(null);
    const response = await api.get<Offer[]>('/me/offers');
    if (response.success) {
      setOffers(response.data);
    } else {
      setError(('error' in response && response.error) || "Failed to fetch your offers.");
    }
    setIsLoading(false);
  };
  useEffect(() => {
    fetchMyOffers();
  }, []);
  const handleSuccess = () => {
    fetchMyOffers(); // Refetch offers after a new one is created
  };
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>My Offers</CardTitle>
          <CardDescription>
            Manage your existing offers or create a new one.
          </CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create a New Offer</DialogTitle>
              <DialogDescription>
                Fill out the details below to list a new service.
              </DialogDescription>
            </DialogHeader>
            <CreateOfferForm onSuccess={handleSuccess} setOpen={setIsFormOpen} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <OfferListSkeleton />
        ) : error ? (
          <div className="text-red-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : offers.length > 0 ? (
          <div className="space-y-2">
            {offers.map(offer => <OfferListItem key={offer.id} offer={offer} />)}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium">No offers yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Create Offer" to get started.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}