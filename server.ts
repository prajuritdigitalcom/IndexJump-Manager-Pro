/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import axios, { AxiosError } from "axios";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API Proxy Route to IndexJump
  // This route intercepts IndexJump API requests, appends correct tokens, avoids CORS issues, and handles custom errors.
  app.all("/api/proxy/*", async (req, res) => {
    const subPath = req.params[0]; // e.g. "balance" or "index" or "index/bulk"
    const method = req.method;
    const token = req.headers["x-api-token"] || req.query.token;
    const targetBaseUrl = req.headers["x-target-base-url"] || "https://api.indexjump.com";
    
    // Extract query parameters, removing custom proxy headers
    const queryParams = { ...req.query };
    delete queryParams.token;

    // Log requests on server for easier debugging
    console.log(`[Proxy Request] ${method} /api/proxy/${subPath} targeting ${targetBaseUrl}/${subPath}`);

    // Elegant simulated fallback for mock tokens or demo testing
    const stringToken = String(token || "");
    if (stringToken.startsWith("mock_") || stringToken === "demo" || stringToken === "TEST_TOKEN") {
      // Simulate real-world network latency (300ms - 800ms)
      await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 500));

      if (subPath === "balance") {
        if (stringToken === "mock_invalid" || stringToken === "mock_expired") {
          return res.status(401).json({ error: "Invalid API Token", code: 401 });
        }
        if (stringToken === "mock_empty") {
          return res.json({ balance: 0, status: "empty", worker_health: "healthy" });
        }
        if (stringToken === "mock_ratelimit") {
          return res.status(429).json({ error: "Rate limit exceeded. Try again later.", code: 429 });
        }
        if (stringToken === "mock_offline") {
          return res.status(503).json({ error: "Service temporarily unavailable", code: 503 });
        }

        // Default happy path mock token balance based on its suffix or random
        let balance = 1250;
        if (stringToken.includes("_")) {
          const parts = stringToken.split("_");
          const customBal = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(customBal)) balance = customBal;
        } else {
          balance = 1000 + Math.floor(Math.random() * 5000);
        }

        return res.json({
          balance,
          status: "ready",
          worker_health: "healthy",
          health_score: 98,
          provider: "IndexJump",
        });
      }

      if (subPath === "index") {
        const targetUrl = req.query.url || req.body.url;
        const bot = req.query.bot || req.body.bot || "GoogleBot";
        
        if (!targetUrl) {
          return res.status(400).json({ error: "URL parameter is required", code: 400 });
        }

        // Randomly simulate errors based on special tokens
        if (stringToken === "mock_unstable" && Math.random() < 0.4) {
          const errors = [
            { status: 500, error: "Internal Server Error" },
            { status: 429, error: "Rate limit reached" },
            { status: 400, error: "Malformed URL" },
          ];
          const selected = errors[Math.floor(Math.random() * errors.length)];
          return res.status(selected.status).json({ error: selected.error, code: selected.status });
        }

        // 95% success rate for default mocks
        const isSuccess = Math.random() < 0.95;
        if (isSuccess) {
          return res.json({
            success: true,
            url: targetUrl,
            bot,
            job_id: `job_${Math.random().toString(36).substring(2, 11)}`,
            message: "URL queued successfully for indexing",
            timestamp: new Date().toISOString(),
          });
        } else {
          return res.status(500).json({
            success: false,
            url: targetUrl,
            error: "Temporary IndexJump indexing node timeout",
            code: 500,
          });
        }
      }

      if (subPath === "index/bulk") {
        const urls = req.body.urls || [];
        const bot = req.body.bot || "GoogleBot";

        if (!urls.length) {
          return res.status(400).json({ error: "At least one URL must be specified", code: 400 });
        }

        // Simple bulk submission simulator
        const results = urls.map((u: string) => ({
          url: u,
          success: Math.random() < 0.96,
          message: "Processed",
        }));

        return res.json({
          success: true,
          processed_count: urls.length,
          results,
          timestamp: new Date().toISOString(),
        });
      }

      if (subPath === "index/status") {
        return res.json({
          status: "completed",
          progress: 100,
          submitted: 1,
          indexed_estimated: true,
        });
      }

      return res.status(404).json({ error: "Endpoint not found in simulator", code: 404 });
    }

    // REAL REQUEST FORWARDING TO INDEXJUMP API (OR USER DEFINED API)
    try {
      const cleanedBaseUrl = String(targetBaseUrl).replace(/\/$/, "");
      const fullUrl = `${cleanedBaseUrl}/${subPath}`;

      // Build headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-api-key"] = String(token);
        headers["x-api-token"] = String(token);
        // Ensure token is passed in query parameters as required by IndexJump API
        queryParams.token = String(token);
      }

      const response = await axios({
        method,
        url: fullUrl,
        params: queryParams,
        data: req.body,
        headers,
        timeout: parseInt(String(req.headers["x-request-timeout"]), 10) || 10000,
      });

      return res.status(response.status).json(response.data);
    } catch (err: any) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status || 500;
      const data: any = axiosErr.response?.data || { error: axiosErr.message || "Unknown proxy error" };
      console.error(`[Proxy Error] Forwarding failed with status ${status}:`, data);
      return res.status(status).json(data);
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "IndexJump Manager Pro Proxy" });
  });

  // Vite development vs production asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware mounted for development mode.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static build from 'dist/' in production mode.");
  }

  // Bind to port 3000 and host 0.0.0.0
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
