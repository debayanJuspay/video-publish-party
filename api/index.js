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

// Load environment variables
dotenv.config();

console.log('Environment check:', {
  mongoUri: process.env.MONGODB_URI ? 'Found' : 'Missing',
  port: process.env.PORT || 3001
});

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-vercel-domain.vercel.app'] // Replace with your actual Vercel domain
    : ['http://localhost:5173', 'http://localhost:3000'],
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
    db = mongoClient.db('videohub');
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
    ? 'https://your-vercel-domain.vercel.app/api/youtube/callback' // Replace with your actual domain
    : 'http://localhost:3001/youtube/callback'
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
    const user = await db.collection('users').findOne({ 
      $or: [
        { _id: new ObjectId(decoded.userId) },
        { googleId: decoded.userId },
        { email: decoded.email }
      ]
    });
    
    if (!user) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Import and add all your existing routes here
// For brevity, I'm showing the structure - you'll need to copy all your routes from the original server file

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Google OAuth routes
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
          role: 'user',
          createdAt: new Date()
        };
        
        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }
    }
    
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { 
        id: user._id, 
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

// Add all your other routes here following the same pattern
// Remember to prefix all routes with '/api' for Vercel

// Export for Vercel
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
