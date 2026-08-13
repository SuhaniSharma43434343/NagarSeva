// Mobile helper utility to extract clean error messages from API calls
export function getMobileErrorMessage(error: any, fallbackMessage = 'Unable to complete request. Please check connection and try again.'): string {
    if (!error) return fallbackMessage;

    if (error.response?.data?.message && typeof error.response.data.message === 'string') {
        return error.response.data.message;
    }

    if (error.response?.data?.error && typeof error.response.data.error === 'string') {
        return error.response.data.error;
    }

    if (error.message && typeof error.message === 'string') {
        if (error.message.includes('Network request failed') || error.message.includes('Network Error')) {
            return 'Unable to connect to server. Please check your network connection.';
        }
        return error.message;
    }

    return fallbackMessage;
}
