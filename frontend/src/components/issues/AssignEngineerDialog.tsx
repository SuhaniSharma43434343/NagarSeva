import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Employee } from '@/types';
import { toast } from 'sonner';

interface AssignEngineerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engineers: Employee[];
  onAssign: (engineerId: string, engineerName: string) => void;
}

export const AssignEngineerDialog = ({
  open,
  onOpenChange,
  engineers,
  onAssign,
}: AssignEngineerDialogProps) => {
  const [selectedEngineer, setSelectedEngineer] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAssign = async () => {
    if (!selectedEngineer) {
      toast.error('Please select an engineer');
      return;
    }
    const engineer = engineers.find((e) => e.id === selectedEngineer);
    if (engineer) {
      setIsSubmitting(true);
      try {
        await onAssign(engineer.id, engineer.name);
        setSelectedEngineer('');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Engineer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Select Engineer</Label>
            <Select value={selectedEngineer} onValueChange={setSelectedEngineer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an engineer" />
              </SelectTrigger>
              <SelectContent>
                {engineers.map((engineer) => (
                  <SelectItem key={engineer.id} value={engineer.id}>
                    {engineer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAssign} disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Assigning...' : 'Assign Engineer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
