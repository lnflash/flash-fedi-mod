const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  console.log("Setting up proxy middleware for Flash GraphQL API...");

  // Proxy for GraphQL endpoint (main API)
  app.use(
    "/graphql",
    createProxyMiddleware({
      target: "https://api.flashapp.me",
      changeOrigin: true,
      secure: true,
      logLevel: "debug",
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying GraphQL request:", req.method, req.path);
        console.log("Request headers:", req.headers);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log("GraphQL proxy response status:", proxyRes.statusCode);
      },
      onError: (err, req, res) => {
        console.error("GraphQL proxy error:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "GraphQL proxy error occurred" }));
      },
    })
  );

  // Proxy for auth endpoints (if they exist at root level)
  app.use(
    "/auth",
    createProxyMiddleware({
      target: "https://api.flashapp.me",
      changeOrigin: true,
      secure: true,
      logLevel: "debug",
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying auth request:", req.method, req.path);
        console.log("Request headers:", req.headers);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log("Auth proxy response status:", proxyRes.statusCode);
      },
      onError: (err, req, res) => {
        console.error("Auth proxy error:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Auth proxy error occurred" }));
      },
    })
  );

  // Proxy for flash-specific endpoints (if they exist at root level)
  app.use(
    "/flash",
    createProxyMiddleware({
      target: "https://api.flashapp.me",
      changeOrigin: true,
      secure: true,
      logLevel: "debug",
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying flash request:", req.method, req.path);
        console.log("Request headers:", req.headers);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log("Flash proxy response status:", proxyRes.statusCode);
      },
      onError: (err, req, res) => {
        console.error("Flash proxy error:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Flash proxy error occurred" }));
      },
    })
  );

  // Health check endpoint
  app.use(
    "/health",
    createProxyMiddleware({
      target: "https://api.flashapp.me",
      changeOrigin: true,
      secure: true,
      logLevel: "debug",
      onProxyReq: (proxyReq, req, res) => {
        console.log("Proxying health check request:", req.method, req.path);
      },
      onError: (err, req, res) => {
        console.error("Health check proxy error:", err);
        res.writeHead(500, {
          "Content-Type": "application/json",
        });
        res.end(JSON.stringify({ error: "Health check proxy error occurred" }));
      },
    })
  );

  console.log("Proxy middleware setup complete for Flash GraphQL API");
};
