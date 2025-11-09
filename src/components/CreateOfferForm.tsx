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
import { Offer } from "@shared/types";
const offerFormSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }).max(255),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  skills: z.string().min(1, { message: "Please enter at least one skill, comma-separated." }),
  rate_per_hour: z.coerce.number().positive({ message: "Rate must be a positive number." }),
});
type OfferFormValues = z.infer<typeof offerFormSchema>;
type CreateOfferFormProps = {
  onSuccess: (newOffer: Offer) => void;
  setOpen: (open: boolean) => void;
};
export function CreateOfferForm({ onSuccess, setOpen }: CreateOfferFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      title: "",
      description: "",
      skills: "",
      rate_per_hour: 0,
    },
  });
  async function onSubmit(values: OfferFormValues) {
    setIsLoading(true);
    const skillsArray = values.skills.split(',').map(s => s.trim()).filter(Boolean);
    const payload = {
      ...values,
      skills: skillsArray,
    };
    const response = await api.post<Offer>('/offers', payload);
    setIsLoading(false);
    if (response.success && response.data) {
      toast.success("Offer created successfully!");
      onSuccess(response.data); // Pass the full new offer object
      setOpen(false);
    } else {
      toast.error(response.error || "Failed to create offer. Please try again.");
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Offer Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Professional Web Design" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the service you are offering..." {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <Input placeholder="e.g., React, TypeScript, Figma" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rate_per_hour"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rate (credits per hour)</FormLabel>
              <FormControl>
                <Input type="number" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Offer
            </Button>
        </div>
      </form>
    </Form>
  );
}