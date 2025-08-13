import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Environment check:', {
  mongoUri: process.env.MONGODB_URI ? 'Found' : 'Missing',
  port: process.env.PORT || 3001
});

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// MongoDB connection
let db;
const mongoClient = new MongoClient(process.env.MONGODB_URI, {
  tlsAllowInvalidCertificates: true,
  tlsAllowInvalidHostnames: true,
  serverSelectionTimeoutMS: 10000
});

async function connectToMongoDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db(process.env.MONGODB_DB_NAME);
    console.log('Connected to MongoDB Atlas');
    
    // Create indexes for better performance
    await createIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create database indexes for performance
async function createIndexes() {
  try {
    // Index for users collection
    await db.collection('users').createIndex({ googleId: 1 });
    await db.collection('users').createIndex({ email: 1 });
    await db.collection('users').createIndex({ authType: 1 });
    
    // Index for videos collection
    await db.collection('videos').createIndex({ accountId: 1 });
    await db.collection('videos').createIndex({ createdAt: -1 });
    await db.collection('videos').createIndex({ status: 1 });
    
    console.log('Database indexes created');
  } catch (error) {
    console.log('Index creation warning (may already exist):', error.message);
  }
}

// Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
);

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const start = Date.now();
    await db.admin().ping();
    const dbTime = Date.now() - start;
    
    res.json({
      status: 'ok',
      database: 'connected',
      dbResponseTime: `${dbTime}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Routes

// Google OAuth login
app.post('/auth/google', async (req, res) => {
  try {
    const { code } = req.body;
    console.log('Received Google OAuth code');
    
    const { tokens } = await googleClient.getToken(code);
    console.log('Got tokens from Google');
    googleClient.setCredentials(tokens);

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    console.log('Google user info:', { googleId, email, name });

    // Check if user exists in MongoDB
    let user = await db.collection('users').findOne({ googleId });
    console.log('Existing user found:', !!user);

    if (!user) {
      console.log('Creating new user');
      
      // All Google OAuth users are admins
      user = {
        googleId,
        email,
        name,
        picture,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await db.collection('users').insertOne(user);
      user._id = result.insertedId;
      console.log(`New user created with ID: ${user._id}, role: ${user.role}`);
    } else {
      console.log('Updating existing user last login');
      // Update last login
      await db.collection('users').updateOne(
        { googleId },
        { $set: { updatedAt: new Date() } }
      );
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user.googleId, // Always use googleId for consistency
        userType: 'google',
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('JWT generated for user:', user.googleId);

    res.json({
      token: jwtToken,
      user: {
        id: user.googleId,
        email: user.email,
        name: user.name,
        picture: user.picture,
        role: user.role
      },
      googleTokens: tokens
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(400).json({ error: 'Authentication failed' });
  }
});

// Email/password login for editors
app.post('/auth/email', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Email login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email (editors created by admin)
    const user = await db.collection('users').findOne({ 
      email,
      authType: 'email' // Only allow email/password users
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // In production, hash and compare passwords properly!
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { 
        userId: user._id.toString(),
        userType: 'email',
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('JWT generated for email user:', user._id);

    res.json({
      token: jwtToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        authType: user.authType
      }
    });

  } catch (error) {
    console.error('Email login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get user profile
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    console.log('⚡ Profile request for user:', req.user.userId);
    
    let user;
    
    // Build query based on user type marker in JWT
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    console.log('🔍 Found user:', !!user);
    
    if (!user) {
      console.log('❌ User not found for ID:', req.user.userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Profile found:', { 
      id: user._id || user.googleId, 
      email: user.email, 
      name: user.name,
      role: user.role,
      picture: user.picture || 'NO_PICTURE'
    });
    
    res.json({
      id: user._id || user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role
    });
  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Helper function to resolve YouTube channel handle to Channel ID
const resolveChannelId = async (channelInput) => {
  console.log('🔍 Resolving channel input:', channelInput);
  
  const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
  });

  // If it's already a channel ID (starts with UC and 24 chars), return as is
  if (channelInput.match(/^UC[a-zA-Z0-9_-]{22}$/)) {
    console.log('✅ Input is already a valid channel ID');
    return channelInput;
  }

  // If it's a URL, extract the handle
  let handle = channelInput;
  if (channelInput.includes('youtube.com/@')) {
    handle = channelInput.split('/@')[1];
    console.log('📋 Extracted handle from URL:', handle);
  } else if (channelInput.includes('youtube.com/c/')) {
    handle = channelInput.split('/c/')[1];
    console.log('📋 Extracted handle from custom URL:', handle);
  } else if (channelInput.includes('youtube.com/channel/')) {
    const channelId = channelInput.split('/channel/')[1];
    console.log('📋 Extracted channel ID from URL:', channelId);
    return channelId;
  }

  // Remove @ prefix if present
  if (handle.startsWith('@')) {
    handle = handle.substring(1);
    console.log('📋 Removed @ prefix, handle:', handle);
  }

  console.log('🔎 Searching for channel handle:', handle);

  try {
    // Search for channel by handle using the search API
    const searchResponse = await youtube.search.list({
      part: ['snippet'],
      q: handle,
      type: 'channel',
      maxResults: 10
    });

    console.log('📊 Search results count:', searchResponse.data.items?.length || 0);

    if (searchResponse.data.items && searchResponse.data.items.length > 0) {
      // Look for exact match of handle
      for (const item of searchResponse.data.items) {
        console.log('🎯 Checking channel:', item.snippet.title, 'ID:', item.snippet.channelId);
        
        const channelResponse = await youtube.channels.list({
          part: ['snippet'],
          id: [item.snippet.channelId]
        });
        
        if (channelResponse.data.items && channelResponse.data.items.length > 0) {
          const channel = channelResponse.data.items[0];
          const customUrl = channel.snippet.customUrl;
          
          console.log('🏷️ Channel custom URL:', customUrl);
          
          // Check if this matches our handle
          if (customUrl === `@${handle}` || customUrl === handle || 
              channel.snippet.title.toLowerCase().includes(handle.toLowerCase())) {
            console.log('✅ Found matching channel:', item.snippet.channelId);
            return item.snippet.channelId;
          }
        }
      }
      
      // If no exact match, return the first result
      console.log('⚠️ No exact match, returning first result:', searchResponse.data.items[0].snippet.channelId);
      return searchResponse.data.items[0].snippet.channelId;
    }
  } catch (error) {
    console.error('❌ Error resolving channel:', error.message);
    console.error('🔧 Full error:', error);
  }

  throw new Error(`Channel not found: ${handle}`);
};

// Get YouTube channel info
app.get('/youtube/channel/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId: channelInput } = req.params;
    
    if (!channelInput) {
      return res.status(400).json({ error: 'Channel ID or handle required' });
    }

    // Resolve channel handle to ID
    const channelId = await resolveChannelId(channelInput);

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    // Get channel details
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      id: [channelId]
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channelResponse.data.items[0];
    
    res.json({
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url,
      subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics.videoCount || '0'),
      viewCount: parseInt(channel.statistics.viewCount || '0'),
      customUrl: channel.snippet.customUrl || null
    });
  } catch (error) {
    console.error('YouTube channel error:', error);
    if (error.message === 'Channel not found') {
      res.status(404).json({ error: 'Channel not found. Please check the channel ID or handle.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch YouTube channel' });
    }
  }
});

// Get YouTube videos for a channel
app.get('/youtube/videos/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId: channelInput } = req.params;
    const { maxResults = 20 } = req.query;
    
    if (!channelInput) {
      return res.status(400).json({ error: 'Channel ID or handle required' });
    }

    // Resolve channel handle to ID
    const channelId = await resolveChannelId(channelInput);

    const youtube = google.youtube({
      version: 'v3',
      auth: process.env.YOUTUBE_API_KEY
    });

    // Get channel's uploads playlist
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId]
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: parseInt(maxResults)
    });

    // Get detailed video info
    const videoIds = playlistResponse.data.items.map(item => item.snippet.resourceId.videoId);
    
    if (videoIds.length === 0) {
      return res.json([]);
    }
    
    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds
    });

    const videos = videosResponse.data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount || '0'),
      likeCount: parseInt(video.statistics.likeCount || '0'),
      commentCount: parseInt(video.statistics.commentCount || '0'),
      duration: video.contentDetails.duration,
      url: `https://www.youtube.com/watch?v=${video.id}`
    }));

    res.json(videos);
  } catch (error) {
    console.error('YouTube videos error:', error);
    res.status(500).json({ error: 'Failed to fetch YouTube videos' });
  }
});

