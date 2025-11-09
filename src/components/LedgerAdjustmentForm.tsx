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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
const ledgerAdjustmentSchema = z.object({
  memberId: z.coerce.number().int().positive({ message: "Member ID must be a positive integer." }),
  amount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }).max(255),
});
type LedgerAdjustmentFormValues = z.infer<typeof ledgerAdjustmentSchema>;
type LedgerAdjustmentFormProps = {
  onSuccess: () => void;
  setOpen: (open: boolean) => void;
};
export function LedgerAdjustmentForm({ onSuccess, setOpen }: LedgerAdjustmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<LedgerAdjustmentFormValues>({
    resolver: zodResolver(ledgerAdjustmentSchema),
    defaultValues: {
      memberId: undefined,
      amount: 0,
      reason: "",
    },
  });
  async function onSubmit(values: LedgerAdjustmentFormValues) {
    setIsLoading(true);
    const response = await api.post('/admin/ledger-adjust', values);
    setIsLoading(false);
    if (response.success) {
      toast.success("Ledger adjusted successfully.");
      onSuccess();
      setOpen(false);
    } else {
      toast.error(response.error || "Failed to adjust ledger.");
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member ID</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 123" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 10.5 or -5.0" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason for Adjustment</FormLabel>
              <FormControl>
                <Textarea placeholder="Provide a clear reason for this adjustment..." {...field} disabled={isLoading} />
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
            Confirm Adjustment
          </Button>
        </div>
      </form>
    </Form>
  );
}