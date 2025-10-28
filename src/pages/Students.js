import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { 
  Box, Grid, Typography, TextField, Button, Paper, MenuItem, Avatar, Snackbar, Alert, 
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Stack, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText,
  IconButton, Tooltip, Chip, InputAdornment, CircularProgress, useTheme, Tabs, Tab, TablePagination
} from "@mui/material";
import { Assignment, PersonAdd, ListAlt, Report, ImportExport, Dashboard, Visibility, Edit, Delete, Search, CloudUpload, PictureAsPdf, Close, ArrowBack, Refresh } from "@mui/icons-material";
import { db, storage, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { validateStudentId, getStudentById } from "../utils/studentValidation";
import StudentImport from "./StudentImport";

const courses = ["BSIT", "BSBA", "BSCRIM", "BSHTM", "BEED", "BSED", "BSHM"];
const years = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const positions = ["Student", "President", "Vice President", "Secretary", "Treasurer"];

function MenuCard({ icon, title, to }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Card>
        <CardActionArea component={Link} to={to}>
          <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {icon}
            <Typography variant="h6">{title}</Typography>
          </CardContent>
        </CardActionArea>
      </Card>
    </Grid>
  );
}

function AddStudent({ onClose, isModal = false }) {
  const theme = useTheme();
  const [formKey, setFormKey] = useState(0); // Force re-render key
  const [profile, setProfile] = useState({
    id: "",
    lastName: "",
    firstName: "",
    middleInitial: "",
    sex: "",
    age: "",
    birthdate: "",
    contact: "",
    course: "",
    year: "",
    section: "",
    image: null
  });
  const [imageFile, setImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentIdError, setStudentIdError] = useState('');

  // Test Firebase connectivity on component mount and ensure form is properly initialized
  useEffect(() => {
    const testConnection = async () => {
      const isConnected = await testFirebaseConnection();
      if (!isConnected) {
        setSnackbar({ 
          open: true, 
          message: "Warning: Firebase connection test failed. Form submission may not work.", 
          severity: "warning" 
        });
      } else {
        // Try to sync offline data if connection is restored
        syncOfflineData();
      }
    };
    testConnection();
    
    // Ensure form is properly initialized
    console.log('🔄 AddStudent component mounted, initializing form');
    resetForm();
  }, []);

  // Sync offline data to Firebase
  const syncOfflineData = async () => {
    try {
      const offlineData = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
      if (offlineData.length > 0) {
        console.log(`Found ${offlineData.length} offline records to sync`);
        
        for (const record of offlineData) {
          try {
            // Remove offline flags before saving
            const { offlineSaved, offlineTimestamp, ...cleanRecord } = record;
            await addDoc(collection(db, "students"), cleanRecord);
            console.log("Synced offline record:", cleanRecord.id);
          } catch (error) {
            console.error("Failed to sync offline record:", error);
          }
        }
        
        // Clear offline data after successful sync
        localStorage.removeItem('offlineStudents');
        setSnackbar({ 
          open: true, 
          message: `Successfully synced ${offlineData.length} offline records to database!`, 
          severity: "success" 
        });
      }
    } catch (error) {
      console.error("Error syncing offline data:", error);
    }
  };

  // Student ID format validation function
  const validateStudentIdFormat = (studentId) => {
    // Must match format: SCC-22-00000000
    // Must start with SCC-22- and have exactly 8 digits after the last dash
    const pattern = /^SCC-22-\d{8}$/;
    return pattern.test(studentId);
  };

  // Age calculation function based on birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    
    const today = new Date();
    const birth = new Date(birthdate);
    
    // Check if birthdate is valid
    if (isNaN(birth.getTime())) return '';
    
    // Check if birthdate is in the future
    if (birth > today) return '';
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // Return age if it's reasonable (0-150 years)
    return (age >= 0 && age <= 150) ? age.toString() : '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('🔄 AddStudent handleChange:', { name, value });
    
    setProfile((prev) => {
      const updated = { ...prev, [name]: value };
      console.log('📝 Profile updated:', updated);
      return updated;
    });
  };

  // Handle birthdate change with automatic age calculation
  const handleBirthdateChange = (e) => {
    const birthdate = e.target.value;
    const calculatedAge = calculateAge(birthdate);
    
    setProfile((prev) => ({ 
      ...prev, 
      birthdate: birthdate,
      age: calculatedAge
    }));
  };

  // Reset form function
  const resetForm = () => {
    console.log('🔄 Resetting AddStudent form');
    setProfile({
      id: "",
      lastName: "",
      firstName: "",
      middleInitial: "",
      sex: "",
      age: "",
      birthdate: "",
      contact: "",
      course: "",
      year: "",
      section: "",
      image: null
    });
    setImageFile(null);
    setStudentIdError('');
    setFormKey(prev => prev + 1); // Force re-render
  };

  // Handle Student ID input with format validation
  const handleStudentIdChange = (e) => {
    let studentId = e.target.value;
    
    // Auto-format the input to help users
    // Remove any non-alphanumeric characters except dashes
    studentId = studentId.replace(/[^A-Za-z0-9-]/g, '');
    
    // Convert to uppercase
    studentId = studentId.toUpperCase();
    
    // Auto-add dashes in the right places
    if (studentId.length > 3 && studentId.charAt(3) !== '-') {
      studentId = studentId.slice(0, 3) + '-' + studentId.slice(3);
    }
    if (studentId.length > 6 && studentId.charAt(6) !== '-') {
      studentId = studentId.slice(0, 6) + '-' + studentId.slice(6);
    }
    
    // Limit to the expected format length (SCC-22-00000000 = 15 characters)
    if (studentId.length > 15) {
      studentId = studentId.slice(0, 15);
    }
    
    setProfile(prev => ({ ...prev, id: studentId }));
    
    // Clear error if field is empty
    if (!studentId.trim()) {
      setStudentIdError('');
      return;
    }
    
    // Validate format
    if (!validateStudentIdFormat(studentId.trim())) {
      setStudentIdError('Invalid Student ID format. Please use this format: SCC-22-00000000');
    } else {
      setStudentIdError('');
    }
  };

  const handleImage = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      
      // Validate file size (max 500KB for better quality)
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      // Show loading message
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      
      setImageFile(file);
      
      // Convert to base64 with error handling
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile image uploaded successfully!", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Manual reset function in case form gets stuck
  const handleReset = () => {
    setIsSubmitting(false);
    setSnackbar({ open: true, message: "Form reset. You can try submitting again.", severity: "info" });
  };

  // Admin can freely input student ID without validation

  // Remove selected image
  const handleRemoveImage = () => {
    setImageFile(null);
    setProfile((prev) => ({ ...prev, image: null }));
    setSnackbar({ open: true, message: "Profile image removed", severity: "info" });
    console.log("Image removed");
  };

  // Test Firebase connectivity
  const testFirebaseConnection = async () => {
    try {
      console.log("Testing Firebase connection...");
      console.log("DB object:", db);
      console.log("Storage object:", storage);
      
      if (!db) {
        throw new Error("Firebase Firestore is not initialized");
      }
      
      if (!storage) {
        throw new Error("Firebase Storage is not initialized");
      }
      
      // Try to get a collection reference
      const testCollection = collection(db, "test");
      console.log("Firebase connection test successful");
      return true;
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log("=== FORM SUBMISSION STARTED ===");
    
    // Prevent double submission
    if (isSubmitting) {
      console.log("Form is already submitting, ignoring click");
      return;
    }
    
    // Basic validation
    if (!profile.id || !profile.firstName || !profile.lastName || !profile.sex) {
      console.log("Validation failed - missing required fields");
      setSnackbar({ open: true, message: "Please fill in all required fields (ID, First Name, Last Name, Sex)", severity: "error" });
      return;
    }

    // Validate Student ID format
    if (!validateStudentIdFormat(profile.id.trim())) {
      console.log("Validation failed - invalid Student ID format");
      setSnackbar({ open: true, message: "Invalid Student ID format. Please use this format: SCC-22-00000000", severity: "error" });
      return;
    }

    // Admin can freely add students without ID validation
    // This allows admins to create student records that can then be used for registration validation

    console.log("Setting isSubmitting to true");
    setIsSubmitting(true);
    console.log("handleSubmit called", profile);
    
    // Test Firebase connection first
    console.log("Testing Firebase connection...");
    const isFirebaseConnected = await testFirebaseConnection();
    if (!isFirebaseConnected) {
      console.log("Firebase connection test failed");
      setSnackbar({ open: true, message: "Firebase connection failed. Please check your internet connection and try again.", severity: "error" });
      setIsSubmitting(false);
      return;
    }
    
    console.log("Firebase connection test passed");
    let imageUrl = profile.image || "";
    
    // Add timeout protection
    const timeoutId = setTimeout(() => {
      console.error("Form submission timed out - forcing reset");
      setSnackbar({ open: true, message: "Submission timed out. Please try again.", severity: "error" });
      setIsSubmitting(false);
    }, 15000); // Reduced to 15 seconds timeout
    
    try {
      // Prepare data for Firebase
      const dataToSave = {
        ...profile,
        fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        image: imageUrl || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Remove the temporary image URL from the data
      delete dataToSave.imageFile;
      
      console.log("Attempting to save to Firestore:", dataToSave);
      
      // Add timeout for Firestore save operation (10 seconds)
      const savePromise = setDoc(doc(db, "students", dataToSave.id), dataToSave);
      const saveTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database save timed out')), 10000)
      );
      
      await Promise.race([savePromise, saveTimeout]);
      console.log("Successfully saved to Firestore with ID:", dataToSave.id);
      
      // Log activity
      await logActivity({ message: `Added student: ${profile.firstName} ${profile.lastName}`, type: 'add_student' });
      
      // Show success message based on whether image was uploaded
      if (imageUrl) {
        setSnackbar({ open: true, message: "Student saved to database successfully with image!", severity: "success" });
      } else {
        setSnackbar({ open: true, message: "Student saved to database successfully!", severity: "success" });
      }
      
      // Reset form
      console.log("Resetting form...");
      resetForm();
      
      // Close modal if provided
      if (onClose) {
        console.log("Closing modal...");
        onClose();
      }
      
      console.log("=== FORM SUBMISSION COMPLETED SUCCESSFULLY ===");
      
    } catch (error) {
      console.error("=== FORM SUBMISSION FAILED ===");
      console.error("Error saving student:", error);
      clearTimeout(timeoutId);
      
      // Provide more specific error messages
      let errorMessage = "Unknown error occurred";
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firebase security rules.";
      } else if (error.code === 'unavailable') {
        errorMessage = "Firebase service is unavailable. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Fallback: Save to localStorage if Firebase fails
      try {
        const offlineData = {
          ...dataToSave,
          offlineSaved: true,
          offlineTimestamp: new Date().toISOString()
        };
        
        const existingOfflineData = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
        existingOfflineData.push(offlineData);
        localStorage.setItem('offlineStudents', JSON.stringify(existingOfflineData));
        
        setSnackbar({ 
          open: true, 
          message: `Student data saved offline due to connection issues. Will sync when connection is restored.`, 
          severity: "warning" 
        });
        
        // Reset form even if saved offline
        resetForm();
        
        if (onClose) onClose();
        
      } catch (offlineError) {
        console.error("Offline save also failed:", offlineError);
        setSnackbar({ 
          open: true, 
          message: `Error saving student: ${errorMessage}`, 
          severity: "error" 
        });
      }
    } finally {
      console.log("Clearing timeout and setting isSubmitting to false");
      clearTimeout(timeoutId);
      setIsSubmitting(false);
      console.log("=== FORM SUBMISSION PROCESS ENDED ===");
    }
  };

  const formContent = (
        <form key={formKey} onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Student ID" 
                name="id" 
                value={profile.id} 
                onChange={handleStudentIdChange} 
                required 
                error={!!studentIdError}
                helperText={studentIdError || "Format: SCC-22-00000000"}
                placeholder="SCC-22-00000000"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: studentIdError ? 'error.main' : 
                                  (profile.id && validateStudentIdFormat(profile.id.trim())) ? 'success.main' : 'primary.main'
                    }
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Middle Initial" name="middleInitial" value={profile.middleInitial} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Sex" name="sex" value={profile.sex} onChange={handleChange} select required>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField 
                fullWidth 
                label="Age" 
                name="age" 
                value={profile.age} 
                type="number" 
                InputProps={{ readOnly: true }}
                helperText="Auto-calculated from birthdate"
                sx={{
                  '& .MuiInputBase-input': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    cursor: 'default'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField 
                fullWidth 
                label="Birthdate" 
                name="birthdate" 
                value={profile.birthdate} 
                onChange={handleBirthdateChange} 
                type="date" 
                InputLabelProps={{ shrink: true }} 
                helperText="Age will be calculated automatically"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth label="Contact Number" name="contact" value={profile.contact} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Course" name="course" value={profile.course} onChange={handleChange} select>
                {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="Year" name="year" value={profile.year} onChange={handleChange} select>
                {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </TextField>
            </Grid>
            {/* Section removed per new registration alignment */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>Profile Image</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button 
                variant="contained" 
                component="label" 
                startIcon={<CloudUpload />}
                sx={{ 
                  mt: 2,
                  backgroundColor: 'white',
                  color: 'black',
                  border: '1px solid #ccc',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: '1px solid #1976d2'
                  }
                }}
              >
                Upload Profile Image
                <input type="file" accept="image/*" hidden onChange={handleImage} />
              </Button>
              {profile.image && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar src={profile.image} sx={{ width: 80, height: 80 }} />
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Grid>
            <Grid item xs={12}>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Student"}
            </Button>
            <Button 
              type="button" 
              variant="outlined" 
              color="secondary" 
              onClick={resetForm}
              disabled={isSubmitting}
              sx={{ ml: 1 }}
            >
              🔄 Reset Form
            </Button>
          </Stack>
            </Grid>
          </Grid>
        </form>
  );

  if (isModal) {
    return (
      <Box>
        {formContent}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Add Student</Typography>
      <Paper sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
        {formContent}
      </Paper>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function LostFound() {
  const theme = useTheme();
  const [lostForm, setLostForm] = useState({ name: '', description: '', location: '', image: null, timeLost: '', lostBy: '' });
  const [foundForm, setFoundForm] = useState({ name: '', description: '', location: '', image: null, timeFound: '', foundBy: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostImageFile, setLostImageFile] = useState(null);
  const [foundImageFile, setFoundImageFile] = useState(null);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, type: '', item: null });
  const [editForm, setEditForm] = useState({ name: '', description: '', location: '', image: '', imageFile: null, timeLost: '', timeFound: '' });
  // Add students state
  const [students, setStudents] = useState([]);
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log("Fetching students from Firebase...");
        
        // Fetch from 'students' collection (includes both registered and unregistered students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const studentsData = studentsQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.registeredEmail || data.email || '', // Use registeredEmail first, then email field
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.id || data.studentId || doc.id, // Use 'id' field first (SCC-22-00000002), then fallback to studentId, then doc.id
            sex: data.sex || '',
            age: data.age || '',
            birthdate: data.birthdate || '',
            contact: data.contact || '',
            profilePic: data.profilePic || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            isRegisteredUser: Boolean(data.isRegistered) // Use isRegistered field from students collection
          };
        }).filter(student => !student.isRegistered);
        
        // Fetch from 'RegisteredStudents' collection (registered students)
        const registeredStudentsQuerySnapshot = await getDocs(collection(db, "RegisteredStudents"));
        const registeredStudentsData = registeredStudentsQuerySnapshot.docs.map(doc => {
          const data = doc.data();
          // The document ID is the studentId
          const studentId = doc.id;
          
          return {
            id: studentId, // Use studentId as ID
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.registeredEmail || data.email || '', // Use registeredEmail first, then email field
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: studentId, // Student ID from document ID
            sex: data.sex || '',
            age: data.age || '',
            birthdate: data.birthdate || '',
            contact: data.contact || '',
            profilePic: data.profilePic || '',
            createdAt: data.registeredAt || '',
            updatedAt: data.updatedAt || '',
            isRegisteredUser: true // Flag to identify registered users
          };
        });
        
        // Combine both collections (no duplicates since we filter unregistered students)
        const allStudents = [...unregisteredStudentsData, ...registeredStudentsData];
        
        // Sort students by creation date (newest first)
        const sortedStudents = allStudents.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        console.log("Students fetched successfully:", sortedStudents.length);
        console.log("Unregistered students:", unregisteredStudentsData.length);
        console.log("Registered students:", registeredStudentsData.length);
        
        // Debug: Check for specific student ID
        const targetStudentId = "SCC-22-00004444";
        const foundStudent = sortedStudents.find(s => s.studentId === targetStudentId);
        if (foundStudent) {
          console.log(`🎯 Found ${targetStudentId}:`, foundStudent);
        } else {
          console.log(`❌ Student ${targetStudentId} not found in combined list`);
          console.log("Available student IDs:", sortedStudents.map(s => s.studentId).filter(id => id));
        }
        setStudents(sortedStudents);
      } catch (error) {
        console.error("Error fetching students:", error);
        
        // Try to load from localStorage as fallback
        try {
          const offlineStudents = JSON.parse(localStorage.getItem('offlineStudents') || '[]');
          if (offlineStudents.length > 0) {
            console.log("Loading students from offline storage:", offlineStudents.length);
            setStudents(offlineStudents);
            setSnackbar({ 
              open: true, 
              message: `Loaded ${offlineStudents.length} students from offline storage. Some features may be limited.`, 
              severity: "warning" 
            });
          } else {
            setStudents([]);
            setSnackbar({ 
              open: true, 
              message: "Error loading students: " + error.message, 
              severity: "error" 
            });
          }
        } catch (offlineError) {
          console.error("Error loading offline students:", offlineError);
          setStudents([]);
          setSnackbar({ 
            open: true, 
            message: "Error loading students: " + error.message, 
            severity: "error" 
          });
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
    
    // Optimize: Use single-time fetches instead of real-time listeners
    const fetchLostFoundData = async () => {
      try {
        const [lostSnap, foundSnap] = await Promise.allSettled([
          getDocs(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc'))),
          getDocs(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')))
        ]);

        if (lostSnap.status === 'fulfilled') {
          setLostItems(lostSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        
        if (foundSnap.status === 'fulfilled') {
          setFoundItems(foundSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
      } catch (error) {
        console.error("Error fetching lost and found data:", error);
      }
    };

    fetchLostFoundData();
    
    return () => { /* No cleanup needed since we're using single-time fetches */ };
  }, []);

  // Summary counts
  const lostTotal = lostItems.length;
  const lostCompleted = lostItems.filter(i => i.resolved).length;
  const lostPending = lostItems.filter(i => !i.resolved).length;
  const foundTotal = foundItems.length;
  const foundCompleted = foundItems.filter(i => i.resolved).length;
  const foundPending = foundItems.filter(i => !i.resolved).length;

  // --- LostFound: handleLostImage ---
  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setLostForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleFoundImage ---
  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setFoundForm(f => ({ ...f, image: reader.result }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleEditImage ---
  const handleEditImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm(f => ({ ...f, image: reader.result, imageFile: null }));
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };
  // --- LostFound: handleLostSubmit ---
  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'lost_items'), { ...lostForm, resolved: false, createdAt: new Date().toISOString() });
      setSnackbar({ open: true, message: 'Lost item submitted!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit lost item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- LostFound: handleFoundSubmit ---
  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'found_items'), { ...foundForm, resolved: false, createdAt: new Date().toISOString() });
      setSnackbar({ open: true, message: 'Found item submitted!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to submit found item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };
  // --- LostFound: handleEditSave ---
  const handleEditSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, editModal.type, editModal.item.id), {
        name: editForm.name,
        description: editForm.description,
        location: editForm.location,
        image: editForm.image
      });
      setSnackbar({ open: true, message: 'Item updated!', severity: 'success' });
      setEditModal({ open: false, type: '', item: null });
      setEditForm({ name: '', description: '', location: '', image: '', imageFile: null });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update item.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (type, id) => {
    try {
      await updateDoc(doc(db, type, id), { resolved: true });
      setSnackbar({ open: true, message: 'Item marked as resolved.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to resolve item.', severity: 'error' });
    }
  };
  const handleDelete = async (type, id) => {
    try {
      await deleteDoc(doc(db, type, id));
      setSnackbar({ open: true, message: 'Item deleted.', severity: 'success' });
    } catch {
      setSnackbar({ open: true, message: 'Failed to delete item.', severity: 'error' });
    }
  };

  const filteredLost = lostItems.filter(item =>
    item.name.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(lostSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(lostSearch.toLowerCase())
  );
  const filteredFound = foundItems.filter(item =>
    item.name.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.description.toLowerCase().includes(foundSearch.toLowerCase()) ||
    item.location.toLowerCase().includes(foundSearch.toLowerCase())
  );

  // Edit logic
  const handleEditOpen = (type, item) => {
    setEditForm({ name: item.name, description: item.description, location: item.location, image: item.image || '', imageFile: null });
    setEditModal({ open: true, type, item });
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Lost and Found</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#80000015', borderLeft: '4px solid #f44336' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Lost Items Summary</Typography>
            <Grid container spacing={2}>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Total: <b>{lostTotal}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Completed: <b>{lostCompleted}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Pending: <b>{lostPending}</b></Typography></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#80000015', borderLeft: '4px solid #4caf50' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Found Items Summary</Typography>
            <Grid container spacing={2}>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Total: <b>{foundTotal}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Completed: <b>{foundCompleted}</b></Typography></Grid>
              <Grid item><Typography sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>Pending: <b>{foundPending}</b></Typography></Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        {/* Lost Items History Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Lost Items History</Typography>
            <TextField fullWidth placeholder="Search lost items..." value={lostSearch} onChange={e => setLostSearch(e.target.value)} sx={{ mb: 2 }} />
            {filteredLost.length === 0 ? <Typography>No lost items yet.</Typography> : filteredLost.map(item => (
              <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: item.resolved ? '#ffe0b2' : '#fffde7', borderRadius: 2, position: 'relative' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    {item.image && <Avatar src={item.image} variant="rounded" sx={{ width: 56, height: 56, mr: 2 }} />}
                  </Grid>
                  <Grid item xs>
                    <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.name}</Typography>
                    <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.description}</Typography>
                    <Typography variant="caption" color="text.secondary">Location: {item.location}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item>
                    <Button size="small" color="info" onClick={() => handleEditOpen('lost_items', item)}>Edit</Button>
                    {!item.resolved && <Button size="small" color="success" onClick={() => handleResolve('lost_items', item.id)}>Resolve</Button>}
                    <Button size="small" color="error" onClick={() => handleDelete('lost_items', item.id)}>Delete</Button>
                  </Grid>
                </Grid>
                {item.resolved && <Typography variant="caption" color="success.main" sx={{ position: 'absolute', top: 8, right: 16 }}>Resolved</Typography>}
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* Found Items Summary Section */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Found Items Summary</Typography>
            <TextField fullWidth placeholder="Search found items..." value={foundSearch} onChange={e => setFoundSearch(e.target.value)} sx={{ mb: 2 }} />
            {filteredFound.length === 0 ? <Typography>No found items yet.</Typography> : filteredFound.map(item => (
              <Box key={item.id} sx={{ mb: 2, p: 2, bgcolor: item.resolved ? '#c8e6c9' : '#e8f5e9', borderRadius: 2, position: 'relative' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item>
                    {item.image && <Avatar src={item.image} variant="rounded" sx={{ width: 56, height: 56, mr: 2 }} />}
                  </Grid>
                  <Grid item xs>
                    <Typography fontWeight={700} sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.name}</Typography>
                    <Typography variant="body2" sx={item.resolved ? { textDecoration: 'line-through', color: 'gray' } : {}}>{item.description}</Typography>
                    <Typography variant="caption" color="text.secondary">Location: {item.location}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
                  </Grid>
                  <Grid item>
                    <Button size="small" color="info" onClick={() => handleEditOpen('found_items', item)}>Edit</Button>
                    {!item.resolved && <Button size="small" color="success" onClick={() => handleResolve('found_items', item.id)}>Resolve</Button>}
                    <Button size="small" color="error" onClick={() => handleDelete('found_items', item.id)}>Delete</Button>
                  </Grid>
                </Grid>
                {item.resolved && <Typography variant="caption" color="success.main" sx={{ position: 'absolute', top: 8, right: 16 }}>Resolved</Typography>}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
      {/* Edit Modal */}
      <Dialog open={editModal.open} onClose={() => setEditModal({ open: false, type: '', item: null })} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Item Name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Description" multiline minRows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} sx={{ mb: 2 }} />
          <TextField fullWidth label="Location" value={editForm.location} onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))} sx={{ mb: 2 }} />
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            Update Image
            <input type="file" accept="image/*" hidden onChange={handleEditImage} />
          </Button>
          {editForm.image && <Avatar src={editForm.image} variant="rounded" sx={{ width: 56, height: 56, mb: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditModal({ open: false, type: '', item: null })}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}>Save</Button>
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

function CourseDashboard({ 
  courseName, 
  onBack, 
  setOpenAddStudent, 
  setOpenViolationRecord, 
  setViolationRecords, 
  currentStudent, 
  setCurrentStudent,
  setOpenViewDetails,
  setOpenEditStudent,
  setStudentToView,
  setStudentToEdit,
  setOpenViolationImagePreview,
  setPreviewViolationImage,
  violationRecords
}) {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState("All Years");
  const [openViolation, setOpenViolation] = useState(false);
  const [violation, setViolation] = useState({ 
    violation: "", 
    classification: "", 
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    severity: "",
    actionTaken: "",
    reportedBy: ""
  });
  const [violationImageFile, setViolationImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        console.log(`Fetching ${courseName} students from Firebase...`);
        
        // Fetch from 'students' collection (only unregistered students)
        const studentsQuerySnapshot = await getDocs(collection(db, "students"));
        const unregisteredStudentsData = studentsQuerySnapshot.docs
          .filter(doc => doc.data().isRegistered !== true) // Only unregistered students
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              email: data.email || '',
              course: data.course || '',
              year: data.year || '',
              section: data.section || '',
              studentId: data.studentId || data.id || doc.id, // Use actual studentId if available, otherwise fallback to document id
              sex: data.sex || '',
              age: data.age || '',
              birthdate: data.birthdate || '',
              contact: data.contact || '',
              profilePic: data.profilePic || '',
              createdAt: data.createdAt || '',
              updatedAt: data.updatedAt || '',
              isRegisteredUser: false // These are unregistered students
            };
          });
        
        // Combine both collections (no duplicates since we filter unregistered students)
        const allStudents = [...unregisteredStudentsData, ...registeredStudentsData];
        
        setStudents(allStudents);
        setFilteredStudents(allStudents);
      } catch (error) {
        console.error("Error fetching course students:", error);
        setError('Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseStudents();
  }, [selectedCourse, courseName]);

  // Real-time listener for students collection
  useEffect(() => {
    console.log('🔄 Setting up real-time listener for students collection...');
    setLoading(true);
    
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        console.log('📊 Real-time update: Students collection changed');
        const studentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.registeredEmail || data.email || '', // Use registeredEmail first, then email field
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.id || data.studentId || doc.id, // Use 'id' field first (SCC-22-00000002), then fallback to studentId, then doc.id
            sex: data.sex || '',
            age: data.age || '',
            birthdate: data.birthdate || '',
            contact: data.contact || '',
            profilePic: data.profilePic || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            lastUpdated: data.lastUpdated || '', // Add lastUpdated field
            updatedBy: data.updatedBy || '', // Add updatedBy field
            isRegisteredUser: Boolean(data.isRegistered), // Use isRegistered field from students collection
            isRegistered: Boolean(data.isRegistered), // Add this field for consistency
            registeredAt: data.registeredAt || '',
            registeredEmail: data.registeredEmail || '',
            registeredUserId: data.registeredUserId || '',
            // Add additional fields that might be updated by students
            middleInitial: data.middleInitial || '',
            sccNumber: data.sccNumber || '',
            fatherName: data.fatherName || '',
            fatherOccupation: data.fatherOccupation || '',
            motherName: data.motherName || '',
            motherOccupation: data.motherOccupation || '',
            guardian: data.guardian || '',
            guardianOccupation: data.guardianOccupation || '',
            emergencyContactName: data.emergencyContactName || '',
            emergencyContactNumber: data.emergencyContactNumber || '',
            province: data.province || '',
            municipality: data.municipality || '',
            barangay: data.barangay || '',
            address: data.address || '',
            zipCode: data.zipCode || ''
          };
        });
        
        console.log("Students fetched successfully:", studentsData.length);
        
        setStudents(studentsData);
        setFilteredStudents(studentsData);
        console.log('📊 Students state updated:', studentsData.length);
      },
      (error) => {
        console.error('❌ Error listening to students collection:', error);
        setLoading(false);
      }
    );
    
    // Note: No longer need separate RegisteredStudents listener since all students 
    // (both registered and unregistered) are now stored in the students collection
    
    return () => {
      console.log('🔄 Cleaning up real-time listeners...');
      unsubStudents();
    };
  }, []);

  // Keyboard shortcut for search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // Focus on search input if it exists
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter students based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const filtered = students.filter(student => {
        const searchLower = searchTerm.toLowerCase();
        const matchName = (student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()).toLowerCase().includes(searchLower);
        const matchEmail = (student.email || '').toLowerCase().includes(searchLower);
        const matchStudentId = (student.studentId || '').toLowerCase().includes(searchLower);
        const matchCourse = (student.course || '').toLowerCase().includes(searchLower);
        const matchYear = (student.year || '').toLowerCase().includes(searchLower);
        const matchSection = (student.section || '').toLowerCase().includes(searchLower);
        
        return matchName || matchEmail || matchStudentId || matchCourse || matchYear || matchSection;
      });
      setFilteredStudents(filtered);
    }
  }, [searchTerm, students]);

  // Filter students based on search and year level
  const filteredStudents = students.filter(student => {
    // Year level filter
    const yearMatch = selectedYear === "All Years" || student.year === selectedYear;
    
    // Search filter
    const searchMatch = !search.trim() || (() => {
      const term = search.trim().toLowerCase();
      const fullName = (student.fullName || `${student.firstName || ""} ${student.lastName || ""}`.trim()).toLowerCase();
      const email = (student.email || "").toLowerCase();
      const studentId = (student.studentId || "").toLowerCase();
      
      return fullName.includes(term) || 
             email.includes(term) || 
             studentId.includes(term);
    })();
    
    return yearMatch && searchMatch;
  });

  // Handle view student details
  const handleViewStudent = (student) => {
    console.log("Viewing student:", student);
    setStudentToView(student);
    setOpenViewDetails(true);
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log("Editing student:", student);
    setStudentToEdit(student);
    setOpenEditStudent(true);
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()}?`)) {
      try {
        await deleteDoc(doc(db, "students", student.id));
        setSnackbar({ open: true, message: "Student deleted successfully!", severity: "success" });
        
        // Refresh the student list
        setStudents(prev => prev.filter(s => s.id !== student.id));
      } catch (error) {
        console.error("Error deleting student:", error);
        setSnackbar({ open: true, message: "Error deleting student: " + error.message, severity: "error" });
      }
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={onBack}
          sx={{ 
            bgcolor: '#fff', 
            color: '#000', 
            border: '1px solid #000',
            '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } 
          }}
        >
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
            fontWeight: 'bold' 
          }}>
            {courseName} Students
          </Typography>
          <Typography variant="body1" sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
          }}>
            {students.length} student{students.length !== 1 ? 's' : ''} enrolled in {courseName}
          </Typography>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
            }}>
              {students.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Total {courseName} Students
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
            }}>
              {selectedYear === "All Years" ? new Set(students.map(s => s.year)).size : 1}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {selectedYear === "All Years" ? 'Year Levels' : 'Selected Year'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
            }}>
              {new Set(filteredStudents.map(s => s.section)).size}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Sections
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: '#000000', 
              fontWeight: 'bold' 
            }}>
              {filteredStudents.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {search.trim() || selectedYear !== "All Years" ? 'Filtered Results' : 'All Students'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Year Level Filter */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ 
          mb: 2, 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
          fontWeight: 'bold' 
        }}>
          Filter by Year Level
        </Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label="All Years"
            onClick={() => setSelectedYear("All Years")}
            color={selectedYear === "All Years" ? "primary" : "default"}
            sx={{
              bgcolor: selectedYear === "All Years" ? '#000000' : 'default',
              color: selectedYear === "All Years" ? 'white' : 'default',
              '&:hover': {
                bgcolor: selectedYear === "All Years" ? '#333333' : '#f5f5f5'
              }
            }}
          />
          {["1st Year", "2nd Year", "3rd Year", "4th Year"].map(year => {
            const yearStudents = students.filter(s => s.year === year);
            return (
              <Chip
                key={year}
                label={`${year} (${yearStudents.length})`}
                onClick={() => setSelectedYear(year)}
                color={selectedYear === year ? "primary" : "default"}
                disabled={yearStudents.length === 0}
                sx={{
                  bgcolor: selectedYear === year ? '#000000' : 'default',
                  color: selectedYear === year ? 'white' : 'default',
                  '&:hover': {
                    bgcolor: selectedYear === year ? '#333333' : '#f5f5f5'
                  },
                  opacity: yearStudents.length === 0 ? 0.5 : 1
                }}
              />
            );
          })}
        </Stack>
        {selectedYear !== "All Years" && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} from {selectedYear}
          </Typography>
        )}
      </Box>

      {/* Search and Actions */}
      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenAddStudent(true)}
            sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
          >
            Add Student
          </Button>
          {(search.trim() || selectedYear !== "All Years") && (
            <Button 
              variant="outlined" 
              onClick={() => {
                setSearch("");
                setSelectedYear("All Years");
              }}
              sx={{ bgcolor: '#fff', color: '#000', borderColor: '#000', '&:hover': { bgcolor: '#800000', color: '#fff', borderColor: '#800000' } }}
            >
              Clear Filters
            </Button>
          )}
        </Stack>
        <TextField 
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          placeholder={`Search ${courseName} students by name, email, or ID...`}
          sx={{ width: 350 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            )
          }}
        />
      </Stack>

      {/* Students Table */}
      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading {courseName} students...</Typography>
        </Box>
      ) : students.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No {courseName} students found.</Typography>
        </Box>
      ) : filteredStudents.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>
            No {courseName} students found matching your criteria.
            {selectedYear !== "All Years" && ` No students in ${selectedYear}.`}
            {search.trim() && ` No students match "${search}".`}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={() => {
              setSearch("");
              setSelectedYear("All Years");
            }}
            sx={{ 
              mt: 2,
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Clear Filters
          </Button>
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: '#800000' 
              }}>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '140px',
                  maxWidth: '140px'
                }}>
                  Student
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Student ID
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '180px',
                  maxWidth: '180px'
                }}>
                  Email
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '100px',
                  maxWidth: '100px'
                }}>
                  Course
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Year & Section
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '100px',
                  maxWidth: '100px'
                }}>
                  Status
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredStudents.map(student => (
                <TableRow
                  key={student.id}
                  hover
                  sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}
                >
                  <TableCell sx={{ padding: '12px 16px', minWidth: '140px', maxWidth: '140px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar 
                        src={student.profilePic || student.image} 
                        sx={{ 
                          width: 36, 
                          height: 36,
                          bgcolor: theme.palette.mode === 'dark' ? '#800000' : '#1976d2',
                          fontSize: '0.875rem'
                        }}
                      >
                        {(student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()).charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'medium',
                            fontSize: '0.875rem',
                            lineHeight: 1.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                          </Typography>
                          {/* Show indicator for recent updates */}
                          {student.lastUpdated && 
                           new Date(student.lastUpdated) > new Date(Date.now() - 5 * 60 * 1000) && (
                            <Chip
                              label="Updated"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.65rem',
                                bgcolor: '#4caf50',
                                color: 'white',
                                '& .MuiChip-label': {
                                  px: 0.5
                                }
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.75rem',
                          lineHeight: 1.2
                        }}>
                          {student.year} • {student.section}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '120px', maxWidth: '120px' }}>
                    <Tooltip 
                      title={student.lastUpdated ? `Last updated: ${new Date(student.lastUpdated).toLocaleString()}${student.updatedBy ? ` by ${student.updatedBy}` : ''}` : 'No update information'}
                      arrow
                    >
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem',
                        fontWeight: 'medium',
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                        cursor: student.lastUpdated ? 'help' : 'default'
                      }}>
                        {student.studentId || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '180px', maxWidth: '180px' }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {student.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '100px', maxWidth: '100px' }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                    }}>
                      {student.course || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '120px', maxWidth: '120px' }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.875rem',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                    }}>
                      {student.year} • {student.section}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '100px', maxWidth: '100px' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Chip 
                        label={student.isRegisteredUser ? 'Registered' : 'Unregistered'} 
                        size="small" 
                        sx={{ 
                          bgcolor: student.isRegisteredUser ? '#4caf50' : '#ff9800',
                          color: 'white',
                          fontSize: '0.75rem',
                          height: 24,
                          fontWeight: 'bold'
                        }} 
                      />
                      {student.transferredFromStudents && (
                        <Chip 
                          label="Transferred" 
                          size="small" 
                          sx={{ 
                            bgcolor: '#2196f3',
                            color: 'white',
                            fontSize: '0.65rem',
                            height: 20,
                            fontWeight: 'bold'
                          }} 
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ padding: '12px 16px', minWidth: '120px', maxWidth: '120px' }}>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#000000' } }}
                          onClick={(e) => { e.stopPropagation(); handleViewStudent(student); }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#000000' } }}
                          onClick={(e) => { e.stopPropagation(); handleEditStudent(student); }}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Student">
                        <IconButton 
                          size="small"
                          sx={{ color: 'grey.600', '&:hover': { color: '#d32f2f' } }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteStudent(student); }}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StudentList({ 
  setOpenAddStudent, 
  setOpenViolationRecord, 
  setViolationRecords, 
  currentStudent, 
  setCurrentStudent,
  setOpenViewDetails,
  setOpenEditStudent,
  setStudentToView,
  setStudentToEdit,
  setOpenViolationImagePreview,
  setPreviewViolationImage,
  violationRecords
}) {
  const theme = useTheme();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState('all'); // 'all' or specific course name
  const [openViolation, setOpenViolation] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: All Students, 1: Unregistered, 2: Registered
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [violation, setViolation] = useState({ 
    violation: "", 
    classification: "", 
    date: "",
    time: "",
    location: "",
    description: "",
    witnesses: "",
    severity: "",
    actionTaken: "",
    reportedBy: ""
  });
  const [violationImageFile, setViolationImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);

  // Debug activeTab changes
  useEffect(() => {
    console.log('🎯 activeTab changed to:', activeTab);
  }, [activeTab]);

  useEffect(() => {
    console.log('🎯 Setting up real-time listeners for students...');
    
    // Real-time listener for students collection (both unregistered and registered students)
    const unsubStudents = onSnapshot(
      collection(db, "students"),
      (snapshot) => {
        const studentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.registeredEmail || data.email || '', // Use registeredEmail first, then email field
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.id || data.studentId || doc.id, // Use 'id' field first (SCC-22-00000002), then fallback to studentId, then doc.id
            sex: data.sex || '',
            age: data.age || '',
            birthdate: data.birthdate || '',
            contact: data.contact || '',
            profilePic: data.profilePic || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            lastUpdated: data.lastUpdated || '', // Add lastUpdated field
            updatedBy: data.updatedBy || '', // Add updatedBy field
            isRegisteredUser: Boolean(data.isRegistered), // Use isRegistered field from students collection
            isRegistered: Boolean(data.isRegistered), // Add this field for consistency
            registeredAt: data.registeredAt || '',
            registeredEmail: data.registeredEmail || '',
            registeredUserId: data.registeredUserId || '',
            // Add additional fields that might be updated by students
            middleInitial: data.middleInitial || '',
            sccNumber: data.sccNumber || '',
            fatherName: data.fatherName || '',
            fatherOccupation: data.fatherOccupation || '',
            motherName: data.motherName || '',
            motherOccupation: data.motherOccupation || '',
            guardian: data.guardian || '',
            guardianContact: data.guardianContact || '',
            homeAddress: data.homeAddress || '',
            teacherId: data.teacherId || '',
            classroomUpdatedAt: data.classroomUpdatedAt || '',
            classroomUpdatedBy: data.classroomUpdatedBy || ''
          };
        }); // Remove filter - show both registered and unregistered
        
        console.log('👥 All students updated:', studentsData.length);
        console.log('📊 Students data:', studentsData.map(s => ({
          id: s.id,
          studentId: s.studentId,
          fullName: s.fullName,
          isRegisteredUser: s.isRegisteredUser,
          isRegistered: s.isRegistered,
          lastUpdated: s.lastUpdated,
          updatedBy: s.updatedBy
        })));
        
        // Debug: Count registered vs unregistered
        const registeredCount = studentsData.filter(s => s.isRegisteredUser).length;
        const unregisteredCount = studentsData.filter(s => !s.isRegisteredUser).length;
        console.log(`📈 Registration status: ${registeredCount} registered, ${unregisteredCount} unregistered`);
        
        // Debug: Show recent updates
        const recentUpdates = studentsData.filter(s => s.lastUpdated && 
          new Date(s.lastUpdated) > new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
        );
        if (recentUpdates.length > 0) {
          console.log('🔄 Recent updates detected:', recentUpdates.map(s => ({
            name: s.fullName,
            studentId: s.studentId,
            lastUpdated: s.lastUpdated,
            updatedBy: s.updatedBy
          })));
          
          // Show notification for recent updates
          const updateMessage = recentUpdates.length === 1 
            ? `${recentUpdates[0].fullName} updated their profile`
            : `${recentUpdates.length} students updated their profiles`;
          
          setSnackbar({
            open: true,
            message: updateMessage,
            severity: 'info'
          });
        }
        
        // Update all students in state
        setStudents(studentsData);
        
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to students collection:', error);
        setLoading(false);
      }
    );
    
    // Real-time listener for registered students (no longer needed - consolidated approach)
    /*
    const unsubUsers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "Student")),
      (snapshot) => {
        const registeredStudentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            firstName: data.firstName || data.fullName?.split(' ')[0] || '',
            lastName: data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '',
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || '',
            course: data.course || '',
            year: data.year || '',
            section: data.section || '',
            studentId: data.studentId || '',
            sex: data.sex || '',
            age: data.age || '',
            birthdate: data.birthdate || '',
            contact: data.contact || '',
            profilePic: data.profilePic || '',
            createdAt: data.createdAt || '',
            updatedAt: data.updatedAt || '',
            isRegisteredUser: true, // Flag to identify registered users
            transferredFromStudents: data.transferredFromStudents || false,
            transferDate: data.transferDate || null
          };
        });
        
        console.log('👥 Registered students updated:', registeredStudentsData.length);
        
        // Update registered students in state
        setStudents(prevStudents => {
          const unregisteredStudents = prevStudents.filter(s => !s.isRegisteredUser);
          const allStudents = [...unregisteredStudents, ...registeredStudentsData];
          
          // Sort students by creation date (newest first)
          const sortedStudents = allStudents.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA; // Descending order (newest first)
          });
          
          return sortedStudents;
        });
        
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to users collection:', error);
        setLoading(false);
      }
    );
    */
    
    // Note: No longer need separate RegisteredStudents listener since all students 
    // (both registered and unregistered) are now stored in the students collection
    
    return () => {
      console.log('🔄 Cleaning up real-time listeners...');
      unsubStudents();
      // unsubUsers(); // No longer needed
    };
  }, []);

  // Keyboard shortcut for search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // Focus on search input
        const searchInput = document.querySelector('input[placeholder*="Search by name"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter students based on registration status, search, and course filter
  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    // Apply course filter
    if (courseFilter !== 'all') {
      filtered = filtered.filter(student => student.course === courseFilter);
    }
    
    // Apply search filter if search term exists
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      console.log('🔍 Searching for:', term);
      console.log('📊 Total students to search:', filtered.length);
      
      filtered = filtered.filter(s => {
        const fullName = `${s.firstName || ""} ${s.lastName || ""}`.trim().toLowerCase();
        const course = (s.course || "").toLowerCase();
        const studentId = (s.id || s.studentId || "").toLowerCase();
        const year = (s.year || "").toLowerCase();
        const section = (s.section || "").toLowerCase();
        
        const matches = fullName.includes(term) || 
               course.includes(term) || 
               studentId.includes(term) ||
               year.includes(term) ||
               section.includes(term);
        
        if (matches) {
          console.log('✅ Match found:', {
            name: fullName,
            course,
            studentId,
            year,
            section
          });
        }
        
        return matches;
      });
      
      console.log('🎯 Search results:', filtered.length, 'matches found');
    }
    
    // Apply tab filter
    if (activeTab === 1) {
      // Unregistered students only
      console.log('🔍 Filtering for UNREGISTERED students, activeTab:', activeTab);
      console.log('📊 Students before unregistered filter:', filtered.length);
      filtered = filtered.filter(student => {
        // Ensure isRegisteredUser is properly defined (default to false if undefined)
        const isRegistered = Boolean(student.isRegisteredUser);
        const isUnregistered = !isRegistered;
        console.log(`Student ${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()}: isRegisteredUser=${student.isRegisteredUser}, isRegistered=${isRegistered}, isUnregistered=${isUnregistered}`);
        return isUnregistered;
      });
      console.log('📊 Students after unregistered filter:', filtered.length);
    } else if (activeTab === 2) {
      // Registered students only
      console.log('🔍 Filtering for REGISTERED students, activeTab:', activeTab);
      console.log('📊 Students before registered filter:', filtered.length);
      filtered = filtered.filter(student => {
        // Ensure isRegisteredUser is properly defined (default to false if undefined)
        const isRegistered = Boolean(student.isRegisteredUser);
        console.log(`Student ${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()} (ID: ${student.studentId}): isRegisteredUser=${student.isRegisteredUser}, isRegistered=${isRegistered}`);
        return isRegistered;
      });
      console.log('📊 Students after registered filter:', filtered.length);
    } else {
      console.log('🔍 Showing ALL students, activeTab:', activeTab);
      console.log('📊 Total students:', filtered.length);
    }
    
    return filtered;
  }, [students, search, activeTab, courseFilter]);

  // Get unique courses for filter dropdown
  const availableCourses = useMemo(() => {
    // Use the predefined courses list instead of dynamically generating from students
    return courses.sort();
  }, []);

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = page * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, page, rowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [search, courseFilter, activeTab]);


  const handleExportToPDF = useCallback(() => {
    // For PDF export, we'll use the browser's print functionality with PDF option
    // This is a simple approach that works across all browsers
    const printWindow = window.open('', '_blank');
    const tableData = filteredStudents.map(student => ({
      name: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      studentId: student.studentId || 'N/A',
      course: student.course || 'Not Assigned',
      year: student.year || 'N/A',
      section: student.section || 'N/A',
      status: student.isRegisteredUser ? 'Registered' : 'Unregistered'
    }));

    const pdfContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student List - PDF Export</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #800000; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .status-registered { color: #2e7d32; }
            .status-unregistered { color: #f57c00; }
            @media print { 
              body { margin: 0; }
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h1>Student List</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Course</th>
                <th>Year & Section</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableData.map(student => `
                <tr>
                  <td>${student.name}</td>
                  <td>${student.studentId}</td>
                  <td>${student.course}</td>
                  <td>${student.year} • ${student.section}</td>
                  <td class="status-${student.status.toLowerCase()}">${student.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    
    // Show a message to guide the user
    setTimeout(() => {
      alert('Please use your browser\'s print dialog and select "Save as PDF" to export the document.');
      printWindow.print();
    }, 500);
  }, [filteredStudents]);

  // Refresh student list
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Refreshing students from Firebase...");
      
      // Fetch from 'students' collection (both registered and unregistered students)
      const studentsQuerySnapshot = await getDocs(collection(db, "students"));
      const studentsData = studentsQuerySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          email: data.email || '',
          course: data.course || '',
          year: data.year || '',
          section: data.section || '',
          studentId: data.studentId || data.id || doc.id, // Use actual studentId if available, otherwise fallback to document id
          sex: data.sex || '',
          age: data.age || '',
          birthdate: data.birthdate || '',
          contact: data.contact || '',
          profilePic: data.profilePic || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          lastUpdated: data.lastUpdated || '', // Add lastUpdated field
          updatedBy: data.updatedBy || '', // Add updatedBy field
          isRegisteredUser: Boolean(data.isRegistered), // Ensure boolean value
          isRegistered: Boolean(data.isRegistered), // Add this field for consistency
          registeredAt: data.registeredAt || '',
          registeredEmail: data.registeredEmail || '',
          registeredUserId: data.registeredUserId || '',
          // Add additional fields that might be updated by students
          middleInitial: data.middleInitial || '',
          sccNumber: data.sccNumber || '',
          fatherName: data.fatherName || '',
          fatherOccupation: data.fatherOccupation || '',
          motherName: data.motherName || '',
          motherOccupation: data.motherOccupation || '',
          guardian: data.guardian || '',
          guardianContact: data.guardianContact || '',
          homeAddress: data.homeAddress || '',
          teacherId: data.teacherId || '',
          classroomUpdatedAt: data.classroomUpdatedAt || '',
          classroomUpdatedBy: data.classroomUpdatedBy || ''
        };
      }); // Show both registered and unregistered students
      
      // Sort students by creation date (newest first)
      const sortedStudents = studentsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      
      // Debug: Count registered vs unregistered
      const registeredCount = sortedStudents.filter(s => s.isRegisteredUser).length;
      const unregisteredCount = sortedStudents.filter(s => !s.isRegisteredUser).length;
      console.log(`🔄 Refresh complete: ${registeredCount} registered, ${unregisteredCount} unregistered`);
      console.log('📧 Sample student email data (StudentList):', sortedStudents.slice(0, 3).map(s => ({ 
        name: s.fullName, 
        email: s.email, 
        studentId: s.studentId 
      })));
      
      setStudents(sortedStudents);
      setSnackbar({ open: true, message: "Student list refreshed successfully!", severity: "success" });
    } catch (error) {
      console.error("Error refreshing students:", error);
      setSnackbar({ open: true, message: "Error refreshing students: " + error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  // Debug function to check specific student ID
  const debugStudentId = useCallback(async (studentId) => {
    try {
      console.log(`🔍 Debugging student ID: ${studentId}`);
      
      // Check all collections for this student ID
      const [studentsSnapshot, usersSnapshot, registeredStudentsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "students"), where("studentId", "==", studentId))),
        getDocs(query(collection(db, "users"), where("studentId", "==", studentId))),
        getDocs(query(collection(db, "RegisteredStudents"), where("studentId", "==", studentId)))
      ]);
      
      // Also check by document ID
      const [studentsByIdSnapshot, registeredStudentsByIdSnapshot] = await Promise.all([
        getDocs(query(collection(db, "students"), where("id", "==", studentId))),
        getDocs(query(collection(db, "RegisteredStudents"), where("id", "==", studentId)))
      ]);
      
      const debugInfo = {
        studentId,
        studentsCollection: {
          byStudentId: studentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
          byDocumentId: studentsByIdSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
        },
        usersCollection: {
          byStudentId: usersSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
        },
        registeredStudentsCollection: {
          byStudentId: registeredStudentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })),
          byDocumentId: registeredStudentsByIdSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
        }
      };
      
      console.log('🔍 Debug results:', debugInfo);
      
      // Analyze the situation
      const hasUsersData = usersSnapshot.size > 0;
      const hasStudentsData = studentsSnapshot.size > 0 || studentsByIdSnapshot.size > 0;
      const hasRegisteredStudentsData = registeredStudentsSnapshot.size > 0 || registeredStudentsByIdSnapshot.size > 0;
      
      let analysisMessage = '';
      if (hasUsersData && !hasStudentsData && !hasRegisteredStudentsData) {
        analysisMessage = 'Student registered but missing from students collections. This is the issue!';
      } else if (hasUsersData && hasRegisteredStudentsData && !hasStudentsData) {
        analysisMessage = 'Student properly registered and in RegisteredStudents, but missing from original students collection.';
      } else if (!hasUsersData && !hasStudentsData && !hasRegisteredStudentsData) {
        analysisMessage = 'Student not found in any collection. May need to be imported first.';
      } else {
        analysisMessage = 'Student data found in some collections.';
      }
      
      console.log('📊 Analysis:', analysisMessage);
      
      // Show results in snackbar
      const totalFound = studentsSnapshot.size + usersSnapshot.size + registeredStudentsSnapshot.size + 
                        studentsByIdSnapshot.size + registeredStudentsByIdSnapshot.size;
      
      setSnackbar({ 
        open: true, 
        message: `${analysisMessage} Found ${totalFound} records. Check console for details.`, 
        severity: totalFound > 0 ? "success" : "warning" 
      });
      
      return debugInfo;
    } catch (error) {
      console.error('❌ Error debugging student ID:', error);
      setSnackbar({ 
        open: true, 
        message: `Error debugging student ID: ${error.message}`, 
        severity: "error" 
      });
    }
  }, []);

  // Function to manually fix a student registration
  const fixStudentRegistration = useCallback(async (studentId) => {
    try {
      console.log(`🔧 Attempting to fix registration for student ID: ${studentId}`);
      
      // First, check if student exists in users collection
      const usersSnapshot = await getDocs(query(collection(db, "users"), where("studentId", "==", studentId)));
      
      if (usersSnapshot.empty) {
        setSnackbar({ 
          open: true, 
          message: `Student ${studentId} not found in users collection. Cannot fix registration.`, 
          severity: "error" 
        });
        return;
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('📋 Found user data:', userData);
      
      // Check if already exists in RegisteredStudents
      const registeredStudentsSnapshot = await getDocs(query(collection(db, "RegisteredStudents"), where("studentId", "==", studentId)));
      
      if (!registeredStudentsSnapshot.empty) {
        setSnackbar({ 
          open: true, 
          message: `Student ${studentId} already exists in RegisteredStudents collection.`, 
          severity: "info" 
        });
        return;
      }
      
      // Create RegisteredStudents entry
      const registeredStudentData = {
        studentId: studentId,
        email: userData.email,
        fullName: userData.fullName,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        course: userData.course || '',
        year: userData.year || '',
        section: userData.section || '',
        sex: userData.sex || '',
        contact: userData.contact || '',
        birthdate: userData.birthdate || '',
        age: userData.age || '',
        profilePic: userData.profilePic || '',
        uid: userData.uid,
        registeredAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transferredFromStudents: userData.transferredFromStudents || false,
        transferDate: userData.transferDate || null,
        originalStudentData: userData.originalStudentData || null,
        manuallyFixed: true,
        fixedAt: new Date().toISOString()
      };
      
      console.log('📦 Creating RegisteredStudents entry:', registeredStudentData);
      
      await setDoc(doc(db, 'RegisteredStudents', studentId), registeredStudentData);
      
      // Also update the original student record if it exists
      const studentsSnapshot = await getDocs(query(collection(db, "students"), where("studentId", "==", studentId)));
      if (!studentsSnapshot.empty) {
        const studentDoc = studentsSnapshot.docs[0];
        await updateDoc(studentDoc.ref, {
          isRegistered: true,
          registeredAt: new Date().toISOString(),
          registeredEmail: userData.email,
          transferredToUsers: true,
          transferredToRegisteredStudents: true,
          manuallyFixed: true
        });
        console.log('✅ Updated original student record');
      }
      
      setSnackbar({ 
        open: true, 
        message: `Successfully fixed registration for ${studentId}! Student should now appear in registered table.`, 
        severity: "success" 
      });
      
      // Refresh the student list
      setTimeout(() => {
        handleRefresh();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error fixing student registration:', error);
      setSnackbar({ 
        open: true, 
        message: `Error fixing registration: ${error.message}`, 
        severity: "error" 
      });
    }
  }, [handleRefresh]);

  // Function to test the complete registration process
  const testRegistrationProcess = useCallback(async (studentId) => {
    try {
      console.log(`🧪 Testing registration process for: ${studentId}`);
      
      // Check if student exists in users collection
      const usersSnapshot = await getDocs(query(collection(db, "users"), where("studentId", "==", studentId)));
      
      if (usersSnapshot.empty) {
        setSnackbar({ 
          open: true, 
          message: `Student ${studentId} not found in users collection. Cannot test registration process.`, 
          severity: "error" 
        });
        return;
      }
      
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      
      console.log('📋 Found user data:', userData);
      
      // Simulate the registration process by calling createSingleUser logic
      const studentData = {
        id: studentId,
        studentId: studentId,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        fullName: userData.fullName || '',
        email: userData.email || '',
        sex: userData.sex || '',
        course: userData.course || '',
        year: userData.year || '',
        section: userData.section || '',
        contact: userData.contact || '',
        birthdate: userData.birthdate || '',
        age: userData.age || '',
        image: userData.profilePic || '',
        createdAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isRegistered: true,
        registeredAt: userData.createdAt || new Date().toISOString(),
        registeredEmail: userData.email,
        registeredUserId: userData.uid,
        transferredToUsers: true,
        transferredToRegisteredStudents: true,
        source: 'manual_test',
        uid: userData.uid
      };
      
      console.log('📦 Creating student record in students collection:', studentData);
      
      // Create/update student record in students collection
      await setDoc(doc(db, 'students', studentId), studentData);
      console.log('✅ Student record created/updated in students collection');
      
      // Also create RegisteredStudents entry
      const registeredStudentData = {
        studentId: studentId,
        email: userData.email,
        fullName: userData.fullName,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        course: userData.course || '',
        year: userData.year || '',
        section: userData.section || '',
        sex: userData.sex || '',
        contact: userData.contact || '',
        birthdate: userData.birthdate || '',
        age: userData.age || '',
        profilePic: userData.profilePic || '',
        uid: userData.uid,
        registeredAt: userData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        transferredFromStudents: false,
        transferDate: null,
        originalStudentData: null,
        manuallyTested: true,
        testedAt: new Date().toISOString()
      };
      
      console.log('📦 Creating RegisteredStudents entry:', registeredStudentData);
      await setDoc(doc(db, 'RegisteredStudents', studentId), registeredStudentData);
      console.log('✅ RegisteredStudents entry created');
      
      setSnackbar({ 
        open: true, 
        message: `Successfully tested registration process for ${studentId}! Student should now appear in both collections.`, 
        severity: "success" 
      });
      
      // Refresh the student list
      setTimeout(() => {
        handleRefresh();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error testing registration process:', error);
      setSnackbar({ 
        open: true, 
        message: `Error testing registration process: ${error.message}`, 
        severity: "error" 
      });
    }
  }, [handleRefresh]);

  // Handle view student details
  const handleViewStudent = (student) => {
    console.log("Viewing student:", student);
    setStudentToView(student);
    setOpenViewDetails(true);
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log("Editing student:", student);
    setStudentToEdit(student);
    setOpenEditStudent(true);
  };

  // Handle delete student
  const handleDeleteStudent = async (student) => {
    if (window.confirm(`Are you sure you want to delete ${student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()}?`)) {
      try {
        await deleteDoc(doc(db, "students", student.id));
        setSnackbar({ open: true, message: "Student deleted successfully!", severity: "success" });
        
        // Refresh the student list
        setStudents(prev => prev.filter(s => s.id !== student.id));
      } catch (error) {
        console.error("Error deleting student:", error);
        setSnackbar({ open: true, message: "Error deleting student: " + error.message, severity: "error" });
      }
    }
  };


  // --- StudentList: handleViolationImage ---
  const handleViolationImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      // Validate file size (max 200KB)
      if (file.size > 200 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
        return;
      }
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        setViolationImageFile(reader.result);
        setSnackbar({ open: true, message: "Image loaded as base64!", severity: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove violation image
  const handleRemoveViolationImage = () => {
    setViolationImageFile(null);
    console.log("Violation image removed");
  };

  // Handle violation image preview
  const handleViolationImagePreview = (imageUrl) => {
    setPreviewViolationImage(imageUrl);
    setOpenViolationImagePreview(true);
  };


  // --- StudentList: handleSaveViolation ---
  const handleSaveViolation = async () => {
    if (!currentStudent || !violation.violation || !violation.classification || !violation.date) {
      setSnackbar({ open: true, message: "Please fill in all required fields.", severity: "error" });
      return;
    }

    // Validate that the student ID is registered in the system
    try {
      const validationResult = await validateStudentId(currentStudent.id);
      if (!validationResult.isValid) {
        setSnackbar({ 
          open: true, 
          message: `Error: ${validationResult.error}. Please ensure the student is properly registered before adding violations.`, 
          severity: "error" 
        });
        return;
      }
    } catch (validationError) {
      console.error("Student validation error:", validationError);
      setSnackbar({ 
        open: true, 
        message: "Student validation failed. Please try again or contact support.", 
        severity: "error" 
      });
      return;
    }

    setLoading(true);
    try {
      const violationData = {
        ...violation,
        studentId: currentStudent.id,
        studentEmail: currentStudent.email, // Add student email for notifications
        studentName: `${currentStudent.firstName} ${currentStudent.lastName}`,
        image: violationImageFile || null,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        status: "Pending"
      };
      const violationRef = await addDoc(collection(db, "violations"), violationData);
      
      // Create detailed notification for the student
      if (currentStudent.email) {
        try {
          // Create comprehensive notification message with all violation details
          const notificationMessage = `
🚨 NEW VIOLATION REPORTED

Dear ${currentStudent.firstName} ${currentStudent.lastName},

A new violation has been reported for you with the following details:

📋 VIOLATION DETAILS:
• Type: ${violation.violation}
• Classification: ${violation.classification}
• Severity: ${violation.severity || 'Not specified'}
• Date: ${violation.date}
• Time: ${violation.time || 'Not specified'}
• Location: ${violation.location || 'Not specified'}

📝 DESCRIPTION:
${violation.description || 'No description provided'}

👥 ADDITIONAL INFORMATION:
• Witnesses: ${violation.witnesses || 'None specified'}
• Reported By: ${violation.reportedBy || 'Not specified'}
• Action Taken: ${violation.actionTaken || 'Pending review'}

⚠️ IMPORTANT:
Please review this violation in your student dashboard. You may need to take action or attend a meeting regarding this matter.

For questions or concerns, please contact the administration office.

Best regards,
School Administration
          `.trim();

          await addDoc(collection(db, "notifications"), {
            recipientEmail: currentStudent.email,
            recipientName: `${currentStudent.firstName} ${currentStudent.lastName}`,
            title: `🚨 New Violation: ${violation.violation}`,
            message: notificationMessage,
            type: "violation",
            severity: violation.severity || "Medium",
            read: false,
            createdAt: new Date().toISOString(),
            violationId: violationRef.id,
            violationDetails: {
              type: violation.violation,
              classification: violation.classification,
              severity: violation.severity,
              date: violation.date,
              time: violation.time,
              location: violation.location,
              description: violation.description,
              witnesses: violation.witnesses,
              reportedBy: violation.reportedBy,
              actionTaken: violation.actionTaken
            },
            priority: violation.severity === "Critical" ? "high" : 
                     violation.severity === "High" ? "high" : 
                     violation.severity === "Medium" ? "medium" : "low"
          });

          console.log("Detailed violation notification created for student:", currentStudent.email);
        } catch (notificationError) {
          console.error("Error creating detailed notification:", notificationError);
          // Fallback to simple notification
          try {
            await addDoc(collection(db, "notifications"), {
              recipientEmail: currentStudent.email,
              title: "New Violation Reported",
              message: `A new violation "${violation.violation}" has been reported for you on ${violation.date}. Please review the details in your dashboard.`,
              type: "violation",
              read: false,
              createdAt: new Date().toISOString(),
              violationId: violationRef.id
            });
          } catch (fallbackError) {
            console.error("Error creating fallback notification:", fallbackError);
          }
        }
      }
      
      setSnackbar({ open: true, message: "Violation saved successfully! Student has been notified.", severity: "success" });
      setOpenViolation(false);
      setViolation({ 
        violation: "", classification: "", date: "", time: "", location: "", description: "", witnesses: "", severity: "", actionTaken: "", reportedBy: "" 
      });
      setViolationImageFile(null);
    } catch (error) {
      console.error("Error saving violation:", error);
      setSnackbar({ open: true, message: "Error saving violation: " + error.message, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // If viewing a specific course, show the course dashboard
  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ 
        color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
        mb: 2,
        mt: 1
      }}>
        Student List
      </Typography>
      
      {/* Tabs for Student Categories */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            console.log('🔄 Tab changed from', activeTab, 'to', newValue);
            setActiveTab(newValue);
          }}
          sx={{
            '& .MuiTab-root': {
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#666',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '1rem',
              textAlign: 'left',
              justifyContent: 'flex-start',
              paddingLeft: '16px',
              paddingRight: '16px'
            },
            '& .Mui-selected': {
              color: '#000000 !important',
              fontWeight: 'bold'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#000000'
            }
          }}
        >
          <Tab 
            label={`All Students (${students.length})`} 
            value={0}
            sx={{ 
              textAlign: 'left', 
              minWidth: 'auto',
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
              '&.Mui-selected': {
                color: theme.palette.mode === 'dark' ? '#ffffff !important' : '#000000 !important'
              }
            }}
          />
          <Tab 
            label={`Unregistered (${students.filter(s => !s.isRegisteredUser).length})`} 
            value={1}
            sx={{ textAlign: 'left', minWidth: 'auto' }}
          />
          <Tab 
            label={`Registered (${students.filter(s => s.isRegisteredUser).length})`} 
            value={2}
            sx={{ textAlign: 'left', minWidth: 'auto' }}
          />
        </Tabs>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              fontWeight: 'bold' 
            }}>
              {filteredStudents.filter(s => s.course && s.course.trim() !== '').length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {activeTab === 1 ? 'Unregistered with Courses' : 
               activeTab === 2 ? 'Registered with Courses' : 
               'Students with Assigned Courses'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              fontWeight: 'bold' 
            }}>
              {availableCourses.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              Available Courses
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              fontWeight: 'bold' 
            }}>
              {courseFilter !== 'all' ? filteredStudents.length : students.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {courseFilter !== 'all' ? `${courseFilter} Students` : 'Total Students'}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ 
            p: 2, 
            textAlign: 'center', 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000'
          }}>
            <Typography variant="h4" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              fontWeight: 'bold' 
            }}>
              {filteredStudents.length}
            </Typography>
            <Typography variant="body2" sx={{ 
              color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
            }}>
              {search.trim() ? `Search Results (${filteredStudents.length} found)` : 
               activeTab === 1 ? 'Unregistered Students' : 
               activeTab === 2 ? 'Registered Students' : 
               'Filtered Students'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={() => setOpenAddStudent(true)}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
          Add Student
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => setOpenImportDialog(true)}
            startIcon={<CloudUpload />}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              },
              '& .MuiSvgIcon-root': {
                fontSize: '0.875rem'
              }
            }}
          >
          Import
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleRefresh}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
            Refresh
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => debugStudentId('SCC-22-12345672')}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
            Debug KEVIN
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => fixStudentRegistration('SCC-22-12345672')}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
            Fix KEVIN
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => createMissingStudentRecord('SCC-22-12345672')}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
            Create KEVIN Record
          </Button>
          <Button 
            variant="outlined" 
            onClick={() => testRegistrationProcess('SCC-22-12345672')}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              } 
            }}
          >
            Test Registration
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleExportToPDF}
            disabled={filteredStudents.length === 0}
            sx={{ 
              bgcolor: '#ffffff', 
              color: '#000000', 
              borderColor: '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              },
              '&:disabled': {
                color: '#cccccc',
                borderColor: '#999999',
                bgcolor: '#999999'
              }
            }}
          >
            <PictureAsPdf sx={{ mr: 0.5, fontSize: '0.875rem', color: 'inherit' }} />
            Export PDF
          </Button>
        </Stack>
      </Stack>
      
      {/* Instructions */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
          fontWeight: 'medium', 
          mb: 1 
        }}>
          📋 Student Management
        </Typography>
        <Typography variant="body2" sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' 
        }}>
          All students are displayed in a unified table below. Use the course filter dropdown to view students from specific courses, 
          or use the search bar to find students by name, course, ID, year, or section.
        </Typography>
        
      </Box>

      {loading ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Loading students...</Typography>
        </Box>
      ) : filteredStudents.length === 0 ? (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          {search.trim() || courseFilter !== 'all' ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
                🔍 No students found
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                {search.trim() ? `No students match "${search}"` : `No students found in ${courseFilter}`}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                {search.trim() && (
                  <Button 
                    variant="outlined" 
                    onClick={() => setSearch("")}
                    sx={{ 
                      mt: 1,
                      bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#fff', 
                      color: '#666666', 
                      borderColor: '#666666', 
                      '&:hover': { 
                        bgcolor: '#800000', 
                        color: '#fff', 
                        borderColor: '#800000' 
                      } 
                    }}
                  >
                    Clear Search
                  </Button>
                )}
                {courseFilter !== 'all' && (
                  <Button 
                    variant="outlined" 
                    onClick={() => setCourseFilter('all')}
                    sx={{ 
                      mt: 1,
                      bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#fff', 
                      color: '#666666', 
                      borderColor: '#666666', 
                      '&:hover': { 
                        bgcolor: '#800000', 
                        color: '#fff', 
                        borderColor: '#800000' 
                      } 
                    }}
                  >
                    Show All Courses
                  </Button>
                )}
              </Stack>
            </Box>
          ) : (
            <Typography>No students found.</Typography>
          )}
        </Box>
      ) : (
        <>
          {/* Search Bar and Course Filter - Outside Table */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField 
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              placeholder="Search students..."
              sx={{ 
                width: '200px',
                bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#ffffff',
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#800000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#800000',
                    borderWidth: 2,
                  },
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: search.trim() ? '#800000' : 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: search.trim() && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearch("")}
                      sx={{ 
                        color: 'text.secondary',
                        '&:hover': { color: '#800000' }
                      }}
                    >
                      ✕
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              select
              label="Filter by Course"
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              size="small"
              sx={{ 
                minWidth: 200,
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#800000',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#800000',
                    borderWidth: 2,
                  },
                }
              }}
            >
              <MenuItem value="all">All Courses</MenuItem>
              {availableCourses.map(course => (
                <MenuItem key={course} value={course}>{course}</MenuItem>
              ))}
            </TextField>
          </Box>

          <TableContainer component={Paper} key={`table-${activeTab}`} sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff'
          }}>
            <Table stickyHeader>
              <TableHead>
                {/* Header Row */}
              <TableRow>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '140px',
                  maxWidth: '140px'
                }}>
                  Student
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Student ID
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '180px',
                  maxWidth: '180px'
                }}>
                  Email
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '100px',
                  maxWidth: '100px'
                }}>
                  Course
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Year & Section
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '100px',
                  maxWidth: '100px'
                }}>
                  Status
                </TableCell>
                <TableCell sx={{ 
                  bgcolor: '#800000',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  padding: '12px 16px',
                  minWidth: '120px',
                  maxWidth: '120px'
                }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(() => {
                console.log('🎯 RENDERING TABLE with activeTab:', activeTab);
                console.log('📊 filteredStudents count:', filteredStudents.length);
                console.log('📋 First few students:', filteredStudents.slice(0, 3).map(s => ({
                  name: `${s.firstName} ${s.lastName}`,
                  isRegisteredUser: s.isRegisteredUser
                })));
                return null;
              })()}
              {paginatedStudents.map((student) => (
                <TableRow 
                  key={student.id} 
                  hover
                  sx={{ 
                    '&:hover': { 
                      bgcolor: theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5' 
                    }
                  }}
                >
                  <TableCell sx={{ padding: '8px 12px', minWidth: '140px', maxWidth: '140px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar 
                        src={student.profilePic} 
                        sx={{ 
                          width: 32, 
                          height: 32,
                          bgcolor: theme.palette.mode === 'dark' ? '#800000' : '#1976d2',
                          fontSize: '0.75rem'
                        }}
                      >
                        {(student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()).charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ 
                          fontWeight: 'medium',
                          fontSize: '0.8rem',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: 'text.secondary',
                          fontSize: '0.7rem',
                          lineHeight: 1.2
                        }}>
                          {student.year} • {student.section}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '120px', maxWidth: '120px' }}>
                    <Tooltip title={student.studentId || 'N/A'} arrow>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.8rem',
                        lineHeight: 1.2,
                        fontFamily: 'monospace',
                        cursor: 'help'
                      }}>
                        {student.studentId || 'N/A'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '180px', maxWidth: '180px' }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.8rem',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {student.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '100px', maxWidth: '100px' }}>
                    <Chip 
                      label={student.course || 'Not Assigned'} 
                      size="small"
                      sx={{ 
                        bgcolor: student.course ? '#e3f2fd' : '#ffebee',
                        color: student.course ? '#1976d2' : '#d32f2f',
                        fontWeight: 'medium',
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '120px', maxWidth: '120px' }}>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.8rem',
                      lineHeight: 1.2
                    }}>
                      {student.year || 'N/A'} • {student.section || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '100px', maxWidth: '100px' }}>
                    <Chip 
                      label={student.isRegisteredUser ? 'Registered' : 'Unregistered'} 
                      size="small"
                      sx={{ 
                        bgcolor: student.isRegisteredUser ? '#e8f5e8' : '#fff3e0',
                        color: student.isRegisteredUser ? '#2e7d32' : '#f57c00',
                        fontWeight: 'medium',
                        fontSize: '0.7rem',
                        height: 20
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ padding: '8px 12px', minWidth: '120px', maxWidth: '120px' }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small" 
                          onClick={() => handleViewStudent(student)}
                          sx={{ 
                            color: '#666666',
                            padding: '4px',
                            '&:hover': { 
                              color: '#1976d2',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          <Visibility sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Student">
                        <IconButton 
                          size="small" 
                          onClick={() => handleEditStudent(student)}
                          sx={{ 
                            color: '#666666',
                            padding: '4px',
                            '&:hover': { 
                              color: '#f57c00',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 124, 0, 0.1)' : 'rgba(245, 124, 0, 0.04)'
                            }
                          }}
                        >
                          <Edit sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Student">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteStudent(student)}
                          sx={{ 
                            color: '#666666',
                            padding: '4px',
                            '&:hover': { 
                              color: '#d32f2f',
                              bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.04)'
                            }
                          }}
                        >
                          <Delete sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[5, 8]}
          component="div"
          count={filteredStudents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
            borderTop: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0'
          }}
        />
        </>
      )}
      <Dialog open={openViolation} onClose={() => setOpenViolation(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Add Violation for {currentStudent && `${currentStudent.firstName} ${currentStudent.lastName}`}
            </Typography>
            <IconButton onClick={() => setOpenViolation(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
                label="Violation Type"
            fullWidth
            value={violation.violation}
            onChange={e => setViolation(v => ({ ...v, violation: e.target.value }))}
                required
          />
            </Grid>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
            label="Classification"
            fullWidth
                select
            value={violation.classification}
            onChange={e => setViolation(v => ({ ...v, classification: e.target.value }))}
                required
              >
                <MenuItem value="Academic">Academic</MenuItem>
                <MenuItem value="Behavioral">Behavioral</MenuItem>
                <MenuItem value="Policy/Rules">Policy/Rules</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
          <TextField
            margin="dense"
            label="Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={violation.date}
            onChange={e => setViolation(v => ({ ...v, date: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Time"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={violation.time}
                onChange={e => setViolation(v => ({ ...v, time: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Location"
                fullWidth
                value={violation.location}
                onChange={e => setViolation(v => ({ ...v, location: e.target.value }))}
                placeholder="e.g., Classroom 101, Library, Cafeteria"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Severity Level"
                fullWidth
                select
                value={violation.severity}
                onChange={e => setViolation(v => ({ ...v, severity: e.target.value }))}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Detailed Description"
                fullWidth
                multiline
                minRows={3}
                value={violation.description}
                onChange={e => setViolation(v => ({ ...v, description: e.target.value }))}
                placeholder="Provide a detailed description of the violation..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Witnesses (if any)"
                fullWidth
                value={violation.witnesses}
                onChange={e => setViolation(v => ({ ...v, witnesses: e.target.value }))}
                placeholder="Names of witnesses, if applicable"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Reported By"
                fullWidth
                value={violation.reportedBy}
                onChange={e => setViolation(v => ({ ...v, reportedBy: e.target.value }))}
                placeholder="Name of person who reported"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Action Taken"
                fullWidth
                multiline
                minRows={2}
                value={violation.actionTaken}
                onChange={e => setViolation(v => ({ ...v, actionTaken: e.target.value }))}
                placeholder="Describe the action taken or disciplinary measures applied..."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button variant="contained" component="label" sx={{ mt: 2 }}>
                Attach Evidence Image
                <input type="file" accept="image/*" hidden onChange={handleViolationImage} />
              </Button>
              {violationImageFile && (
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar 
                    src={violationImageFile} 
                    sx={{ width: 80, height: 80 }} 
                    variant="rounded"
                  />
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={handleRemoveViolationImage}
                  >
                    Remove
                  </Button>
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolation(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveViolation} 
            variant="contained"
            disabled={!violation.violation || !violation.classification || !violation.date}
          >
            Save Violation
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Student Import Dialog */}
      <StudentImport 
        open={openImportDialog} 
        onClose={() => setOpenImportDialog(false)}
        onImportSuccess={handleRefresh}
      />
      
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function StudentMenu() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Student Menu
      </Typography>
      <Grid container spacing={2}>

        <MenuCard icon={<PersonAdd fontSize="large" />} title="Add Student" to="add-student" />
        <MenuCard icon={<ListAlt fontSize="large" />} title="Student List" to="student-list" />
        <MenuCard icon={<Report fontSize="large" />} title="Add Violation" to="add-violation" />
        <MenuCard icon={<ListAlt fontSize="large" />} title="Violation Record" to="violation-record" />
        <MenuCard icon={<ImportExport fontSize="large" />} title="Student Import" to="student-import" />
      </Grid>
    </Box>
  );
}

function EditStudentForm({ student, onClose, onSuccess }) {
  const theme = useTheme();
  const [formKey, setFormKey] = useState(0); // Force re-render key
  const [profile, setProfile] = useState({
    id: student.studentId || "",
    lastName: student.lastName || "",
    firstName: student.firstName || "",
    middleInitial: student.middleInitial || "",
    sex: student.sex || "",
    age: student.age || "",
    birthdate: student.birthdate || "",
    contact: student.contact || "",
    course: student.course || "",
    year: student.year || "",
    section: student.section || "",
    image: student.image || null
  });
  const [imageFile, setImageFile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentIdError, setStudentIdError] = useState('');
  const [isValidatingStudentId, setIsValidatingStudentId] = useState(false);

  // Age calculation function based on birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return '';
    
    const today = new Date();
    const birth = new Date(birthdate);
    
    // Check if birthdate is valid
    if (isNaN(birth.getTime())) return '';
    
    // Check if birthdate is in the future
    if (birth > today) return '';
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    // Return age if it's reasonable (0-150 years)
    return (age >= 0 && age <= 150) ? age.toString() : '';
  };

  // Calculate age when component loads with existing birthdate
  useEffect(() => {
    if (student.birthdate) {
      const calculatedAge = calculateAge(student.birthdate);
      setProfile(prev => ({ ...prev, age: calculatedAge }));
    }
  }, [student.birthdate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log('🔄 EditStudentForm handleChange:', { name, value });
    
    setProfile((prev) => {
      const updated = { ...prev, [name]: value };
      console.log('📝 Profile updated:', updated);
      return updated;
    });
  };

  // Reset form function
  const resetForm = () => {
    console.log('🔄 Resetting EditStudentForm');
    setProfile({
      id: student.studentId || "",
      lastName: student.lastName || "",
      firstName: student.firstName || "",
      middleInitial: student.middleInitial || "",
      sex: student.sex || "",
      age: student.age || "",
      birthdate: student.birthdate || "",
      contact: student.contact || "",
      course: student.course || "",
      year: student.year || "",
      section: student.section || "",
      image: student.image || null
    });
    setImageFile(null);
    setStudentIdError('');
    setFormKey(prev => prev + 1); // Force re-render
  };

  // Handle birthdate change with automatic age calculation
  const handleBirthdateChange = (e) => {
    const birthdate = e.target.value;
    const calculatedAge = calculateAge(birthdate);
    
    setProfile((prev) => ({ 
      ...prev, 
      birthdate: birthdate,
      age: calculatedAge
    }));
  };

  const handleStudentIdChange = async (e) => {
    const studentId = e.target.value;
    setProfile(prev => ({ ...prev, id: studentId }));
    
    // Clear error if field is empty
    if (!studentId.trim()) {
      setStudentIdError('');
      return;
    }
    
    setIsValidatingStudentId(true);
    setStudentIdError('');
    
    try {
      const validation = await validateStudentId(studentId.trim());
      if (!validation.isValid) {
        setStudentIdError(validation.error || 'Student ID is not registered in the system');
      } else {
        setStudentIdError('');
      }
    } catch (error) {
      console.error('Error validating student ID:', error);
      setStudentIdError('Error validating student ID. Please try again.');
    } finally {
      setIsValidatingStudentId(false);
    }
  };

  const handleImage = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF)", severity: "error" });
        return;
      }
      
      // Validate file size (max 500KB for better quality)
      if (file.size > 500 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 500KB", severity: "error" });
        return;
      }
      
      // Show loading message
      setSnackbar({ open: true, message: "Processing image...", severity: "info" });
      
      setImageFile(file);
      
      // Convert to base64 with error handling
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, image: reader.result }));
        setSnackbar({ open: true, message: "Profile image updated successfully!", severity: "success" });
      };
      reader.onerror = () => {
        setSnackbar({ open: true, message: "Error reading image file. Please try again.", severity: "error" });
        setImageFile(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Basic validation
    if (!profile.id || !profile.firstName || !profile.lastName || !profile.sex) {
      setSnackbar({ open: true, message: "Please fill in all required fields (ID, First Name, Last Name, Sex)", severity: "error" });
      return;
    }

    // Validate student ID exists in system
    if (studentIdError) {
      setSnackbar({ open: true, message: studentIdError, severity: "error" });
      return;
    }

    // Double-check student ID validation before submission
    try {
      const validation = await validateStudentId(profile.id.trim());
      if (!validation.isValid) {
        setSnackbar({ open: true, message: validation.error || 'Student ID is not registered in the system', severity: "error" });
        return;
      }
    } catch (validationError) {
      console.error("Student validation error:", validationError);
      setSnackbar({ 
        open: true, 
        message: "Student validation failed. Please try again or contact support.", 
        severity: "error" 
      });
      return;
    }

    setIsSubmitting(true);
    let imageUrl = profile.image || "";
    
    try {
      // Update data in Firebase
      const dataToUpdate = {
        ...profile,
        fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        image: imageUrl,
        updatedAt: new Date().toISOString()
      };
      
      // Remove the temporary image URL from the data
      delete dataToUpdate.imageFile;
      
      console.log("Updating student in Firestore:", dataToUpdate);
      
      // Update the document
      await updateDoc(doc(db, "students", student.id), dataToUpdate);
      await logActivity({ message: `Updated student: ${profile.firstName} ${profile.lastName}`, type: 'edit_student' });
      
      console.log("Student updated successfully!");
      setSnackbar({ open: true, message: "Student updated successfully!", severity: "success" });
      
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error("Error updating student:", error);
      setSnackbar({ 
        open: true, 
        message: "Error updating student: " + error.message, 
        severity: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <form key={formKey} onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="Student ID" 
              name="id" 
              value={profile.id} 
              onChange={handleStudentIdChange} 
              required 
              error={!!studentIdError}
              helperText={studentIdError}
              InputProps={{
                endAdornment: isValidatingStudentId ? (
                  <InputAdornment position="end">
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : null
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Last Name" name="lastName" value={profile.lastName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="First Name" name="firstName" value={profile.firstName} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Middle Initial" name="middleInitial" value={profile.middleInitial} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Sex" name="sex" value={profile.sex} onChange={handleChange} select required>
              <MenuItem value="Male">Male</MenuItem>
              <MenuItem value="Female">Female</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField 
              fullWidth 
              label="Age" 
              name="age" 
              value={profile.age} 
              type="number" 
              InputProps={{ readOnly: true }}
              helperText="Auto-calculated from birthdate"
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  cursor: 'default'
                }
              }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField 
              fullWidth 
              label="Birthdate" 
              name="birthdate" 
              value={profile.birthdate} 
              onChange={handleBirthdateChange} 
              type="date" 
              InputLabelProps={{ shrink: true }} 
              helperText="Age will be calculated automatically"
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth label="Contact Number" name="contact" value={profile.contact} onChange={handleChange} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Course" name="course" value={profile.course} onChange={handleChange} select>
              {courses.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Year" name="year" value={profile.year} onChange={handleChange} select>
              {years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Section" name="section" value={profile.section} onChange={handleChange} select>
              <MenuItem value="A">A</MenuItem>
              <MenuItem value="B">B</MenuItem>
              <MenuItem value="C">C</MenuItem>
              <MenuItem value="D">D</MenuItem>
              <MenuItem value="E">E</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  component="label" 
                  startIcon={<CloudUpload />}
                  sx={{ 
                    bgcolor: '#ffffff', 
                    color: '#000000', 
                    borderColor: '#000000', 
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    padding: '6px 12px',
                    minHeight: '32px',
                    boxShadow: 'none',
                    '&:hover': { 
                      bgcolor: '#800000', 
                      color: '#fff', 
                      borderColor: '#800000',
                      boxShadow: 'none'
                    }
                  }}
                >
                  Update Profile Image
                  <input type="file" accept="image/*" hidden onChange={handleImage} />
                </Button>
                {profile.image && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar src={profile.image} sx={{ width: 40, height: 40 }} />
                  </Box>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ alignSelf: 'flex-end' }}>
                <Button 
                  type="submit" 
                  variant="outlined"
                  disabled={isSubmitting}
                  sx={{ 
                    color: '#666666',
                    padding: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    minHeight: '32px',
                    boxShadow: 'none',
                    '&:hover': { 
                      color: '#f57c00',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(245, 124, 0, 0.1)' : 'rgba(245, 124, 0, 0.04)'
                    }
                  }}
                >
                  {isSubmitting ? "Updating..." : "Update Student"}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={resetForm}
                  disabled={isSubmitting}
                  sx={{ 
                    color: '#666666',
                    padding: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    minHeight: '32px',
                    boxShadow: 'none',
                    '&:hover': { 
                      color: '#1976d2',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  🔄 Reset
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={onClose}
                  disabled={isSubmitting}
                  sx={{ 
                    color: '#666666',
                    padding: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    textTransform: 'none',
                    minHeight: '32px',
                    boxShadow: 'none',
                    '&:hover': { 
                      color: '#d32f2f',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.04)'
                    }
                  }}
                >
                  Cancel
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Grid>
      </form>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function Students() {
  const theme = useTheme();
  const [openAddStudent, setOpenAddStudent] = useState(false);
  const [openViolationRecord, setOpenViolationRecord] = useState(false);
  const [violationRecords, setViolationRecords] = useState([]);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [openViewDetails, setOpenViewDetails] = useState(false);
  const [openEditStudent, setOpenEditStudent] = useState(false);
  const [studentToView, setStudentToView] = useState(null);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [openViolationImagePreview, setOpenViolationImagePreview] = useState(false);
  const [previewViolationImage, setPreviewViolationImage] = useState(null);

  return (
    <>
      <Routes>
        <Route path="/" element={
          <StudentList
            setOpenAddStudent={setOpenAddStudent}
            setOpenViolationRecord={setOpenViolationRecord}
            setViolationRecords={setViolationRecords}
            currentStudent={currentStudent}
            setCurrentStudent={setCurrentStudent}
            setOpenViewDetails={setOpenViewDetails}
            setOpenEditStudent={setOpenEditStudent}
            setStudentToView={setStudentToView}
            setStudentToEdit={setStudentToEdit}
            setOpenViolationImagePreview={setOpenViolationImagePreview}
            setPreviewViolationImage={setPreviewViolationImage}
            violationRecords={violationRecords}
          />
        } />

        <Route path="student-list" element={
          <StudentList
            setOpenAddStudent={setOpenAddStudent}
            setOpenViolationRecord={setOpenViolationRecord}
            setViolationRecords={setViolationRecords}
            currentStudent={currentStudent}
            setCurrentStudent={setCurrentStudent}
            setOpenViewDetails={setOpenViewDetails}
            setOpenEditStudent={setOpenEditStudent}
            setStudentToView={setStudentToView}
            setStudentToEdit={setStudentToEdit}
            setOpenViolationImagePreview={setOpenViolationImagePreview}
            setPreviewViolationImage={setPreviewViolationImage}
            violationRecords={violationRecords}
          />
        } />
        {/* Add subroutes for each menu item */}
      </Routes>
      {/* Add Student Modal */}
      <Dialog open={openAddStudent} onClose={() => setOpenAddStudent(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Add Student</Typography>
            <IconButton onClick={() => setOpenAddStudent(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <AddStudent onClose={() => setOpenAddStudent(false)} isModal={true} />
        </DialogContent>
      </Dialog>
      {/* Violation Record Modal */}
      <Dialog open={openViolationRecord} onClose={() => setOpenViolationRecord(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Violation Record for {currentStudent && `${currentStudent.firstName} ${currentStudent.lastName}`} 
              {violationRecords.length > 0 && ` (${violationRecords.length} violation${violationRecords.length > 1 ? 's' : ''})`}
            </Typography>
            <IconButton onClick={() => setOpenViolationRecord(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {violationRecords.length === 0 ? (
            <DialogContentText>No violations found for this student.</DialogContentText>
          ) : (
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table size="small">
              <TableHead>
                <TableRow>
                    <TableCell>Evidence</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                  <TableCell>Violation</TableCell>
                  <TableCell>Classification</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Reported By</TableCell>
                    <TableCell>Action Taken</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {violationRecords.map((v, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>
                        {v.image && (
                          <Avatar 
                            src={v.image} 
                            sx={{ width: 40, height: 40, cursor: 'pointer' }} 
                            variant="rounded"
                            onClick={() => handleViolationImagePreview(v.image)}
                          />
                        )}
                      </TableCell>
                      <TableCell>{v.date || 'N/A'}</TableCell>
                      <TableCell>{v.time || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {v.violation}
                        </Typography>
                        {v.description && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {v.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: v.classification === 'Grave' ? 'error.main' : 
                                   v.classification === 'Serious' ? 'warning.main' : 
                                   v.classification === 'Major' ? 'info.main' : 'success.main',
                            fontWeight: 'medium'
                          }}
                        >
                          {v.classification}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: v.severity === 'Critical' ? 'error.main' : 
                                   v.severity === 'High' ? 'warning.main' : 
                                   v.severity === 'Medium' ? 'info.main' : 'success.main',
                            fontWeight: 'medium'
                          }}
                        >
                          {v.severity || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>{v.location || 'N/A'}</TableCell>
                      <TableCell>{v.reportedBy || 'N/A'}</TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {v.actionTaken || 'N/A'}
                        </Typography>
                        {v.witnesses && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Witnesses: {v.witnesses}
                          </Typography>
                        )}
                      </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolationRecord(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* View Student Details Modal */}
      <Dialog 
        open={openViewDetails} 
        onClose={() => setOpenViewDetails(false)} 
        maxWidth="md"
        fullWidth={true}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#800000' }}>
              Student Details - {studentToView && `${studentToView.firstName} ${studentToView.lastName}`}
            </Typography>
            <IconButton onClick={() => setOpenViewDetails(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {studentToView && (
            <Box sx={{ p: 2 }}>
              {/* Profile Section */}
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                {studentToView.image ? (
                  <Avatar src={studentToView.image} sx={{ width: 80, height: 80, mx: 'auto', mb: 2 }} />
                ) : (
                  <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: '#800000', fontSize: '1.5rem' }}>
                    {studentToView.firstName?.charAt(0)}{studentToView.lastName?.charAt(0)}
                  </Avatar>
                )}
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#800000', mb: 1 }}>
                  {`${studentToView.firstName || ''} ${studentToView.lastName || ''}`.trim() || 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                  {studentToView.email || 'N/A'}
                </Typography>
              </Box>

              {/* Student Information */}
              <Box sx={{ bgcolor: 'rgba(128,0,0,0.05)', borderRadius: 2, p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#800000', mb: 2 }}>
                  Student Information
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Student ID:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {studentToView.studentId || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Last Name:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.lastName || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      First Name:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.firstName || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Middle Initial:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.middleInitial || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Sex:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.sex || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Age:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.age || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Birthday:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {studentToView.birthdate ? new Date(studentToView.birthdate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }) : 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                      Contact Number:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      {studentToView.contact || 'N/A'}
                    </Typography>
                  </Box>

                  {/* Transfer Information */}
                  {studentToView.transferredFromStudents && (
                    <>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#2196f3', mb: 1 }}>
                          Transfer Information
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                            Transfer Status:
                          </Typography>
                          <Chip 
                            label="Transferred from Unregistered" 
                            size="small" 
                            sx={{ 
                              bgcolor: '#2196f3',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }} 
                          />
                        </Box>
                        {studentToView.transferDate && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                              Transfer Date:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {new Date(studentToView.transferDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => window.print()}
            variant="outlined"
            sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff', 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              borderColor: theme.palette.mode === 'dark' ? '#666666' : '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              }
            }}
          >
            Print
          </Button>
          <Button 
            onClick={() => setOpenViewDetails(false)}
            variant="outlined"
            sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff', 
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000', 
              borderColor: theme.palette.mode === 'dark' ? '#666666' : '#000000', 
              fontSize: '0.75rem',
              fontWeight: 400,
              textTransform: 'none',
              padding: '6px 12px',
              minHeight: '32px',
              boxShadow: 'none',
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000',
                boxShadow: 'none'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Modal */}
      <Dialog open={openEditStudent} onClose={() => setOpenEditStudent(false)} maxWidth="md" fullWidth={false}>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: '#800000' }}>
              Edit Student - {studentToEdit && `${studentToEdit.firstName} ${studentToEdit.lastName}`}
            </Typography>
            <IconButton onClick={() => setOpenEditStudent(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {studentToEdit && (
            <EditStudentForm 
              student={studentToEdit} 
              onClose={() => setOpenEditStudent(false)}
              onSuccess={() => {
                setOpenEditStudent(false);
                // Refresh the student list without page reload
                // The EditStudentForm should handle the refresh internally
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Violation Image Preview Modal */}
      <Dialog 
        open={openViolationImagePreview} 
        onClose={() => setOpenViolationImagePreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Violation Evidence Image</Typography>
            <IconButton onClick={() => setOpenViolationImagePreview(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewViolationImage && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
              <img 
                src={previewViolationImage} 
                alt="Violation Evidence" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '70vh', 
                  objectFit: 'contain' 
                }} 
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViolationImagePreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 