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

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, 'https://www.videohub.world', 'https://videohub-brown-alpha.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
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
let mongoClient;

async function connectToMongoDB() {
  if (db) return db;
  
  try {
    mongoClient = new MongoClient(process.env.MONGODB_URI, {
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
      serverSelectionTimeoutMS: 10000
    });
    
    await mongoClient.connect();
    db = mongoClient.db('video_publish_party');
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Google OAuth2 client for general auth
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://www.videohub.world'
    : 'http://localhost:8080'
);

// Separate OAuth2 client for YouTube API operations
const youtubeOauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://www.videohub.world/api/auth/youtube/callback'
    : 'http://localhost:3001/api/auth/youtube/callback'
);

// JWT middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = await connectToMongoDB();
    
    let user;
    const query = decoded.userType === 'email' 
      ? { _id: new ObjectId(decoded.userId) }
      : { googleId: decoded.userId };
    
    user = await db.collection('users').findOne(query);
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    req.user = {
      userId: decoded.userId,
      userType: decoded.userType,
      email: user.email,
      name: user.name,
      role: user.role
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = await connectToMongoDB();
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

// Google OAuth login with authorization code
app.post('/api/auth/google', async (req, res) => {
  console.log('🔐 OAuth request received:', { hasCode: !!req.body.code });
  
  try {
    const { code } = req.body;
    
    if (!code) {
      console.log('❌ No authorization code provided');
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('🔄 Exchanging authorization code for tokens...');
    const startTime = Date.now();
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    console.log(`✅ Token exchange completed in ${Date.now() - startTime}ms`);
    
    oauth2Client.setCredentials(tokens);

    console.log('🔍 Verifying ID token...');
    // Verify the ID token
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    console.log('✅ ID token verified successfully');
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    console.log('Google OAuth user data:', { googleId, email, name, role: 'admin' });
    
    const db = await connectToMongoDB();
    let user = await db.collection('users').findOne({ googleId });
    
    console.log('Found existing user by googleId:', user ? { id: user._id, email: user.email, role: user.role } : 'none');
    
    if (!user) {
      user = await db.collection('users').findOne({ email });
      console.log('Found existing user by email:', user ? { id: user._id, email: user.email, role: user.role } : 'none');
      if (user) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { googleId, picture, role: 'admin' } }  // Also update role to admin
        );
        user.googleId = googleId;
        user.picture = picture;
        user.role = 'admin';  // Update in memory object too
        console.log('Updated existing user to admin role');
      } else {
        const newUser = {
          googleId,
          email,
          name,
          picture,
          role: 'admin',
          createdAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
        console.log('Created new user with admin role');
      }
    } else {
      // User exists with googleId, ensure they have admin role
      if (user.role !== 'admin') {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { role: 'admin' } }
        );
        user.role = 'admin';
        console.log('Updated existing Google user to admin role');
      } else {
        console.log('User already has admin role');
      }
    }
    
    // CRITICAL: Create super admin userRole entry for OAuth admins
    if (user.role === 'admin') {
      console.log('🔧 Creating/ensuring owner userRole entry for admin:', user.email);
      
      // Check if admin already has an owner role entry
      const existingOwnerRole = await db.collection('userRoles').findOne({
        userId: user.googleId,
        role: 'owner',
        isGlobalAdmin: true
      });
      
      if (!existingOwnerRole) {
        // Create a special owner role entry (not tied to any specific account)
        await db.collection('userRoles').insertOne({
          userId: user.googleId,
          accountId: null, // null means "global admin" - access to all accounts
          role: 'owner',
          createdAt: new Date(),
          isGlobalAdmin: true
        });
        console.log('✅ Created global owner userRole entry');
      } else {
        console.log('✅ Global owner userRole entry already exists');
      }
    }
    
    const token = jwt.sign(
      { 
        userId: user.googleId,
        userType: 'google',
        email: user.email,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { 
        id: user.googleId, 
        email: user.email, 
        name: user.name, 
        picture: user.picture, 
        role: user.role 
      }, 
      token 
    });
  } catch (error) {
    console.error('❌ Google auth error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    
    // Provide more specific error messages
    if (error.message?.includes('invalid_grant')) {
      return res.status(400).json({ error: 'Authorization code expired or invalid. Please try signing in again.' });
    } else if (error.message?.includes('redirect_uri_mismatch')) {
      return res.status(400).json({ error: 'OAuth configuration error. Please contact support.' });
    }
    
    res.status(400).json({ error: 'Authentication failed. Please try again.' });
  }
});

