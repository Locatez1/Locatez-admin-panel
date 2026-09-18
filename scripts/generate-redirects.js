import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get backend URL from environment variables (BACKEND_URL, VITE_BACKEND_URL, or BACKEND_IP)
let rawBackend =
  process.env.BACKEND_URL ||
  process.env.VITE_BACKEND_URL ||
  process.env.BACKEND_IP ||
  "http://13.205.128.239";

// Clean up formatting
if (!rawBackend.startsWith("http://") && !rawBackend.startsWith("https://")) {
  rawBackend = `http://${rawBackend}`;
}
const backendUrl = rawBackend.replace(/\/+$/, "");

// Check if backend URL already ends with /api/v1
const targetUrl = backendUrl.endsWith("/api/v1")
  ? `${backendUrl}/:splat`
  : `${backendUrl}/api/v1/:splat`;

const redirectsContent = `/api/v1/*  ${targetUrl}  200!
/*         /index.html   200
`;

const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, "_redirects"), redirectsContent);
console.log(`[Build] Generated public/_redirects pointing to: ${targetUrl}`);
