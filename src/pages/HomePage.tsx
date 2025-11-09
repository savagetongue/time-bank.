import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { mockOffers, Offer } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight } from "lucide-react";
const OfferCard = ({ offer }: { offer: Offer }) => (
  <Card className="flex flex-col h-full hover:shadow-lg transition-shadow duration-300">
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
      <p className="text-muted-foreground text-sm line-clamp-3">{offer.description}</p>
    </CardContent>
    <CardFooter className="flex justify-between items-center">
      <div className="font-semibold">{offer.ratePerHour} credits/hr</div>
      <Button variant="secondary" size="sm">View Details</Button>
    </CardFooter>
  </Card>
);
export function HomePage() {
  const featuredOffers = mockOffers.filter(o => o.isActive).slice(0, 3);
  return (
    <>
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20 md:py-28 lg:py-36 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Exchange Skills, Not Money.
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-8">
            ChronoBank is a modern time-banking platform where your time and skills are the currency. Offer your talents, earn time credits, and spend them on services you need.
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link to="/offers">Explore Offers</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/register">Join Now</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Featured Offers Section */}
      <div className="bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-16 md:py-20 lg:py-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Featured Offers</h2>
              <p className="text-muted-foreground mt-2">Get a glimpse of the amazing skills available in our community.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredOffers.map(offer => (
                <OfferCard key={offer.id} offer={offer} />
              ))}
            </div>
            <div className="text-center mt-12">
              <Button variant="outline" asChild>
                <Link to="/offers">
                  View All Offers <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}