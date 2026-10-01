# MapRank Agency — Complete Online Deployment Guide

This guide provides step-by-step instructions to deploy the entire MapRank system online using:
1. **Frontend** → Netlify (Free global CDN hosting)
2. **Backend API** → Render (Free Node.js Web Service)
3. **Database** → TiDB Serverless or Railway (Free MySQL Cloud Hosting)
4. **Email Alerts** → Gmail SMTP with App Password (Delivers to `abbasarsalan462@gmail.com`)

---

## Part 1: Setting Up the Cloud MySQL Database (Free)

Netlify is a static hosting platform and cannot run a MySQL server directly. You will host the database on a free cloud MySQL provider.

### Option A: TiDB Serverless (Recommended — 100% Free Forever)
1. Go to [https://tidbcloud.com](https://tidbcloud.com) and sign up for a free account.
2. Click **Create Cluster** and select **Serverless (Free)**.
3. Once created, click **Connect**.
4. Choose **General** connection to view your credentials:
   - Host (e.g., `gateway01.us-east-1.prod.aws.tidbcloud.com`)
   - Port (e.g., `4000`)
   - User (e.g., `xxxxx.root`)
   - Password (your generated password)
   - Database name (e.g., `maprank_db`)
5. In the TiDB Cloud web console, open the **SQL Editor**, paste the contents of `backend/database/schema.sql`, and click **Run**. This will create the `inquiries` and `admins` tables.

---

## Part 2: Deploying the Backend API to Render (Free)

1. Push your project or the `backend/` folder to GitHub (you can create a repository named `maprank-agency`).
2. Go to [https://render.com](https://render.com) and sign in.
3. Click **New +** and select **Web Service**.
4. Connect your GitHub repository.
5. Configure the service settings:
   - **Name:** `maprank-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/server.js`
   - **Plan:** `Free`
6. Click **Advanced** -> **Add Environment Variable** and enter the following keys from your `.env`:
   - `NODE_ENV`: `production`
   - `PORT`: `5000`
   - `DB_HOST`: *(Your TiDB/MySQL Host)*
   - `DB_PORT`: *(Your TiDB/MySQL Port, e.g. 4000 or 3306)*
   - `DB_USER`: *(Your TiDB/MySQL Username)*
   - `DB_PASSWORD`: *(Your TiDB/MySQL Password)*
   - `DB_NAME`: `maprank_db`
   - `JWT_SECRET`: *(A long secure random string)*
   - `DEFAULT_ADMIN_USER`: `arsalan`
   - `DEFAULT_ADMIN_PASSWORD`: `MapRank2026!`
   - `NOTIFICATION_EMAIL`: `abbasarsalan462@gmail.com`
   - `SMTP_HOST`: `smtp.gmail.com`
   - `SMTP_PORT`: `465`
   - `SMTP_USER`: `abbasarsalan462@gmail.com`
   - `SMTP_PASS`: *(Your Google App Password — see Part 4 below)*
   - `CORS_ORIGIN`: `*`
7. Click **Create Web Service**.
8. Once deployed, Render will provide your public backend URL (e.g., `https://maprank-api.onrender.com`).
   - Test it by visiting: `https://maprank-api.onrender.com/api/health`

---

## Part 3: Deploying the Frontend to Netlify

You can deploy the `frontend/` folder to Netlify in 2 minutes:

### Method 1: Instant Drag-and-Drop (No Git Required)
1. Go to [https://app.netlify.com](https://app.netlify.com) and sign in.
2. In your Netlify team dashboard, go to the **Sites** tab.
3. Locate the **"Drag & drop your site output folder here"** area.
4. Drag the entire `frontend` folder from your computer:
   `c:\Users\fattani computers\Desktop\portfolio\frontend`
   and drop it into the Netlify window.
5. Netlify will deploy your site in seconds and assign you a free URL (e.g., `https://maprank-agency.netlify.app`).

### Connecting the Frontend to Your Live Render Backend
Once your backend URL is live (e.g., `https://maprank-api.onrender.com`):
1. In `frontend/_redirects`, update the line:
   ```text
   /api/*  https://maprank-api.onrender.com/api/:splat  200
   ```
2. Or in `frontend/js/config.js`, set:
   ```javascript
   window.MAPRANK_API_URL = 'https://maprank-api.onrender.com/api';
   ```
3. Re-upload or push to Netlify. Now, all inquiries and admin dashboard requests on Netlify will communicate directly with your live backend and MySQL database!

---

## Part 4: Setting Up Email Notifications (Gmail SMTP)

To enable automatic email delivery to `abbasarsalan462@gmail.com`:
1. Log in to your Google Account: [https://myaccount.google.com](https://myaccount.google.com).
2. Go to **Security** and ensure **2-Step Verification** is turned ON.
3. Search for **App passwords** (or go to [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
4. Enter an App Name (e.g. `MapRank Website`) and click **Create**.
5. Google will display a 16-character password (e.g., `abcd efgh ijkl mnop`).
6. Copy this password and paste it into:
   - Your local `backend/.env` under `SMTP_PASS=`
   - Your Render Environment Variables under `SMTP_PASS`
7. Now, every inquiry submitted on the website will instantly send a structured notification to `abbasarsalan462@gmail.com`.

---

## Part 5: Admin Dashboard Access

- **Public Website URL:** `https://your-site.netlify.app`
- **Admin Portal URL:** `https://your-site.netlify.app/admin`
- **Default Username:** `arsalan`
- **Default Password:** `MapRank2026!`

In the admin portal, you can:
- View all received inquiries
- Filter by status (*New*, *Contacted*, *In Progress*, *Completed*, *Closed*)
- Search by client, business, or service
- Open individual inquiries for full message reading
- Direct WhatsApp chat with the client in one click
- Download uploaded client documents
- Delete inquiries