// Create account
app.post('/accounts', authenticateToken, async (req, res) => {
  try {
    const { name, youtubeChannelId } = req.body;
    
    const account = {
      name,
      youtubeChannelId,
      ownerId: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('accounts').insertOne(account);
    
    // Add owner role
    await db.collection('userRoles').insertOne({
      userId: req.user.userId,
      accountId: result.insertedId,
      role: 'owner',
      createdAt: new Date()
    });

    res.json({ 
      id: result.insertedId,
      ...account 
    });
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get user accounts
app.get('/accounts', authenticateToken, async (req, res) => {
  try {
    // Get user info to determine filtering logic
    let user;
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('🔍 Account request - User ID:', req.user.userId, 'User Type:', req.user.userType);
    
    // Get user roles
    const userRoles = await db.collection('userRoles').find({
      userId: req.user.userId
    }).toArray();

    console.log('📋 User roles found:', userRoles.length);

    // Admin users should only see accounts where they are the actual owner
    if (user.role === 'admin') {
      console.log('👑 Admin user detected - returning only accounts where user is owner');
      
      // Get only accounts where the user is the owner (either by ownerId or youtubeAuthorizedBy)
      const ownedAccounts = await db.collection('accounts').find({
        $or: [
          { ownerId: req.user.userId },
          { youtubeAuthorizedBy: req.user.userId }
        ]
      }).toArray();
      
      // Mark all returned accounts as owned by the user
      const accountsWithRoles = ownedAccounts.map(account => ({
        ...account,
        userRole: 'owner'
      }));
      
      console.log('✅ Returning', accountsWithRoles.length, 'owned accounts to admin user');
      return res.json(accountsWithRoles);
    }

    // For non-admin users, check their specific roles
    if (userRoles.length === 0) {
      console.log('❌ No roles found for user, returning empty accounts');
      return res.json([]);
    }

    const accountIds = userRoles.map(ur => ur.accountId);
    let accounts = await db.collection('accounts').find({
      _id: { $in: accountIds }
    }).toArray();

    // Return accounts with their respective roles (both owner and editor)
    const accountsWithRoles = accounts
      .map(account => {
        const userRole = userRoles.find(ur => ur.accountId.equals(account._id));
        return {
          ...account,
          userRole: userRole ? userRole.role : 'editor'
        };
      });
      // Remove the filter - return all accounts the user has access to (owner or editor)

    res.json(accountsWithRoles);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Get accounts filtered for YouTube videos viewing
app.get('/accounts/youtube-accessible', authenticateToken, async (req, res) => {
  try {
    // Get user info to determine filtering logic
    let user;
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let accessibleAccounts = [];

    if (user.role === 'admin') {
      // For Google OAuth admins: show accounts where they are the owner (ownerId OR youtubeAuthorizedBy matches)
      // AND the account has YouTube tokens
      const allAccounts = await db.collection('accounts').find({
        youtubeAccessToken: { $exists: true },  // Only accounts with YouTube authorization
        $or: [
          { ownerId: req.user.userId },           // Accounts they created
          { youtubeAuthorizedBy: req.user.userId } // Accounts they authorized for YouTube
        ]
      }).toArray();

      accessibleAccounts = allAccounts.map(account => {
        // Determine user role based on ownership
        let userRole = 'editor';
        if (account.ownerId === req.user.userId || account.youtubeAuthorizedBy === req.user.userId) {
          userRole = 'owner';
        }
        
        return {
          ...account,
          userRole
        };
      });
    } else {
      // For editors: show only the accounts where they have editor role
      // AND the account has a YouTube channel configured
      const userRoles = await db.collection('userRoles').find({
        userId: req.user.userId,
        role: 'editor'
      }).toArray();

      const accountIds = userRoles.map(ur => ur.accountId);
      const accounts = await db.collection('accounts').find({
        _id: { $in: accountIds },
        youtubeChannelId: { $exists: true, $ne: null }  // Only accounts with YouTube channel configured
      }).toArray();

      accessibleAccounts = accounts.map(account => {
        const userRole = userRoles.find(ur => ur.accountId.equals(account._id));
        return {
          ...account,
          userRole: userRole.role
        };
      });
    }

    res.json(accessibleAccounts);
  } catch (error) {
    console.error('Get YouTube accessible accounts error:', error);
    res.status(500).json({ error: 'Failed to get YouTube accessible accounts' });
  }
});

// Upload video endpoint
app.post('/videos', authenticateToken, async (req, res) => {
  try {
    const { title, description, accountId, videoUrl, thumbnailUrl, cloudinaryPublicId, duration, format, fileSize, status } = req.body;
    
    const video = {
      title,
      description,
      accountId,
      videoUrl,
      thumbnailUrl,
      cloudinaryPublicId,
      duration,
      format,
      fileSize,
      status: 'pending',
      uploadedBy: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('videos').insertOne(video);
    
    res.json({ 
      id: result.insertedId,
      ...video 
    });
  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({ error: 'Failed to save video' });
  }
});

// Get videos
app.get('/videos', authenticateToken, async (req, res) => {
  try {
    const { accountIds, uploadedBy } = req.query;
    
    // Get user's accessible accounts to ensure they can only see videos from accounts they have access to
    let user;
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user roles to determine accessible accounts
    const userRoles = await db.collection('userRoles').find({
      userId: req.user.userId
    }).toArray();

    const accessibleAccountIds = userRoles.map(ur => ur.accountId.toString());
    
    let filter = {};
    
    // If specific accountIds are requested, ensure user has access to them
    if (accountIds) {
      const requestedAccountIds = accountIds.split(',');
      const allowedAccountIds = requestedAccountIds.filter(id => accessibleAccountIds.includes(id));
      
      if (allowedAccountIds.length === 0) {
        return res.json([]); // No accessible accounts
      }
      
      filter.accountId = { $in: allowedAccountIds };
    } else {
      // No specific accounts requested, show videos from all accessible accounts
      if (accessibleAccountIds.length === 0) {
        return res.json([]); // No accessible accounts
      }
      
      filter.accountId = { $in: accessibleAccountIds };
    }
    
    // Additional filter by uploader if specified (for specific use cases)
    if (uploadedBy) {
      filter.uploadedBy = uploadedBy;
    }
    
    const videos = await db.collection('videos').find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.json(videos);
  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// Publish approved video to YouTube
app.post('/api/videos/:videoId/publish', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    console.log('Publishing video to YouTube:', videoId);
    
    // Get the video details
    const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    if (video.status !== 'approved') {
      return res.status(400).json({ error: 'Video must be approved before publishing' });
    }
    
    // Get the account details with YouTube credentials
    const account = await db.collection('accounts').findOne({ _id: new ObjectId(video.accountId) });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    if (!account.youtubeAccessToken || !account.youtubeRefreshToken) {
      return res.status(400).json({ error: 'YouTube account not authorized. Please authorize YouTube first.' });
    }
    
    console.log('Found account with YouTube credentials:', account.name);
    
    // Verify user has permission to publish
    const userRole = await db.collection('userRoles').findOne({
      $or: [
        { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
        { userId: req.user.userId },
        { userId: new ObjectId(req.user.userId) }
      ],
      $or: [
        { accountId: new ObjectId(video.accountId) },
        { accountId: null } // Global admin
      ]
    });
    
    if (!userRole || userRole.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only account owners can publish videos.' });
    }
    
    try {
      // Prepare tokens for YouTube upload
      const youtubeTokens = {
        access_token: account.youtubeAccessToken,
        refresh_token: account.youtubeRefreshToken
      };
      
      // Upload to YouTube
      const youtubeVideoId = await uploadVideoToYouTube(video, youtubeTokens);
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
      
      console.log('Video successfully uploaded to YouTube:', youtubeUrl);
      
      // Update video record with YouTube details
      await db.collection('videos').updateOne(
        { _id: new ObjectId(videoId) },
        {
          $set: {
            status: 'published',
            youtubeVideoId: youtubeVideoId,
            youtubeUrl: youtubeUrl,
            publishedAt: new Date(),
            publishedBy: req.user.userId,
            updatedAt: new Date()
          }
        }
      );
      
      res.json({
        message: 'Video successfully published to YouTube',
        youtubeUrl: youtubeUrl,
        youtubeVideoId: youtubeVideoId
      });
      
    } catch (publishError) {
      console.error('YouTube publish error:', publishError);
      
      // Update video status to failed
      await db.collection('videos').updateOne(
        { _id: new ObjectId(videoId) },
        {
          $set: {
            status: 'publish_failed',
            publishError: publishError.message,
            updatedAt: new Date()
          }
        }
      );
      
      res.status(500).json({ 
        error: 'Failed to publish video to YouTube',
        details: publishError.message 
      });
    }
    
  } catch (error) {
    console.error('Publish endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to publish video to YouTube',
      details: error.message 
    });
  }
});

// Approve/reject video
app.patch('/videos/:videoId/status', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { status, adminNotes } = req.body;

    const updateData = {
      status,
      adminNotes,
      reviewedBy: req.user.userId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    };

    // If approved, publish to YouTube
    if (status === 'approved') {
      try {
        const video = await db.collection('videos').findOne({ _id: new ObjectId(videoId) });
        if (video) {
          const account = await db.collection('accounts').findOne({ _id: new ObjectId(video.accountId) });
          
          // Check if account has YouTube OAuth tokens
          if (account && account.youtubeAccessToken && account.youtubeRefreshToken) {
            console.log(`🎬 Starting real YouTube upload for "${video.title}"`);
            
            // Prepare tokens in the format expected by uploadVideoToYouTube
            const youtubeTokens = {
              access_token: account.youtubeAccessToken,
              refresh_token: account.youtubeRefreshToken
            };
            
            // Real YouTube upload
            const youtubeVideoId = await uploadVideoToYouTube(video, youtubeTokens);
            
            updateData.status = 'published';
            updateData.publishedAt = new Date();
            updateData.youtubeVideoId = youtubeVideoId;
            updateData.youtubeUploadStatus = 'completed';
            updateData.adminNotes = (adminNotes || '') + '\n\n✅ Video successfully uploaded to YouTube!';
            console.log(`✅ Video uploaded to YouTube with ID: ${youtubeVideoId}`);
          } else {
            // No YouTube OAuth tokens - can't upload yet
            updateData.status = 'approved';
            updateData.youtubeUploadStatus = 'pending_oauth';
            updateData.adminNotes = (adminNotes || '') + '\n\n⚠️ Video approved but YouTube upload requires OAuth authorization. Please authorize YouTube access in the Accounts tab.';
            console.log(`⚠️ Video approved but no YouTube OAuth tokens for account`);
          }
        }
      } catch (publishError) {
        console.error('YouTube publishing error:', publishError);
        updateData.status = 'publish_failed';
        updateData.youtubeUploadStatus = 'failed';
        updateData.adminNotes = (adminNotes || '') + '\n\n❌ YouTube publishing failed: ' + publishError.message;
      }
    }

    await db.collection('videos').updateOne(
      { _id: new ObjectId(videoId) },
      { $set: updateData }
    );

    res.json({ message: 'Video status updated successfully' });
  } catch (error) {
    console.error('Update video status error:', error);
    res.status(500).json({ error: 'Failed to update video status' });
  }
});

// Add editor to account
app.post('/accounts/:accountId/editors', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { email } = req.body;
    
    // Find user by email (could be Google OAuth user or email-registered user)
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found with this email address' });
    }
    
    // Use consistent user identifier (googleId for OAuth users, _id for email users)
    const userId = user.googleId || user._id.toString();
    
    // Check if user is already an editor for this account
    const existingRole = await db.collection('userRoles').findOne({
      userId: userId,
      accountId: accountId
    });
    
    if (existingRole) {
      return res.status(400).json({ error: 'User is already an editor for this account' });
    }
    
    // Add editor role
    await db.collection('userRoles').insertOne({
      userId: userId,
      accountId: accountId,
      role: 'editor',
      createdAt: new Date()
    });
    
    res.json({ message: 'Editor added successfully' });
  } catch (error) {
    console.error('Add editor error:', error);
    res.status(500).json({ error: 'Failed to add editor' });
  }
});

// Remove editor from account
app.delete('/accounts/:accountId/editors/:userId', authenticateToken, async (req, res) => {
  try {
    const { accountId, userId } = req.params;
    
    await db.collection('userRoles').deleteOne({
      userId: userId,
      accountId: accountId,
      role: 'editor'
    });
    
    res.json({ message: 'Editor removed successfully' });
  } catch (error) {
    console.error('Remove editor error:', error);
    res.status(500).json({ error: 'Failed to remove editor' });
  }
});

// Get account editors
app.get('/accounts/:accountId/editors', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const userRoles = await db.collection('userRoles').find({
      accountId: accountId,
      role: 'editor'
    }).toArray();
    
    const userIds = userRoles.map(ur => ur.userId);
    const users = await db.collection('users').find({
      $or: [
        { _id: { $in: userIds } },
        { googleId: { $in: userIds } }
      ]
    }).toArray();
    
    const editors = users.map(user => ({
      id: user._id || user.googleId,
      name: user.name,
      email: user.email,
      picture: user.picture
    }));
    
    res.json(editors);
  } catch (error) {
    console.error('Get editors error:', error);
    res.status(500).json({ error: 'Failed to get editors' });
  }
});

// Admin middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Admin: Get all users
app.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔍 Admin users request from:', req.user.userId);
    
    // Only show editors created by this admin, not all users
    // Get accounts owned by this admin
    const adminAccounts = await db.collection('accounts').find({
      ownerId: req.user.userId
    }).toArray();
    
    console.log('📋 Admin accounts found:', adminAccounts.length, adminAccounts.map(acc => ({ id: acc._id, name: acc.name })));
    
    if (adminAccounts.length === 0) {
      return res.json([]); // No accounts = no editors
    }
    
    const accountIds = adminAccounts.map(acc => acc._id);
    
    // Get user roles for these accounts (editors only)
    const userRoles = await db.collection('userRoles').find({
      accountId: { $in: accountIds },
      role: 'editor'
    }).toArray();
    
    console.log('📋 User roles found:', userRoles.length, userRoles.map(ur => ({ userId: ur.userId, accountId: ur.accountId, role: ur.role })));
    
    const editorUserIds = userRoles.map(ur => ur.userId);
    console.log('📋 Editor user IDs:', editorUserIds);
    
    if (editorUserIds.length === 0) {
      return res.json([]); // No editors
    }
    
    // Get the actual user records for these editors
    // Try to match both ObjectId and string formats
    const editors = await db.collection('users').find({
      $or: [
        { _id: { $in: editorUserIds.map(id => { 
          try { 
            return new ObjectId(id); 
          } catch { 
            return id; 
          } 
        }) } },
        { googleId: { $in: editorUserIds } }
      ]
    }).toArray();
    
    console.log('📋 Editors found:', editors.length, editors.map(e => ({ id: e._id, googleId: e.googleId, email: e.email, name: e.name })));
    
    // Add account information to each editor
    const editorsWithAccounts = editors.map(editor => {
      const editorId = editor._id?.toString() || editor.googleId;
      const editorRoles = userRoles.filter(ur => ur.userId === editorId);
      const editorAccounts = editorRoles.map(role => {
        const account = adminAccounts.find(acc => acc._id.equals(role.accountId));
        return account ? account.name : 'Unknown Account';
      });
      
      return {
        ...editor,
        accounts: editorAccounts
      };
    });
    
    console.log('📋 Final editors with accounts:', editorsWithAccounts.length);
    res.json(editorsWithAccounts);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Admin: Create editor account (email/password)
app.post('/admin/create-editor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Create editor user (without Google OAuth)
    const user = {
      email,
      name,
      role: 'user', // Regular user role, not admin
      authType: 'email', // Mark as email/password auth
      password, // In production, hash this password!
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(user);
    const newUserId = result.insertedId.toString();
    
    // Auto-assign this editor to accounts owned by the current admin only
    const adminAccounts = await db.collection('accounts').find({
      ownerId: req.user.userId
    }).toArray();
    
    if (adminAccounts.length > 0) {
      const userRoles = adminAccounts.map(account => ({
        userId: newUserId,
        accountId: account._id,
        role: 'editor',
        createdAt: new Date()
      }));
      
      await db.collection('userRoles').insertMany(userRoles);
      console.log(`✅ Auto-assigned editor ${email} to ${adminAccounts.length} admin-owned YouTube accounts`);
    }
    
    res.json({
      id: newUserId,
      name: user.name,
      email: user.email,
      role: user.role,
      authType: user.authType,
      assignedAccounts: adminAccounts.length
    });
  } catch (error) {
    console.error('Create editor error:', error);
    res.status(500).json({ error: 'Failed to create editor account' });
  }
});

// Admin: Delete user
app.delete('/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🗑️ DELETE request - User ID:', userId, 'Admin ID:', req.user.userId);
    
    // Find user to delete
    let userToDelete;
    try {
      // Try to find by ObjectId first (if it's a valid ObjectId)
      if (ObjectId.isValid(userId)) {
        userToDelete = await db.collection('users').findOne({
          $or: [
            { _id: new ObjectId(userId) },
            { googleId: userId }
          ]
        });
      } else {
        // If not a valid ObjectId, search by googleId only
        userToDelete = await db.collection('users').findOne({ googleId: userId });
      }
    } catch (error) {
      console.log('🗑️ Error searching user:', error.message);
      // Fallback to googleId search
      userToDelete = await db.collection('users').findOne({ googleId: userId });
    }
    
    console.log('🗑️ User to delete found:', userToDelete ? { id: userToDelete._id || userToDelete.googleId, email: userToDelete.email } : 'NOT FOUND');
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    // Check if this user is an editor for accounts owned by the current admin
    const adminAccounts = await db.collection('accounts').find({
      ownerId: req.user.userId
    }).toArray();
    
    console.log('🗑️ Admin accounts found:', adminAccounts.length, adminAccounts.map(acc => ({ id: acc._id, name: acc.name })));
    
    if (adminAccounts.length === 0) {
      return res.status(403).json({ error: 'You have no accounts to manage editors for' });
    }
    
    const accountIds = adminAccounts.map(acc => acc._id);
    const userIdToDelete = userToDelete._id?.toString() || userToDelete.googleId;
    
    console.log('🗑️ Looking for user roles for userID:', userIdToDelete, 'in accounts:', accountIds.map(id => id.toString()));
    console.log('🗑️ User object found:', { 
      _id: userToDelete._id?.toString(), 
      googleId: userToDelete.googleId, 
      email: userToDelete.email,
      authType: userToDelete.authType 
    });
    
    // Check if this user has editor roles for any of the admin's accounts
    // Try both possible userId formats
    const userRoles = await db.collection('userRoles').find({
      $or: [
        { userId: userIdToDelete, accountId: { $in: accountIds }, role: 'editor' },
        { userId: userToDelete._id, accountId: { $in: accountIds }, role: 'editor' }
      ]
    }).toArray();
    
    console.log('🗑️ User roles found:', userRoles.length, userRoles.map(ur => ({ userId: ur.userId, accountId: ur.accountId, role: ur.role })));
    
    if (userRoles.length === 0) {
      return res.status(403).json({ error: 'You can only delete editors from your own accounts' });
    }
    
    // Delete user roles first
    const deleteRolesResult = await db.collection('userRoles').deleteMany({
      $or: [
        { userId: userIdToDelete, accountId: { $in: accountIds }, role: 'editor' },
        { userId: userToDelete._id, accountId: { $in: accountIds }, role: 'editor' }
      ]
    });
    
    console.log('🗑️ Deleted roles:', deleteRolesResult.deletedCount);
    
    // Check if user has any other roles
    const remainingRoles = await db.collection('userRoles').find({
      $or: [
        { userId: userIdToDelete },
        { userId: userToDelete._id }
      ]
    }).toArray();
    
    console.log('🗑️ Remaining roles:', remainingRoles.length);
    
    // Only delete the user if they have no other roles
    if (remainingRoles.length === 0) {
      let deleteUserResult;
      if (ObjectId.isValid(userId)) {
        deleteUserResult = await db.collection('users').deleteOne({
          $or: [
            { _id: new ObjectId(userId) },
            { googleId: userId }
          ]
        });
      } else {
        deleteUserResult = await db.collection('users').deleteOne({ googleId: userId });
      }
      console.log('🗑️ Deleted user:', deleteUserResult.deletedCount);
    }
    
    console.log('🗑️ Delete operation completed successfully');
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('🗑️ Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Cloudinary upload endpoint
app.post('/upload/cloudinary', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { resourceType = 'auto' } = req.body;

    // Convert buffer to base64 data URL
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary using server-side SDK
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      resource_type: resourceType,
      folder: 'video_uploads',
      use_filename: true,
      unique_filename: true
    });

    res.json({
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      thumbnail_url: uploadResult.thumbnail_url,
      duration: uploadResult.duration,
      format: uploadResult.format,
      bytes: uploadResult.bytes
    });

  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Failed to upload to Cloudinary: ' + error.message });
  }
});

