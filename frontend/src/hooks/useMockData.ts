import { useAtom } from "jotai";
import { useCallback, useEffect } from "react";
import {
  employeesAtom,
  employeesLoadingAtom,
  employeesErrorAtom,
  surveyorsAtom,
  engineersAtom,
  issuesAtom,
  issuesLoadingAtom,
  issuesErrorAtom,
  routesAtom,
  routesLoadingAtom,
  routesErrorAtom,
  wardsAtom,
  wardsLoadingAtom,
  wardsErrorAtom,
  dashboardStatsAtom,
} from "@/atoms/dataAtoms";
import { employeeApi, issueApi, routeApi, wardApi } from "@/lib/api";
import type { Employee, Issue, Route, IssueStatus } from "@/types";

// Dashboard Stats Hook
export function useDashboardStats() {
  const [stats] = useAtom(dashboardStatsAtom);
  const { data: employees, isLoading: empLoading } = useEmployees();
  const { data: issues, isLoading: issueLoading } = useIssues();
  const { data: routes, isLoading: routeLoading } = useRoutes();
  const { data: wards, isLoading: wardLoading } = useWards();

  return {
    data: stats,
    isLoading: empLoading || issueLoading || routeLoading || wardLoading,
  };
}

// Employees Hook
export function useEmployees() {
  const [employees, setEmployees] = useAtom(employeesAtom);
  const [isLoading, setIsLoading] = useAtom(employeesLoadingAtom);
  const [error, setError] = useAtom(employeesErrorAtom);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeApi.getAll();
      if (response && response.success) {
        setEmployees(response.data || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch employees");
    } finally {
      setIsLoading(false);
    }
  }, [setEmployees, setIsLoading, setError]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const addEmployee = useCallback(
    async (employee: {
      name: string;
      email: string;
      role: "SURVEYOR" | "ENGINEER";
      password: string;
      wardId: string;
    }) => {
      try {
        const response = await employeeApi.create(employee);
        if (response.success) {
          setEmployees((prev) => [...prev, response.data]);
          return response.data;
        }
      } catch (err: any) {
        console.error("Failed to add employee:", err);
      }
      return null;
    },
    [setEmployees]
  );

  const updateEmployee = useCallback(
    async (employeeId: string, data: { name?: string; email?: string; role?: string; wardId?: string }) => {
      try {
        const response = await employeeApi.update(employeeId, data);
        if (response.success) {
          setEmployees((prev) =>
            prev.map((emp) => (emp.id === employeeId ? { ...emp, ...response.data } : emp))
          );
          return true;
        }
      } catch (err: any) {
        console.error("Failed to update employee:", err);
      }
      return false;
    },
    [setEmployees]
  );

  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      try {
        const response = await employeeApi.delete(employeeId);
        if (response.success) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
          return true;
        }
      } catch (err: any) {
        console.error("Failed to delete employee:", err);
      }
      return false;
    },
    [setEmployees]
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await employeeApi.getAll();
      if (response.success) {
        setEmployees(response.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch employees");
    } finally {
      setIsLoading(false);
    }
  }, [setEmployees, setIsLoading, setError]);

  return { data: employees, isLoading, error, addEmployee, updateEmployee, deleteEmployee, refetch };
}

// Wards Hook
export function useWards() {
  const [wards, setWards] = useAtom(wardsAtom);
  const [isLoading, setIsLoading] = useAtom(wardsLoadingAtom);
  const [error, setError] = useAtom(wardsErrorAtom);

  const fetchWards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wardApi.getAll();
      if (response && response.success) {
        // Map backend data to frontend Ward type
        const mappedWards = (response.data || []).map((ward: any) => ({
          id: ward.id,
          name: ward.name,
          code: `W${ward.number?.toString().padStart(2, "0") || "00"}`,
        }));
        setWards(mappedWards);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch wards");
    } finally {
      setIsLoading(false);
    }
  }, [setWards, setIsLoading, setError]);

  useEffect(() => {
    fetchWards();
  }, []);

  return { data: wards, isLoading, error };
}

