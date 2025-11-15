// Auto-run script to update admin+10@school.com to Admin role
import { updateUserToAdmin } from './updateUserRole';
import { auth } from '../firebase';

// Auto-update the user when this module is imported
const updateAdminUser = async () => {
  const email = 'admin+10@school.com';
  console.log(`🚀 Auto-updating ${email} to Admin role...`);
  
  // Get current user UID if logged in
  const currentUser = auth.currentUser;
  const uid = currentUser && currentUser.email === email ? currentUser.uid : null;
  
  const success = await updateUserToAdmin(email, uid);
  
  if (success) {
    console.log(`✅ Successfully updated ${email} to Admin role!`);
    console.log('🔄 IMPORTANT: Please log out and log back in for changes to take effect!');
    console.log(`   Email: ${email}`);
    console.log('   Password: 123456');
    
    // If user is currently logged in, show alert
    if (currentUser && currentUser.email === email) {
      setTimeout(() => {
        alert('Your role has been updated to Admin! Please log out and log back in for the changes to take effect.');
      }, 1000);
    }
  } else {
    console.error(`❌ Failed to update ${email}. User may not exist yet.`);
    console.log('💡 If you just logged in, the document should exist. Try refreshing the page.');
  }
};

// Run immediately
updateAdminUser();

export default updateAdminUser;

