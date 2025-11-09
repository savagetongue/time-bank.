import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Offer } from "@shared/types";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestServiceForm } from "@/components/RequestServiceForm";
import { useAuthStore } from "@/lib/authStore";
import { Link } from "react-router-dom";
const OfferCard = ({ offer, onSelectOffer }: { offer: Offer, onSelectOffer: (offer: Offer) => void }) => {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return (
    <Card className="flex flex-col h-full transition-shadow duration-300 hover:shadow-lg">
      <CardHeader className="flex-row gap-4 items-center">
        <Avatar>
          <AvatarImage src={`https://i.pravatar.cc/150?u=${offer.provider.email}`} alt={offer.provider.name} />
          <AvatarFallback>{offer.provider.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>{offer.title}</CardTitle>
          <CardDescription>by {offer.provider.name}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground text-sm line-clamp-3">{offer.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.isArray(offer.skills) && offer.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="font-semibold">{offer.rate_per_hour} credits/hr</div>
        {isAuthenticated ? (
          <DialogTrigger asChild>
            <Button onClick={() => onSelectOffer(offer)}>Request Service</Button>
          </DialogTrigger>
        ) : (
          <Button asChild>
            <Link to="/login">Login to Request</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
const OfferSkeleton = () => (
  <Card className="flex flex-col h-full">
    <CardHeader className="flex-row gap-4 items-center">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
    </CardHeader>
    <CardContent className="flex-grow space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </CardContent>
    <CardFooter className="flex justify-between items-center">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-10 w-32" />
    </CardFooter>
  </Card>
);
export function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequestFormOpen, setIsRequestFormOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  useEffect(() => {
    const fetchOffers = async () => {
      setIsLoading(true);
      setError(null);
      const response = await api.get<Offer[]>('/offers');
      if (response.success) {
        setOffers(response.data);
      } else {
        setError(response.error ?? "Failed to fetch offers.");
      }
      setIsLoading(false);
    };
    fetchOffers();
  }, []);
  const handleSelectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setIsRequestFormOpen(true);
  };
  return (
    <Dialog open={isRequestFormOpen} onOpenChange={setIsRequestFormOpen}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8 md:py-10 lg:py-12">
          <div className="space-y-4 mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Explore Offers</h1>
            <p className="text-muted-foreground">Find the skills and services you need from our talented community.</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search for skills or services..." className="pl-10" />
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md my-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <OfferSkeleton key={index} />)
            ) : offers.length > 0 ? (
              offers.map(offer => <OfferCard key={offer.id} offer={offer} onSelectOffer={handleSelectOffer} />)
            ) : (
              !error && <p>No offers available at the moment.</p>
            )}
          </div>
        </div>
      </div>
      {selectedOffer && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request: {selectedOffer.title}</DialogTitle>
            <DialogDescription>
              Send a request to {selectedOffer.provider.name}. You can add a note below.
            </DialogDescription>
          </DialogHeader>
          <RequestServiceForm offer={selectedOffer} setOpen={setIsRequestFormOpen} />
        </DialogContent>
      )}
    </Dialog>
  );
}