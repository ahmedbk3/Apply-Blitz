import { Layout } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetConfig, useUpdateConfig, useGetProfile, useUpdateProfile, useGetCoverLetters, useUpdateCoverLetters, usePreviewCoverLetter, useSendDigest } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Send, Loader2 } from "lucide-react";

export default function Settings() {
  const { data: config } = useGetConfig();
  const updateConfig = useUpdateConfig();
  const { data: profile } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { data: coverLetters } = useGetCoverLetters();
  const updateCoverLetters = useUpdateCoverLetters();
  const previewCoverLetter = usePreviewCoverLetter();
  const sendDigest = useSendDigest();
  
  const { toast } = useToast();

  const [localConfig, setLocalConfig] = useState({
    smtpHost: "",
    smtpUser: "",
    smtpPass: "",
    adzunaApiKey: "",
    scheduleTime: ""
  });

  const [localProfile, setLocalProfile] = useState({
    name: "", email: "", location: "", university: "", skills: ""
  });

  const [localLetters, setLocalLetters] = useState({ fr: "", en: "" });
  const [previewData, setPreviewData] = useState({ company: "Example Corp", role: "Software Engineer", language: "en" as "en" | "fr" });

  useEffect(() => {
    if (config) setLocalConfig(prev => ({ ...prev, smtpHost: config.smtpHost || "", smtpUser: config.smtpUser || "", adzunaApiKey: config.adzunaApiKey || "", scheduleTime: config.scheduleTime || "" }));
    if (profile) setLocalProfile({ name: profile.name || "", email: profile.email || "", location: profile.location || "", university: profile.university || "", skills: profile.skills || "" });
    if (coverLetters) setLocalLetters({ fr: coverLetters.fr || "", en: coverLetters.en || "" });
  }, [config, profile, coverLetters]);

  const handleSaveConfig = () => {
    updateConfig.mutate({ data: localConfig }, {
      onSuccess: () => toast({ title: "Configuration saved" })
    });
  };

  const handleSaveProfile = () => {
    updateProfile.mutate({ data: localProfile }, {
      onSuccess: () => toast({ title: "Profile saved" })
    });
  };

  const handleSaveLetters = () => {
    updateCoverLetters.mutate({ data: localLetters }, {
      onSuccess: () => toast({ title: "Cover letters saved" })
    });
  };

  const handlePreview = () => {
    previewCoverLetter.mutate({ data: previewData });
  };

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">Settings & Configuration</h1>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="mb-6 bg-secondary border border-border">
            <TabsTrigger value="system">System Config</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="templates">Cover Letters</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  SMTP Configuration
                  {config?.smtpConfigured ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20 ml-2"><CheckCircle2 className="w-3 h-3 mr-1"/> Configured</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 ml-2"><XCircle className="w-3 h-3 mr-1"/> Missing</Badge>
                  )}
                </CardTitle>
                <CardDescription>Required for sending automated emails to jobs that only accept direct applications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input className="font-mono" value={localConfig.smtpHost} onChange={e => setLocalConfig({...localConfig, smtpHost: e.target.value})} placeholder="smtp.gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP User</Label>
                    <Input className="font-mono" value={localConfig.smtpUser} onChange={e => setLocalConfig({...localConfig, smtpUser: e.target.value})} placeholder="ahmed@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>App Password (Write only)</Label>
                  <Input type="password" placeholder="••••••••" className="font-mono" value={localConfig.smtpPass} onChange={e => setLocalConfig({...localConfig, smtpPass: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>API Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-sm">
                <div className="space-y-2">
                  <Label>Adzuna API Key</Label>
                  <div className="flex gap-2">
                    <Input type="password" placeholder="Key" className="font-mono" value={localConfig.adzunaApiKey} onChange={e => setLocalConfig({...localConfig, adzunaApiKey: e.target.value})} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => sendDigest.mutate(undefined, { onSuccess: () => toast({title: "Digest sent"}) })}>
                <Send className="w-4 h-4 mr-2" /> Send Daily Digest Now
              </Button>
              <Button onClick={handleSaveConfig} disabled={updateConfig.isPending}>
                {updateConfig.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Configuration
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Data used to auto-fill application forms and populate templates.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 font-mono text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={localProfile.name} onChange={e => setLocalProfile({...localProfile, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={localProfile.email} onChange={e => setLocalProfile({...localProfile, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={localProfile.location} onChange={e => setLocalProfile({...localProfile, location: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>University</Label>
                    <Input value={localProfile.university} onChange={e => setLocalProfile({...localProfile, university: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Core Skills</Label>
                  <Textarea value={localProfile.skills} onChange={e => setLocalProfile({...localProfile, skills: e.target.value})} />
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>Save Profile</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Template Editor</CardTitle>
                  <CardDescription>Use {'{{company}}'} and {'{{role}}'} variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="en" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="en">English</TabsTrigger>
                      <TabsTrigger value="fr">French</TabsTrigger>
                    </TabsList>
                    <TabsContent value="en">
                      <Textarea 
                        className="h-64 font-mono text-sm" 
                        value={localLetters.en} 
                        onChange={e => setLocalLetters({...localLetters, en: e.target.value})} 
                      />
                    </TabsContent>
                    <TabsContent value="fr">
                      <Textarea 
                        className="h-64 font-mono text-sm" 
                        value={localLetters.fr} 
                        onChange={e => setLocalLetters({...localLetters, fr: e.target.value})} 
                      />
                    </TabsContent>
                  </Tabs>
                  <Button className="w-full" onClick={handleSaveLetters} disabled={updateCoverLetters.isPending}>Save Templates</Button>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Company</Label>
                      <Input size={sm as any} value={previewData.company} onChange={e => setPreviewData({...previewData, company: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Role</Label>
                      <Input size={sm as any} value={previewData.role} onChange={e => setPreviewData({...previewData, role: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setPreviewData({...previewData, language: "en"}); handlePreview(); }}>Preview EN</Button>
                    <Button variant="outline" size="sm" onClick={() => { setPreviewData({...previewData, language: "fr"}); handlePreview(); }}>Preview FR</Button>
                  </div>
                  <div className="mt-4 p-4 bg-[#0A0D12] border border-border rounded-md min-h-[200px] whitespace-pre-wrap font-mono text-sm text-muted-foreground">
                    {previewCoverLetter.data?.rendered || "Click preview to render template..."}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

// Needed to make it compile with the arbitrary `size={sm as any}` I typed above.
const sm = "sm";
function Badge({ children, variant, className }: any) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}
