# Hosting Guide: Deploying on aaPanel with PostgreSQL

This guide provides step-by-step instructions for hosting the **Nutrition Consultation ERP** on a VPS running **aaPanel** where other Node.js or PHP sites are already running.

---

## Prerequisites

1. A server with **aaPanel** installed.
2. The following plugins installed inside aaPanel's App Store:
   - **Node.js Version Manager** (or Node Project Manager)
   - **PostgreSQL Manager**
   - **Nginx** (to handle reverse proxying)

---

## Step 1: Create a PostgreSQL Database

1. Open your aaPanel control panel.
2. Go to the **App Store** and open the **PostgreSQL Manager** settings.
3. Click the **Databases** tab and click **Add Database**.
4. Configure the database details:
   - **Database name:** `nutrition_erp`
   - **Username:** `nutrition_user`
   - **Password:** Choose a secure password (e.g., `MySecurePassword123`)
5. Click **Submit**. Record these database credentials for later use.

---

## Step 2: Upload Project Files

1. Compress your project folder on your local machine (excluding `node_modules` and any local `.env` files).
2. In aaPanel, navigate to the **Files** tab.
3. Go to your web directory (typically `/www/wwwroot/`).
4. Create a new directory named `nutrition-erp`.
5. Upload the ZIP file into `/www/wwwroot/nutrition-erp` and decompress it.

---

## Step 3: Configure Environment Variables

1. Go inside the `/www/wwwroot/nutrition-erp` directory using aaPanel Files Manager.
2. Locate the `.env.example` file.
3. Copy or rename it to `.env`.
4. Edit the `.env` file and set the following values:
   ```env
   GEMINI_API_KEY="your-gemini-api-key-here"
   APP_URL="http://yourdomain.com"
   DATABASE_URL="postgresql://nutrition_user:MySecurePassword123@127.0.0.1:5432/nutrition_erp"
   NODE_ENV="production"
   PORT="3009"
   ```
5. Save the file.

---

## Step 4: Add Node.js Project in aaPanel

Since you have other sites running, aaPanel Node Project Manager allows you to run multiple independent Node processes listening on different local ports, using Nginx as a reverse proxy to route domain names to their respective ports.

1. Go to the **Website** tab in aaPanel.
2. Select the **Node Projects** tab at the top.
3. Click **Add Node Project**.
4. Configure the project settings:
   - **Project Directory:** Select `/www/wwwroot/nutrition-erp`
   - **Project Name:** `nutrition-erp`
   - **Node Version:** Choose a version (v18.x or v20.x are recommended)
   - **Run Command:** Set this to:
     ```bash
     npm run build && npm run start
     ```
     *(This builds the Vite frontend and runs `node dist/server.cjs`)*
   - **Start Command Script:** `dist/server.cjs` or keep it automated.
   - **Project Port:** `3009` (Make sure this matches the `PORT` in your `.env`)
   - **Run User:** `www`
   - **Web Service:** **Enable** (this sets up Nginx reverse proxy)
   - **Domain:** Enter your domain name (e.g., `nutrition-erp.yourdomain.com`)
5. Click **Submit**.

aaPanel will automatically:
- Download node dependencies (`npm install`).
- Compile the Vite frontend bundle into the `dist` directory.
- Start the server using PM2 or Node Manager.
- Generate an Nginx configuration mapping your domain (`nutrition-erp.yourdomain.com`) to `http://127.0.0.1:3009`.

---

## Step 5: Port & Firewall Security (Optional)

If aaPanel fails to connect, ensure that port `3009` is open internally (usually blocked from public access, which is fine since Nginx reverse proxy operates locally).
- Go to the aaPanel **Security** tab.
- Port `3009` does **not** need to be opened to the public since Nginx forwards traffic locally.
- Ensure the Nginx service is running.

---

## Troubleshooting

- **Check Logs:** Click on the **Node Projects** list -> **nutrition-erp** -> **Log** to see stdout/stderr outputs.
- **Database Connection Refused:** Ensure the PostgreSQL service is active in aaPanel and you can connect using the credentials locally (from `127.0.0.1`).
- **Nginx Gateway Timeout:** Ensure your Node application didn't crash. Check logs under aaPanel Node Manager.