// Real YouTube video upload function
const uploadVideoToYouTube = async (videoData, youtubeTokens) => {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials(youtubeTokens);

    const youtube = google.youtube({
      version: 'v3',
      auth: oauth2Client
    });

    // Download video from Cloudinary
    const videoResponse = await axios.get(videoData.videoUrl, {
      responseType: 'stream'
    });

    // Upload to YouTube
    const uploadResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: videoData.title,
          description: videoData.description,
          tags: ['uploaded', 'video'],
          categoryId: '22' // People & Blogs category
        },
        status: {
          privacyStatus: 'public', // or 'private', 'unlisted'
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: videoResponse.data
      }
    });

    console.log(`✅ Video uploaded to YouTube: ${uploadResponse.data.id}`);
    return uploadResponse.data.id;

  } catch (error) {
    console.error('YouTube upload error:', error);
    throw new Error(`YouTube upload failed: ${error.message}`);
  }
};

// YouTube OAuth endpoints
app.get('/auth/youtube', authenticateToken, async (req, res) => {
  try {
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${req.protocol}://${req.get('host')}/auth/youtube/callback`
    );

    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube'
    ];

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ userId: req.user.userId })
    });

    res.redirect(url);
  } catch (error) {
    console.error('YouTube OAuth error:', error);
    res.status(500).json({ error: 'Failed to initiate YouTube OAuth' });
  }
});

