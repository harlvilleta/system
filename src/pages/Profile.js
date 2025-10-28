import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, TextField, MenuItem, Button, Paper, Avatar, Snackbar, Alert,
  Card, CardContent, Divider, IconButton, Tabs, Tab, Stack, Chip, Dialog, DialogTitle, DialogContent, DialogActions, useTheme,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, List, ListItem, ListItemText, ListItemSecondaryAction
} from "@mui/material";
import { 
  Person, Security, PhotoCamera, Save, Edit, Visibility, VisibilityOff,
  Email, Phone, Home, Work, ArrowBack
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, getDoc, updateDoc, setDoc, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { updatePassword, updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';


export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
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
    course: "",
    year: "",
    section: "",
    sccNumber: "",
    contact: "",
    email: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    guardian: "",
    guardianContact: "",
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
  const [openEditModal, setOpenEditModal] = useState(false);
  const [editProfile, setEditProfile] = useState({
    firstName: "",
    lastName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    course: "",
    year: "",
    section: "",
    sccNumber: "",
    contact: "",
    homeAddress: "",
    email: "",
    image: null
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [connectionStatus, setConnectionStatus] = useState('connected'); // 'connected', 'connecting', 'disconnected'
  const [retryCount, setRetryCount] = useState(0);
  
  // Helper function for database operations with timeout and retry
  const dbOperation = async (operation, operationName = 'Database operation', maxRetries = 3) => {
    const timeoutDuration = 15000; // 15 seconds timeout
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setConnectionStatus('connecting');
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Database connection timeout. Please check your internet connection.')), timeoutDuration);
        });
        
        const result = await Promise.race([operation(), timeoutPromise]);
        setConnectionStatus('connected');
        setRetryCount(0);
        return result;
        
      } catch (error) {
        console.error(`${operationName} attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          setConnectionStatus('disconnected');
          setRetryCount(attempt);
          
          // Show user-friendly error message
          setSnackbar({
            open: true,
            message: 'Database connection failed. Please check your internet connection and try again.',
            severity: 'error'
          });
          
          throw error;
        } else {
          // Wait before retrying (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Retrying ${operationName} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  };

  // Function to handle retry connection
  const handleRetryConnection = async () => {
    if (!currentUser) return;
    
    setConnectionStatus('connecting');
    setRetryCount(0);
    
    try {
      await loadUserProfile(currentUser.uid);
      setSnackbar({
        open: true,
        message: 'Connection restored successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Retry failed:', error);
      setSnackbar({
        open: true,
        message: 'Connection retry failed. Please check your internet connection.',
        severity: 'error'
      });
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserProfile(user.uid);
      }
    });

    return unsubscribe;
  }, []);

  // Periodic connection check
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      const interval = setInterval(async () => {
        try {
          // Try a simple database operation to check connection
          await dbOperation(
            () => getDoc(doc(db, 'users', currentUser?.uid || 'test')),
            'Connection check',
            1 // Only 1 retry for connection check
          );
          // If successful, reload profile
          if (currentUser) {
            await loadUserProfile(currentUser.uid);
          }
        } catch (error) {
          // Connection still not available, do nothing
        }
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [connectionStatus, currentUser]);


  const loadUserProfile = async (uid) => {
    try {
      console.log('🔍 Profile - Fetching data for user:', currentUser?.email);
      
      // First, try to get user data from the users collection
      const userDoc = await dbOperation(
        () => getDoc(doc(db, 'users', uid)),
        'Load user profile'
      );
      
      let userData = {};
      if (userDoc.exists()) {
        userData = userDoc.data();
      }

      // Fetch student data from students collection (priority) - same logic as UserDashboard
      let studentData = {};
      if (currentUser?.email) {
        try {
          // Strategy 1: Match registeredEmail field
          let studentsSnapshot = null;
          const studentsQuery1 = query(
            collection(db, 'students'),
            where('registeredEmail', '==', currentUser.email)
          );
          studentsSnapshot = await getDocs(studentsQuery1);
          console.log('📚 Profile - Strategy 1 - registeredEmail match:', studentsSnapshot.size, 'documents found');
          
          // Strategy 2: Match email field (if no results)
          if (studentsSnapshot.empty) {
            const studentsQuery2 = query(
              collection(db, 'students'),
              where('email', '==', currentUser.email)
            );
            studentsSnapshot = await getDocs(studentsQuery2);
            console.log('📚 Profile - Strategy 2 - email field match:', studentsSnapshot.size, 'documents found');
          }
          
          // Strategy 3: Case-insensitive registeredEmail match (if no results)
          if (studentsSnapshot.empty) {
            const studentsQuery3 = query(
              collection(db, 'students'),
              where('registeredEmail', '==', currentUser.email.toLowerCase())
            );
            studentsSnapshot = await getDocs(studentsQuery3);
            console.log('📚 Profile - Strategy 3 - Lowercase registeredEmail match:', studentsSnapshot.size, 'documents found');
          }
          
          // Strategy 4: Get all students and filter client-side (if still no results)
          if (studentsSnapshot.empty) {
            console.log('📚 Profile - Strategy 4 - Fetching all students for client-side filtering...');
            const allStudentsQuery = query(collection(db, 'students'));
            const allStudentsSnapshot = await getDocs(allStudentsQuery);
            
            const matchingStudents = allStudentsSnapshot.docs.filter(doc => {
              const data = doc.data();
              return (data.registeredEmail && data.registeredEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                     (data.email && data.email.toLowerCase() === currentUser.email.toLowerCase());
            });
            
            if (matchingStudents.length > 0) {
              console.log('📚 Profile - Strategy 4 - Found', matchingStudents.length, 'matching students');
              studentsSnapshot = { 
                empty: false, 
                docs: matchingStudents,
                size: matchingStudents.length 
              };
            }
          }
          
          if (!studentsSnapshot.empty) {
            const studentDoc = studentsSnapshot.docs[0];
            studentData = studentDoc.data();
            console.log('✅ Profile - Student data fetched from students collection:', studentData);
          } else {
            console.log('❌ Profile - No student data found in students collection for:', currentUser.email);
          }
        } catch (studentError) {
          console.log('⚠️ Profile - Could not load student data from students collection:', studentError);
        }
      }

      // Merge user data and student data, prioritizing student data for student-specific fields
      const mergedData = {
        ...userData,
        ...studentData, // Student data takes precedence
        // Keep user-specific fields from userData
        email: userData.email || studentData.registeredEmail || studentData.email || currentUser?.email || "",
        profilePic: userData.profilePic || studentData.image || null,
        role: userData.role || "Student"
      };

      setProfile(prev => ({
        ...prev,
        id: uid,
        studentId: mergedData.studentId || mergedData.id || "",
        email: mergedData.email,
        firstName: mergedData.firstName || mergedData.fullName?.split(' ')[0] || "",
        lastName: mergedData.lastName || mergedData.fullName?.split(' ').slice(1).join(' ') || "",
        middleInitial: mergedData.middleInitial || "",
        sex: mergedData.sex || "",
        age: mergedData.age || "",
        birthdate: mergedData.birthdate || "",
        course: mergedData.course || "",
        year: mergedData.year || "",
        section: mergedData.section || "",
        sccNumber: mergedData.sccNumber || "",
        contact: mergedData.contact || mergedData.phoneNumber || "",
        fatherName: mergedData.fatherName || "",
        fatherOccupation: mergedData.fatherOccupation || "",
        motherName: mergedData.motherName || "",
        motherOccupation: mergedData.motherOccupation || "",
        guardian: mergedData.guardian || "",
        guardianContact: mergedData.guardianContact || "",
        homeAddress: mergedData.homeAddress || mergedData.address || "",
        image: mergedData.profilePic || null,
        role: mergedData.role || "Student"
      }));

      if (!userDoc.exists()) {
        // If user document doesn't exist, create a basic profile and save it
        const basicProfile = {
          id: uid,
          email: currentUser?.email || "",
          firstName: currentUser?.displayName?.split(' ')[0] || "",
          lastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "",
          role: "Student",
          createdAt: new Date().toISOString()
        };
        
        setProfile(prev => ({ ...prev, ...basicProfile }));
        
        // Automatically create the user document in the background
        try {
          await dbOperation(
            () => setDoc(doc(db, 'users', uid), basicProfile),
            'Create user profile'
          );
          console.log('✅ User profile created automatically');
        } catch (createError) {
          console.log('Profile will be created on next successful connection');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      
      // Set a fallback profile to prevent blocking the UI
      const fallbackProfile = {
        id: uid,
        email: currentUser?.email || "",
        firstName: currentUser?.displayName?.split(' ')[0] || "",
        lastName: currentUser?.displayName?.split(' ').slice(1).join(' ') || "",
        role: "Student"
      };
      
      setProfile(prev => ({ ...prev, ...fallbackProfile }));
      
      // Try to create the profile in the background when connection is restored
      setTimeout(async () => {
        try {
          await dbOperation(
            () => setDoc(doc(db, 'users', uid), { ...fallbackProfile, createdAt: new Date().toISOString() }),
            'Create fallback profile'
          );
          console.log('✅ Fallback profile saved when connection restored');
        } catch (bgError) {
          console.log('Will retry profile creation on next user action');
        }
      }, 5000);
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
      await dbOperation(
        () => setDoc(doc(db, 'users', currentUser.uid), {
          email: profile.email,
          fullName: fullName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          middleInitial: profile.middleInitial,
          sex: profile.sex,
          age: profile.age,
          birthdate: profile.birthdate,
          course: profile.course,
          year: profile.year,
          section: profile.section,
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
          role: profile.role || 'Student',
          studentId: profile.studentId, // Ensure studentId is included
          updatedAt: new Date().toISOString()
        }, { merge: true }),
        'Save user profile'
      );

      // 🔄 SYNC WITH ADMIN STUDENT LIST
      // If this is a student, also update their record in the admin's students collection
      if (profile.role === 'Student' && profile.studentId) {
        try {
          console.log('🔄 Syncing student profile with admin records...');
          
          // Find the student record in the admin's students collection
          const studentsSnapshot = await dbOperation(
            () => {
              const studentsQuery = query(
                collection(db, 'students'),
                where('id', '==', profile.studentId)
              );
              return getDocs(studentsQuery);
            },
            'Find student record'
          );
          
          if (!studentsSnapshot.empty) {
            // Update the existing student record in admin's collection
            const studentDoc = studentsSnapshot.docs[0];
            await dbOperation(
              () => updateDoc(doc(db, 'students', studentDoc.id), {
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleInitial: profile.middleInitial,
                sex: profile.sex,
                age: profile.age,
                birthdate: profile.birthdate,
                course: profile.course,
                year: profile.year,
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
              }),
              'Update student record'
            );
            
            console.log('✅ Student record synced with admin list successfully');
          } else {
            console.log('⚠️ Student record not found in admin collection, creating new record...');
            
            // Create a new student record in admin's collection if not found
            await dbOperation(
              () => addDoc(collection(db, 'students'), {
                id: profile.studentId,
                firstName: profile.firstName,
                lastName: profile.lastName,
                middleInitial: profile.middleInitial,
                sex: profile.sex,
                age: profile.age,
                birthdate: profile.birthdate,
                course: profile.course,
                year: profile.year,
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
              }),
              'Create student record'
            );
            
            console.log('✅ New student record created in admin collection');
          }
        } catch (syncError) {
          console.error('❌ Error syncing with admin student list:', syncError);
          // Don't fail the entire operation if sync fails
        }
      }

      setSnackbar({ open: true, message: "Profile updated successfully! Changes synced with admin records.", severity: "success" });
      setSaveSuccess(true); // Set success state
      setTimeout(() => setSaveSuccess(false), 3000); // Reset success state after 3 seconds
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

  const handleOpenEditModal = () => {
    setEditProfile({
      firstName: profile.firstName,
      lastName: profile.lastName,
      middleInitial: profile.middleInitial,
      sex: profile.sex,
      age: profile.age,
      birthdate: profile.birthdate,
      course: profile.course,
      year: profile.year,
      section: profile.section,
      sccNumber: profile.sccNumber,
      contact: profile.contact,
      homeAddress: profile.homeAddress,
      email: profile.email,
      image: profile.image
    });
    setOpenEditModal(true);
  };

  const handleEditProfileChange = (e) => {
    const { name, value } = e.target;
    setEditProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSaving(true);
      const imageUrl = await uploadImageToStorage(file, currentUser.uid);
      setEditProfile(prev => ({ ...prev, image: imageUrl }));
      setSnackbar({ open: true, message: "Profile picture updated!", severity: "success" });
    } catch (error) {
      console.error('Error uploading image:', error);
      setSnackbar({ open: true, message: "Error uploading image: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEditProfile = async () => {
    setSaving(true);
    try {
      // Basic validation
      if (!editProfile.firstName || !editProfile.lastName) {
        setSnackbar({ open: true, message: "First name and last name are required", severity: "error" });
        setSaving(false);
        return;
      }

      // Email validation
      if (!editProfile.email || !editProfile.email.trim()) {
        setSnackbar({ open: true, message: "Email address is required", severity: "error" });
        setSaving(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editProfile.email.trim())) {
        setSnackbar({ open: true, message: "Please enter a valid email address", severity: "error" });
        setSaving(false);
        return;
      }

      const userRef = doc(db, 'users', currentUser.uid);
      
      // Update Firestore document
      const updateData = {
        firstName: editProfile.firstName,
        lastName: editProfile.lastName,
        middleInitial: editProfile.middleInitial,
        sex: editProfile.sex,
        age: editProfile.age,
        birthdate: editProfile.birthdate,
        course: editProfile.course,
        year: editProfile.year,
        section: editProfile.section,
        sccNumber: editProfile.sccNumber,
        contact: editProfile.contact,
        homeAddress: editProfile.homeAddress,
        fullName: `${editProfile.firstName} ${editProfile.lastName}`.trim()
      };

      // Add email and image if they changed
      if (editProfile.email !== profile.email) {
        updateData.email = editProfile.email;
      }
      if (editProfile.image !== profile.image) {
        updateData.profilePic = editProfile.image;
      }

      await updateDoc(userRef, updateData);

      // Update email in Firebase Auth if it changed
      if (editProfile.email !== profile.email) {
        try {
          await updateEmail(currentUser, editProfile.email);
          console.log('✅ Email updated in Firebase Auth');
        } catch (error) {
          console.error('❌ Error updating email in Firebase Auth:', error);
          // Continue with Firestore update even if Auth update fails
        }
      }

      // Update profile picture in Firebase Auth if it changed
      if (editProfile.image !== profile.image) {
        await updateProfile(currentUser, {
          photoURL: editProfile.image
        });
      }

      // Update local profile state
      setProfile(prev => ({
        ...prev,
        firstName: editProfile.firstName,
        lastName: editProfile.lastName,
        middleInitial: editProfile.middleInitial,
        sex: editProfile.sex,
        age: editProfile.age,
        birthdate: editProfile.birthdate,
        studentId: editProfile.studentId,
        course: editProfile.course,
        year: editProfile.year,
        section: editProfile.section,
        sccNumber: editProfile.sccNumber,
        contact: editProfile.contact,
        homeAddress: editProfile.homeAddress,
        email: editProfile.email,
        image: editProfile.image
      }));

      setSnackbar({ open: true, message: "Profile updated successfully!", severity: "success" });
      setOpenEditModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({ open: true, message: "Error updating profile: " + error.message, severity: "error" });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)'
        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      pt: { xs: 2, sm: 3 }, 
      pl: { xs: 2, sm: 3, md: 4 }, 
      pr: { xs: 2, sm: 3, md: 4 }, 
      pb: 3
    }}>
      {/* Header Section */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: 4,
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -16,
          left: 0,
          right: 0,
          height: '2px',
          background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)',
          borderRadius: '1px'
        }
      }}>
        <IconButton 
          onClick={() => navigate('/options')}
          sx={{ 
            mr: 3,
            p: 1.5,
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)',
            border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 0, 0, 0.2)'}`,
            borderRadius: 2,
            transition: 'all 0.3s ease',
            '&:hover': {
              bgcolor: '#800000',
              color: 'white',
              borderColor: '#800000',
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(128, 0, 0, 0.3)'
            }
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4" fontWeight={800} sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            mb: 0.5,
            background: theme.palette.mode === 'dark' 
              ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
              : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
        }}>
          Account Settings
        </Typography>
          <Typography variant="body1" sx={{ 
            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
            fontWeight: 500
          }}>
            Manage your profile and security settings
          </Typography>
        </Box>
        
        {/* Connection Status Indicator */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: connectionStatus === 'connected' ? '#4caf50' : 
                    connectionStatus === 'connecting' ? '#ff9800' : '#f44336',
            animation: connectionStatus === 'connecting' ? 'pulse 1.5s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.5 },
              '100%': { opacity: 1 }
            }
          }} />
          <Typography variant="caption" sx={{
            color: connectionStatus === 'connected' ? '#4caf50' : 
                   connectionStatus === 'connecting' ? '#ff9800' : '#f44336',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {connectionStatus === 'connected' ? 'Connected' : 
             connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </Typography>
          {connectionStatus === 'disconnected' && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleRetryConnection}
              sx={{
                ml: 1,
                fontSize: '0.75rem',
                py: 0.5,
                px: 1,
                minWidth: 'auto',
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  bgcolor: '#f44336',
                  color: 'white'
                }
              }}
            >
              Retry
            </Button>
          )}
        </Box>
      </Box>

      {/* Enhanced Tabs Section */}
      <Paper sx={{ 
        mb: 4,
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 3,
        boxShadow: theme.palette.mode === 'dark' 
          ? '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
          : '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(128, 0, 0, 0.3) 50%, transparent 100%)'
        }
      }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            px: 2,
            pt: 1,
            '& .MuiTab-root': {
              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '1rem',
              py: 2,
              px: 3,
              mx: 0.5,
              borderRadius: 2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%)',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              },
              '&.Mui-selected': {
                color: '#ffffff',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                boxShadow: '0 4px 20px rgba(128, 0, 0, 0.3)',
                transform: 'translateY(-2px)',
                '&::before': {
                  opacity: 0
                }
              },
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.08)',
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                transform: 'translateY(-1px)',
                '&::before': {
                  opacity: 1
                }
              }
            },
            '& .MuiTabs-indicator': {
              display: 'none'
            }
          }}
        >
          <Tab 
            icon={<Person sx={{ fontSize: '1.2rem', mb: 0.5 }} />} 
            label="Profile Information"
            sx={{ flexDirection: 'column', gap: 0.5 }}
          />
          <Tab 
            icon={<Security sx={{ fontSize: '1.2rem', mb: 0.5 }} />} 
            label="Security Settings"
            sx={{ flexDirection: 'column', gap: 0.5 }}
          />
        </Tabs>
      </Paper>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Enhanced Profile Picture Section */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 4,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  : '0 20px 60px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                <Avatar 
                  src={profile.image} 
                  sx={{ 
                      width: 140, 
                      height: 140, 
                      fontSize: '3.5rem',
                    bgcolor: 'primary.main',
                    mx: 'auto',
                      background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                      border: `4px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(128, 0, 0, 0.2)'}`,
                      boxShadow: '0 8px 32px rgba(128, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 12px 40px rgba(128, 0, 0, 0.4)'
                      }
                  }}
                >
                  {profile.firstName?.charAt(0)}{profile.lastName?.charAt(0)}
                </Avatar>
                  <Box sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    border: `3px solid ${theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#ffffff'
                    }} />
                  </Box>
                </Box>
                
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                  mb: 1,
                  background: theme.palette.mode === 'dark' 
                    ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
                    : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {profile.firstName} {profile.lastName}
                </Typography>
                
                {/* Enhanced Gmail and Student ID Display */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 1, 
                  mb: 2,
                  p: 1.5,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.15)' : 'rgba(128, 0, 0, 0.08)',
                  borderRadius: 2,
                  border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.3)' : 'rgba(128, 0, 0, 0.2)'}`
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      minWidth: '80px'
                    }}>
                      Gmail:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      {profile.email || 'Not provided'}
                    </Typography>
                  </Box>
                  
                  {profile.studentId && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        minWidth: '80px'
                      }}>
                        Student ID:
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
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
                  sx={{ 
                    mb: 3,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.1)',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.3)' : 'rgba(128, 0, 0, 0.3)'}`,
                    fontWeight: 600,
                    px: 2,
                    py: 0.5
                  }}
                />
                
                  <Button 
                  variant="contained" 
                  startIcon={<Edit sx={{ fontSize: '1.1rem' }} />}
                    onClick={handleOpenEditModal}
                    sx={{ 
                    background: 'linear-gradient(135deg, #800000 0%, #ff6b6b 100%)',
                    color: 'white',
                    fontWeight: 700,
                      textTransform: 'none',
                    px: 4,
                    py: 1.5,
                    borderRadius: 3,
                    boxShadow: '0 4px 20px rgba(128, 0, 0, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                      background: 'linear-gradient(135deg, #6b0000 0%, #e55a5a 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 30px rgba(128, 0, 0, 0.4)'
                      }
                    }}
                  >
                    Edit Profile
                  </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Enhanced Profile Information Display */}
          <Grid item xs={12} md={8}>
            <Card sx={{
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: 4,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              position: 'relative',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark' 
                  ? '0 16px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  : '0 16px 50px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.08)'
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'linear-gradient(90deg, #800000 0%, #ff6b6b 50%, #800000 100%)'
              }
            }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  mb: 4,
                  pb: 2,
                  borderBottom: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)'}`
                }}>
                  <Box sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.1)',
                    color: '#800000'
                  }}>
                    <Person sx={{ fontSize: '1.5rem' }} />
                  </Box>
                  <Typography variant="h5" fontWeight={700} sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                    background: theme.palette.mode === 'dark' 
                      ? 'linear-gradient(45deg, #ffffff 30%, #e0e0e0 90%)'
                      : 'linear-gradient(45deg, #800000 30%, #ff6b6b 90%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Personal Information
                </Typography>
                </Box>
                {/* Personal Information Display - Matching UserDashboard Style */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 2, 
                  mt: 2
                }}>
                  {/* Name Display */}
                  <Box sx={{ 
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.05)',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                        : '0 4px 12px rgba(128, 0, 0, 0.1)'
                    }
                  }}>
                    <Typography variant="body2" sx={{
                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                      fontWeight: 600,
                      mb: 1,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '0.8rem'
                    }}>
                      Full Name
                    </Typography>
                    <Typography variant="h6" sx={{
                      fontWeight: 700,
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                      fontSize: '1.2rem'
                    }}>
                      {profile.firstName} {profile.lastName}
                    </Typography>
                  </Box>

                  {/* Email Display - Matching UserDashboard */}
                  <Box sx={{ 
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.15)' : 'rgba(128, 0, 0, 0.08)',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.3)' : 'rgba(128, 0, 0, 0.2)'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.2)' : 'rgba(128, 0, 0, 0.12)',
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 12px rgba(128, 0, 0, 0.3)'
                        : '0 4px 12px rgba(128, 0, 0, 0.15)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        minWidth: '80px'
                      }}>
                        Gmail:
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                        fontWeight: 600,
                        fontSize: '0.9rem'
                      }}>
                        {profile.email || 'Not provided'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Academic Information - Read Only (Admin Only) - Only for Students */}
                  {profile.role === 'Student' && (
                    <Box sx={{ 
                      p: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(255, 193, 7, 0.05)',
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 193, 7, 0.2)'}`,
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      '&:hover': {
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.08)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark' 
                          ? '0 4px 12px rgba(255, 193, 7, 0.2)'
                          : '0 4px 12px rgba(255, 193, 7, 0.1)'
                      }
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        mb: 1.5,
                        position: 'relative'
                      }}>
                        <Typography variant="body2" sx={{
                          color: theme.palette.mode === 'dark' ? '#ffc107' : '#f57c00',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontSize: '0.8rem'
                        }}>
                          Academic Information
                        </Typography>
                        <Chip 
                          label="Admin Only" 
                          size="small"
                          sx={{
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 193, 7, 0.1)',
                            color: theme.palette.mode === 'dark' ? '#ffc107' : '#f57c00',
                            border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            height: '20px'
                          }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              minWidth: '60px'
                            }}>
                              Student ID:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                              fontWeight: 600,
                              fontSize: '0.9rem',
                              fontFamily: 'monospace'
                            }}>
                              {profile.studentId || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              minWidth: '60px'
                            }}>
                              Course:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                              fontWeight: 600,
                              fontSize: '0.9rem'
                            }}>
                              {profile.course || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              minWidth: '60px'
                            }}>
                              Year:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                              fontWeight: 600,
                              fontSize: '0.9rem'
                            }}>
                              {profile.year || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              minWidth: '60px'
                            }}>
                              Section:
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                              fontWeight: 600,
                              fontSize: '0.9rem'
                            }}>
                              {profile.section || 'Not assigned'}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}

                  {/* Personal Details - Editable */}
                  <Box sx={{ 
                    p: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(128, 0, 0, 0.05)',
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(128, 0, 0, 0.1)'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(128, 0, 0, 0.08)',
                      transform: 'translateY(-2px)',
                      boxShadow: theme.palette.mode === 'dark' 
                        ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                        : '0 4px 12px rgba(128, 0, 0, 0.1)'
                    }
                  }}>
                    <Typography variant="body2" sx={{
                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                      fontWeight: 600,
                      mb: 1.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontSize: '0.8rem'
                    }}>
                      Personal Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '60px'
                          }}>
                            Gender:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}>
                            {profile.sex || 'Not provided'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '60px'
                          }}>
                            Birthday:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}>
                            {profile.birthdate || 'Not provided'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '60px'
                          }}>
                            Contact:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                          }}>
                            {profile.contact || 'Not provided'}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            minWidth: '60px',
                            mt: 0.5
                          }}>
                            Address:
                          </Typography>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            lineHeight: 1.4
                          }}>
                            {profile.homeAddress || 'Not provided'}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Box sx={{ 
          maxWidth: 500, 
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 3,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: 4,
          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: theme.palette.mode === 'dark' 
              ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 700, 
            color: '#800000', 
            textAlign: 'center',
                  mb: 2,
            fontSize: '1.2rem'
                }}>
                  Change Password
                </Typography>
          
            <TextField
            fullWidth
              label="Current Password"
            type={showCurrentPassword ? 'text' : 'password'}
              value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    edge="end"
                  size="small"
                >
                  {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
                  sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.875rem'
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.875rem'
              }
            }}
          />
          
          <TextField
            fullWidth
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    edge="end"
                  size="small"
                  >
                    {showNewPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
                  sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.875rem'
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.875rem'
              }
            }}
          />
          
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    edge="end"
                  size="small"
                  >
                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                ),
              }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '0.875rem'
              },
              '& .MuiInputLabel-root': {
                fontSize: '0.875rem'
              }
            }}
          />
          
            <Button 
            fullWidth
                  variant="contained"
              onClick={handleChangePassword}
            disabled={saving}
              sx={{
              bgcolor: '#800000',
              fontSize: '0.875rem',
              py: 1.5,
                    '&:hover': {
                bgcolor: '#a00000'
              }
            }}
          >
            {saving ? 'Changing Password...' : 'Change Password'}
            </Button>
        </Box>
      )}

      {/* Edit Profile Modal */}
      <Dialog open={openEditModal} onClose={() => setOpenEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#800000', pb: 1, fontSize: '1.1rem' }}>
          Edit Profile
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Grid container spacing={2}>
            {/* Profile Picture Section */}
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Avatar 
                  src={editProfile.image} 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mx: 'auto',
                    mb: 2,
                    border: '3px solid #800000'
                  }}
                />
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="profile-picture-upload"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="profile-picture-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<PhotoCamera />}
                      size="small"
                      sx={{
                      color: '#800000',
                      borderColor: '#800000',
                        fontSize: '0.75rem',
                        '&:hover': {
                        bgcolor: 'rgba(128, 0, 0, 0.1)',
                        borderColor: '#800000'
                        }
                      }}
                    >
                    Change Photo
                    </Button>
                  </label>
              </Box>
            </Grid>

            {/* Form Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editProfile.firstName}
                onChange={(e) => setEditProfile({ ...editProfile, firstName: e.target.value })}
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={editProfile.lastName}
                onChange={(e) => setEditProfile({ ...editProfile, lastName: e.target.value })}
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                value={editProfile.email}
                onChange={(e) => setEditProfile({ ...editProfile, email: e.target.value })}
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Gender"
                value={editProfile.sex}
                onChange={(e) => setEditProfile({ ...editProfile, sex: e.target.value })}
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Birthday"
                type="date"
                value={editProfile.birthdate}
                onChange={(e) => setEditProfile({ ...editProfile, birthdate: e.target.value })}
                size="small"
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone"
                value={editProfile.contact}
                onChange={(e) => setEditProfile({ ...editProfile, contact: e.target.value })}
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Home Address"
                value={editProfile.homeAddress}
                onChange={(e) => setEditProfile({ ...editProfile, homeAddress: e.target.value })}
                multiline
                rows={2}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '0.875rem'
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button 
            onClick={() => setOpenEditModal(false)} 
            variant="outlined"
            size="small"
            sx={{
              color: 'black',
              borderColor: 'black',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.1)',
                borderColor: 'black'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEditProfile} 
            variant="contained"
            disabled={saving}
            startIcon={<Save />}
            size="small"
            sx={{
              bgcolor: '#800000',
              fontSize: '0.875rem',
              '&:hover': {
                bgcolor: '#a00000'
              }
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 