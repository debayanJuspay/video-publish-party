# Video Publish Party

A collaborative video management platform that allows users to upload videos for review and automatic publishing to YouTube.

## Features

- **Google OAuth Authentication**: Secure login using Google accounts
- **MongoDB Atlas Database**: Cloud-based data storage
- **Cloudinary Video Storage**: Reliable video hosting and processing
- **YouTube API Integration**: Automatic video publishing to YouTube
- **Role-based Access Control**: Account owners can invite editors
- **Video Approval Workflow**: Videos must be approved before publishing

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **Authentication**: Google OAuth 2.0
- **File Storage**: Cloudinary
- **Video Publishing**: YouTube Data API v3

## Setup Instructions

### Prerequisites

1. **MongoDB Atlas Account**: Create a free cluster at [mongodb.com](https://mongodb.com)
2. **Google Cloud Console**: Set up OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com)
3. **Cloudinary Account**: Sign up for free at [cloudinary.com](https://cloudinary.com)
4. **YouTube API**: Enable YouTube Data API v3 in Google Cloud Console

### Environment Setup

1. Copy the `.env` file and fill in your credentials:

```bash
# MongoDB Atlas
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=video_publish_party

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# YouTube API
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# App Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_API_URL=http://localhost:3001
JWT_SECRET=your_jwt_secret_key_change_this_in_production
PORT=3001
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API and YouTube Data API v3
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized origins: `http://localhost:5173` (development)
7. Add authorized redirect URIs: `http://localhost:5173/auth`

### Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to Dashboard to get your cloud name, API key, and API secret
3. Create an upload preset:
   - Go to Settings → Upload
   - Add upload preset named `video_upload`
   - Set signing mode to "Unsigned"
   - Configure folder and other settings as needed

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com](https://mongodb.com)
2. Create a database user
3. Whitelist your IP address (or use 0.0.0.0/0 for development)
4. Get your connection string

### Installation & Running

1. Install dependencies:
```bash
npm install
```

2. Start both frontend and backend:
```bash
npm run dev:full
```

Or run them separately:
```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173)

## User Workflow

### Account Owner
1. Sign in with Google OAuth
2. Create a YouTube account in the platform
3. Add YouTube channel ID (optional)
4. Invite editors by email
5. Review and approve/reject uploaded videos
6. Videos are automatically published to YouTube when approved

### Editor
1. Sign in with Google OAuth
2. Access accounts they've been invited to
3. Upload videos with title, description, and thumbnail
4. Wait for approval from account owner
5. View upload status and admin feedback

## API Endpoints

- `POST /auth/google` - Google OAuth authentication
- `GET /auth/profile` - Get user profile
- `GET /accounts` - Get user's accounts
- `POST /accounts` - Create new account
- `POST /accounts/:id/editors` - Add editor to account
- `DELETE /accounts/:id/editors/:userId` - Remove editor
- `GET /accounts/:id/editors` - Get account editors
- `POST /videos` - Save video metadata after Cloudinary upload
- `GET /videos` - Get videos for user's accounts
- `PATCH /videos/:id/status` - Approve/reject video

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