// Save YouTube access token for account
app.post('/accounts/:accountId/youtube-token', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { accessToken, refreshToken } = req.body;
    
    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required' });
    }
    
    // Update account with YouTube tokens
    await db.collection('accounts').updateOne(
      { _id: new ObjectId(accountId) },
      { 
        $set: { 
          youtubeAccessToken: accessToken,
          youtubeRefreshToken: refreshToken,
          youtubeTokenUpdated: new Date()
        }
      }
    );
    
    res.json({ message: 'YouTube token saved successfully' });
  } catch (error) {
    console.error('Save YouTube token error:', error);
    res.status(500).json({ error: 'Failed to save YouTube token' });
  }
});

// Get YouTube authorization URL
app.get('/youtube/auth-url/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    console.log('YouTube auth request for account:', accountId, 'by user:', req.user.userId, 'role:', req.user.role);
    
    // Get user info to check if they're admin
    let user;
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    
    // Admin users can authorize YouTube for any account
    if (user && user.role === 'admin') {
      console.log('👑 Admin user - allowing YouTube authorization for any account');
    } else {
      // For non-admin users, verify they have access to this account
      const accountObjectId = new ObjectId(accountId);
      const userRole = await db.collection('userRoles').findOne({
        userId: req.user.userId,
        accountId: accountObjectId
      });
      
      console.log('User role found:', userRole);
      
      if (!userRole || userRole.role !== 'owner') {
        console.log('Access denied for user:', req.user.userId, 'role:', userRole?.role);
        return res.status(403).json({ error: 'Access denied. Only account owners can authorize YouTube.' });
      }
    }
    
    // Use the redirect URI that matches your Google Cloud Console configuration
    const redirectUri = `http://localhost:3001/auth/youtube/callback`;
    const state = `${req.params.accountId}:${req.user.userId}`; // Pass account ID and user ID as state parameter
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.YOUTUBE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=https://www.googleapis.com/auth/youtube.upload&` +
      `response_type=code&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;
    
    res.json({ authUrl, accountId: req.params.accountId });
  } catch (error) {
    console.error('Get auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// YouTube OAuth callback
app.get('/auth/youtube/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('YouTube OAuth error:', error);
      return res.send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    if (!code || !state) {
      return res.send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Missing authorization code or account ID</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
    
    const [accountId, userId] = state.split(':');
    const redirectUri = `http://localhost:3001/auth/youtube/callback`;
    
    console.log('YouTube callback received:', { accountId, userId, codeLength: code.length });
    
    // Exchange code for tokens
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    
    const { access_token, refresh_token } = response.data;
    console.log('Received tokens:', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token });
    
    // Save tokens to account
    await db.collection('accounts').updateOne(
      { _id: new ObjectId(accountId) },
      { 
        $set: { 
          youtubeAccessToken: access_token,
          youtubeRefreshToken: refresh_token,
          youtubeTokenUpdated: new Date(),
          youtubeAuthorizedBy: userId  // Track which user authorized YouTube access
        }
      }
    );
    
    console.log(`YouTube tokens saved for account ${accountId} by user ${userId}`);
    
    // Send success page that closes the popup
    res.send(`
      <html>
        <head>
          <title>YouTube Authorization Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ YouTube Authorization Successful!</h1>
          <p>You can now publish videos to YouTube. This window will close automatically.</p>
          <script>
            // Send message to parent window
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'YOUTUBE_AUTH_SUCCESS', 
                accountId: '${accountId}' 
              }, '*');
            }
            setTimeout(() => window.close(), 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('YouTube callback error:', error);
    res.send(`
      <html>
        <body>
          <h1>Authorization Failed</h1>
          <p>Error processing authorization: ${error.message}</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
});

