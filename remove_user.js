import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function removeUser() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('video_publish_party');
    
    const emailToRemove = 'debayanghosh0125@gmail.com';
    console.log(`=== Searching for user: ${emailToRemove} ===`);
    
    // Find the user
    const user = await db.collection('users').findOne({ email: emailToRemove });
    
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
    
    // Find videos uploaded by user
    console.log('\n=== Finding videos uploaded by user ===');
    const videos = await db.collection('videos').find({ 
      $or: [
        { uploadedBy: userId },
        { uploadedBy: userId.toString() },
        { uploadedBy: user.googleId }
      ]
    }).toArray();
    console.log(`Found ${videos.length} videos uploaded by user`);
    
    // Ask for confirmation before deletion
    console.log('\n=== DELETION SUMMARY ===');
    console.log(`Will delete:`);
    console.log(`- 1 user record`);
    console.log(`- ${userRoles.length} user role assignments`);
    console.log(`- ${ownedAccounts.length} accounts (and their data)`);
    console.log(`- ${videos.length} videos`);
    
    // Perform deletion
    console.log('\n🗑️  Starting deletion process...');
    
    // 1. Delete videos uploaded by user
    if (videos.length > 0) {
      const videoResult = await db.collection('videos').deleteMany({
        $or: [
          { uploadedBy: userId },
          { uploadedBy: userId.toString() },
          { uploadedBy: user.googleId }
        ]
      });
      console.log(`✅ Deleted ${videoResult.deletedCount} videos`);
    }
    
    // 2. Delete user roles
    if (userRoles.length > 0) {
      const roleResult = await db.collection('userRoles').deleteMany({
        $or: [
          { userId: userId },
          { userId: userId.toString() },
          { userId: user.googleId }
        ]
      });
      console.log(`✅ Deleted ${roleResult.deletedCount} user roles`);
    }
    
    // 3. Delete accounts owned by user
    if (ownedAccounts.length > 0) {
      const accountIds = ownedAccounts.map(acc => acc._id);
      
      // Delete user roles for these accounts
      const accountRoleResult = await db.collection('userRoles').deleteMany({
        accountId: { $in: accountIds }
      });
      console.log(`✅ Deleted ${accountRoleResult.deletedCount} roles for owned accounts`);
      
      // Delete videos for these accounts
      const accountVideoResult = await db.collection('videos').deleteMany({
        accountId: { $in: accountIds.map(id => id.toString()) }
      });
      console.log(`✅ Deleted ${accountVideoResult.deletedCount} videos for owned accounts`);
      
      // Delete the accounts
      const accountResult = await db.collection('accounts').deleteMany({
        $or: [
          { ownerId: userId },
          { ownerId: userId.toString() },
          { ownerId: user.googleId }
        ]
      });
      console.log(`✅ Deleted ${accountResult.deletedCount} accounts`);
    }
    
    // 4. Finally, delete the user
    const userResult = await db.collection('users').deleteOne({ _id: user._id });
    console.log(`✅ Deleted user: ${userResult.deletedCount} record`);
    
    console.log('\n🎉 User removal completed successfully!');
    
  } catch (error) {
    console.error('❌ Error removing user:', error);
  } finally {
    await client.close();
  }
}

removeUser();
