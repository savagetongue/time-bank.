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
import { Offer } from "@shared/types";
const requestFormSchema = z.object({
  note: z.string().max(1000, "Note cannot exceed 1000 characters.").optional(),
});
type RequestFormValues = z.infer<typeof requestFormSchema>;
type RequestServiceFormProps = {
  offer: Offer;
  setOpen: (open: boolean) => void;
};
export function RequestServiceForm({ offer, setOpen }: RequestServiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      note: "",
    },
  });
  async function onSubmit(values: RequestFormValues) {
    setIsLoading(true);
    const payload = {
      offerId: offer.id,
      note: values.note,
    };
    const response = await api.post<{ requestId: number }>('/requests', payload);
    setIsLoading(false);
    if (response.success) {
      toast.success("Request sent successfully!");
      setOpen(false);
    } else {
      toast.error(response.error ?? "Failed to send request. Please try again.");
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional Note</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add a message for the provider..."
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
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Request
          </Button>
        </div>
      </form>
    </Form>
  );
}