// Exchange code for tokens (updated to match redirect URI)
app.post('/youtube/exchange-code', authenticateToken, async (req, res) => {
  try {
    const { code, accountId } = req.body;
    const redirectUri = 'http://localhost:3001/auth/youtube/callback';
    
    console.log('Exchanging code for tokens:', { accountId, codeLength: code?.length });
    
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.YOUTUBE_CLIENT_ID,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });
    
    const { access_token, refresh_token } = response.data;
    console.log('Received tokens:', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token });
    
    // Save tokens to account
    await db.collection('accounts').updateOne(
      { _id: new ObjectId(accountId) },
      { 
        $set: { 
          youtubeAccessToken: access_token,
          youtubeRefreshToken: refresh_token,
          youtubeTokenUpdated: new Date()
        }
      }
    );
    
    console.log(`YouTube tokens saved for account ${accountId}`);
    res.json({ message: 'YouTube authorization successful' });
  } catch (error) {
    console.error('Exchange code error:', error.response?.data || error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

// Test endpoint to check YouTube authorization status
app.get('/test/youtube-auth-status', authenticateToken, async (req, res) => {
  try {
    const accounts = await db.collection('accounts').find({}).toArray();
    const accountsWithAuth = accounts.map(acc => ({
      id: acc._id,
      name: acc.name,
      hasYouTubeTokens: !!(acc.youtubeAccessToken && acc.youtubeRefreshToken),
      tokenUpdated: acc.youtubeTokenUpdated
    }));
    
    res.json({ accounts: accountsWithAuth });
  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// Start server
async function startServer() {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