// Routes Hook
export function useRoutes() {
  const [routes, setRoutes] = useAtom(routesAtom);
  const [isLoading, setIsLoading] = useAtom(routesLoadingAtom);
  const [error, setError] = useAtom(routesErrorAtom);

  const fetchRoutes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await routeApi.getAll();
      if (response && response.success) {
        setRoutes((response.data || []) as Route[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch routes");
    } finally {
      setIsLoading(false);
    }
  }, [setRoutes, setIsLoading, setError]);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const assignSurveyor = useCallback(
    async (routeId: string, surveyorId: string, surveyorName: string) => {
      try {
        const response = await routeApi.assignSurveyor(surveyorId, routeId);
        if (response.success) {
          // Update local state optimistically
          setRoutes((prev) =>
            prev.map((r) =>
              r.id === routeId
                ? {
                    ...r,
                    assignedSurveyorId: surveyorId,
                    assignedSurveyorName: surveyorName,
                    status: "ASSIGNED" as const,
                  }
                : r
            )
          );
          return true;
        }
      } catch (err: any) {
        console.error("Failed to assign surveyor:", err);
      }
      return false;
    },
    [setRoutes]
  );

  const createRoute = useCallback(
    async (payload: { name: string; wardId: string; distance?: number; startLat?: number; startLon?: number; endLat?: number; endLon?: number }) => {
      try {
        const response = await routeApi.createRoute(payload);
        if (response.success && response.data) {
          setRoutes((prev) => [response.data as Route, ...prev]);
          return response.data;
        }
      } catch (err: any) {
        console.error("Failed to create route:", err);
      }
      return null;
    },
    [setRoutes]
  );

  const updateRoute = useCallback(
    async (routeId: string, payload: { name?: string; wardId?: string; distance?: number; startLat?: number; startLon?: number; endLat?: number; endLon?: number }) => {
      try {
        const response = await routeApi.update(routeId, payload);
        if (response.success && response.data) {
          setRoutes((prev) =>
            prev.map((r) => (r.id === routeId ? { ...r, ...response.data } as Route : r))
          );
          return true;
        }
      } catch (err: any) {
        console.error("Failed to update route:", err);
      }
      return false;
    },
    [setRoutes]
  );

  const deleteRoute = useCallback(
    async (routeId: string) => {
      try {
        const response = await routeApi.delete(routeId);
        if (response.success) {
          setRoutes((prev) => prev.filter((r) => r.id !== routeId));
          return true;
        }
      } catch (err: any) {
        console.error("Failed to delete route:", err);
      }
      return false;
    },
    [setRoutes]
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await routeApi.getAll();
      if (response && response.success) {
        setRoutes((response.data || []) as Route[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch routes");
    } finally {
      setIsLoading(false);
    }
  }, [setRoutes, setIsLoading, setError]);

  return {
    data: routes,
    isLoading,
    error,
    assignSurveyor,
    createRoute,
    updateRoute,
    deleteRoute,
    refetch,
  };
}

// Issues Hook
const previousIssueIdsRef = { current: new Set<string>() };

const playNotificationChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioCtx = new AudioCtx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.warn("Audio chime warning:", e);
  }
};

