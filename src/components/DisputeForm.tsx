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
import { Loader2 } from "lucide-react";
import { BookingWithDetails } from "@shared/types";
const disputeFormSchema = z.object({
  reason: z.string().min(10, "Please provide a detailed reason.").max(2000, "Reason cannot exceed 2000 characters."),
});
type DisputeFormValues = z.infer<typeof disputeFormSchema>;
type DisputeFormProps = {
  booking: BookingWithDetails;
  onSuccess: () => void;
  setOpen: (open: boolean) => void;
};
export function DisputeForm({ booking, onSuccess, setOpen }: DisputeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<DisputeFormValues>({
    resolver: zodResolver(disputeFormSchema),
    defaultValues: {
      reason: "",
    },
  });
  async function onSubmit(values: DisputeFormValues) {
    setIsLoading(true);
    try {
      const payload = {
        bookingId: booking.id,
        reason: values.reason,
      };
      const response = await api.post<{ disputeId: number }>('/disputes', payload);
      if (response.success) {
        toast.success("Dispute raised successfully.");
        onSuccess();
        setOpen(false);
      } else {
        toast.error(response.error || "Failed to raise dispute. Please try again.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unexpected error occurred. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Dispute</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Please describe the issue in detail..."
                  className="resize-none h-32"
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
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Dispute
          </Button>
        </div>
      </form>
    </Form>
  );
}