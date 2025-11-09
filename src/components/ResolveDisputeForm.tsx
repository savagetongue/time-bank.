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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { DisputeWithDetails } from "@shared/types";
const resolveDisputeSchema = z.object({
  resolution: z.enum(['RESOLVED', 'REJECTED']),
  resolutionNotes: z.string().optional(),
  refundAmount: z.coerce.number().min(0).optional(),
});
type ResolveDisputeFormValues = z.infer<typeof resolveDisputeSchema>;
type ResolveDisputeFormProps = {
  dispute: DisputeWithDetails;
  onSuccess: () => void;
  setOpen: (open: boolean) => void;
};
export function ResolveDisputeForm({ dispute, onSuccess, setOpen }: ResolveDisputeFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<ResolveDisputeFormValues>({
    resolver: zodResolver(resolveDisputeSchema),
    defaultValues: {
      resolution: 'RESOLVED',
      resolutionNotes: "",
      refundAmount: 0,
    },
  });
  const resolution = form.watch("resolution");
  const onSubmit = async (values: ResolveDisputeFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...values,
        refundAmount: values.resolution === 'RESOLVED' ? values.refundAmount : 0,
      };
      const response = await api.post(`/disputes/${dispute.id}/resolve`, payload);
      if (response.success) {
        toast.success("Dispute resolved successfully.");
        onSuccess();
        setOpen(false);
      } else {
        toast.error(response.error ?? "Failed to resolve dispute.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
      console.error("Failed to resolve dispute:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="resolution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resolution</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a resolution status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="RESOLVED">Resolve (with optional refund)</SelectItem>
                  <SelectItem value="REJECTED">Reject</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {resolution === 'RESOLVED' && (
          <FormField
            control={form.control}
            name="refundAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Refund Amount (credits)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="resolutionNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resolution Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Explain the resolution..." {...field} disabled={isLoading} />
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
            Confirm Resolution
          </Button>
        </div>
      </form>
    </Form>
  );
}