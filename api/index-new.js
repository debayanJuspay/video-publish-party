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
    ? [process.env.FRONTEND_URL || 'https://videohub-brown-alpha.vercel.app'] 
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

// Google OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.NODE_ENV === 'production' 
    ? 'https://videohub-brown-alpha.vercel.app/api/auth/youtube/callback'
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

// Google OAuth login
app.post('/api/auth/google', async (req, res) => {
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
          { $set: { googleId, picture } }
        );
        user.googleId = googleId;
        user.picture = picture;
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
app.get('/api/accounts', authenticateToken, async (req, res) => {
  try {
    const db = await connectToMongoDB();
    
    // Get user roles
    const userRoles = await db.collection('userRoles').find({
      userId: req.user.userId
    }).toArray();

    if (userRoles.length === 0) {
      return res.json([]);
    }

    const accountIds = userRoles.map(ur => ur.accountId);
    let accounts = await db.collection('accounts').find({
      _id: { $in: accountIds }
    }).toArray();

    // Filter accounts based on user role
    if (req.user.role === 'admin') {
      accounts = accounts.filter(account => {
        const userRole = userRoles.find(ur => ur.accountId.equals(account._id));
        return userRole && userRole.role === 'owner';
      });
    } else {
      accounts = accounts.filter(account => {
        const userRole = userRoles.find(ur => ur.accountId.equals(account._id));
        return userRole && userRole.role === 'editor';
      });
    }

    const accountsWithRoles = accounts.map(account => {
      const userRole = userRoles.find(ur => ur.accountId.equals(account._id));
      return {
        ...account,
        userRole: userRole.role
      };
    });

    res.json(accountsWithRoles);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
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
