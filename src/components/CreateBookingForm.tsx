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
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { RequestWithDetails } from "@shared/types";
import { format } from "date-fns";
const bookingFormSchema = z.object({
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Please select a valid date and time.",
  }),
  durationMinutes: z.coerce.number().int().min(15, "Duration must be at least 15 minutes."),
});
type BookingFormValues = z.infer<typeof bookingFormSchema>;
type CreateBookingFormProps = {
  request: RequestWithDetails;
  onSuccess: () => void;
  setOpen: (open: boolean) => void;
};
export function CreateBookingForm({ request, onSuccess, setOpen }: CreateBookingFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      durationMinutes: 60,
    },
  });
  const duration = form.watch("durationMinutes");
  const escrowAmount = (request.offer.rate_per_hour * (duration / 60)).toFixed(2);
  async function onSubmit(values: BookingFormValues) {
    setIsLoading(true);
    const payload = {
      requestId: request.id,
      startTime: new Date(values.startTime).toISOString(),
      durationMinutes: values.durationMinutes,
    };
    const response = await api.post<{ bookingId: number }>('/bookings', payload);
    setIsLoading(false);
    if (response.success) {
      toast.success("Booking created successfully!");
      onSuccess();
      setOpen(false);
    } else {
      toast.error(response.error || "Failed to create booking. Please try again.");
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="startTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="durationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (in minutes)</FormLabel>
              <FormControl>
                <Input type="number" step="15" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="p-4 bg-muted rounded-md text-sm">
          <p>
            Based on a rate of <span className="font-semibold">{request.offer.rate_per_hour} credits/hr</span> and a duration of <span className="font-semibold">{duration || 0} minutes</span>, an escrow of <span className="font-semibold">{escrowAmount} credits</span> will be held.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || duration < 15}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Booking
          </Button>
        </div>
      </form>
    </Form>
  );
}