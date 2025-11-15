import { db, auth } from '../firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';

/**
 * Update user role to Admin
 * @param {string} email - User email address
 * @param {string} uid - Optional user UID (if provided, will use this directly)
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export const updateUserToAdmin = async (email, uid = null) => {
  try {
    console.log(`🔍 Searching for user with email: ${email}${uid ? ` or UID: ${uid}` : ''}`);
    
    let userId = null;
    let userData = null;
    
    // Strategy 1: If UID is provided, try to get document directly
    if (uid) {
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          userId = uid;
          userData = userDocSnap.data();
          console.log(`✅ Found user by UID: ${uid}`);
        }
      } catch (error) {
        console.log(`⚠️ Could not find user by UID ${uid}, trying email search...`);
      }
    }
    
    // Strategy 2: Query by email if not found by UID
    if (!userId) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.error(`❌ No user found with email: ${email}`);
        
        // Strategy 3: If user is currently logged in, try to use their UID
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email === email) {
          console.log(`🔄 User is logged in, trying to create/update document with UID: ${currentUser.uid}`);
          userId = currentUser.uid;
          // Try to get existing document
          try {
            const userDocRef = doc(db, 'users', userId);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              userData = userDocSnap.data();
            } else {
              // Document doesn't exist, we'll create it
              userData = { email: email };
            }
          } catch (error) {
            // Document doesn't exist, we'll create it
            userData = { email: email };
          }
        } else {
          return false;
        }
      } else {
        // Get the first matching user document
        const userDoc = querySnapshot.docs[0];
        userData = userDoc.data();
        userId = userDoc.id;
        console.log(`✅ Found user by email: ${email}`);
      }
    }
    
    console.log(`📄 Current role: ${userData.role || 'Not set'}`);
    console.log(`🆔 User ID: ${userId}`);
    
    // Update user document with Admin role and adminInfo
    const adminData = {
      email: email,
      role: 'Admin',
      adminInfo: {
        permissions: ['all'],
        adminLevel: 'super',
        assignedBy: 'system',
        assignedDate: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    
    // Preserve existing fields
    if (userData.fullName) adminData.fullName = userData.fullName;
    if (userData.uid) adminData.uid = userData.uid;
    if (!adminData.uid && userId) adminData.uid = userId;
    
    // Use merge: true to preserve existing fields
    await setDoc(doc(db, 'users', userId), adminData, { merge: true });
    
    console.log(`✅ Successfully updated user ${email} (${userId}) to Admin role`);
    console.log(`🔄 Please log out and log back in for changes to take effect`);
    return true;
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    return false;
  }
};

// Export for use in components
export default updateUserToAdmin;

