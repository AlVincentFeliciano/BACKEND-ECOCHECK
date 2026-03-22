# EcoCheck Setup Guide
## Step-by-Step Instructions for Cloning and Installing

*Last Updated: March 14, 2026*

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloning the Repository](#cloning-the-repository)
3. [Backend Setup](#backend-setup)
4. [Mobile App Setup](#mobile-app-setup)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Running the Application](#running-the-application)
8. [Initial System Setup](#initial-system-setup)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)
11. [Updating the Application](#updating-the-application)

---

## Prerequisites

Before you begin, ensure you have the following installed on your computer:

### Required Software

1. **Git** (for cloning the repository)
   - Download from: https://git-scm.com/downloads
   - Verify installation: Open terminal and run `git --version`

2. **Node.js** (v18 or higher recommended)
   - Download from: https://nodejs.org/
   - Verify installation: Run `node --version` and `npm --version`

3. **MongoDB Atlas Account** (cloud database — no local install needed)
   - Sign up at: https://www.mongodb.com/cloud/atlas
   - Free tier is available

4. **Cloudinary Account** (for report and profile photo storage)
   - Sign up at: https://cloudinary.com/
   - Free tier is available

5. **Brevo Account** (for email notifications and verification)
   - Sign up at: https://www.brevo.com/
   - Free tier is available

6. **Expo Go App** (for testing the mobile app on a physical device)
   - Android: Search "Expo Go" on Google Play Store
   - iOS: Search "Expo Go" on the App Store

7. **Code Editor** (recommended)
   - Visual Studio Code: https://code.visualstudio.com/

---

## Cloning the Repository

### Step 1: Choose Installation Location

Open your terminal or PowerShell and navigate to where you want to install EcoCheck:

**Windows:**
```powershell
cd C:\Users\YourUsername\Documents
```

**Mac/Linux:**
```bash
cd ~/Documents
```

### Step 2: Clone the Repository

```bash
git clone https://github.com/AlVincentFeliciano/BACKEND-ECOCHECK.git
```


**Alternative: Clone via SSH**
```bash
git clone git@github.com:your-username/ecocheck1.git
```

### Step 3: Navigate to the Project

```bash
cd ecocheck1
```

### Step 4: Verify the Structure

Check that you have the following folders:

**Windows:**
```powershell
dir
```

**Mac/Linux:**
```bash
ls -la
```

You should see:
- `backend/`
- `admin-dashboard/`
- `ecocheck-app/`

---

## Backend Setup

The backend powers everything — it runs the API, serves the admin dashboard, and connects to all external services.

### Step 1: Navigate to the Backend Folder

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

This installs all required packages. It may take a few minutes.

### Step 3: Create the Environment File

Create a new `.env` file in the backend folder:

**Windows (PowerShell):**
```powershell
New-Item .env -ItemType File
```

**Mac/Linux:**
```bash
touch .env
```

### Step 4: Configure Environment Variables

Open the `.env` file in your text editor and add the following:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=<appname>

# JWT
JWT_SECRET=replace_with_a_long_random_secret

# Cloudinary
CLOUDINARY_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Brevo)
BREVO_API_KEY=your_brevo_api_key
BREVO_FROM_EMAIL=your_verified_sender_email@yourdomain.com
```

See the [Environment Configuration](#environment-configuration) section below for detailed instructions on where to get each value.

### Step 5: Verify the Admin Dashboard is Bundled

The admin dashboard is already pre-built and included inside the backend. Confirm the folder exists:

```bash
# Windows
dir admin-dashboard-build

# Mac/Linux
ls admin-dashboard-build
```

You should see `index.html` and a `static/` folder inside. If missing, see [Troubleshooting](#troubleshooting).

---

## Mobile App Setup

### Step 1: Open a New Terminal

Keep the backend terminal open and open a new terminal window.

### Step 2: Navigate to the Mobile App Folder

From the project root:

```bash
cd ecocheck-app
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure the API URL

Open this file in your code editor:

```
ecocheck-app/src/utils/config.ts
```

Set the correct backend URL based on your situation:

| Situation | URL to Use |
|---|---|
| Android Emulator | `http://10.0.2.2:5000/api` |
| iOS Simulator | `http://localhost:5000/api` |
| Physical Phone (same WiFi as PC) | `http://YOUR_PC_LAN_IP:5000/api` |
| Deployed Backend | `https://your-backend.onrender.com/api` |

Example for a physical phone:
```ts
export const API_URL = "http://192.168.1.50:5000/api";
```

#### How to Find Your PC LAN IP (for physical phone)

**Windows:**
```powershell
ipconfig
```
Look for **IPv4 Address** under your active network adapter (e.g., `192.168.1.50`).

**Mac:**
```bash
ipconfig getifaddr en0
```

---

## Environment Configuration

### MongoDB URI

1. Log in to MongoDB Atlas: https://cloud.mongodb.com
2. Open your cluster and click **Connect**
3. Choose **Connect your application**
4. Copy the connection string
5. Replace `<password>` with your database user's password
6. Paste it as `MONGODB_URI` in your `.env` file

### JWT Secret

Generate a strong random string. You can use this command:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as `JWT_SECRET`.

### Cloudinary Credentials

> ⚠️ **Important:** Create a brand-new Cloudinary account dedicated to EcoCheck — do not reuse a personal account. This keeps all report and profile photos under the project's ownership.

1. Go to: https://cloudinary.com/ and click **Sign Up for Free**
2. Register using the official EcoCheck email (e.g., `ecocheckapp@gmail.com`)
3. After signing in, go to the **Dashboard**
4. You will see:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
5. Copy all three into your `.env` file

### Brevo Email Credentials

1. Log in to Brevo: https://app.brevo.com
2. Go to **SMTP & API** under your account settings
3. Generate a new API key
4. Copy it as `BREVO_API_KEY`
5. Set `BREVO_FROM_EMAIL` to a verified sender email in your Brevo account
   - To verify a sender: Go to **Senders & IPs** > **Senders** > **Add a Sender**

---

## Database Setup

EcoCheck uses MongoDB Atlas (cloud-hosted). No local MongoDB installation is needed.

> ⚠️ **Important:** Create a brand-new MongoDB Atlas account dedicated to EcoCheck — do not reuse a personal account. This ensures the database and credentials belong to the project, not an individual.

### Step 1: Create a Dedicated MongoDB Atlas Account

1. Go to: https://www.mongodb.com/cloud/atlas
2. Sign up using the official EcoCheck email (e.g., `ecocheckapp@gmail.com`)
3. Create a new organization named **EcoCheck**
4. Create a new project named **EcoCheck**
5. Create a new cluster inside that project (free tier M0 is sufficient)

### Step 2: Configure Network Access

1. In the Atlas dashboard, go to **Network Access**
2. Click **Add IP Address**
3. For development: Click **Allow Access from Anywhere** (`0.0.0.0/0`)
4. Confirm

> For production, restrict this to your server's specific IP address.

### Step 3: Create a Database User

1. Go to **Database Access**
2. Click **Add New Database User**
3. Choose a username and password
4. Grant **Read and Write** permissions
5. Click **Add User**

### Step 4: Get the Connection String

1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database user's password
5. Add it to `backend/.env` as `MONGODB_URI`

---

## Running the Application

### Step 1: Start the Backend Server

In the backend terminal:

```bash
npm start
```

You should see:
```
Server started on port 5000
MongoDB Connected...
```

### Step 2: Verify the Backend is Running

Open your browser and go to:

```
http://localhost:5000
```

You should see:
```json
{ "service": "EcoCheck Backend", "status": "ok" }
```

### Step 3: Open the Admin Dashboard

The admin dashboard is served directly from the backend. Open:

```
http://localhost:5000/admin
```

You should see the EcoCheck Admin login page.

### Step 4: Start the Mobile App

In the ecocheck-app terminal:

```bash
npm start
```

You will see a QR code in the terminal. Options:

- Press `a` to open on Android emulator
- Press `i` to open on iOS simulator (Mac only)
- Scan the QR code with **Expo Go** on your physical phone

---

## Initial System Setup

### Step 1: Create the First Superadmin Account

EcoCheck requires a superadmin to manage other admins. This first account must be created directly in MongoDB.

#### Using MongoDB Atlas (Recommended)

1. Log in to MongoDB Atlas
2. Open your cluster and click **Browse Collections**
3. Find the `users` collection (create it if empty)
4. Click **Insert Document**
5. Insert the following (replace values as needed):

```json
{
  "firstName": "Super",
  "lastName": "Admin",
  "email": "superadmin@ecocheck.com",
  "contactNumber": "09000000000",
  "password": "<bcrypt hashed password>",
  "role": "superadmin",
  "isEmailVerified": true,
  "isActive": true,
  "points": 0,
  "createdAt": { "$date": "2026-03-14T00:00:00.000Z" }
}
```

> **Important:** The password must be bcrypt-hashed before storing. Use this command to generate one:
> ```powershell
> node -e "const b=require('bcryptjs');b.hash('YourPassword123',10).then(h=>console.log(h))"
> ```
> Copy the output hash and use it as the `password` value.

#### Using MongoDB Shell (mongosh)

```bash
mongosh "your-mongodb-uri"
```

Then run:
```javascript
use ecocheck

db.users.insertOne({
  firstName: "Super",
  lastName: "Admin",
  email: "superadmin@ecocheck.com",
  contactNumber: "09000000000",
  password: "<bcrypt hash here>",
  role: "superadmin",
  isEmailVerified: true,
  isActive: true,
  points: 0,
  createdAt: new Date()
})
```

### Step 2: First Login

1. Open the admin dashboard at `http://localhost:5000/admin`
2. Enter your superadmin email and password
3. You should be redirected to the main dashboard

### Step 3: Create Location Admins

Once logged in as superadmin:

1. Go to the **Admin Management** section
2. Click **Add Admin**
3. Fill in the admin's details and assign a location (**Bulaon** or **Del Carmen**)
4. Each location admin will only see users and reports from their assigned area

### Step 4: Verify Core Features

| Feature | How to Test |
|---|---|
| User registration | Register a new account via the mobile app |
| Email verification | Check that a 6-digit code email is received |
| Report submission | Submit a report with a photo via mobile app |
| Admin report view | Confirm report appears in admin dashboard |
| Resolve report | Mark a report as resolved and confirm email is sent |

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Solutions:**

1. Verify `MONGODB_URI` in `backend/.env` is correct
2. Log in to MongoDB Atlas and go to **Network Access**
3. Make sure your IP address is whitelisted (or allow `0.0.0.0/0`)
4. Check that the database username and password are correct

### Issue: Admin Dashboard Shows Blank Page

**Most likely cause:** The admin build folder is missing or incomplete.

**Solution:**
```bash
# Navigate to admin source
cd admin-dashboard/admin-dashboard

# Build the project
npm install
npm run build

# Copy to backend (Windows PowerShell)
Remove-Item -Recurse -Force ..\..\ backend\admin-dashboard-build\* -ErrorAction SilentlyContinue
Copy-Item -Recurse -Force .\build\* ..\..\backend\admin-dashboard-build\

# Restart the backend
cd ..\..\backend
npm start
```

### Issue: Mobile App Shows "Network Error"

**Solutions:**

1. Make sure your phone and computer are on the **same WiFi network**
2. Confirm the backend is running on port 5000
3. Check `ecocheck-app/src/utils/config.ts` — `localhost` will not work on a physical device
4. Use your PC's LAN IP address instead (find it with `ipconfig` on Windows)

### Issue: Report Photos Are Not Uploading

**Solution:**

1. Open `backend/.env`
2. Verify all three Cloudinary values are correct:
   ```
   CLOUDINARY_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
3. Log in to Cloudinary and confirm the credentials match
4. Restart the backend after any `.env` change

### Issue: Verification Emails Not Arriving

**Solutions:**

1. Verify `BREVO_API_KEY` and `BREVO_FROM_EMAIL` in `backend/.env`
2. Log in to Brevo and confirm the sender email is verified under **Senders & IPs**
3. Check the recipient's spam/junk folder
4. Restart backend after updating `.env`

### Issue: "Port 5000 already in use"

**Windows:**
```powershell
# Find the process using port 5000
netstat -ano | findstr :5000

# Kill it (replace 1234 with the actual PID)
taskkill /PID 1234 /F
```

**Mac/Linux:**
```bash
lsof -ti:5000 | xargs kill -9
```

Or change the port in `backend/.env`:
```env
PORT=5001
```

### Issue: "Module not found" Errors

```bash
# Delete node_modules and reinstall

# Mac/Linux
rm -rf node_modules package-lock.json
npm install

# Windows PowerShell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

## Production Deployment

When ready to deploy EcoCheck for live use:

### Step 1: Deploy the Backend

Recommended platforms:
- **Render** (currently used): https://render.com
- **Railway**: https://railway.app
- **DigitalOcean**: https://www.digitalocean.com

Set all environment variables in your hosting platform's dashboard (same keys as your `.env` file).

### Step 2: The Admin Dashboard Deploys With the Backend

No separate deployment needed. The admin build is already inside `backend/admin-dashboard-build` and served automatically at `/admin`.

### Step 3: Build and Publish the Mobile App

When ready to publish on app stores:

```bash
cd ecocheck-app

# Log in to Expo
npx eas login

# Build for Android
npx eas build -p android

# Build for iOS
npx eas build -p ios
```

Before building, update `src/utils/config.ts` to use the production backend URL:
```ts
export const API_URL = "https://your-backend.onrender.com/api";
```

### Step 4: Production Security Checklist

- [ ] Change `JWT_SECRET` to a strong unique value
- [ ] Set `NODE_ENV=production`
- [ ] Restrict MongoDB Atlas network access to your server IP
- [ ] Enable HTTPS on your hosting platform
- [ ] Restrict CORS in the backend to known domains
- [ ] Rotate Cloudinary and Brevo API keys if previously shared
- [ ] Monitor Brevo free-tier daily email limits
- [ ] Monitor Cloudinary free-tier storage usage

---

## Updating the Application

### Pull Latest Changes

```bash
# From the project root
git pull origin main

# Update backend dependencies
cd backend
npm install

# Update mobile app dependencies
cd ..\ecocheck-app
npm install
```

### Rebuild Admin Dashboard After Source Changes

If the admin dashboard source code was updated:

```bash
cd admin-dashboard\admin-dashboard
npm install
npm run build

# Copy to backend (Windows PowerShell)
Copy-Item -Recurse -Force .\build\* ..\..\backend\admin-dashboard-build\
```

Then restart the backend.

---

## Getting Help

### Documentation in This Repository
- Network & Connectivity Guide: `ECOCHECK_NETWORK_GUIDE.md`
- This Setup Guide: `ECOCHECK_SETUP_GUIDE.md`
- Privacy Feature Summary: `backend/PRIVACY_FEATURE.md`

### Support
- Check existing issues on the GitHub repository
- Create a new issue with a detailed description
- Contact the development team directly

---

## Next Steps

After successful installation:

1. ✅ Read the Network Guide — confirm your connection meets requirements
2. ✅ Create the Superadmin — provision the first admin account in MongoDB
3. ✅ Create Location Admins — assign admins to Bulaon and Del Carmen
4. ✅ Test Report Submission — submit a test report via the mobile app
5. ✅ Test Resolution Flow — resolve a report and confirm email notification
6. ✅ Run PII Migration — clean up any existing resolved reports:
   ```bash
   cd backend
   node src/scripts/removePIIFromResolvedReports.js
   ```
7. ✅ Train Users — walk through the app with your local team
8. ✅ Go Live — begin accepting real environmental reports

---

**EcoCheck is ready. Start protecting your environment. 🌱**

If you encounter any issues not covered in this guide, refer to `ECOCHECK_NETWORK_GUIDE.md` or contact the development team.
