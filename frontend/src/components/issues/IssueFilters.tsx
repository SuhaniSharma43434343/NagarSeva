import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Ward, IssueType, IssueStatus } from "@/types";
import { useTranslation } from 'react-i18next';

interface IssueFiltersProps {
  filters: {
    wardId: string;
    type: IssueType | "all";
    status: IssueStatus | "all";
    fromDate?: string;
    toDate?: string;
  };
  onFiltersChange: (filters: {
    wardId: string;
    type: IssueType | "all";
    status: IssueStatus | "all";
    fromDate?: string;
    toDate?: string;
  }) => void;
  wards: Ward[];
}


export const IssueFilters = ({
  filters,
  onFiltersChange,
  wards,
}: IssueFiltersProps) => {
  const { t } = useTranslation();

  const issueTypes: { value: IssueType; labelKey: string }[] = [
    { value: "POTHOLE", labelKey: "issues.pothole" },
    { value: "GARBAGE", labelKey: "issues.garbage" },
  ];

  const issueStatuses: { value: IssueStatus; labelKey: string }[] = [
    { value: "DETECTED", labelKey: "issues.detected" },
    { value: "ASSIGNED", labelKey: "issues.assigned" },
    { value: "IN_PROGRESS", labelKey: "issues.inProgress" },
    { value: "FIXED", labelKey: "issues.fixed" },
    { value: "RESOLVED", labelKey: "issues.resolved" },
    { value: "REJECTED", labelKey: "issues.rejected" },
  ];
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full md:w-auto">
            <Select
              value={filters.wardId}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, wardId: value })
              }
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t('routesPage.filterByWard')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mapView.allWards')}</SelectItem>
                {wards.map((ward) => (
                  <SelectItem key={ward.id} value={ward.id}>
                    {ward.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.type}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, type: value as IssueType | "all" })
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mapView.allTypes')}</SelectItem>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(type.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value as IssueStatus | "all",
                })
              }
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('mapView.allStatuses')}</SelectItem>
                {issueStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {t(status.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">From:</span>
              <input
                type="date"
                value={filters.fromDate || ""}
                onChange={(e) => onFiltersChange({ ...filters, fromDate: e.target.value })}
                className="h-9 px-2 text-xs rounded-md border border-input bg-background font-mono"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">To:</span>
              <input
                type="date"
                value={filters.toDate || ""}
                onChange={(e) => onFiltersChange({ ...filters, toDate: e.target.value })}
                className="h-9 px-2 text-xs rounded-md border border-input bg-background font-mono"
              />
            </div>
            {(filters.fromDate || filters.toDate) && (
              <button
                onClick={() => onFiltersChange({ ...filters, fromDate: "", toDate: "" })}
                className="text-xs text-muted-foreground hover:text-foreground underline px-1"
              >
                Clear Dates
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
