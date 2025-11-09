import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2, Star } from "lucide-react";
import { BookingWithDetails } from "@shared/types";
import { cn } from "@/lib/utils";
const ratingFormSchema = z.object({
  score: z.number().min(1, "Please select a rating.").max(5),
  comments: z.string().max(1000, "Comments cannot exceed 1000 characters.").optional(),
});
type RatingFormValues = z.infer<typeof ratingFormSchema>;
type RatingFormProps = {
  booking: BookingWithDetails;
  onSuccess: () => void;
  setOpen: (open: boolean) => void;
};
export function RatingForm({ booking, onSuccess, setOpen }: RatingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const form = useForm<RatingFormValues>({
    resolver: zodResolver(ratingFormSchema),
    defaultValues: {
      score: 0,
      comments: "",
    },
  });
  const currentRating = form.watch("score");
  async function onSubmit(values: RatingFormValues) {
    setIsLoading(true);
    const payload = {
      bookingId: booking.id,
      ...values,
    };
    try {
      const response = await api.post<{ ratingId: number }>('/ratings', payload);
      if (!response.success) {
        toast.error(response.error || "Failed to submit rating. Please try again.");
        return;
      }
      toast.success("Thank you for your feedback!");
      onSuccess();
      setOpen(false);
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Rating</FormLabel>
              <FormControl>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-8 w-8 cursor-pointer transition-colors",
                        (hoverRating >= star || currentRating >= star)
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground"
                      )}
                      onClick={() => field.onChange(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                    />
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="comments"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comments (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience..."
                  className="resize-none"
                  {...field}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || currentRating === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Review
          </Button>
        </div>
      </form>
    </Form>
  );
}