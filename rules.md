# Nginx Server & Backend Routing Specifications

This document outlines the rules, constraints, and architecture of the Nginx server configuration and the corresponding backend implementations for the **MayCore API & Bot backend**.

---

## 📋 Nginx Configuration Reference

The Nginx reverse-proxy is configured as follows:

```nginx
server {
    listen 8443 ssl;
    server_name 13.229.238.234;

    ssl_certificate     /dev/https_config/cert.pem;
    ssl_certificate_key /dev/https_config/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /bot/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🔒 1. SSL/TLS Infrastructure Rules
* **Port Allocation**: The secure Nginx entry point is bound to port `8443` with `ssl` enabled.
* **Domain Restrictions**: The server responds explicitly to the server name `13.229.238.234`.
* **Certificate Paths**:
  * **Certificate File**: `/dev/https_config/cert.pem`
  * **Private Key File**: `/dev/https_config/key.pem`
* **Requirement**: The directories and certificates must be readable by the `nginx` process user (typically `www-data` or `nginx`).

---

## 🗺️ 2. Reverse Proxy & Routing Rules

Nginx handles routing using standard `location` blocks and proxies requests to two separate local backend services.

### A. Location: `/api/` (Rust Actix Web Backend)
* **Proxy Destination**: `http://localhost:3000` (or `127.0.0.1:3000`)
* **URI Preservation**:
  > [!IMPORTANT]
  > Because `proxy_pass http://localhost:3000;` does not have a trailing slash `/` after the host/port, **Nginx does NOT strip the `/api/` prefix** from the URI before passing it to the backend.
  >
  > For example:
  > * `https://13.229.238.234:8443/api/` ➡️ `http://localhost:3000/api/`
  > * `https://13.229.238.234:8443/api/health` ➡️ `http://localhost:3000/api/health`
* **Backend Requirement**: The Rust backend must listen on port `3000` and handle incoming endpoints starting with `/api/`.

### B. Location: `/bot/` (TypeScript Backend)
* **Proxy Destination**: `http://localhost:4000` (or `127.0.0.1:4000`)
* **URI Preservation**:
  > [!IMPORTANT]
  > Because `proxy_pass http://localhost:4000;` does not have a trailing slash `/` after the host/port, **Nginx does NOT strip the `/bot/` prefix** from the URI.
  >
  > For example:
  > * `https://13.229.238.234:8443/bot/` ➡️ `http://localhost:4000/bot/`
  > * `https://13.229.238.234:8443/bot/health` ➡️ `http://localhost:4000/bot/health`
* **Backend Requirement**: 
  > [!NOTE]
  > This service will be built as a separate **TypeScript / Node.js application** (e.g., using Express, Fastify, or NestJS). Any future agent task to build the bot service must bind the application to port `4000` and handle incoming endpoints prefixed with `/bot/`.

### C. Header Propagation
The following headers are forwarded to both backends to preserve request context:
* `Host`: Contains the original host requested by the client (passed via `$host`).
* `X-Real-IP`: Contains the client's real IP address (passed via `$remote_addr`).

---

## ⚡ 3. Rust Backend (API) Setup & Verification
The Rust Actix Web backend is located in this directory (`may_core_api_backend`) and runs on port `3000`.

* **Service Ports**:
  * **API Service (Rust)**: `127.0.0.1:3000`
* **Endpoints**:
  * `GET /api/` - Returns standard Hello World JSON metadata.
  * `GET /api/health` - Status monitoring endpoint.

### Running & Testing the Rust Backend
1. **Start the API server**:
   ```bash
   cargo run
   ```
2. **Verify endpoints**:
   ```bash
   curl http://localhost:3000/api/
   curl http://localhost:3000/api/health
   ```