// Google OAuth login with ID token (legacy endpoint)
app.post('/api/auth/google/token', async (req, res) => {
  try {
    const { credential } = req.body;
    
    const ticket = await oauth2Client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;
    
    const db = await connectToMongoDB();
    let user = await db.collection('users').findOne({ googleId });
    
    if (!user) {
      user = await db.collection('users').findOne({ email });
      if (user) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { googleId, picture, role: 'admin' } }  // Also update role to admin
        );
        user.googleId = googleId;
        user.picture = picture;
        user.role = 'admin';  // Update in memory object too
      } else {
        const newUser = {
          googleId,
          email,
          name,
          picture,
          role: 'admin',
          createdAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }
    } else {
      // User exists with googleId, ensure they have admin role
      if (user.role !== 'admin') {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { role: 'admin' } }
        );
        user.role = 'admin';
      }
    }
    
    // CRITICAL: Create super admin userRole entry for OAuth admins (legacy endpoint)
    if (user.role === 'admin') {
      console.log('🔧 [Legacy] Creating/ensuring owner userRole entry for admin:', user.email);
      
      // Check if admin already has an owner role entry
      const existingOwnerRole = await db.collection('userRoles').findOne({
        userId: user.googleId,
        role: 'owner',
        isGlobalAdmin: true
      });
      
      if (!existingOwnerRole) {
        // Create a special owner role entry (not tied to any specific account)
        await db.collection('userRoles').insertOne({
          userId: user.googleId,
          accountId: null, // null means "global admin" - access to all accounts
          role: 'owner',
          createdAt: new Date(),
          isGlobalAdmin: true
        });
        console.log('✅ [Legacy] Created global owner userRole entry');
      } else {
        console.log('✅ [Legacy] Global owner userRole entry already exists');
      }
    }
    
    const token = jwt.sign(
      { 
        userId: user.googleId,
        userType: 'google',
        email: user.email,
        name: user.name,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { 
        id: user.googleId, 
        email: user.email, 
        name: user.name, 
        picture: user.picture, 
        role: user.role 
      }, 
      token 
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(400).json({ error: 'Invalid token' });
  }
});

