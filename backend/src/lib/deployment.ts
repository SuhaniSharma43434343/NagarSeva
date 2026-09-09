import "dotenv/config";
export const production = process.env.NODE_ENV === "production";
export const publicUrl = (process.env.PUBLIC_BACKEND_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/+$/, "");
export const serviceHeaders = process.env.INTERNAL_API_KEY ? { "X-Service-Key": process.env.INTERNAL_API_KEY } : {};
export const modelServiceUrl = (process.env.MODEL_SERVICE_URL || (process.env.MODEL_SERVICE_HOSTPORT ? `http://${process.env.MODEL_SERVICE_HOSTPORT}` : "http://localhost:7860")).replace(/\/+$/, "");
export const sqlAgentUrl = (process.env.SQL_AGENT_URL || (process.env.SQL_AGENT_HOSTPORT ? `http://${process.env.SQL_AGENT_HOSTPORT}` : "http://localhost:5001")).replace(/\/+$/, "");
export const serviceTimeout = Number(process.env.SERVICE_TIMEOUT_MS || 120000);
export function localUploadUrl(path: string): string {
  if (production) throw new Error("Permanent image storage unavailable. Check Cloudinary configuration.");
  return `${publicUrl}/${path.replace(/\\/g, "/").replace(/^\/+/, "")}`;
}
export function validateDeployment() {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  if (production) required.push("CORS_ORIGINS", "INTERNAL_API_KEY", "cloudinary_cloud_name", "cloudinary_api_key", "cloudinary_api_secret");
  if (production && !process.env.MODEL_SERVICE_URL && !process.env.MODEL_SERVICE_HOSTPORT) throw new Error("MODEL_SERVICE_URL is required");
  if (production && !process.env.SQL_AGENT_URL && !process.env.SQL_AGENT_HOSTPORT) throw new Error("SQL_AGENT_URL is required");
  const missing = required.filter(key => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`);
}