export function useIssues() {
  const [issues, setIssues] = useAtom(issuesAtom);
  const [isLoading, setIsLoading] = useAtom(issuesLoadingAtom);
  const [error, setError] = useAtom(issuesErrorAtom);

  const fetchIssues = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await issueApi.getAll();
      if (response && response.success && Array.isArray(response.data)) {
        const fetchedIssues = response.data as Issue[];

        // Check for new detections reported by surveyor app
        if (previousIssueIdsRef.current.size > 0) {
          const newDetections = fetchedIssues.filter((i) => !previousIssueIdsRef.current.has(i.id));
          if (newDetections.length > 0) {
            playNotificationChime();
            toast.error(`🚨 Live Alert: ${newDetections.length} New Pothole Detection(s) Reported!`, {
              description: `Location: ${newDetections[0].wardName || "City Patrol"} • ${newDetections[0].routeName || "Survey Route"}`,
              duration: 6000,
            });
          }
        }

        previousIssueIdsRef.current = new Set(fetchedIssues.map((i) => i.id));
        setIssues(fetchedIssues);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch issues");
    } finally {
      setIsLoading(false);
    }
  }, [setIssues, setIsLoading, setError]);

  useEffect(() => {
    fetchIssues();
    const interval = setInterval(fetchIssues, 5000);
    return () => clearInterval(interval);
  }, [fetchIssues]);

  const assignEngineer = useCallback(
    async (issueId: string, engineerId: string, engineerName: string) => {
      try {
        const response = await issueApi.assignEngineer(issueId, engineerId);
        if (response.success) {
          // Update local state optimistically
          setIssues((prev) =>
            prev.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    assignedEngineerId: engineerId,
                    assignedEngineerName: engineerName,
                    status: "ASSIGNED" as IssueStatus,
                  }
                : i
            )
          );
          return true;
        }
      } catch (err: any) {
        console.error("Failed to assign engineer:", err);
      }
      return false;
    },
    [setIssues]
  );

  const verifyResolution = useCallback(
    async (issueId: string, approved: boolean, feedback?: string) => {
      try {
        const response = await issueApi.verifyResolution(
          issueId,
          approved ? "APPROVED" : "REJECTED",
          feedback
        );
        if (response.success) {
          // Update local state
          setIssues((prev) =>
            prev.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    status: (approved ? "RESOLVED" : "REJECTED") as IssueStatus,
                    feedback,
                  }
                : i
            )
          );
          return true;
        }
      } catch (err: any) {
        console.error("Failed to verify resolution:", err);
      }
      return false;
    },
    [setIssues]
  );

  const analyzeIssue = useCallback(
    async (issueId: string) => {
      try {
        const response = await issueApi.analyzeIssue(issueId);
        if (response && response.success && response.data) {
          setIssues((prev) =>
            prev.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    analysis: response.data,
                  }
                : i
            )
          );
          return response.data;
        }
      } catch (err: any) {
        console.error("Failed to analyze issue:", err);
      }
      return null;
    },
    [setIssues]
  );

  const auditResolution = useCallback(
    async (issueId: string) => {
      try {
        const response = await issueApi.auditResolution(issueId);
        if (response && response.success && response.data) {
          setIssues((prev) =>
            prev.map((i) =>
              i.id === issueId
                ? {
                    ...i,
                    resolutionAudit: response.data,
                  }
                : i
            )
          );
          return response.data;
        }
      } catch (err: any) {
        console.error("Failed to audit resolution:", err);
      }
      return null;
    },
    [setIssues]
  );

  const deleteIssue = useCallback(
    async (issueId: string) => {
      try {
        const response = await issueApi.delete(issueId);
        if (response && response.success) {
          setIssues((prev) => prev.filter((i) => i.id !== issueId));
          return true;
        }
      } catch (err: any) {
        console.error("Failed to delete issue:", err);
      }
      return false;
    },
    [setIssues]
  );

  const bulkDeleteIssues = useCallback(
    async (issueIds: string[]) => {
      try {
        const response = await issueApi.bulkDelete(issueIds);
        if (response && response.success) {
          setIssues((prev) => prev.filter((i) => !issueIds.includes(i.id)));
          return true;
        }
      } catch (err: any) {
        console.error("Failed to bulk delete issues:", err);
      }
      return false;
    },
    [setIssues]
  );

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await issueApi.getAll();
      if (response.success) {
        setIssues(response.data as Issue[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch issues");
    } finally {
      setIsLoading(false);
    }
  }, [setIssues, setIsLoading, setError]);

  return {
    data: issues,
    isLoading,
    error,
    assignEngineer,
    verifyResolution,
    analyzeIssue,
    auditResolution,
    deleteIssue,
    bulkDeleteIssues,
    refetch,
  };
}

// Engineers Hook (derived from employees)
export function useEngineers() {
  const [engineers] = useAtom(engineersAtom);
  const { isLoading, error } = useEmployees();

  return { data: engineers, isLoading, error };
}

// Surveyors Hook (derived from employees)
export function useSurveyors() {
  const [surveyors] = useAtom(surveyorsAtom);
  const { isLoading, error } = useEmployees();

  return { data: surveyors, isLoading, error };
}
