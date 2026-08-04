import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useIssues, useEngineers, useWards } from "@/hooks/useMockData";
import { IssueCard } from "@/components/issues/IssueCard";
import { IssueFilters } from "@/components/issues/IssueFilters";
import { AssignEngineerDialog } from "@/components/issues/AssignEngineerDialog";
import { VerifyResolutionDialog } from "@/components/issues/VerifyResolutionDialog";
import type { Issue, IssueType, IssueStatus } from "@/types";
import { AlertTriangle, Download, Trash2, LayoutGrid, List, Sparkles, UserCheck, CheckCircle2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Issues = () => {
  const { data: issues, assignEngineer, verifyResolution, analyzeIssue, deleteIssue, bulkDeleteIssues } = useIssues();
  const { data: engineers } = useEngineers();
  const { data: wards } = useWards();
  const { t } = useTranslation();

  const [filters, setFilters] = useState<{
    wardId: string;
    type: IssueType | "all";
    status: IssueStatus | "all";
    fromDate?: string;
    toDate?: string;
  }>({
    wardId: "all",
    type: "all",
    status: "all",
    fromDate: "",
    toDate: "",
  });

  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filteredIssues =
    issues?.filter((issue) => {
      const matchesWard =
        filters.wardId === "all" || issue.wardId === filters.wardId;
      const matchesType = filters.type === "all" || issue.type === filters.type;
      const matchesStatus =
        filters.status === "all" || issue.status === filters.status;

      const issueDate = new Date(issue.createdAt);
      const matchesFromDate = !filters.fromDate || issueDate >= new Date(filters.fromDate);
      const matchesToDate = !filters.toDate || issueDate <= new Date(filters.toDate + "T23:59:59");

      return matchesWard && matchesType && matchesStatus && matchesFromDate && matchesToDate;
    }) || [];

  const handleAssignClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setAssignDialogOpen(true);
  };

  const handleVerifyClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setVerifyDialogOpen(true);
  };

  const handleAnalyzeClick = async (issue: Issue) => {
    if (analyzeIssue) {
      const res = await analyzeIssue(issue.id);
      if (res) {
        toast.success(`AI Model Analysis completed successfully!`);
      } else {
        toast.error("Failed to run AI Model analysis.");
      }
    }
  };

  const handleDeleteClick = async (issue: Issue) => {
    if (window.confirm("Are you sure you want to delete this issue? This action cannot be undone.")) {
      const success = await deleteIssue(issue.id);
      if (success) {
        toast.success("Issue deleted successfully");
        setSelectedIssueIds((prev) => prev.filter((id) => id !== issue.id));
      } else {
        toast.error("Failed to delete issue");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIssueIds.length === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedIssueIds.length} selected issue(s)? This action cannot be undone.`
      )
    ) {
      setIsBulkDeleting(true);
      try {
        const success = await bulkDeleteIssues(selectedIssueIds);
        if (success) {
          toast.success(`Successfully deleted ${selectedIssueIds.length} issue(s).`);
          setSelectedIssueIds([]);
        } else {
          toast.error("Failed to delete selected issues.");
        }
      } catch (err) {
        toast.error("Error bulk deleting issues.");
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const handleExportCSV = () => {
    if (filteredIssues.length === 0) {
      toast.error("No issues available to export");
      return;
    }
    const headers = ["ID", "Type", "Status", "Ward", "Route", "Latitude", "Longitude", "Created At", "Assigned Engineer"];
    const rows = filteredIssues.map((i) => [
      i.id,
      i.type,
      i.status,
      `"${i.wardName || ""}"`,
      `"${i.routeName || ""}"`,
      i.latitude,
      i.longitude,
      i.createdAt,
      `"${i.assignedEngineerName || "Unassigned"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `NagarSeva_Issues_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredIssues.length} issue(s) to CSV`);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIssueIds(filteredIssues.map((i) => i.id));
    } else {
      setSelectedIssueIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAssignEngineer = (engineerId: string, engineerName: string) => {
    if (selectedIssue) {
      assignEngineer(selectedIssue.id, engineerId, engineerName);
    }
  };

  const handleVerifyResolution = (approved: boolean, feedback?: string) => {
    if (selectedIssue) {
      verifyResolution(selectedIssue.id, approved, feedback);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('issuesPage.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('issuesPage.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="w-4 h-4 mr-1" /> Grid
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("table")}
              >
                <List className="w-4 h-4 mr-1" /> Table
              </Button>
            </div>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Export CSV
            </Button>

            {/* Bulk Delete Button */}
            {selectedIssueIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete ({selectedIssueIds.length})
              </Button>
            )}
          </div>
        </div>

        <IssueFilters
          filters={filters}
          onFiltersChange={setFilters}
          wards={wards || []}
        />

        {/* Grid View */}
        {viewMode === "grid" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onAssignClick={handleAssignClick}
                onVerifyClick={handleVerifyClick}
                onAnalyzeClick={handleAnalyzeClick}
                onDeleteClick={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {/* Table View */}
        {viewMode === "table" && filteredIssues.length > 0 && (
          <div className="rounded-md border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filteredIssues.length > 0 &&
                        selectedIssueIds.length === filteredIssues.length
                      }
                      onCheckedChange={(checked) => handleSelectAll(!!checked)}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ward / Route</TableHead>
                  <TableHead>Assigned Engineer</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIssues.map((issue) => {
                  const isSelected = selectedIssueIds.includes(issue.id);
                  return (
                    <TableRow key={issue.id} className={isSelected ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelect(issue.id)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        <Badge variant="outline" className="uppercase font-mono text-[10px]">
                          {issue.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            issue.status === "RESOLVED"
                              ? "default"
                              : issue.status === "FIXED"
                              ? "secondary"
                              : issue.status === "REJECTED"
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{issue.wardName}</div>
                        <div className="text-xs text-muted-foreground">{issue.routeName}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.assignedEngineerName ? (
                          <span className="font-medium">{issue.assignedEngineerName}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {issue.status === "DETECTED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Assign Engineer"
                              onClick={() => handleAssignClick(issue)}
                            >
                              <UserCheck className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                          {issue.status === "FIXED" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Verify Resolution"
                              onClick={() => handleVerifyClick(issue)}
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Run AI Analysis"
                            onClick={() => handleAnalyzeClick(issue)}
                          >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Issue"
                            onClick={() => handleDeleteClick(issue)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {filteredIssues.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {t('issuesPage.noIssuesFound')}
            </p>
          </div>
        )}

        <AssignEngineerDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          engineers={engineers || []}
          onAssign={handleAssignEngineer}
        />

        <VerifyResolutionDialog
          open={verifyDialogOpen}
          onOpenChange={setVerifyDialogOpen}
          issue={selectedIssue}
          onVerify={handleVerifyResolution}
        />
      </div>
    </DashboardLayout>
  );
};

export default Issues;
