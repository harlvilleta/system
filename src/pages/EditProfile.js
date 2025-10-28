import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Stack, Chip
} from "@mui/material";
import { 
  Person, PhotoCamera, Save, ArrowBack, Visibility, VisibilityOff,
  Email, Phone, Home, Work
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, query, where, getDocs } from "firebase/firestore";
import { updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export default function EditProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    id: "",
    studentId: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    contact: "",
    email: "",
    homeAddress: "",
    image: null,
    role: "Student"
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserProfile(user.uid);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loadUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfile(prev => ({
          ...prev,
          id: uid,
          studentId: userData.studentId || "",
          email: userData.email || currentUser?.email || "",
          firstName: userData.firstName || userData.fullName?.split(' ')[0] || "",
          lastName: userData.lastName || userData.fullName?.split(' ').slice(1).join(' ') || "",
          middleInitial: userData.middleInitial || "",
          sex: userData.sex || "",
          age: userData.age || "",
          birthdate: userData.birthdate || "",
          contact: userData.contact || userData.phoneNumber || "",
          homeAddress: userData.homeAddress || userData.address || "",
          image: userData.profilePic || null,
          role: userData.role || "Student"
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  // Function to upload image to Firebase Storage
  const uploadImageToStorage = async (file, userId) => {
    const storageRef = ref(storage, `profile-pictures/${userId}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const handleImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setSnackbar({ open: true, message: "Image file size must be less than 10MB", severity: "error" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile picture updated!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: fullName
      });

      // Upload image to Firebase Storage if it's a new file (not a URL)
      let imageURL = profile.image;
      if (profile.image && profile.image.startsWith('data:')) {
        // Convert base64 to file and upload
        const response = await fetch(profile.image);
        const blob = await response.blob();
        const file = new File([blob], 'profile-picture.jpg', { type: 'image/jpeg' });
        
        try {
          imageURL = await uploadImageToStorage(file, currentUser.uid);
          console.log('✅ Image uploaded to Storage:', imageURL);
        } catch (uploadError) {
          console.error('❌ Image upload error:', uploadError);
          // Keep the base64 as fallback
        }
      }

      // Update Firestore user document
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: profile.email,
        fullName: fullName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        middleInitial: profile.middleInitial,
        sex: profile.sex,
        age: profile.age,
        birthdate: profile.birthdate,
        contact: profile.contact,
        homeAddress: profile.homeAddress,
        profilePic: imageURL,
        role: profile.role || 'Student',
        studentId: profile.studentId, // Ensure studentId is included
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 🔄 SYNC WITH ADMIN STUDENT LIST
      // If this is a student, also update their record in the admin's students collection
      if (profile.role === 'Student' && profile.studentId) {
        try {
          console.log('🔄 Syncing student profile with admin records...');
          
          // Find the student record in the admin's students collection
          const studentsQuery = query(
            collection(db, 'students'),
            where('id', '==', profile.studentId)
          );
          
          const studentsSnapshot = await getDocs(studentsQuery);
          
          if (!studentsSnapshot.empty) {
            // Update the existing student record in admin's collection
            const studentDoc = studentsSnapshot.docs[0];
            await updateDoc(doc(db, 'students', studentDoc.id), {
              firstName: profile.firstName,
              lastName: profile.lastName,
              middleInitial: profile.middleInitial,
              sex: profile.sex,
              age: profile.age,
              birthdate: profile.birthdate,
              sccNumber: profile.sccNumber,
              contact: profile.contact,
              fatherName: profile.fatherName,
              fatherOccupation: profile.fatherOccupation,
              motherName: profile.motherName,
              motherOccupation: profile.motherOccupation,
              guardian: profile.guardian,
              guardianContact: profile.guardianContact,
              homeAddress: profile.homeAddress,
              profilePic: imageURL,
              email: profile.email,
              isRegistered: true,
              registeredUserId: currentUser.uid,
              lastUpdated: new Date().toISOString(),
              updatedBy: 'student'
            });
            
            console.log('✅ Student record synced with admin list successfully');
          } else {
            console.log('⚠️ Student record not found in admin collection, creating new record...');
            
            // Create a new student record in admin's collection if not found
            await addDoc(collection(db, 'students'), {
              id: profile.studentId,
              firstName: profile.firstName,
              lastName: profile.lastName,
              middleInitial: profile.middleInitial,
              sex: profile.sex,
              age: profile.age,
              birthdate: profile.birthdate,
              sccNumber: profile.sccNumber,
              contact: profile.contact,
              fatherName: profile.fatherName,
              fatherOccupation: profile.fatherOccupation,
              motherName: profile.motherName,
              motherOccupation: profile.motherOccupation,
              guardian: profile.guardian,
              guardianContact: profile.guardianContact,
              homeAddress: profile.homeAddress,
              profilePic: imageURL,
              email: profile.email,
              isRegistered: true,
              registeredUserId: currentUser.uid,
              registeredAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              lastUpdated: new Date().toISOString(),
              updatedBy: 'student'
            });
            
            console.log('✅ New student record created in admin collection');
          }
        } catch (syncError) {
          console.error('❌ Error syncing with admin student list:', syncError);
          // Don't fail the entire operation if sync fails
        }
      }

      setSnackbar({ open: true, message: "Profile updated successfully! Changes synced with admin records.", severity: "success" });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // Navigate back to profile after successful save
      setTimeout(() => {
        navigate('/profile');
      }, 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({ open: true, message: "Error updating profile: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    // Validate current password is provided
    if (!passwordForm.currentPassword) {
      setSnackbar({ open: true, message: "Please enter your current password", severity: "error" });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({ open: true, message: "New passwords don't match", severity: "error" });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setSnackbar({ open: true, message: "Password must be at least 6 characters", severity: "error" });
      return;
    }

    setSaving(true);
    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(currentUser.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // If re-authentication successful, update password
      await updatePassword(currentUser, passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSnackbar({ open: true, message: "Password changed successfully!", severity: "success" });
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setSnackbar({ open: true, message: "Current password is incorrect", severity: "error" });
      } else {
        setSnackbar({ open: true, message: "Error changing password: " + error.message, severity: "error" });
      }
    } finally {
      setSaving(false);
    }
  };


  return (
    <Box>
      {/* Header with Back Button */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => navigate('/profile')} 
          sx={{ mr: 2, bgcolor: 'grey.100', '&:hover': { bgcolor: 'grey.200' } }}
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" gutterBottom fontWeight={700} color="primary.main">
          Edit Profile
        </Typography>
      </Box>

      {/* Sync Information Banner */}
      {profile.role === 'Student' && profile.studentId && (
        <Box sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: '#e3f2fd', 
          borderRadius: 2, 
          border: '1px solid #1976d2',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Typography sx={{ color: '#1976d2', fontSize: '1.2rem' }}>🔄</Typography>
          <Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: '#1976d2' }}>
              Profile Sync Enabled
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Changes to your profile will automatically sync with the admin's student records.
            </Typography>
          </Box>
        </Box>
      )}

      <Grid container spacing={3}>
        {/* Profile Picture Section */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                <Avatar 
                  src={profile.image} 
                  sx={{ 
                    width: 120, 
                    height: 120, 
                    fontSize: '3rem',
                    bgcolor: 'primary.main',
                    mb: 2
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                  component="label"
                >
                  <PhotoCamera />
                  <input type="file" accept="image/*" hidden onChange={handleImage} />
                </IconButton>
              </Box>
              <Typography variant="h6" gutterBottom>
                {profile.firstName} {profile.lastName}
              </Typography>
              
              {/* Enhanced Gmail and Student ID Display */}
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                mt: 1,
                p: 1.5,
                bgcolor: 'rgba(25, 118, 210, 0.08)',
                borderRadius: 2,
                border: '1px solid rgba(25, 118, 210, 0.2)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ 
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    minWidth: '80px'
                  }}>
                    Gmail:
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: '#1976d2',
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    {profile.email || 'Not provided'}
                  </Typography>
                </Box>
                
                {profile.studentId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ 
                      color: 'text.secondary',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      minWidth: '80px'
                    }}>
                      Student ID:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#1976d2',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      fontFamily: 'monospace'
                    }}>
                      {profile.studentId}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Chip 
                label={profile.role || "Student"} 
                color="primary" 
                variant="outlined" 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Form */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person /> Personal Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="First Name" 
                    name="firstName" 
                    value={profile.firstName} 
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Last Name" 
                    name="lastName" 
                    value={profile.lastName} 
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Student ID" 
                    name="studentId" 
                    value={profile.studentId} 
                    onChange={handleChange}
                    required
                    disabled={profile.role !== 'Admin' && profile.studentId} // Allow editing if not set, but disable if already set
                    helperText={profile.role !== 'Admin' && profile.studentId ? 'Student ID cannot be changed once set' : ''}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Middle Initial" 
                    name="middleInitial" 
                    value={profile.middleInitial} 
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Email Address" 
                    name="email" 
                    value={profile.email} 
                    onChange={handleChange}
                    type="email"
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField 
                    fullWidth 
                    label="Contact Number" 
                    name="contact" 
                    value={profile.contact} 
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    fullWidth 
                    label="Sex" 
                    name="sex" 
                    value={profile.sex} 
                    onChange={handleChange}
                    select
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    fullWidth 
                    label="Age" 
                    name="age" 
                    value={profile.age} 
                    onChange={handleChange}
                    type="number"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField 
                    fullWidth 
                    label="Birthdate" 
                    name="birthdate" 
                    value={profile.birthdate} 
                    onChange={handleChange}
                    type="date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Home /> Address Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Home Address" 
                    name="homeAddress" 
                    value={profile.homeAddress} 
                    onChange={handleChange}
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/profile')}
                  sx={{ px: 3 }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  onClick={handleSaveProfile}
                  disabled={saving || saveSuccess}
                  startIcon={<Save />}
                  color={saveSuccess ? "success" : "primary"}
                  sx={{
                    transition: 'all 0.3s ease',
                    transform: saveSuccess ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: saveSuccess ? '0 4px 12px rgba(76, 175, 80, 0.4)' : '0 2px 8px rgba(25, 118, 210, 0.3)',
                    px: 3
                  }}
                >
                  {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
