import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useGetOnboardingStatus, useCompleteOnboarding } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

export function OnboardingModal() {
  const { data: status, isLoading } = useGetOnboardingStatus();
  const [open, setOpen] = useState(false);
  const completeOnboarding = useCompleteOnboarding();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    profile: {
      name: "Ahmed Ben Kilani",
      email: "ahmed@example.com",
      location: "Tunisia",
      university: "ENIT",
      skills: "React, Node.js, Python"
    },
    smtpHost: "smtp.gmail.com",
    smtpUser: "",
    smtpPass: "",
    adzunaApiKey: "",
    coverLetterEn: "Dear Hiring Manager,\n\nI am writing to apply for the position.\n\nBest,\nAhmed",
    coverLetterFr: "Bonjour,\n\nJe vous écris pour postuler au poste.\n\nCordialement,\nAhmed"
  });

  useEffect(() => {
    if (!isLoading && status && !status.complete) {
      setOpen(true);
    }
  }, [status, isLoading]);

  const handleSubmit = () => {
    completeOnboarding.mutate({ data: formData }, {
      onSuccess: () => setOpen(false)
    });
  };

  if (isLoading || !status) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px] pointer-events-none" hideCloseButton>
        <DialogHeader>
          <DialogTitle>Initialize ApplyBlitz</DialogTitle>
          <DialogDescription>
            Configure your war room to begin automated applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 pointer-events-auto">
          {step === 1 && (
            <div className="space-y-4 font-mono text-sm">
              <div className="text-primary font-bold mb-2">&gt; CONFIGURING PROFILE_DATA</div>
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={formData.profile.name} onChange={e => setFormData({...formData, profile: {...formData.profile, name: e.target.value}})} className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={formData.profile.email} onChange={e => setFormData({...formData, profile: {...formData.profile, email: e.target.value}})} className="font-mono" />
              </div>
              <Button className="w-full mt-4" onClick={() => setStep(2)}>Next: SMTP Setup &gt;</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 font-mono text-sm">
              <div className="text-primary font-bold mb-2">&gt; CONFIGURING COMMS_RELAY (SMTP)</div>
              <div className="grid gap-2">
                <Label>SMTP Host</Label>
                <Input value={formData.smtpHost} onChange={e => setFormData({...formData, smtpHost: e.target.value})} className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>SMTP User</Label>
                <Input value={formData.smtpUser} onChange={e => setFormData({...formData, smtpUser: e.target.value})} className="font-mono" />
              </div>
              <div className="grid gap-2">
                <Label>App Password</Label>
                <Input type="password" value={formData.smtpPass} onChange={e => setFormData({...formData, smtpPass: e.target.value})} className="font-mono" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(1)}>&lt; Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Next: Cover Letters &gt;</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 font-mono text-sm">
              <div className="text-primary font-bold mb-2">&gt; CONFIGURING TEMPLATES</div>
              <div className="grid gap-2">
                <Label>English Template</Label>
                <Textarea value={formData.coverLetterEn} onChange={e => setFormData({...formData, coverLetterEn: e.target.value})} className="font-mono h-24 text-xs" />
              </div>
              <div className="grid gap-2">
                <Label>French Template</Label>
                <Textarea value={formData.coverLetterFr} onChange={e => setFormData({...formData, coverLetterFr: e.target.value})} className="font-mono h-24 text-xs" />
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStep(2)}>&lt; Back</Button>
                <Button className="flex-1" onClick={handleSubmit} disabled={completeOnboarding.isPending}>
                  {completeOnboarding.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  INITIALIZE_SYSTEM()
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
