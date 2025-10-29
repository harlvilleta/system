import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Autocomplete,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  AttachFile,
  Delete,
  Save,
  CheckCircle,
  MeetingRoom
} from '@mui/icons-material';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

const violationTypes = [
  'Cheating',
  'Plagiarism',
  'Disruptive Behavior',
  'Inappropriate Language',
  'Bullying',
  'Tardiness',
  'Absence',
  'Dress Code Violation',
  'Academic Dishonesty',
  'Other'
];

const classifications = [
  'Academic',
  'Behavioral',
  'Disciplinary',
  'Attendance',
  'Other'
];

const severityLevels = [
  'Minor',
  'Moderate',
  'Major',
  'Critical'
];


export default function TeacherViolationRecords() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [myViolations, setMyViolations] = useState([]);
  const [myViolationsLoading, setMyViolationsLoading] = useState(true);
  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [selectedViolationForMeeting, setSelectedViolationForMeeting] = useState(null);
  const [violationMeetings, setViolationMeetings] = useState([]);

  // Helper function to get TextField styling for dark mode
  const getTextFieldSx = () => ({
    '& .MuiOutlinedInput-root': {
      backgroundColor: theme.palette.mode === 'dark' ? '#404040' : '#ffffff',
      '& fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#666666' : '#e0e0e0',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#b0b0b0',
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
      },
    },
    '& .MuiInputLabel-root': {
      color: theme.palette.mode === 'dark' ? '#b0b0b0' : '#666666',
      fontSize: '0.75rem',
      fontWeight: 500,
    },
    '& .MuiInputBase-input': {
      color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
    },
    '& .MuiAutocomplete-input': {
      color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
    },
    '& .MuiAutocomplete-paper': {
      backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
      border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none',
    },
    '& .MuiAutocomplete-option': {
      color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
      '&:hover': {
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      },
    }
  });
  
  // Form state
  const [formData, setFormData] = useState({
    studentName: '',
    studentId: '',
    violation: '',
    severity: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    location: '',
    witnesses: '',
    description: '',
    evidenceImage: null
  });

  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidencePreview, setEvidencePreview] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch user profile to get teacher name
          const userQuery = query(collection(db, 'users'), where('uid', '==', user.uid));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            setUserProfile(userData);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchStudents();
    }
  }, [currentUser]);

  // Fetch violations reported by this teacher (myViolations)
  useEffect(() => {
    if (!currentUser?.uid && !currentUser?.email) {
      setMyViolationsLoading(false);
      return;
    }

    setMyViolationsLoading(true);
    let unsubscribe = null;
    
    const fetchViolations = async () => {
      try {
        console.log('📊 Fetching myViolations for teacher:', { 
          uid: currentUser?.uid, 
          email: currentUser?.email 
        });
        
        // Method 1: Query by createdBy (uid) - primary method
        if (currentUser?.uid) {
          try {
            const byCreatedByQuery = query(
              collection(db, 'violations'),
              where('createdBy', '==', currentUser.uid),
              orderBy('createdAt', 'desc')
            );
            
            unsubscribe = onSnapshot(byCreatedByQuery, (snapshot) => {
              console.log('✅ Violations found by createdBy (uid):', snapshot.size);
              const violations = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data()
              }));
              
              console.log('📋 Fetched violations data:', violations);
              setMyViolations(violations);
              setMyViolationsLoading(false);
              
              // If we found violations by createdBy, we're done
              if (violations.length > 0) {
                return;
              }
              
              // Otherwise, try by email as fallback
              console.log('⚠️ No violations found by uid, trying email fallback...');
              tryFetchByEmail();
            }, (error) => {
              console.error('❌ Error fetching violations by createdBy:', error);
              tryFetchByEmail();
            });
          } catch (error) {
            console.error('❌ Error setting up createdBy query:', error);
            tryFetchByEmail();
          }
        } else {
          tryFetchByEmail();
        }
        
        // Method 2: Fallback to email-based queries
        function tryFetchByEmail() {
          if (!currentUser?.email) {
            console.log('⚠️ No email available for fallback query');
            setMyViolations([]);
            setMyViolationsLoading(false);
            return;
          }
          
          try {
            console.log('🔍 Trying to fetch by email:', currentUser.email);
            const byEmailQuery = query(
              collection(db, 'violations'),
              where('reportedByEmail', '==', currentUser.email),
              orderBy('createdAt', 'desc')
            );
            
            unsubscribe = onSnapshot(byEmailQuery, (snapshot) => {
              console.log('✅ Violations found by email:', snapshot.size);
              const violations = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data()
              }));
              
              console.log('📋 Fetched violations data by email:', violations);
              setMyViolations(violations);
              setMyViolationsLoading(false);
            }, (error) => {
              console.error('❌ Error fetching violations by email:', error);
              setMyViolations([]);
              setMyViolationsLoading(false);
            });
          } catch (error) {
            console.error('❌ Error setting up email query:', error);
            setMyViolations([]);
            setMyViolationsLoading(false);
          }
        }
        
      } catch (error) {
        console.error('❌ Error in fetchViolations:', error);
        setMyViolations([]);
        setMyViolationsLoading(false);
      }
    };
    
    fetchViolations();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  const fetchStudents = async () => {
    try {
      // Fetch all students from both collections (teachers can report violations for any student)
      const [studentsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(query(collection(db, 'users'), where('role', '==', 'Student')))
      ]);

      const studentsData = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const registeredStudents = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Combine and format students for autocomplete
      const allStudents = [...studentsData, ...registeredStudents].map(student => ({
        id: student.id,
        name: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name,
        studentId: student.studentId || student.idNumber || student.id,
        email: student.email,
        course: student.course,
        year: student.year,
        section: student.section
      }));

      setStudents(allStudents);
      setFilteredStudents([]); // Start with empty filtered list
    } catch (error) {
      console.error('Error fetching students:', error);
      setSnackbar({ open: true, message: 'Error loading students', severity: 'error' });
    }
  };


  const filterStudents = (searchText) => {
    if (!searchText || searchText.trim() === '') {
      setFilteredStudents([]);
      return;
    }

    const searchLower = searchText.toLowerCase().trim();
    
    // First, try to find exact matches
    const exactMatches = students.filter(student => 
      student && student.name && student.name.toLowerCase() === searchLower
    );

    if (exactMatches.length > 0) {
      // If exact match found, show only that student
      setFilteredStudents(exactMatches);
    } else {
      // If no exact match, show up to 3 suggestions that start with the search text
      const suggestions = students
        .filter(student => 
          student && student.name && student.name.toLowerCase().startsWith(searchLower)
        )
        .slice(0, 3); // Limit to 3 suggestions
      
      setFilteredStudents(suggestions);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStudentSelect = (event, selectedStudent) => {
    if (selectedStudent) {
      setFormData(prev => ({
        ...prev,
        studentName: selectedStudent.name,
        studentId: selectedStudent.studentId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        studentName: '',
        studentId: ''
      }));
    }
  };

  const handleStudentInputChange = (event, value) => {
    // Update the form data with the typed value
    setFormData(prev => ({
      ...prev,
      studentName: value || '',
      studentId: ''
    }));
    
    // Filter students based on the input
    filterStudents(value);
  };

  const handleEvidenceUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ 
          open: true, 
          message: 'Please select a valid image file', 
          severity: 'error' 
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({ 
          open: true, 
          message: 'Image file size must be less than 5MB', 
          severity: 'error' 
        });
        return;
      }
      
      setEvidenceFile(file);
      setFormData(prev => ({ ...prev, evidenceImage: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setEvidencePreview(e.target.result);
      };
      reader.onerror = () => {
        setSnackbar({ 
          open: true, 
          message: 'Error reading image file', 
          severity: 'error' 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEvidence = () => {
    setEvidenceFile(null);
    setEvidencePreview(null);
    setFormData(prev => ({ ...prev, evidenceImage: null }));
  };

  const validateForm = () => {
    const requiredFields = ['studentName', 'violation', 'severity', 'date'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `Please fill in all required fields: ${missingFields.join(', ')}`, 
        severity: 'error' 
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Additional validation
    if (!currentUser) {
      setSnackbar({ 
        open: true, 
        message: 'User not authenticated. Please refresh the page and try again.', 
        severity: 'error' 
      });
      return;
    }
    
    setLoading(true);
    try {
      // Create violation record
      const violationData = {
        studentName: formData.studentName,
        studentId: formData.studentId,
        studentEmail: students.find(s => s.name === formData.studentName)?.email || '',
        violationType: formData.violation,
        severity: formData.severity,
        status: 'Pending', // Always set to Pending for new violations
        date: formData.date,
        time: formData.time || null,
        location: formData.location || null,
        reportedBy: userProfile?.fullName || currentUser?.displayName || currentUser?.email,
        reportedByName: userProfile?.fullName || currentUser?.displayName || currentUser?.email,
        reportedByEmail: currentUser?.email,
        reportedByRole: 'Teacher',
        witnesses: formData.witnesses || null,
        description: formData.description || null,
        evidenceImage: evidenceFile ? {
          name: evidenceFile.name,
          size: evidenceFile.size,
          type: evidenceFile.type,
          url: evidencePreview
        } : null,
        image: evidencePreview || null, // Store image data for admin dashboard compatibility
        // Debug info for troubleshooting
        imageStored: !!evidencePreview,
        imageSize: evidencePreview ? evidencePreview.length : 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.uid,
        reviewedBy: null,
        reviewDate: null,
        adminNotes: null
      };

      // Add violation to database
      const docRef = await addDoc(collection(db, 'violations'), violationData);
      console.log('Violation added successfully with ID:', docRef.id);
      
      // Create notification for admin
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: 'admin',
          recipientEmail: 'admin@school.com',
          recipientName: 'Administrator',
          title: 'New Violation Reported',
          message: `Teacher ${userProfile?.fullName || currentUser?.displayName || currentUser?.email} has reported a ${formData.severity.toLowerCase()} violation: ${formData.violation} for student ${formData.studentName}`,
          type: 'violation',
          violationId: docRef.id,
          studentName: formData.studentName,
          violationType: formData.violation,
          severity: formData.severity,
          reportedBy: userProfile?.fullName || currentUser?.displayName || currentUser?.email,
          senderId: currentUser?.uid,
          senderEmail: currentUser?.email,
          senderName: userProfile?.fullName || currentUser?.displayName || currentUser?.email,
          read: false,
          createdAt: new Date().toISOString(),
          priority: formData.severity === 'Critical' ? 'high' : 'medium'
        });
        console.log('Notification created successfully');
      } catch (notificationError) {
        console.warn('Failed to create notification:', notificationError);
        // Don't fail the entire operation if notification fails
      }

      setSnackbar({ 
        open: true, 
        message: 'Violation recorded successfully! Admin has been notified.', 
        severity: 'success' 
      });

      // Reset form
      setFormData({
        studentName: '',
        studentId: '',
        violation: '',
        severity: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        location: '',
        witnesses: '',
        description: '',
        evidenceImage: null
      });
      setEvidenceFile(null);
      setEvidencePreview(null);

    } catch (error) {
      console.error('Error recording violation:', error);
      console.error('Form data:', formData);
      console.error('Current user:', currentUser);
      console.error('User profile:', userProfile);
      
      let errorMessage = 'Error recording violation. Please try again.';
      
      // Provide more specific error messages
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your account permissions.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service temporarily unavailable. Please try again later.';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Get all violations reported by this teacher
  const getAllTeacherViolations = () => {
    return myViolations;
  };

  // Get resolved violations reported by this teacher
  const getResolvedViolations = () => {
    return myViolations.filter(violation => 
      violation.status === 'Solved' || violation.status === 'solved' ||
      violation.status === 'Approved' || violation.status === 'approved'
    );
  };

  // Handle viewing meetings for a specific violation
  const handleViewMeetingForViolation = async (violation) => {
    setSelectedViolationForMeeting(violation);
    setMeetingModalOpen(true);
    
    try {
      // Fetch meetings related to this violation's student
      const studentId = violation.studentId || violation.studentIdNumber;
      const studentName = violation.studentName;
      
      if (!studentId && !studentName) {
        setViolationMeetings([]);
        return;
      }

      // Query meetings by student ID or student name
      let meetingsQuery;
      if (studentId) {
        meetingsQuery = query(
          collection(db, 'meetings'),
          where('studentId', '==', studentId)
        );
      } else {
        meetingsQuery = query(
          collection(db, 'meetings'),
          where('studentName', '==', studentName)
        );
      }

      const meetingsSnapshot = await getDocs(meetingsQuery);
      const meetingsData = meetingsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Also check for meetings where the current teacher is involved
      const teacherMeetingsQuery = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains', currentUser?.email || currentUser?.uid)
      );
      
      const teacherMeetingsSnapshot = await getDocs(teacherMeetingsQuery);
      const teacherMeetingsData = teacherMeetingsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      // Combine and deduplicate meetings
      const allMeetings = [...meetingsData, ...teacherMeetingsData];
      const uniqueMeetings = allMeetings.filter((meeting, index, self) => 
        index === self.findIndex(m => m.id === meeting.id)
      );

      setViolationMeetings(uniqueMeetings);
    } catch (error) {
      console.error('Error fetching meetings for violation:', error);
      setViolationMeetings([]);
    }
  };

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 2, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          gutterBottom 
          sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2
          }}
        >
          Violation Records
        </Typography>
      </Box>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Record student violations and notify administrators for review.
      </Typography>

      {/* Add New Violation Form */}
        <Paper elevation={2} sx={{ 
          p: 2, 
          mb: 3, 
          bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#fafafa',
          border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none'
        }}>
          <Typography variant="h6" gutterBottom sx={{ 
            fontWeight: 600, 
            mb: 2,
            color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
          }}>
            Add New Violation
          </Typography>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* First Row */}
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={filteredStudents}
                  getOptionLabel={(option) => option.name}
                  value={students.find(s => s.name === formData.studentName) || null}
                  onChange={handleStudentSelect}
                  onInputChange={handleStudentInputChange}
                  freeSolo
                  PaperComponent={({ children, ...other }) => (
                    <Paper 
                      {...other} 
                      sx={{ 
                        backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none',
                        '& .MuiAutocomplete-option': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          },
                        }
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Select Student Involved"
                      placeholder="Type to search for a student"
                      sx={getTextFieldSx()}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props}>
                      <Box>
                        <Typography variant="body2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#b0b0b0' : 'text.secondary' }}>
                          {option.studentId} • {option.course} • {option.year}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Type of Violation Committed"
                  placeholder="Describe the specific violation"
                  value={formData.violation}
                  onChange={(e) => handleInputChange('violation', e.target.value)}
                  sx={getTextFieldSx()}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={severityLevels}
                  value={formData.severity}
                  onChange={(event, newValue) => handleInputChange('severity', newValue || '')}
                  PaperComponent={({ children, ...other }) => (
                    <Paper 
                      {...other} 
                      sx={{ 
                        backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
                        border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none',
                        '& .MuiAutocomplete-option': {
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                          '&:hover': {
                            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          },
                        }
                      }}
                    >
                      {children}
                    </Paper>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="Severity Level of Violation"
                      placeholder="Select severity level"
                      sx={getTextFieldSx()}
                    />
                  )}
                />
              </Grid>
              

              {/* Second Row */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Date of Violation Incident"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={getTextFieldSx()}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Time of Violation Incident"
                  type="time"
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={getTextFieldSx()}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location Where Violation Occurred"
                  placeholder="Enter specific location or classroom"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  sx={getTextFieldSx()}
                />
              </Grid>

              {/* Third Row */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Names of Witnesses Present"
                  placeholder="List any witnesses who observed the violation"
                  value={formData.witnesses}
                  onChange={(e) => handleInputChange('witnesses', e.target.value)}
                  sx={getTextFieldSx()}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  label="Detailed Description of Incident"
                  placeholder="Provide a detailed account of what happened"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  sx={getTextFieldSx()}
                />
              </Grid>

              {/* Evidence Upload */}
              <Grid item xs={12}>
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="evidence-upload"
                    type="file"
                    onChange={handleEvidenceUpload}
                  />
                  <label htmlFor="evidence-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<AttachFile />}
                      sx={{
                        textTransform: 'none',
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
                      Attach Evidence Image
                    </Button>
                  </label>
                  
                  {evidenceFile && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Selected: {evidenceFile.name}
                      </Typography>
                      <Tooltip title="Remove evidence">
                        <IconButton size="small" onClick={removeEvidence} color="error">
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                  
                  {evidencePreview && (
                    <Box sx={{ mt: 2 }}>
                      <img
                        src={evidencePreview}
                        alt="Evidence preview"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '200px',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
              <Button
                type="submit"
                variant="outlined"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                sx={{
                  textTransform: 'none',
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
                {loading ? 'Recording...' : 'Add Violation'}
              </Button>
            </Box>
          </form>
        </Paper>

      {/* My Violation Records Table */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Card sx={{ 
            border: 'none',
            boxShadow: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
            borderRadius: 2,
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  My Violation Records
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={`${getAllTeacherViolations().length} Total`} 
                    size="small"
                    sx={{ 
                      fontWeight: 500,
                      backgroundColor: '#1976d2',
                      color: '#ffffff',
                      '& .MuiChip-label': {
                        color: '#ffffff'
                      }
                    }}
                  />
                  <Chip 
                    label={`${getResolvedViolations().length} Resolved`} 
                    size="small"
                    sx={{ 
                      fontWeight: 500,
                      backgroundColor: '#4caf50',
                      color: '#ffffff',
                      '& .MuiChip-label': {
                        color: '#ffffff'
                      }
                    }}
                  />
                </Box>
              </Box>
              
              {myViolationsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                  <CircularProgress sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }} />
                  <Typography variant="body1" sx={{ ml: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                    Loading your violation records...
                  </Typography>
                </Box>
              ) : getAllTeacherViolations().length > 0 ? (
                <TableContainer sx={{ maxHeight: '400px', overflow: 'auto' }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Student Name
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Violation Type
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Classification
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Severity
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Location
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Status
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {getAllTeacherViolations().map((violation) => (
                        <TableRow key={violation.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ 
                                bgcolor: violation.status === 'Solved' || violation.status === 'solved' ? '#4caf50' : '#ff9800', 
                                width: 32, 
                                height: 32 
                              }}>
                                <CheckCircle sx={{ fontSize: 16 }} />
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {violation.studentName || violation.studentId || 'Unknown Student'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {violation.violationType || violation.violation || 'Not specified'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {violation.classification || 'Not specified'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={violation.severity || 'Not specified'} 
                              size="small"
                              color={
                                violation.severity === 'Critical' ? 'error' :
                                violation.severity === 'High' ? 'error' :
                                violation.severity === 'Medium' ? 'warning' :
                                violation.severity === 'Low' ? 'success' : 'default'
                              }
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {new Date(violation.date || violation.createdAt).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {violation.location || 'Not specified'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={violation.status || 'Pending'} 
                              size="small"
                              color={
                                violation.status === 'Solved' || violation.status === 'solved' ? 'success' :
                                violation.status === 'Pending' || violation.status === 'pending' ? 'warning' :
                                violation.status === 'Approved' || violation.status === 'approved' ? 'success' : 'default'
                              }
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewMeetingForViolation(violation)}
                              sx={{ 
                                textTransform: 'none',
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
                              View Meeting
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircle sx={{ 
                    fontSize: 48, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', 
                    mb: 1 
                  }} />
                  <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 1 }}>
                    No Violations Reported
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                    Your reported violations will appear here.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Meeting Modal */}
      <Dialog 
        open={meetingModalOpen} 
        onClose={() => setMeetingModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600,
          color: '#800000',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <MeetingRoom />
          Meetings for Violation
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {selectedViolationForMeeting && (
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Student: {selectedViolationForMeeting.studentName || selectedViolationForMeeting.studentId || 'Unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Violation: {selectedViolationForMeeting.violationType || selectedViolationForMeeting.violation || 'Not specified'}
              </Typography>
            </Box>
          )}
          
          {violationMeetings.length > 0 ? (
            <TableContainer sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Purpose
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Location
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Time
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5' }}>
                      Description
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {violationMeetings.map((meeting) => (
                    <TableRow key={meeting.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {meeting.purpose || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {meeting.location || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {meeting.date ? new Date(meeting.date).toLocaleDateString() : 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {meeting.time || 'Not specified'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={meeting.status || 'Scheduled'} 
                          size="small"
                          color={
                            meeting.status === 'Completed' ? 'success' :
                            meeting.status === 'Scheduled' ? 'primary' :
                            meeting.status === 'Cancelled' ? 'error' : 'default'
                          }
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meeting.description || 'No description provided'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <MeetingRoom sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Meetings Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No meetings have been scheduled for this violation yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button 
            onClick={() => setMeetingModalOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
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
            Close
          </Button>
          <Button 
            onClick={() => {
              setMeetingModalOpen(false);
              navigate('/violation-record/create-meeting');
            }}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
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
            Create New Meeting
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
