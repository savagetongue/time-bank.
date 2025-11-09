import { mockOffers, Offer } from "@/lib/mock-data";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
const OfferCard = ({ offer }: { offer: Offer }) => (
  <Card className="flex flex-col h-full">
    <CardHeader className="flex-row gap-4 items-center">
      <Avatar>
        <AvatarImage src={offer.provider.avatarUrl} alt={offer.provider.name} />
        <AvatarFallback>{offer.provider.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <CardTitle>{offer.title}</CardTitle>
        <CardDescription>by {offer.provider.name} - ★ {offer.provider.rating}</CardDescription>
      </div>
    </CardHeader>
    <CardContent className="flex-grow">
      <p className="text-muted-foreground text-sm">{offer.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {offer.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}
      </div>
    </CardContent>
    <CardFooter className="flex justify-between items-center">
      <div className="font-semibold">{offer.ratePerHour} credits/hr</div>
      <Button>Request Service</Button>
    </CardFooter>
  </Card>
);
export function OffersPage() {
  return (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockOffers.filter(o => o.isActive).map(offer => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </div>
  );
}