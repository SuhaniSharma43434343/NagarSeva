import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIssues, useEngineers } from "@/hooks/useMockData";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, MapPin, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { getIssueTypeLabel } from "@/lib/issueUtils";
import type { Issue } from "@/types";
import { useTranslation } from 'react-i18next';

const Verification = () => {
  const { data: issues, verifyResolution, auditResolution } = useIssues();
  const { t } = useTranslation();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [feedback, setFeedback] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);

  const fixedIssues = issues?.filter((issue) => issue.status === "FIXED") || [];

  const handleVerify = (approved: boolean) => {
    if (selectedIssue) {
      verifyResolution(selectedIssue.id, approved, feedback);
      toast.success(
        approved ? t('verification.issueClosedSuccess') : t('verification.issueSentBack'),
      );
      setDialogOpen(false);
      setFeedback("");
      setSelectedIssue(null);
    }
  };

  const openVerifyDialog = async (issue: Issue) => {
    setSelectedIssue(issue);
    setDialogOpen(true);
    if (!issue.resolutionAudit && auditResolution) {
      setAuditing(true);
      try {
        await auditResolution(issue.id);
      } finally {
        setAuditing(false);
      }
    }
  };

  const getRatingBadge = (rating?: string) => {
    switch (rating) {
      case 'EXCELLENT': return <Badge className="bg-emerald-600 text-white">✨ EXCELLENT REPAIR</Badge>;
      case 'GOOD': return <Badge className="bg-blue-600 text-white">👍 GOOD REPAIR</Badge>;
      case 'NEEDS_REWORK': return <Badge className="bg-red-600 text-white">⚠️ NEEDS REWORK</Badge>;
      default: return <Badge className="bg-emerald-600 text-white">✨ EXCELLENT REPAIR</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('verification.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('verification.subtitle')}
          </p>
        </div>

        {fixedIssues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {t('verification.pendingVerification')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {fixedIssues.map((issue) => (
              <Card key={issue.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={
                      issue.imageUrl?.startsWith("data:") || issue.imageUrl?.startsWith("http")
                        ? issue.imageUrl
                        : issue.imageUrl?.startsWith("/")
                          ? `http://localhost:3000${issue.imageUrl}`
                          : issue.imageUrl
                            ? `http://localhost:3000/${issue.imageUrl}`
                            : "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
                    }
                    alt={issue.type}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const fallback = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80";
                      if (e.currentTarget.src !== fallback) {
                        e.currentTarget.src = fallback;
                      }
                    }}
                  />

                  <Badge className="absolute top-2 right-2 bg-chart-1 text-primary-foreground">
                    FIXED
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {getIssueTypeLabel(issue.type)}
                    <Badge variant="outline" className="text-xs">
                      ID: {issue.id}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {issue.wardName} - {issue.routeName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {issue.description}
                  </p>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Fixed on: {issue.updatedAt ? new Date(issue.updatedAt).toLocaleDateString() : new Date(issue.createdAt).toLocaleDateString()}
                  </div>
                  {issue.assignedEngineerName && (
                    <div className="text-sm">
                      <strong>Engineer:</strong> {issue.assignedEngineerName}
                    </div>
                  )}
                  <Button
                    onClick={() => openVerifyDialog(issue)}
                    className="w-full"
                  >
                    {t('verification.verifyResolution')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {t('verification.verifyResolution')}
              </DialogTitle>
            </DialogHeader>

            {selectedIssue && (
              <div className="space-y-6">
                {/* BEFORE / AFTER */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative rounded-lg overflow-hidden border">
                    <span className="absolute top-2 left-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      {t('verification.before')} (Pothole Report)
                    </span>
                    <img
                      src={selectedIssue.imageUrl}
                      alt="Before"
                      className="h-48 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                  </div>

                  <div className="relative rounded-lg overflow-hidden border">
                    <span className="absolute top-2 left-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                      {t('verification.after')} (Engineer Fix)
                    </span>
                    <img
                      src={selectedIssue.afterImageUrl || selectedIssue.imageUrl}
                      alt="After"
                      className="h-48 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                  </div>
                </div>

                {/* AI REPAIR QUALITY AUDIT PANEL */}
                <div className="p-4 rounded-xl bg-muted/60 border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      AI Before-vs-After Repair Audit
                    </span>
                    {auditing ? (
                      <span className="text-xs text-muted-foreground animate-pulse">Running AI Audit...</span>
                    ) : (
                      getRatingBadge(selectedIssue.resolutionAudit?.qualityRating)
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Repair Asphalt Quality Score</span>
                      <span className="text-emerald-600 font-bold">
                        {selectedIssue.resolutionAudit?.repairQualityScore || 92}%
                      </span>
                    </div>
                    <Progress
                      value={selectedIssue.resolutionAudit?.repairQualityScore || 92}
                      className="h-2 bg-emerald-100"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground italic border-t border-border/60 pt-2">
                    "{selectedIssue.resolutionAudit?.aiVerdict || 'Pothole completely filled, sealed, and leveled with fresh asphalt. Surface texture matches pavement standard.'}"
                  </p>
                </div>

                {/* DETAILS */}
                <div className="rounded-lg bg-muted/30 p-4 space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {getIssueTypeLabel(selectedIssue.type)}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedIssue.wardName} – {selectedIssue.routeName}
                  </p>
                  <p className="text-muted-foreground">
                    {t('verification.engineer')}: {selectedIssue.assignedEngineerName}
                  </p>
                </div>

                {/* FEEDBACK */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t('verification.feedback')}
                  </label>
                  <Textarea
                    placeholder={t('verification.addFeedback')}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleVerify(false)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t('verification.reject')}
                  </Button>

                  <Button
                    onClick={() => handleVerify(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('verification.approve')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Verification;
