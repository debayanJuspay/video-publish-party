# Vercel Deployment Guide for VideoHub

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Environment Variables**: Prepare all your environment variables

## Environment Variables

You'll need to set these environment variables in Vercel:

### Required Environment Variables:
```
MONGODB_URI=mongodb+srv://your-mongodb-connection-string
JWT_SECRET=your-jwt-secret-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=production
```

## Deployment Steps

### 1. Update Google OAuth Settings

Before deploying, update your Google OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services > Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Vercel domain to:
   - **Authorized JavaScript origins**: `https://your-app-name.vercel.app`
   - **Authorized redirect URIs**: `https://your-app-name.vercel.app/api/youtube/callback`

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect it's a Vite project
4. Add all environment variables in the Environment Variables section
5. Click "Deploy"

#### Option B: Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### 3. Post-Deployment Configuration

1. **Update API URLs**: The frontend will automatically use relative URLs which will work with Vercel
2. **Update CORS**: The server is configured to accept your Vercel domain
3. **Update OAuth URLs**: Make sure Google OAuth redirect URLs match your Vercel domain

### 4. Environment Variable Setup in Vercel

1. Go to your project in Vercel Dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables"
4. Add each variable:
   - **Name**: Variable name (e.g., `MONGODB_URI`)
   - **Value**: Variable value
   - **Environments**: Select Production, Preview, and Development

### 5. Domain Configuration (Optional)

If you want to use a custom domain:
1. Go to your project settings in Vercel
2. Click on "Domains"
3. Add your custom domain
4. Update Google OAuth settings with your custom domain

## File Structure for Vercel

```
your-project/
├── api/
│   └── index.js          # Serverless function for backend
├── dist/                 # Built frontend files (auto-generated)
├── src/                  # React frontend source
├── server/
│   └── index.js          # Original server (for local dev)
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies and scripts
```

## Vercel Configuration Explained

The `vercel.json` file configures:
- **Builds**: Tells Vercel to build the frontend and create a serverless function for the backend
- **Routes**: Routes API calls to the serverless function and everything else to the frontend
- **Functions**: Configures the serverless function timeout and size limits

## Troubleshooting

### Common Issues:

1. **Environment Variables Not Working**
   - Make sure all environment variables are set in Vercel Dashboard
   - Redeploy after adding environment variables

2. **API Routes Not Working**
   - Check that all backend routes are prefixed with `/api`
   - Ensure the frontend is making requests to relative URLs

3. **File Upload Issues**
   - Vercel has a 50MB limit for serverless functions
   - Consider using Cloudinary's upload widget for large files

4. **Database Connection Issues**
   - Ensure MongoDB URI is correct and accessible
   - Check that IP allowlist includes 0.0.0.0/0 for Vercel

5. **OAuth Issues**
   - Update Google OAuth redirect URLs to match your Vercel domain
   - Ensure client ID and secret are correctly set

## Performance Considerations

1. **Cold Starts**: Serverless functions may have cold start delays
2. **Function Timeout**: Set appropriate timeout for video processing
3. **Memory Limits**: Adjust function memory if needed for large file processing

## Monitoring

1. **Vercel Analytics**: Enable in project settings
2. **Function Logs**: Check in Vercel Dashboard > Functions tab
3. **Error Tracking**: Consider adding Sentry or similar service

## Local Development vs Production

The app is configured to work in both environments:
- **Local**: Uses `http://localhost:3001` for API calls
- **Production**: Uses relative URLs that resolve to your Vercel domain

## Next Steps After Deployment

1. Test all functionality on the deployed app
2. Update any hardcoded URLs to use your Vercel domain
3. Set up monitoring and error tracking
4. Configure custom domain if needed
5. Set up CI/CD pipeline for automatic deployments
