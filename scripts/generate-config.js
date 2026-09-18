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

if (!rawBackend.startsWith("http://") && !rawBackend.startsWith("https://")) {
  rawBackend = `http://${rawBackend}`;
}
const backendUrl = rawBackend.replace(/\/+$/, "");

// Formatting target endpoints
const targetNetlifyUrl = backendUrl.endsWith("/api/v1")
  ? `${backendUrl}/:splat`
  : `${backendUrl}/api/v1/:splat`;

const targetVercelUrl = backendUrl.endsWith("/api/v1")
  ? `${backendUrl}/:path*`
  : `${backendUrl}/api/v1/:path*`;

// 1. Generate Netlify _redirects
const redirectsContent = `/api/v1/*  ${targetNetlifyUrl}  200!
/*         /index.html   200
`;

const publicDir = path.join(__dirname, "..", "public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(path.join(publicDir, "_redirects"), redirectsContent);
console.log(`[Config] Generated public/_redirects -> ${targetNetlifyUrl}`);

// 2. Generate vercel.json for Vercel deployment
const vercelConfig = {
  rewrites: [
    {
      source: "/api/v1/:path*",
      destination: targetVercelUrl,
    },
    {
      source: "/(.*)",
      destination: "/index.html",
    },
  ],
};

const rootDir = path.join(__dirname, "..");
fs.writeFileSync(
  path.join(rootDir, "vercel.json"),
  JSON.stringify(vercelConfig, null, 2)
);
console.log(`[Config] Generated vercel.json -> ${targetVercelUrl}`);
