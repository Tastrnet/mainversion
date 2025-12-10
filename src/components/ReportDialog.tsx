import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'review' | 'list';
  contentId: string;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or irrelevant' },
  { id: 'inappropriate', label: 'Inappropriate language or discrimination' },
  { id: 'misinformation', label: 'Misinformation' },
  { id: 'conflict', label: 'Conflict of interest' },
  { id: 'other', label: 'Other' }
];

const ReportDialog = ({ open, onOpenChange, contentType, contentId }: ReportDialogProps) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    );
  };

  const handleSubmit = async () => {
    if (selectedReasons.length === 0) {
      toast({
        title: "Please select a reason",
        description: "You must select at least one reason for reporting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to report content.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('reports')
        .insert({
          reporter_id: user.id,
          reported_content_type: contentType,
          reported_content_id: contentId,
          reasons: selectedReasons,
          description: description.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for helping us keep the community safe. We'll review your report.",
      });

      // Reset form and close dialog
      setSelectedReasons([]);
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report {contentType === 'review' ? 'Review' : 'List'}</DialogTitle>
          <DialogDescription>
            Help us maintain a safe community by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>Reason for reporting</Label>
            {REPORT_REASONS.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-2">
                <Checkbox
                  id={reason.id}
                  checked={selectedReasons.includes(reason.id)}
                  onCheckedChange={() => handleReasonToggle(reason.id)}
                />
                <label
                  htmlFor={reason.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {reason.label}
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional information</Label>
            <Textarea
              id="description"
              placeholder="Please provide any additional context about why you're reporting this content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedReasons.length === 0}
            className="btn-primary"
          >
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;