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
import { getApiErrorMessage } from "@/lib/apiUtils";
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
        if (response && response.success) {
          setEmployees((prev) => [...prev, response.data]);
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to add employee" };
      } catch (err: any) {
        console.error("Failed to add employee:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to add employee") };
      }
    },
    [setEmployees]
  );

  const updateEmployee = useCallback(
    async (employeeId: string, data: { name?: string; email?: string; role?: string; wardId?: string }) => {
      try {
        const response = await employeeApi.update(employeeId, data);
        if (response && response.success) {
          setEmployees((prev) =>
            prev.map((emp) => (emp.id === employeeId ? { ...emp, ...response.data } : emp))
          );
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to update employee" };
      } catch (err: any) {
        console.error("Failed to update employee:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to update employee") };
      }
    },
    [setEmployees]
  );

  const deleteEmployee = useCallback(
    async (employeeId: string) => {
      try {
        const response = await employeeApi.delete(employeeId);
        if (response && response.success) {
          setEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
          return { success: true, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to delete employee" };
      } catch (err: any) {
        console.error("Failed to delete employee:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to delete employee") };
      }
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
          return { success: true, message: response.message };
        }
        return { success: false, message: response.message || "Failed to assign route." };
      } catch (err: any) {
        console.error("Failed to assign surveyor:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to assign route.";
        return { success: false, message: errorMsg };
      }
    },
    [setRoutes]
  );

  const createRoute = useCallback(
    async (payload: { name: string; wardId: string; distance?: number; startLat?: number; startLon?: number; endLat?: number; endLon?: number }) => {
      try {
        const response = await routeApi.createRoute(payload);
        if (response && response.success && response.data) {
          setRoutes((prev) => [response.data as Route, ...prev]);
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to create route" };
      } catch (err: any) {
        console.error("Failed to create route:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to create route") };
      }
    },
    [setRoutes]
  );

  const updateRoute = useCallback(
    async (routeId: string, payload: { name?: string; wardId?: string; distance?: number; startLat?: number; startLon?: number; endLat?: number; endLon?: number }) => {
      try {
        const response = await routeApi.update(routeId, payload);
        if (response && response.success && response.data) {
          setRoutes((prev) =>
            prev.map((r) => (r.id === routeId ? { ...r, ...response.data } as Route : r))
          );
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to update route" };
      } catch (err: any) {
        console.error("Failed to update route:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to update route") };
      }
    },
    [setRoutes]
  );

  const deleteRoute = useCallback(
    async (routeId: string) => {
      try {
        const response = await routeApi.delete(routeId);
        if (response && response.success) {
          setRoutes((prev) => prev.filter((r) => r.id !== routeId));
          return { success: true, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to delete route" };
      } catch (err: any) {
        console.error("Failed to delete route:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to delete route") };
      }
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

    // Poll every 5s only when the browser tab is visible to avoid unnecessary background requests
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchIssues();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchIssues();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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
          return { success: true, message: response.message };
        }
        return { success: false, message: response.message || "Failed to assign engineer." };
      } catch (err: any) {
        console.error("Failed to assign engineer:", err);
        const errorMsg = err.response?.data?.message || err.message || "Failed to assign engineer.";
        return { success: false, message: errorMsg };
      }
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
        if (response && response.success) {
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
          return { success: true, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to verify resolution" };
      } catch (err: any) {
        console.error("Failed to verify resolution:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to verify resolution") };
      }
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
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to analyze issue" };
      } catch (err: any) {
        console.error("Failed to analyze issue:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to analyze issue") };
      }
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
          return { success: true, data: response.data, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to audit resolution" };
      } catch (err: any) {
        console.error("Failed to audit resolution:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to audit resolution") };
      }
    },
    [setIssues]
  );

  const deleteIssue = useCallback(
    async (issueId: string) => {
      try {
        const response = await issueApi.delete(issueId);
        if (response && response.success) {
          previousIssueIdsRef.current.delete(issueId);
          setIssues((prev) => prev.filter((i) => i.id !== issueId));
          return { success: true, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to delete issue" };
      } catch (err: any) {
        console.error("Failed to delete issue:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to delete issue") };
      }
    },
    [setIssues]
  );

  const bulkDeleteIssues = useCallback(
    async (issueIds: string[]) => {
      try {
        const response = await issueApi.bulkDelete(issueIds);
        if (response && response.success) {
          issueIds.forEach((id) => previousIssueIdsRef.current.delete(id));
          setIssues((prev) => prev.filter((i) => !issueIds.includes(i.id)));
          return { success: true, message: response.message };
        }
        return { success: false, message: response?.message || "Failed to bulk delete issues" };
      } catch (err: any) {
        console.error("Failed to bulk delete issues:", err);
        return { success: false, message: getApiErrorMessage(err, "Failed to bulk delete issues") };
      }
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
