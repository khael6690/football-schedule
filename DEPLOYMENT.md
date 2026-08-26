# Football Live Deployment Guide

## Overview

This guide covers deploying Football Live to production using Render (backend), Vercel (frontend), and MongoDB Atlas (database).

## Prerequisites

- GitHub repository
- Render account
- Vercel account
- MongoDB Atlas account
- football-data.org API key

## Step 1: MongoDB Atlas Setup

1. Create a new cluster on [MongoDB Atlas](https://www.mongodb.com/atlas/database)
2. Whitelist your IP address or allow all IPs (for testing only)
3. Create a database user with read/write permissions
4. Get the connection string (e.g., `mongodb+srv://user:pass@cluster.mongodb.net/soccer?retryWrites=true&w=majority`)
5. Note your username, password, and cluster URL

## Step 2: Backend Deployment (Render)

1. Go to [Render Dashboard](https://dashboard.render.com/) and create a new **Web Service**
2. Connect your GitHub repository
3. Set the following environment variables:
   - `NODE_ENV=production`
   - `MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/soccer?retryWrites=true&w=majority`
   - `FOOTBALL_DATA_API_KEY=your_api_key_here`
   - `PORT=3050`
   - `CORS_ORIGINS=https://your-frontend-url.vercel.app`
   - `LOG_LEVEL=warn`
4. Set the **Build Command** to:
   ```bash
   npm install
   ```
5. Set the **Start Command** to:
   ```bash
   npm start
   ```
6. Deploy

## Step 3: Frontend Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and import your project
2. Set the following environment variable:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com`
3. Configure the following settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
4. Deploy

## Step 4: football-data.org API Key

1. Register for a free API key at [football-data.org](https://www.football-data.org/client/register)
2. Add the key to your Render backend environment variables

## Step 5: Data Initialization

After deployment, initialize your database:

```bash
# Clone your repo locally
git clone https://github.com/your-repo/football-live.git
cd football-live/backend

# Install dependencies
npm install

# Set up .env with production values
cp .env.example .env

# Seed initial data
npm run fetcher:seed
```

## Step 6: Set Up Live Updates

To keep your data live, set up a cron job or use Render's built-in cron service:

```bash
# Example cron job (runs every 5 minutes)
npm run fetcher:live
```

## Step 7: Docker Deployment (Optional)

If using Docker locally:

1. Install Docker and Docker Compose
2. Run:
   ```bash
   docker-compose up
   ```
3. Set `FOOTBALL_DATA_API_KEY` in your environment

## Troubleshooting

### Common Issues

- **MongoDB Connection Errors**: Verify your Atlas IP whitelist and connection string
- **API Key Errors**: Ensure your football-data.org API key is valid and not expired
- **CORS Errors**: Update `CORS_ORIGINS` in backend to include your frontend URL
- **Build Failures**: Check your GitHub Actions logs for detailed error messages

### Debugging

To debug your backend:

```bash
# SSH into your Render instance (if available)
npm run dev
```

## Post-Deployment

1. Verify all endpoints work:
   - http://your-backend-url.onrender.com/api-docs (Swagger UI)
   - http://your-frontend-url.vercel.app

2. Set up monitoring for your backend and database

## Scaling

For high traffic:
- Consider upgrading your MongoDB Atlas cluster tier
- Add Redis caching for frequently accessed data
- Implement a CDN for static assets
