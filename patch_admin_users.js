import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

async function patchAdminUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('video_publish_party');
    
    console.log('🔍 Searching for admin users without owner userRoles...');
    
    // Find all users with admin role
    const adminUsers = await db.collection('users').find({ role: 'admin' }).toArray();
    
    if (adminUsers.length === 0) {
      console.log('❌ No admin users found in the database');
      return;
    }
    
    console.log(`✅ Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - ID: ${user._id || user.googleId}`);
    });
    
    let patchedCount = 0;
    let skippedCount = 0;
    
    for (const user of adminUsers) {
      const userId = user._id || user.googleId;
      
      console.log(`\n🔧 Processing admin user: ${user.email}`);
      
      // Check if this admin already has an owner userRole entry
      const existingSuperAdminRole = await db.collection('userRoles').findOne({
        userId: userId,
        role: 'owner'
      });
      
      if (existingSuperAdminRole) {
        console.log(`  ⏭️  Already has owner role - skipping`);
        skippedCount++;
        continue;
      }
      
      // Create owner userRole entry
      const superAdminRole = {
        userId: userId,
        accountId: null, // null means "global owner" - access to all accounts
        role: 'owner',
        createdAt: new Date(),
        isGlobalAdmin: true,
        patchedAt: new Date(), // Mark as patched
        patchReason: 'Auto-created for existing admin user'
      };
      
      await db.collection('userRoles').insertOne(superAdminRole);
      console.log(`  ✅ Created owner userRole entry`);
      patchedCount++;
    }
    
    console.log('\n🎉 PATCH COMPLETED!');
    console.log(`📊 Summary:`);
    console.log(`  - Total admin users found: ${adminUsers.length}`);
    console.log(`  - New owner roles created: ${patchedCount}`);
    console.log(`  - Users already patched (skipped): ${skippedCount}`);
    
    if (patchedCount > 0) {
      console.log('\n💡 Next steps:');
      console.log('  1. Have admin users sign out and sign in again');
      console.log('  2. They should now see "admin" role instead of "user"');
      console.log('  3. They should have access to all accounts in the system');
    }
    
  } catch (error) {
    console.error('❌ Error patching admin users:', error);
  } finally {
    await client.close();
  }
}

// Run the patch
console.log('🚀 Starting Admin Users Patch Script...');
console.log('📝 This script will create owner userRoles entries for all existing admin users');
console.log('');

patchAdminUsers();
