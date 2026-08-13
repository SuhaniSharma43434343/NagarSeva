// Utility helper to extract clean, informative error messages from API responses
export function getApiErrorMessage(error: any, fallbackMessage = "Unable to complete the request. Please try again."): string {
  if (!error) return fallbackMessage;

  // Check if Axios or fetch response contains a specific message from backend
  if (error.response?.data?.message && typeof error.response.data.message === "string") {
    return error.response.data.message;
  }

  if (error.response?.data?.error && typeof error.response.data.error === "string") {
    return error.response.data.error;
  }

  // Network offline / connection refused
  if (error.code === "ERR_NETWORK" || error.message?.includes("Network Error")) {
    return "Unable to connect to server. Please check your network connection and try again.";
  }

  // HTTP status specific fallback
  if (error.response?.status === 409) {
    return "Conflict error: The requested operation conflicts with an existing assignment or record.";
  }

  if (error.response?.status === 403) {
    return "Access denied: You do not have permission to perform this action.";
  }

  if (error.response?.status === 401) {
    return "Session expired or unauthorized. Please log in again.";
  }

  if (error.message && typeof error.message === "string") {
    return error.message;
  }

  return fallbackMessage;
}
