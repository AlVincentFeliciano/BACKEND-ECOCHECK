# EcoCheck Network & Connectivity Guide
## Step-by-Step Instructions for Setting Up and Testing Your Network for EcoCheck

*Last Updated: March 14, 2026*

---

## Table of Contents

1. [Why Network Matters for EcoCheck](#1-why-network-matters-for-ecocheck)
2. [EcoCheck Network Requirements](#2-ecocheck-network-requirements)
3. [Step 1 — Test Your Internet Speed](#3-step-1--test-your-internet-speed)
4. [Step 2 — Check Backend Server Connectivity](#4-step-2--check-backend-server-connectivity)
5. [Step 3 — Connect the Admin Dashboard](#5-step-3--connect-the-admin-dashboard)
6. [Step 4 — Connect the Mobile App](#6-step-4--connect-the-mobile-app)
7. [Understanding Your Results](#7-understanding-your-results)
8. [Troubleshooting Connection Issues](#8-troubleshooting-connection-issues)
9. [Tips for Stable Operation](#9-tips-for-stable-operation)
10. [Frequently Asked Questions](#10-frequently-asked-questions)
11. [Quick Reference Checklist](#11-quick-reference-checklist)

---

## 1. Why Network Matters for EcoCheck

EcoCheck depends on a stable internet connection for all three of its parts to work properly:

| Component | What Needs Network |
|---|---|
| Mobile App | Submitting reports, uploading photos, receiving status updates |
| Admin Dashboard | Viewing and managing reports, updating statuses |
| Backend Server | Connecting to MongoDB database, Cloudinary image service, and email provider |

A poor or misconfigured network connection will result in:
- Reports failing to submit
- Photos not uploading
- Email notifications not sending
- Admin dashboard not loading data

---

## 2. EcoCheck Network Requirements

### Minimum Requirements

| Item | Requirement |
|---|---|
| Download Speed | 5 Mbps |
| Upload Speed | 2 Mbps |
| Latency (Ping) | Under 150ms |
| Connection Type | WiFi or Mobile Data (4G/LTE minimum) |

### Recommended for Best Performance

| Item | Recommendation |
|---|---|
| Download Speed | 25+ Mbps |
| Upload Speed | 5+ Mbps |
| Latency (Ping) | Under 50ms |
| Connection Type | Wired Ethernet or 5G / Strong WiFi |

### Required External Services (Must Be Reachable)

| Service | Purpose |
|---|---|
| MongoDB Atlas | Main database |
| Cloudinary | Image and photo storage |
| Brevo (email) | Verification and notification emails |
| Render / your hosting | Backend API server |

---

## 3. Step 1 — Test Your Internet Speed

Before using EcoCheck, verify your internet connection can handle it.

### How to Run a Speed Test

#### Step 1: Open Your Browser
- Open Chrome, Edge, Firefox, or Safari
- Make sure no downloads or streaming are active

#### Step 2: Go to a Speed Test Site
Choose any one of these:

| Site | Address |
|---|---|
| Fast.com (simple) | https://fast.com |
| Speedtest.net (detailed) | https://www.speedtest.net |
| Google Speed Test | Search "speed test" on Google |
| Cloudflare | https://speed.cloudflare.com |

#### Step 3: Run the Test
- The test usually starts automatically or after clicking **GO**
- Wait 30–60 seconds for it to finish
- Do not use the internet while testing

#### Step 4: Read Your Results
Look for three numbers:

- **Download Speed** — How fast you receive data (Mbps)
- **Upload Speed** — How fast you send data (Mbps)
- **Ping / Latency** — Response time (ms, lower is better)

#### Step 5: Compare Against EcoCheck Requirements

| Your Result | Status for EcoCheck |
|---|---|
| 25+ Mbps download, 5+ Mbps upload, <50ms ping | ✅ Excellent |
| 10–25 Mbps download, 2–5 Mbps upload, <100ms ping | ✅ Good |
| 5–10 Mbps download, 1–2 Mbps upload, <150ms ping | ⚠️ Minimum — may be slow |
| Below 5 Mbps or above 150ms ping | ❌ Poor — expect issues |

#### Step 6: Save Your Results
- Take a screenshot for your records
- Windows: `Win + Shift + S`
- Mac: `Cmd + Shift + 4`

---

## 4. Step 2 — Check Backend Server Connectivity

After confirming your internet speed, verify the EcoCheck backend server itself is reachable.

### If Running Locally (Your Own Computer)

#### Step 1: Make Sure the Backend is Running
- Open a terminal
- Navigate to the backend folder:
  ```
  cd backend
  ```
- Start the server:
  ```
  npm start
  ```
- You should see: `Server started on port 5000`

#### Step 2: Open the Health Check URL
- Open your browser
- Go to:
  ```
  http://localhost:5000
  ```
- You should see this response:
  ```json
  { "service": "EcoCheck Backend", "status": "ok" }
  ```
- If you see this, your backend is running correctly. ✅

#### Step 3: Test the API
- Go to:
  ```
  http://localhost:5000/api/users
  ```
- You should get a response (even if it says unauthorized — that means the server is working)

### If Using a Deployed Server (e.g., Render)

#### Step 1: Open the Backend URL
- Go to your deployed backend URL
- Example:
  ```
  https://your-backend.onrender.com
  ```
- Expect the same `{ "service": "EcoCheck Backend", "status": "ok" }` response

#### Step 2: Check Response Time
- If the page takes more than 10 seconds to load on a fresh visit, your server may be in a sleep state (common on free hosting tiers)
- Wait for it to wake up; subsequent requests will be faster

---

## 5. Step 3 — Connect the Admin Dashboard

The admin dashboard is served directly from the backend at `/admin`.

### Step 1: Open the Admin Dashboard
- In your browser, go to:
  ```
  http://localhost:5000/admin
  ```
  (or your deployed URL)
  ```
  https://your-backend.onrender.com/admin
  ```

### Step 2: Verify the Login Page Loads
- You should see the EcoCheck Admin login page
- If the page is blank or shows an error, the admin build may not be copied correctly into the backend folder

### Step 3: Log In
- Enter your admin email and password
- Click **Login**
- You should land on the Admin Dashboard with reports and users visible

### What a Successful Connection Looks Like

| Item | Expected |
|---|---|
| Login page loads | ✅ Visible login form |
| Login succeeds | ✅ Redirected to dashboard |
| Reports load | ✅ Report list appears |
| Users load | ✅ User list appears |
| Images load | ✅ Report photos visible |

---

## 6. Step 4 — Connect the Mobile App

The mobile app needs to point to the correct backend address depending on how you are running it.

### Finding the Right Backend URL for Your Situation

| Situation | URL to Use |
|---|---|
| Android Emulator | `http://10.0.2.2:5000/api` |
| iOS Simulator | `http://localhost:5000/api` |
| Physical Phone (same WiFi) | `http://YOUR_PC_LAN_IP:5000/api` |
| Deployed Backend | `https://your-backend.onrender.com/api` |

### How to Find Your PC LAN IP (for Physical Phone)

#### On Windows:
1. Open PowerShell or Command Prompt
2. Type:
   ```
   ipconfig
   ```
3. Look for **IPv4 Address** under your active network adapter
4. Example: `192.168.1.50`
5. Your API URL would be: `http://192.168.1.50:5000/api`

#### On Mac:
1. Open Terminal
2. Type:
   ```
   ipconfig getifaddr en0
   ```
3. Use the IP shown

### Update the API URL in the Mobile App

1. Open this file in the project:
   ```
   ecocheck-app/src/utils/config.ts
   ```
2. Change the `API_URL` to match your situation:
   ```ts
   export const API_URL = "http://192.168.1.50:5000/api";
   ```
3. Save the file
4. Restart Expo:
   ```
   npm start
   ```

### Verify the Mobile App is Connected

| Action | Expected Result |
|---|---|
| Open app | Splash and login screen loads |
| Register new account | Verification email received |
| Log in | Home screen loads |
| Submit a report with photo | Report appears in admin dashboard |
| View report status | Status shows correctly |

---

## 7. Understanding Your Results

### Download Speed

**What it means:** How fast data arrives at your device (browsing, loading reports, viewing photos)

| Speed | EcoCheck Performance |
|---|---|
| Below 5 Mbps | ❌ Slow loading, photos may fail to load |
| 5–15 Mbps | ⚠️ Usable but may feel sluggish |
| 15–50 Mbps | ✅ Good performance |
| 50+ Mbps | ✅ Excellent, no issues expected |

### Upload Speed

**What it means:** How fast data leaves your device (uploading report photos, sending data to server)

| Speed | EcoCheck Performance |
|---|---|
| Below 1 Mbps | ❌ Photo uploads will fail or timeout |
| 1–3 Mbps | ⚠️ Works but uploads are slow |
| 3–10 Mbps | ✅ Good for report photo uploads |
| 10+ Mbps | ✅ Fast uploads, no delays |

### Ping / Latency

**What it means:** How quickly the server responds to a request

| Ping | EcoCheck Performance |
|---|---|
| Under 50ms | ✅ Excellent — instant responses |
| 50–100ms | ✅ Good — slight delay barely noticeable |
| 100–200ms | ⚠️ Noticeable lag when loading data |
| Over 200ms | ❌ Very slow — forms and data may time out |

---

## 8. Troubleshooting Connection Issues

### Problem: Admin Dashboard Shows Blank Page

**Most likely cause:** Admin build files are missing or not copied properly

**Solution:**
1. Navigate to admin source folder:
   ```
   cd admin-dashboard/admin-dashboard
   ```
2. Build the project:
   ```
   npm run build
   ```
3. Copy the build output into the backend:
   - Source: `admin-dashboard/admin-dashboard/build`
   - Destination: `backend/admin-dashboard-build`
4. Restart the backend server

---

### Problem: Mobile App Cannot Reach Backend

**Most likely cause:** Wrong API URL set in the config file

**Solution:**
1. Make sure your phone and computer are on the **same WiFi network**
2. Find your computer's LAN IP using `ipconfig` (Windows) or `ifconfig` (Mac)
3. Update `ecocheck-app/src/utils/config.ts` with that IP
4. Do not use `localhost` on a physical device — it will not work

---

### Problem: Report Photos Not Uploading

**Most likely cause:** Cloudinary credentials are missing or wrong in the backend `.env`

**Solution:**
1. Open `backend/.env`
2. Verify these three values are correct:
   ```
   CLOUDINARY_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
3. Log in to your Cloudinary account to confirm the keys
4. Restart the backend after any `.env` change

---

### Problem: Verification or Notification Emails Not Arriving

**Most likely cause:** Brevo email credentials are missing or the sender email is not verified

**Solution:**
1. Open `backend/.env`
2. Verify:
   ```
   BREVO_API_KEY=your_brevo_api_key
   BREVO_FROM_EMAIL=your_verified_sender_email
   ```
3. Log in to your Brevo account and make sure the sender email is verified
4. Check your spam folder for test emails
5. Restart backend after updating `.env`

---

### Problem: Backend Fails to Start (Database Error)

**Most likely cause:** MongoDB URI is wrong or network access is blocked

**Solution:**
1. Verify `MONGODB_URI` in `backend/.env` is correct
2. Log in to MongoDB Atlas
3. Go to **Network Access** and make sure your current IP (or `0.0.0.0/0`) is allowed
4. Re-test your connection

---

### Problem: Slow Loading or Timeouts on Free Hosted Server

**Most likely cause:** Free hosting tiers (e.g., Render free plan) put servers to sleep after inactivity

**Solution:**
1. Open the backend URL in a browser and wait up to 30 seconds for it to wake up
2. After the first load, subsequent requests will be fast
3. Consider upgrading to a paid tier for always-on availability in production

---

## 9. Tips for Stable Operation

### For the Admin Dashboard User

✅ Use a **wired Ethernet connection** or strong WiFi for best performance  
✅ Keep only the dashboard open; avoid heavy background downloads  
✅ Refresh the page if reports do not load after a few seconds  
✅ Use an updated browser (Chrome or Edge recommended)  

### For Mobile App Users

✅ Connect to **WiFi** when submitting reports with photos — mobile data may be slow for image uploads  
✅ Wait for the upload progress to complete before closing the app  
✅ If submit fails, check your connection and try again  
✅ Make sure location permissions are enabled for the app  

### For the Server / Backend Host

✅ Ensure the server machine has a stable internet connection  
✅ Do not change `.env` values while the server is running — restart after any change  
✅ Monitor Cloudinary storage usage as photos fill up over time  
✅ Monitor Brevo email quota (free tier has daily limits)  

---

## 10. Frequently Asked Questions

**Q: Can I use EcoCheck without internet?**
> No. EcoCheck requires an internet connection for the mobile app, admin dashboard, and backend to communicate. All data is stored in a cloud database.

**Q: Why does my mobile app show "Network Error"?**
> This usually means the API URL in the app is pointing to the wrong address. Double-check `ecocheck-app/src/utils/config.ts` and make sure the backend is running.

**Q: Does EcoCheck work on mobile data?**
> Yes, but WiFi is recommended especially when uploading photos. Mobile data works for browsing reports and checking statuses.

**Q: Why do emails sometimes arrive late?**
> Email delivery depends on your Brevo account configuration and the recipient's mail server. Verification emails usually arrive within 1–2 minutes. Check spam folders if delayed.

**Q: Can two admins be logged in at the same time?**
> Yes. Multiple admins can use the dashboard simultaneously from different devices.

**Q: Why is the first page load slow on the deployed server?**
> Free hosting services put servers to sleep when inactive. The first visit wakes it up, which takes 10–30 seconds. All subsequent requests are fast.

**Q: Do I need to do anything after a power or internet outage?**
> Just restart the backend server. The database and cloud services are unaffected by local outages.

---

## 11. Quick Reference Checklist

Use this before going live or handing over to your team.

### Network Readiness

- [ ] Speed test passed (25+ Mbps download, 5+ Mbps upload, <100ms ping)
- [ ] Backend server health check returns OK at `/`
- [ ] MongoDB Atlas network access allows your server IP
- [ ] Cloudinary credentials verified and image upload tested
- [ ] Brevo credentials verified and test email received

### Admin Dashboard

- [ ] Dashboard loads at `/admin`
- [ ] Admin login works
- [ ] Reports list loads correctly
- [ ] Report photos display correctly
- [ ] Status update works and triggers email notification

### Mobile App

- [ ] API URL points to correct backend address
- [ ] App loads and shows login screen
- [ ] User registration works and verification email received
- [ ] Login works after email verification
- [ ] Report submission with photo works
- [ ] Report status updates are visible in the app

### Handover

- [ ] Local team has backend `.env` file with correct credentials
- [ ] Superadmin account created in database
- [ ] Team knows daily startup order (backend first, then admin/mobile)
- [ ] Team has this guide saved

---

**EcoCheck is ready when all items above are checked. ✅**

For further assistance, contact your system administrator or development team.
