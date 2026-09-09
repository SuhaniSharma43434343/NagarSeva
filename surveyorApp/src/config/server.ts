// Set this to the deployed HTTPS backend origin before building a release.
// Keep the /api suffix here. No database credentials or service keys belong in the app.
const PRODUCTION_API_URL = "";
export const BASE_URL = __DEV__ ? "http://localhost:3000/api" : PRODUCTION_API_URL;
if (!__DEV__ && !/^https:\/\/[^/]+\/api$/.test(BASE_URL)) {
    throw new Error("Set PRODUCTION_API_URL in src/config/server.ts before building a release.");
}