// Email/password login
app.post('/api/auth/email', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = await connectToMongoDB();
    const user = await db.collection('users').findOne({ 
      email,
      authType: 'email'
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
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

    res.json({
      token,
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
app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const db = await connectToMongoDB();
    let user;
    
    const query = req.user.userType === 'email' 
      ? { _id: new ObjectId(req.user.userId) }
      : { googleId: req.user.userId };
    
    user = await db.collection('users').findOne(query);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user._id || user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Create account
app.post('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const { name, youtubeChannelId } = req.body;
    
    const db = await connectToMongoDB();
    const account = {
      name,
      youtubeChannelId,
      ownerId: req.user.userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('accounts').insertOne(account);
    
    console.log('🎯 Creating account for user:', req.user.userId, 'role:', req.user.role);
    
    // Add owner role - always use 'owner' for account creators regardless of user role
    await db.collection('userRoles').insertOne({
      userId: req.user.userId,
      accountId: result.insertedId,
      role: 'owner',  // Always owner for account creator
      createdAt: new Date()
    });

    console.log('✅ Account created with owner role assigned');

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
app.get('/api/accounts', authenticateToken, async (req, res) => {
  // Set no-cache headers to prevent 304 responses
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  try {
    const db = await connectToMongoDB();
    
    // Get user roles - make sure to check if userId exists and is valid
    const userId = req.user.userId;
    if (!userId) {
      console.log('No userId found in request');
      return res.json([]);
    }

    console.log('🔍 Account request - User ID:', userId, 'User Type:', req.user.userType, 'Role:', req.user.role);
    
    let accounts = [];
    let userRoles = [];
    
    try {
      // For admin users, they should only see accounts where they are the actual owner
      if (req.user.role === 'admin') {
        console.log('👑 Admin user detected - returning only accounts where user is owner');
        
        // Get only accounts where the user is the owner (either by ownerId or youtubeAuthorizedBy)
        const ownedAccounts = await db.collection('accounts').find({
          $or: [
            { ownerId: userId },
            { youtubeAuthorizedBy: userId }
          ]
        }).toArray();
        
        // Mark all returned accounts as owned by the user
        const accountsWithRoles = ownedAccounts.map(account => ({
          ...account,
          userRole: 'owner'
        }));
        
        console.log('✅ Returning', accountsWithRoles.length, 'owned accounts to admin user');
        return res.json(accountsWithRoles || []);
      }
      
      // For non-admin users, get roles normally
      if (req.user.userType === 'email') {
        userRoles = await db.collection('userRoles').find({
          $or: [
            { userId: new ObjectId(userId) },  // ObjectId format
            { userId: userId }                  // String format
          ]
        }).toArray();
      } else {
        // For Google users, userId is the googleId (string)
        userRoles = await db.collection('userRoles').find({
          userId: userId
        }).toArray();
      }
    } catch (error) {
      console.error('Error finding user roles:', error);
      return res.json([]);
    }

    console.log('📋 User roles found:', userRoles.length);

    if (!userRoles || userRoles.length === 0) {
      console.log('❌ No roles found for user, returning empty accounts');
      return res.json([]);
    }

    const accountIds = userRoles.map(ur => ur.accountId);
    accounts = await db.collection('accounts').find({
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

    console.log('✅ Final response for accounts endpoint:', {
      userId: userId,
      userRole: req.user.role,
      accountsCount: accountsWithRoles.length,
      accountsData: accountsWithRoles.map(acc => ({
        id: acc._id,
        name: acc.name,
        userRole: acc.userRole
      }))
    });
    
    res.json(accountsWithRoles || []);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts', accounts: [] });
  }
});

// Upload video endpoint
app.post('/api/videos', authenticateToken, async (req, res) => {
  try {
    const { title, description, accountId, videoUrl, thumbnailUrl, cloudinaryPublicId, duration, format, fileSize } = req.body;
    
    const db = await connectToMongoDB();
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
app.get('/api/videos', authenticateToken, async (req, res) => {
  try {
    const { accountIds } = req.query;
    
    const db = await connectToMongoDB();
    
    // Get user roles to determine accessible accounts
    const userRoles = await db.collection('userRoles').find({
      userId: req.user.userId
    }).toArray();

    const accessibleAccountIds = userRoles.map(ur => ur.accountId.toString());
    
    let filter = {};
    
    if (accountIds) {
      const requestedAccountIds = accountIds.split(',');
      const allowedAccountIds = requestedAccountIds.filter(id => accessibleAccountIds.includes(id));
      
      if (allowedAccountIds.length === 0) {
        return res.json([]);
      }
      
      filter.accountId = { $in: allowedAccountIds };
    } else {
      if (accessibleAccountIds.length === 0) {
        return res.json([]);
      }
      
      filter.accountId = { $in: accessibleAccountIds };
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

// Approve/reject video
app.patch('/api/videos/:videoId/status', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { status, adminNotes } = req.body;

    const db = await connectToMongoDB();
    const updateData = {
      status,
      adminNotes,
      reviewedBy: req.user.userId,
      reviewedAt: new Date(),
      updatedAt: new Date()
    };

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

// Admin: Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = await connectToMongoDB();
    
    // Get accounts owned by this admin
    const adminAccounts = await db.collection('accounts').find({
      ownerId: req.user.userId
    }).toArray();
    
    if (adminAccounts.length === 0) {
      return res.json([]);
    }
    
    const accountIds = adminAccounts.map(acc => acc._id);
    
    // Get user roles for these accounts (editors only)
    const userRoles = await db.collection('userRoles').find({
      accountId: { $in: accountIds },
      role: 'editor'
    }).toArray();
    
    const editorUserIds = userRoles.map(ur => ur.userId);
    
    if (editorUserIds.length === 0) {
      return res.json([]);
    }
    
    // Get the actual user records for these editors
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
    
    res.json(editorsWithAccounts);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Admin: Create editor account
app.post('/api/admin/create-editor', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    const db = await connectToMongoDB();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Create editor user
    const user = {
      email,
      name,
      role: 'user',
      authType: 'email',
      password,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('users').insertOne(user);
    const newUserId = result.insertedId.toString();
    
    // Auto-assign to admin's accounts
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
app.delete('/api/admin/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const db = await connectToMongoDB();
    
    // Find user to delete
    let userToDelete;
    if (ObjectId.isValid(userId)) {
      userToDelete = await db.collection('users').findOne({
        $or: [
          { _id: new ObjectId(userId) },
          { googleId: userId }
        ]
      });
    } else {
      userToDelete = await db.collection('users').findOne({ googleId: userId });
    }
    
    if (!userToDelete) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }
    
    const userIdToDelete = userToDelete._id?.toString() || userToDelete.googleId;
    
    // Delete user roles
    await db.collection('userRoles').deleteMany({
      $or: [
        { userId: userIdToDelete },
        { userId: userToDelete._id }
      ]
    });
    
    // Delete user
    if (ObjectId.isValid(userId)) {
      await db.collection('users').deleteOne({
        $or: [
          { _id: new ObjectId(userId) },
          { googleId: userId }
        ]
      });
    } else {
      await db.collection('users').deleteOne({ googleId: userId });
    }
    
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Cloudinary upload endpoint
app.post('/api/upload/cloudinary', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { resourceType = 'auto' } = req.body;

    // Convert buffer to base64 data URL
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = `data:${req.file.mimetype};base64,${b64}`;

    // Upload to Cloudinary
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

// Export for Vercel
export default app;

// Initialize MongoDB connection
connectToMongoDB().catch(console.error);

// Get editors for a specific account
app.get('/api/accounts/:accountId/editors', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const db = await connectToMongoDB();
    
    // Verify user has access to this account
    const accountObjectId = new ObjectId(accountId);
    const userRole = await db.collection('userRoles').findOne({
      $or: [
        { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
        { userId: req.user.userId }
      ],
      accountId: accountObjectId
    });
    
    if (!userRole || userRole.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only account owners can view editors.' });
    }
    
    // Get all editors for this account
    const editorRoles = await db.collection('userRoles').find({
      accountId: accountObjectId,
      role: 'editor'
    }).toArray();
    
    if (editorRoles.length === 0) {
      return res.json([]);
    }
    
    // Get editor user details
    const editorUserIds = editorRoles.map(ur => ur.userId);
    const editors = await db.collection('users').find({
      $or: [
        { _id: { $in: editorUserIds.filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id)) } },
        { googleId: { $in: editorUserIds.filter(id => !ObjectId.isValid(id)) } }
      ]
    }).toArray();
    
    const editorsWithRoles = editors.map(editor => ({
      id: editor._id?.toString() || editor.googleId,
      name: editor.name,
      email: editor.email,
      role: 'editor',
      addedAt: editorRoles.find(ur => 
        (ur.userId === editor._id?.toString() || ur.userId === editor.googleId)
      )?.createdAt
    }));
    
    res.json(editorsWithRoles);
  } catch (error) {
    console.error('Get account editors error:', error);
    res.status(500).json({ error: 'Failed to get account editors' });
  }
});

// Add editor to account
app.post('/api/accounts/:accountId/editors', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const db = await connectToMongoDB();
    
    // Verify user has access to this account
    const accountObjectId = new ObjectId(accountId);
    const userRole = await db.collection('userRoles').findOne({
      $or: [
        { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
        { userId: req.user.userId }
      ],
      accountId: accountObjectId
    });
    
    if (!userRole || userRole.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only account owners can add editors.' });
    }
    
    // Find the user to add as editor
    const userToAdd = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found with this email' });
    }
    
    const editorUserId = userToAdd._id || userToAdd.googleId;
    
    // Check if user is already an editor of this account
    const existingRole = await db.collection('userRoles').findOne({
      userId: editorUserId,
      accountId: accountObjectId
    });
    
    if (existingRole) {
      return res.status(400).json({ error: 'User is already assigned to this account' });
    }
    
    // Add user as editor
    const newRole = {
      userId: editorUserId,
      accountId: accountObjectId,
      role: 'editor',
      createdAt: new Date()
    };
    
    await db.collection('userRoles').insertOne(newRole);
    
    res.json({
      message: 'Editor added successfully',
      editor: {
        id: editorUserId,
        name: userToAdd.name,
        email: userToAdd.email,
        role: 'editor'
      }
    });
  } catch (error) {
    console.error('Add editor error:', error);
    res.status(500).json({ error: 'Failed to add editor' });
  }
});

// Remove editor from account
app.delete('/api/accounts/:accountId/editors/:editorId', authenticateToken, async (req, res) => {
  try {
    const { accountId, editorId } = req.params;
    const db = await connectToMongoDB();
    
    // Verify user has access to this account
    const accountObjectId = new ObjectId(accountId);
    const userRole = await db.collection('userRoles').findOne({
      $or: [
        { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
        { userId: req.user.userId }
      ],
      accountId: accountObjectId
    });
    
    if (!userRole || userRole.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only account owners can remove editors.' });
    }
    
    // Remove the editor role
    const result = await db.collection('userRoles').deleteOne({
      userId: editorId,
      accountId: accountObjectId,
      role: 'editor'
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Editor role not found' });
    }
    
    res.json({ message: 'Editor removed successfully' });
  } catch (error) {
    console.error('Remove editor error:', error);
    res.status(500).json({ error: 'Failed to remove editor' });
  }
});

// YouTube authorization endpoints

// Get YouTube authorization URL
app.get('/api/youtube/auth-url/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    const db = await connectToMongoDB();
    
    console.log('YouTube auth request for account:', accountId, 'by user:', req.user.userId, 'role:', req.user.role);
    
    // Admin users can authorize YouTube for any account
    if (req.user.role === 'admin') {
      console.log('👑 Admin user - allowing YouTube authorization for any account');
    } else {
      // For non-admin users, verify they have access to this account
      const accountObjectId = new ObjectId(accountId);
      const userRole = await db.collection('userRoles').findOne({
        $or: [
          { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
          { userId: req.user.userId }
        ],
        accountId: accountObjectId
      });
      
      console.log('User role found:', userRole);
      
      if (!userRole || userRole.role !== 'owner') {
        console.log('Access denied for user:', req.user.userId, 'role:', userRole?.role);
        return res.status(403).json({ error: 'Access denied. Only account owners can authorize YouTube.' });
      }
    }
    
    // Generate authorization URL with YouTube scope
    const authUrl = youtubeOauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ],
      state: accountId // Pass account ID in state parameter
    });
    
    console.log('Generated YouTube auth URL for account:', accountId);
    res.json({ authUrl });
  } catch (error) {
    console.error('YouTube auth URL error:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// YouTube OAuth callback
app.get('/api/auth/youtube/callback', async (req, res) => {
  try {
    const { code, state: accountId } = req.query;
    
    console.log('YouTube callback received:', { code: !!code, accountId });
    
    if (!code) {
      console.log('No authorization code provided');
      return res.status(400).send('Authorization code not provided');
    }
    
    if (!accountId) {
      console.log('No account ID provided in state');
      return res.status(400).send('Account ID not provided');
    }
    
    console.log('Exchanging code for tokens...');
    // Exchange authorization code for tokens
    const { tokens } = await youtubeOauth2Client.getToken(code);
    youtubeOauth2Client.setCredentials(tokens);
    
    console.log('Tokens received, getting channel info...');
    // Get YouTube channel information
    const youtube = google.youtube({ version: 'v3', auth: youtubeOauth2Client });
    const channelResponse = await youtube.channels.list({
      part: ['snippet'],
      mine: true
    });
    
    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      console.log('No YouTube channel found');
      return res.status(400).send('No YouTube channel found for this account');
    }
    
    const channel = channelResponse.data.items[0];
    const channelId = channel.id;
    const channelTitle = channel.snippet.title;
    
    console.log('Channel found:', { channelId, channelTitle });
    
    // Store YouTube credentials and channel info in database
    const db = await connectToMongoDB();
    const updateResult = await db.collection('accounts').updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          youtubeChannelId: channelId,
          youtubeChannelTitle: channelTitle,
          youtubeAccessToken: tokens.access_token,
          youtubeRefreshToken: tokens.refresh_token,
          youtubeTokenExpiry: tokens.expiry_date,
          youtubeAuthorizedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
    
    console.log('Database update result:', updateResult);
    
    // Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            console.log('Sending success message to parent window');
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_SUCCESS',
              accountId: '${accountId}',
              channelId: '${channelId}',
              channelTitle: '${channelTitle}'
            }, '*');
            window.close();
          </script>
          <p>Authorization successful! You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('YouTube callback error:', error);
    res.status(500).send(`
      <html>
        <body>
          <script>
            console.log('Sending error message to parent window');
            window.opener.postMessage({
              type: 'YOUTUBE_AUTH_ERROR',
              error: 'Authorization failed: ${error.message}'
            }, '*');
            window.close();
          </script>
          <p>Authorization failed: ${error.message}</p>
        </body>
      </html>
    `);
  }
});

// Publish approved video to YouTube
app.post('/api/videos/:videoId/publish', authenticateToken, async (req, res) => {
  try {
    const { videoId } = req.params;
    const db = await connectToMongoDB();
    
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
    
    if (!account.youtubeAccessToken || !account.youtubeChannelId) {
      return res.status(400).json({ error: 'YouTube account not authorized. Please authorize YouTube first.' });
    }
    
    console.log('Found account with YouTube credentials:', account.name);
    
    // Verify user has permission to publish
    const userRole = await db.collection('userRoles').findOne({
      $or: [
        { userId: req.user.userType === 'email' ? new ObjectId(req.user.userId) : req.user.userId },
        { userId: req.user.userId }
      ],
      accountId: new ObjectId(video.accountId)
    });
    
    if (!userRole || userRole.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Only account owners can publish videos.' });
    }
    
    // Set up YouTube OAuth client with stored tokens
    const publishOauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    publishOauth2Client.setCredentials({
      access_token: account.youtubeAccessToken,
      refresh_token: account.youtubeRefreshToken,
      expiry_date: account.youtubeTokenExpiry
    });
    
    // Check if token needs refresh
    if (account.youtubeTokenExpiry && new Date() > new Date(account.youtubeTokenExpiry)) {
      console.log('Refreshing YouTube token...');
      const { credentials } = await publishOauth2Client.refreshAccessToken();
      publishOauth2Client.setCredentials(credentials);
      
      // Update stored tokens
      await db.collection('accounts').updateOne(
        { _id: new ObjectId(video.accountId) },
        {
          $set: {
            youtubeAccessToken: credentials.access_token,
            youtubeRefreshToken: credentials.refresh_token,
            youtubeTokenExpiry: credentials.expiry_date,
            updatedAt: new Date()
          }
        }
      );
    }
    
    const youtube = google.youtube({ version: 'v3', auth: publishOauth2Client });
    
    console.log('Downloading video from Cloudinary:', video.videoUrl);
    
    // Download video from Cloudinary
    const videoResponse = await axios.get(video.videoUrl, {
      responseType: 'stream'
    });
    
    console.log('Uploading to YouTube...');
    
    // Upload to YouTube
    const uploadResponse = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: video.title,
          description: video.description,
          channelId: account.youtubeChannelId,
          tags: ['video', 'upload', 'automated'],
          categoryId: '22' // People & Blogs category
        },
        status: {
          privacyStatus: 'public', // Can be 'private', 'unlisted', or 'public'
          selfDeclaredMadeForKids: false
        }
      },
      media: {
        body: videoResponse.data
      }
    });
    
    const youtubeVideoId = uploadResponse.data.id;
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
    
  } catch (error) {
    console.error('YouTube publish error:', error);
    
    // Update video status to failed
    try {
      const db = await connectToMongoDB();
      await db.collection('videos').updateOne(
        { _id: new ObjectId(req.params.videoId) },
        {
          $set: {
            status: 'failed',
            publishError: error.message,
            updatedAt: new Date()
          }
        }
      );
    } catch (dbError) {
      console.error('Failed to update video status:', dbError);
    }
    
    res.status(500).json({ 
      error: 'Failed to publish video to YouTube',
      details: error.message 
    });
  }
});

// Videos endpoint...
