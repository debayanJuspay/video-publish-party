import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserStatus() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('video_publish_party');
    
    const email = 'debayan.ghosh@juspay.in';
    console.log(`=== Checking user status: ${email} ===`);
    
    // Find the user
    const user = await db.collection('users').findOne({ email });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('✅ User found:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      googleId: user.googleId
    });
    
    const userId = user._id || user.googleId;
    
    // Find user roles
    console.log('\n=== Finding user roles ===');
    const userRoles = await db.collection('userRoles').find({
      $or: [
        { userId: userId },
        { userId: userId.toString() },
        { userId: user.googleId }
      ]
    }).toArray();
    console.log(`Found ${userRoles.length} user roles:`, userRoles);
    
    // Find accounts owned by user
    console.log('\n=== Finding accounts owned by user ===');
    const ownedAccounts = await db.collection('accounts').find({ 
      $or: [
        { ownerId: userId },
        { ownerId: userId.toString() },
        { ownerId: user.googleId }
      ]
    }).toArray();
    console.log(`Found ${ownedAccounts.length} owned accounts:`, ownedAccounts);
    
    console.log('\n=== Summary ===');
    console.log(`- User role in users table: ${user.role}`);
    console.log(`- Number of userRoles entries: ${userRoles.length}`);
    console.log(`- Number of owned accounts: ${ownedAccounts.length}`);
    
  } catch (error) {
    console.error('❌ Error checking user status:', error);
  } finally {
    await client.close();
  }
}

checkUserStatus();
