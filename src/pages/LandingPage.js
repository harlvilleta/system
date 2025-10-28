import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  School as SchoolIcon,
  Security as SecurityIcon,
  Policy as PolicyIcon,
  ContactMail as ContactIcon,
  Info as InfoIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Report as ReportIcon,
  Event as EventIcon,
  Campaign as CampaignIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  LinkedIn as LinkedInIcon,
  Instagram as InstagramIcon,
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTheme as useCustomTheme } from '../contexts/ThemeContext';
import { validateStudentIdForRegistration, getStudentById, debugStudentId } from '../utils/studentValidation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { checkEmailAvailability } from '../utils/studentValidation';
import { createSingleUser } from '../utils/createUsers';
import { doc, getDoc, deleteDoc, updateDoc, getDocs, query, collection, where } from 'firebase/firestore';

export default function LandingPage() {
  const { isDark } = useCustomTheme();
  const navigate = useNavigate();
  
  // State for modals and interactions
  const [openMessages, setOpenMessages] = useState(false);
  const [openRoles, setOpenRoles] = useState(false);
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openContact, setOpenContact] = useState(false);
  const [openLogin, setOpenLogin] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [openRegister, setOpenRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ 
    role: 'Student',
    email: '', 
    password: '', 
    confirmPassword: '',
    name: '',
    studentId: '',
    fullName: ''
  });
  const [studentIdError, setStudentIdError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [openDashboardModal, setOpenDashboardModal] = useState(false);
  const [openStudentModal, setOpenStudentModal] = useState(false);
  const [openViolationModal, setOpenViolationModal] = useState(false);
  const [openActivityModal, setOpenActivityModal] = useState(false);
  const [openAnnouncementModal, setOpenAnnouncementModal] = useState(false);
  const [openLostFoundModal, setOpenLostFoundModal] = useState(false);
  const [openLearnMoreModal, setOpenLearnMoreModal] = useState(false);
  const [openSystemInfoModal, setOpenSystemInfoModal] = useState(false);

  // Animation states
  const [fadeIn, setFadeIn] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  
  // Image carousel states
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselImages = ['/2121s.jpg', '/12.jpg', '/v1.jpg', '/vs1.jpg', '/33.jpg', '/6s.jpg', '/5s.jpg'];

  useEffect(() => {
    setFadeIn(true);
    setTimeout(() => setSlideIn(true), 300);
  }, []);

  // Auto-scroll effect for horizontal movement
  useEffect(() => {
    if (!isAutoScrolling) return;

    const scrollInterval = setInterval(() => {
      setScrollPosition((prevPosition) => {
        const imageWidth = 320; // Base width for lg screens (responsive size)
        const gap = 20; // Base gap between images
        const totalWidth = (imageWidth + gap) * carouselImages.length;
        const newPosition = prevPosition + 1.5; // Smooth speed for rectangular images
        
        // Reset position when we've scrolled through all images for seamless loop
        if (newPosition >= totalWidth) {
          return 0;
        }
        return newPosition;
      });
    }, 50); // Smooth scrolling every 50ms

    return () => clearInterval(scrollInterval);
  }, [isAutoScrolling, carouselImages.length]);



  const handleContactSubmit = (e) => {
    e.preventDefault();
    setSnackbar({ 
      open: true, 
      message: 'Thank you for your message! We will get back to you soon.', 
      severity: 'success' 
    });
    setContactForm({ name: '', email: '', message: '' });
    setOpenContact(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Use Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      const user = userCredential.user;
      
      setSnackbar({ 
        open: true, 
        message: 'Login successful! Redirecting to dashboard...', 
        severity: 'success' 
      });
      setLoginForm({ email: '', password: '' });
      setOpenLogin(false);
      
      // The App.js will automatically detect the auth state change and redirect to the appropriate dashboard
      // No need to manually navigate here as the auth state change will trigger the routing
      
    } catch (error) {
      let errorMessage = 'Login failed. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No user found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' 
      });
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!registerForm.email || !registerForm.password || !registerForm.confirmPassword || !registerForm.name) {
      setSnackbar({ 
        open: true, 
        message: 'Please fill in all required fields', 
        severity: 'error' 
      });
      return;
    }

    // Check for email errors
    if (emailError && !emailError.startsWith('✅')) {
      setSnackbar({ 
        open: true, 
        message: 'Please fix the email error', 
        severity: 'error' 
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setSnackbar({ 
        open: true, 
        message: 'Passwords do not match', 
        severity: 'error' 
      });
      return;
    }

    if (registerForm.password.length < 6) {
      setSnackbar({ 
        open: true, 
        message: 'Password must be at least 6 characters', 
        severity: 'error' 
      });
      return;
    }

    // Role-specific validation
    if (registerForm.role === 'Student') {
      if (!registerForm.studentId) {
        setSnackbar({ 
          open: true, 
          message: 'Please enter your Student ID', 
          severity: 'error' 
        });
        return;
      }
      if (studentIdError && !studentIdError.startsWith('✅')) {
        setSnackbar({ 
          open: true, 
          message: 'Please fix the Student ID error', 
          severity: 'error' 
        });
        return;
      }
    }

    if (registerForm.role === 'Teacher') {
      if (!registerForm.name) {
        setSnackbar({ 
          open: true, 
          message: 'Please fill in your full name', 
          severity: 'error' 
        });
        return;
      }
    }

    // Prevent double submission
    if (isRegistering) {
      setSnackbar({ 
        open: true, 
        message: 'Registration in progress, please wait...', 
        severity: 'warning' 
      });
      return;
    }

    setIsRegistering(true);

    try {
      // Prepare user data for registration
      const userData = {
        email: registerForm.email,
        password: registerForm.password,
        fullName: registerForm.name,
        role: registerForm.role,
        studentId: registerForm.studentId || '',
        firstName: registerForm.name.split(' ')[0] || '',
        lastName: registerForm.name.split(' ').slice(1).join(' ') || '',
        course: '',
        year: '',
        section: '',
        phone: '',
        address: '',
        registrationMethod: 'self',
        createdBy: 'self'
      };

      console.log('Creating user with data:', userData);

      // Check if this is a student registration and transfer data if needed
      let finalUserData = userData;
      let transferMessage = '';
      if (registerForm.role === 'Student' && registerForm.studentId) {
        const transferResult = await transferStudentData(registerForm.studentId, userData);
        finalUserData = transferResult.enhancedData;
        transferMessage = transferResult.transferMessage;
      }

      console.log('Final user data for creation:', finalUserData);
      console.log('🚀 About to call createSingleUser...');

      // Create the user account
      const result = await createSingleUser(finalUserData);
      console.log('🔍 createSingleUser result:', result);
      console.log('🔍 Final user data that was passed:', finalUserData);
      
      if (result.success) {
        console.log('✅ Registration successful! User data should be in Firestore now.');
        console.log('   User role:', finalUserData.role);
        console.log('   User studentId:', finalUserData.studentId);
        console.log('   Should create RegisteredStudents entry:', finalUserData.role === 'Student' && finalUserData.studentId);
        console.log('   Should create students collection entry:', finalUserData.role === 'Student' && finalUserData.studentId);
        
        // Additional debugging - check if student was created in students collection
        if (finalUserData.role === 'Student' && finalUserData.studentId) {
          setTimeout(async () => {
            try {
              console.log('🔍 Checking if student was created in students collection...');
              const studentsSnapshot = await getDocs(query(collection(db, 'students'), where('studentId', '==', finalUserData.studentId)));
              console.log('📊 Students collection check result:', {
                found: !studentsSnapshot.empty,
                count: studentsSnapshot.size,
                docs: studentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
              });
              
              const registeredStudentsSnapshot = await getDocs(query(collection(db, 'RegisteredStudents'), where('studentId', '==', finalUserData.studentId)));
              console.log('📊 RegisteredStudents collection check result:', {
                found: !registeredStudentsSnapshot.empty,
                count: registeredStudentsSnapshot.size,
                docs: registeredStudentsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
              });
            } catch (checkError) {
              console.error('❌ Error checking collections after registration:', checkError);
            }
          }, 2000);
        }
        
        setSnackbar({ 
          open: true, 
          message: transferMessage 
            ? transferMessage
            : '✅ Account created successfully! Please sign in.', 
          severity: 'success',
          autoHideDuration: 8000 // Show longer for transfer messages
        });
        
        // Reset form
        setRegisterForm({ 
          role: 'Student',
          email: '', 
          password: '', 
          confirmPassword: '',
          name: '',
          studentId: '',
          fullName: ''
        });
        setStudentIdError('');
        setEmailError('');
        setOpenRegister(false);
        setOpenLogin(true); // Open login modal after registration
      } else {
        setSnackbar({ 
          open: true, 
          message: result.error || 'Failed to create account. Please try again.', 
          severity: 'error' 
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSnackbar({ 
        open: true, 
        message: error.message || 'Registration failed. Please try again.', 
        severity: 'error' 
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Function to transfer unregistered student data to registered user
  const transferStudentData = async (studentId, userData) => {
    try {
      console.log('🔄 Checking for unregistered student with ID:', studentId);
      
      // Query students collection by studentId field - check all students with this ID
      const studentsQuery = query(
        collection(db, 'students'),
        where('studentId', '==', studentId)
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      
      // Filter out registered students (isRegistered === true)
      const unregisteredStudents = studentsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.isRegistered !== true; // Consider undefined/null as unregistered
      });
      
      // Also check by document ID (for imported students)
      let studentDoc = null;
      let studentData = null;
      
      if (unregisteredStudents.length > 0) {
        studentDoc = unregisteredStudents[0];
        studentData = studentDoc.data();
        console.log('📋 Found unregistered student data by field:', studentData);
      } else {
        // Try by document ID
        try {
          const docRef = doc(db, 'students', studentId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isRegistered !== true) {
              studentDoc = docSnap;
              studentData = data;
              console.log('📋 Found unregistered student data by document ID:', studentData);
            }
          }
        } catch (error) {
          console.log('Document ID check failed:', error.message);
        }
      }
      
      if (studentDoc && studentData) {
        
        // Update the user data with the existing student information
        const enhancedUserData = {
          ...userData,
          firstName: studentData.firstName || userData.firstName,
          lastName: studentData.lastName || userData.lastName,
          fullName: studentData.fullName || `${studentData.firstName} ${studentData.lastName}`,
          email: userData.email, // Use the email from registration
          course: studentData.course || userData.course,
          year: studentData.year || userData.year,
          section: studentData.section || userData.section,
          sex: studentData.sex || userData.sex,
          contact: studentData.contact || userData.phone,
          birthdate: studentData.birthdate || '',
          age: studentData.age || '',
          image: studentData.image || userData.profilePic,
          // Transfer additional fields
          originalStudentData: studentData,
          transferredFromStudents: true,
          transferDate: new Date().toISOString()
        };
        
        console.log('✅ Enhanced user data with student info:', enhancedUserData);
        
        // Mark the student as registered in the students collection
        await updateDoc(studentDoc.ref, {
          isRegistered: true,
          registeredAt: new Date().toISOString(),
          registeredEmail: userData.email,
          transferredToUsers: true,
          transferredToRegisteredStudents: false // Will be updated by createSingleUser
        });
        
        console.log('✅ Marked student as registered in students collection');
        
        return {
          enhancedData: enhancedUserData,
          transferMessage: `✅ Registration successful! Student ${studentData.firstName} ${studentData.lastName} with Student ID: ${studentId} has been moved from unregistered to registered students. You can now sign in with your account.`
        };
      } else {
        console.log('ℹ️ No unregistered student found with ID:', studentId);
        return {
          enhancedData: userData,
          transferMessage: ''
        };
      }
    } catch (error) {
      console.error('❌ Error transferring student data:', error);
      return {
        enhancedData: userData,
        transferMessage: ''
      };
    }
  };

  const handleStudentIdChange = async (e) => {
    const value = e.target.value;
    setRegisterForm({...registerForm, studentId: value});
    
    if (value) {
      console.log('🔍 Testing student ID validation for:', value);
      
      // First run debug to see what's in the database
      const debugResult = await debugStudentId(value);
      console.log('🔍 DEBUG INFO:', debugResult.debug);
      
      const result = await validateStudentIdForRegistration(value);
      console.log('📊 Validation result:', result);
      
      if (!result.isValid) {
        setStudentIdError(result.error);
      } else {
        // Get student info to show name
        try {
          const studentInfo = await getStudentById(value);
          console.log('📊 Student info result:', studentInfo);
          if (studentInfo.student) {
            setStudentIdError(`✅ Valid Student ID found: ${studentInfo.student.firstName} ${studentInfo.student.lastName}`);
          } else {
            setStudentIdError('✅ Valid Student ID - Ready for registration');
          }
        } catch (error) {
          console.error('❌ Error getting student info:', error);
          setStudentIdError('✅ Valid Student ID - Ready for registration');
        }
      }
    } else {
      setStudentIdError('');
    }
  };

  const handleEmailChange = async (e) => {
    const email = e.target.value;
    setRegisterForm({...registerForm, email: email});
    
    if (email && email.includes('@')) {
      try {
        const result = await checkEmailAvailability(email);
        if (!result.isAvailable) {
          setEmailError(result.error);
        } else {
          setEmailError('');
        }
      } catch (error) {
        setEmailError('Error checking email availability. Please try again.');
      }
    } else {
      setEmailError('');
    }
  };

  // Manual navigation functions
  const handlePrevious = () => {
    setIsAutoScrolling(false);
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? carouselImages.length - 1 : prevIndex - 1
    );
  };

  const handleNext = () => {
    setIsAutoScrolling(false);
    setCurrentImageIndex((prevIndex) => 
      prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const handleResumeAuto = () => {
    setIsAutoScrolling(true);
  };

  const features = [
    {
      icon: <DashboardIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Dashboard Overview',
      description: 'Comprehensive analytics and real-time insights into student activities and system performance with interactive charts and detailed reporting.',
      action: () => setOpenDashboardModal(true)
    },
    {
      icon: <PeopleIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Student Management',
      description: 'Complete student lifecycle management including academic records, disciplinary tracking, and seamless parent communication tools.',
      action: () => setOpenStudentModal(true)
    },
    {
      icon: <ReportIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Violation Tracking',
      description: 'Advanced disciplinary system with automated notifications, escalation procedures, and comprehensive violation history tracking for better student behavior management.',
      action: () => setOpenViolationModal(true)
    },
    {
      icon: <EventIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Activity Management',
      description: 'Organize and track school activities, events, and student participation with automated scheduling and notifications.',
      action: () => setOpenActivityModal(true)
    },
    {
      icon: <CampaignIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Announcements',
      description: 'Broadcast important announcements, emergency notifications, and updates to the entire school community with targeted messaging and delivery confirmation.',
      action: () => setOpenAnnouncementModal(true)
    },
    {
      icon: <SearchIcon sx={{ fontSize: 32, color: '#800000' }} />,
      title: 'Lost and Found Management',
      description: 'Digital lost and found system for tracking misplaced items, facilitating returns, and maintaining detailed records of found objects with photo documentation.',
      action: () => setOpenLostFoundModal(true)
    }
  ];

  const roles = [
    {
      title: 'Administrator',
      description: 'Full system access with complete control over all features and user management.',
      permissions: ['User Management', 'System Configuration', 'Data Analytics', 'Report Generation', 'Policy Management'],
      color: '#800000'
    },
    {
      title: 'Teacher',
      description: 'Access to student management, activity tracking, and educational tools.',
      permissions: ['Student Records', 'Activity Management', 'Violation Report Management', 'Communication Tools'],
      color: '#A52A2A'
    },
    {
      title: 'Student',
      description: 'Personal dashboard with access to activities, announcements, and academic records.',
      permissions: ['View Activities', 'Access Announcements', 'View Violation', 'Update Profile'],
      color: '#8B0000'
    }
  ];

  const policies = [
    {
      title: 'Data Privacy Policy',
      content: 'We are committed to protecting your personal information and ensuring data security in compliance with international privacy standards.'
    },
    {
      title: 'User Access Policy',
      content: 'Access to the system is granted based on user roles and responsibilities. Unauthorized access is strictly prohibited.'
    },
    {
      title: 'Academic Integrity Policy',
      content: 'All users must maintain the highest standards of academic integrity and ethical behavior while using the system.'
    },
    {
      title: 'System Usage Policy',
      content: 'The system should be used responsibly for educational purposes only. Misuse or abuse will result in account suspension.'
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: isDark 
        ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%)'
        : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Elements */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(128, 0, 0, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(128, 0, 0, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(128, 0, 0, 0.05) 0%, transparent 50%)
        `,
        animation: 'float 20s ease-in-out infinite'
      }} />

      <Box sx={{ width: '100%', maxWidth: '100%' }}>
        {/* Header */}
        <Container maxWidth="xl">
          <Box sx={{ 
            py: { xs: 2, sm: 3, md: 4 },
            px: { xs: 2, sm: 3, md: 0 },
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? 'translateY(0)' : 'translateY(-20px)',
            transition: 'all 0.8s ease-out',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: { xs: 2, sm: 0 }
          }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1, sm: 2 },
            flex: { xs: '1 1 100%', sm: '0 0 auto' },
            justifyContent: { xs: 'center', sm: 'flex-start' }
          }}>
            <Avatar sx={{ 
              bgcolor: '#800000', 
              width: { xs: 50, sm: 55, md: 60 }, 
              height: { xs: 50, sm: 55, md: 60 },
              fontSize: { xs: '1.2rem', sm: '1.3rem', md: '1.5rem' },
              fontWeight: 'bold'
            }}>
              <SchoolIcon />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ 
                fontWeight: 800,
                background: 'linear-gradient(45deg, #800000, #A52A2A, #8B0000)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.125rem' }
              }}>
                CeciServe
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 },
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            justifyContent: { xs: 'center', sm: 'flex-end' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <Button
              variant="outlined"
              startIcon={<InfoIcon />}
              onClick={() => setOpenMessages(true)}
              size="small"
              sx={{
                borderColor: '#800000',
                color: '#800000',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                '&:hover': {
                  borderColor: '#A52A2A',
                  backgroundColor: 'rgba(128, 0, 0, 0.1)'
                }
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>Messages</Box>
              <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Info</Box>
            </Button>
            <Button
              variant="contained"
              startIcon={<DashboardIcon />}
              onClick={() => setOpenLogin(true)}
              size="small"
              sx={{
                backgroundColor: '#800000',
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.5, sm: 1 },
                '&:hover': {
                  backgroundColor: '#A52A2A'
                },
                boxShadow: '0 4px 20px rgba(128, 0, 0, 0.3)'
              }}
            >
              Login
            </Button>
          </Box>
          </Box>
        </Container>

        {/* Hero Section */}
        <Box sx={{ 
          textAlign: 'center', 
          py: { xs: 4, sm: 6, md: 8 },
          px: { xs: 2, sm: 3, md: 4 },
          position: 'relative',
          zIndex: 2,
          opacity: slideIn ? 1 : 0,
          transform: slideIn ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 1s ease-out',
          backgroundImage: 'url(/2121.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          borderRadius: 0,
          overflow: 'hidden',
          margin: { xs: '0 -16px', sm: '0 -24px', md: '0 -32px', lg: '0 -32px' },
          width: { xs: 'calc(100% + 32px)', sm: 'calc(100% + 48px)', md: 'calc(100% + 64px)', lg: 'calc(100% + 64px)' },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6))',
            zIndex: 1
          }
        }}>
          <Typography variant="h1" sx={{
            fontSize: { xs: '1.8rem', sm: '2.5rem', md: '3.5rem', lg: '4.5rem' },
            fontWeight: 900,
            color: '#ffffff',
            mb: { xs: 2, sm: 3, md: 3 },
            textShadow: '0 4px 8px rgba(0,0,0,0.8), 0 0 20px rgba(128,0,0,0.5)',
            lineHeight: { xs: 1.2, sm: 1.1 },
            position: 'relative',
            zIndex: 2,
            px: { xs: 1, sm: 0 }
          }}>
            Transform <span style={{ color: '#A52A2A' }}>Education</span>
            <br />
            <span style={{ fontSize: '0.7em' }}>with Smart Management</span>
          </Typography>
          
          <Typography variant="h5" sx={{
            color: '#ffffff',
            mb: { xs: 3, sm: 4, md: 4 },
            maxWidth: { xs: '100%', sm: '600px', md: '800px' },
            mx: 'auto',
            fontWeight: 400,
            lineHeight: { xs: 1.4, sm: 1.6 },
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            position: 'relative',
            zIndex: 2,
            fontSize: { xs: '1rem', sm: '1.25rem', md: '1.5rem' },
            px: { xs: 1, sm: 0 }
          }}>
            The most comprehensive Student Affairs Management System that revolutionizes how educational institutions operate, 
            manage students, and track violation progress and more.
          </Typography>


          {/* Image Gallery - All 6 Images Displayed */}
          <Box sx={{ 
            mb: { xs: 4, sm: 5, md: 6 },
            opacity: slideIn ? 1 : 0,
            transform: slideIn ? 'scale(1)' : 'scale(0.8)',
            transition: 'all 1.2s ease-out',
            zIndex: 2,
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: { xs: 1, sm: 2, md: 0 }
          }}>
            {/* Auto-scrolling Images Container */}
            <Box sx={{
              width: '100%',
                  overflow: 'hidden',
                  position: 'relative',
              height: { xs: '140px', sm: '160px', md: '180px', lg: '200px' },
              display: 'flex',
              alignItems: 'center',
              maxWidth: { xs: '100%', sm: '90%', md: '100%' }
            }}>
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 1.5, md: 2, lg: 2.5 },
                transform: `translateX(-${scrollPosition}px)`,
                transition: 'none', // Disable transition for smooth animation
                animation: isAutoScrolling ? 'scrollLeft 30s linear infinite' : 'none',
                '@keyframes scrollLeft': {
                  '0%': {
                    transform: 'translateX(0)',
                  },
                  '100%': {
                    transform: 'translateX(-50%)', // Only scroll through first set, then loop
                  },
                },
              }}>
                {/* First set of images */}
                {carouselImages.map((image, index) => (
              <Paper
                    key={`first-${index}`}
                    elevation={0}
                sx={{
                      borderRadius: 2,
                  overflow: 'hidden',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                  position: 'relative',
                      width: { xs: '200px', sm: '240px', md: '280px', lg: '320px' },
                      height: { xs: '120px', sm: '140px', md: '160px', lg: '180px' },
                  flexShrink: 0,
                      transition: 'all 0.3s ease',
                  cursor: 'pointer',
                      border: 'none',
                  '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 'none',
                  }
                }}
              >
                <Box
                  component="img"
                      src={image}
                      alt={`Gallery Image ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                        filter: 'none',
                        transition: 'all 0.3s ease',
                        opacity: 0.8
                      }}
                    />
              </Paper>
                ))}
                {/* Duplicate set for seamless looping */}
                {carouselImages.map((image, index) => (
              <Paper
                    key={`second-${index}`}
                    elevation={0}
                sx={{
                      borderRadius: 2,
                  overflow: 'hidden',
                      backgroundColor: 'transparent',
                      boxShadow: 'none',
                  position: 'relative',
                      width: { xs: '200px', sm: '240px', md: '280px', lg: '320px' },
                      height: { xs: '120px', sm: '140px', md: '160px', lg: '180px' },
                  flexShrink: 0,
                      transition: 'all 0.3s ease',
                  cursor: 'pointer',
                      border: 'none',
                  '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 'none',
                  }
                }}
              >
                <Box
                  component="img"
                      src={image}
                      alt={`Gallery Image ${index + 1}`}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                        filter: 'none',
                        transition: 'all 0.3s ease',
                        opacity: 0.8
                      }}
                    />
              </Paper>
                ))}
              </Box>
            </Box>

          </Box>

          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 2, sm: 3, md: 3 }, 
            justifyContent: 'center', 
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 2,
            px: { xs: 2, sm: 0 },
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center'
          }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setOpenLogin(true)}
              sx={{
                backgroundColor: '#800000',
                px: { xs: 3, sm: 4, md: 4 },
                py: { xs: 1, sm: 1.5, md: 1.5 },
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                maxWidth: { xs: '280px', sm: 'none' },
                '&:hover': {
                  backgroundColor: '#A52A2A',
                  transform: 'translateY(-2px)'
                },
                boxShadow: '0 8px 25px rgba(128, 0, 0, 0.4)',
                transition: 'all 0.3s ease'
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<InfoIcon />}
              onClick={() => setOpenLearnMoreModal(true)}
              sx={{
                borderColor: '#800000',
                color: '#800000',
                px: { xs: 3, sm: 4, md: 4 },
                py: { xs: 1, sm: 1.5, md: 1.5 },
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                maxWidth: { xs: '280px', sm: 'none' },
                '&:hover': {
                  borderColor: '#A52A2A',
                  backgroundColor: 'rgba(128, 0, 0, 0.1)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.3s ease'
              }}
            >
              Learn More
            </Button>
          </Box>
        </Box>

        {/* Features Section */}
        <Container maxWidth="xl">
          <Box sx={{ py: { xs: 3, sm: 4, md: 4 }, px: { xs: 2, sm: 3, md: 0 } }}>
          <Typography variant="h4" sx={{
            textAlign: 'center',
            fontWeight: 800,
            color: isDark ? '#ffffff' : '#800000',
            mb: { xs: 1, sm: 2, md: 2 },
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}>
            Powerful Features & Functionality
          </Typography>
          
          <Typography variant="h6" sx={{
            textAlign: 'center',
            fontWeight: 400,
            color: isDark ? '#cccccc' : '#666666',
            mb: { xs: 2, sm: 3, md: 4 },
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' },
            maxWidth: '800px',
            mx: 'auto',
            lineHeight: 1.6
          }}>
            Discover the comprehensive suite of tools designed to streamline school management, 
            enhance student experiences, and empower educators with data-driven insights.
          </Typography>
          
          <Grid container spacing={{ xs: 2, sm: 2, md: 2 }}>
            {features.map((feature, index) => (
              <Grid item xs={12} sm={6} md={6} lg={4} key={index}>
                <Card sx={{
                  height: '100%',
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(128, 0, 0, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  border: '1px solid rgba(128, 0, 0, 0.2)',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 8px 20px rgba(128, 0, 0, 0.2)'
                  }
                }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Box sx={{ mb: 1.5 }}>
                      {feature.icon}
                    </Box>
                    <Typography variant="h6" sx={{
                      fontWeight: 700,
                      color: isDark ? '#ffffff' : '#800000',
                      mb: 1,
                      fontSize: '1.1rem'
                    }}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{
                      color: isDark ? '#cccccc' : '#666666',
                      lineHeight: 1.4,
                      mb: 2,
                      fontSize: '0.85rem'
                    }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 2, pt: 0 }}>
                    <Button
                      variant="contained"
                      onClick={feature.action}
                      sx={{
                        backgroundColor: '#800000',
                        '&:hover': {
                          backgroundColor: '#A52A2A'
                        }
                      }}
                    >
                      Explore
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
        </Container>

        {/* Action Buttons Section */}
        <Container maxWidth="xl">
          <Box sx={{ 
            py: 8,
            background: isDark 
              ? 'linear-gradient(135deg, rgba(128, 0, 0, 0.1) 0%, rgba(128, 0, 0, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(128, 0, 0, 0.05) 0%, rgba(128, 0, 0, 0.02) 100%)',
            borderRadius: 4,
            mb: 8
          }}>
            <Container maxWidth="md">
            <Typography variant="h4" sx={{
              textAlign: 'center',
              fontWeight: 700,
              color: isDark ? '#ffffff' : '#800000',
              mb: 4
            }}>
              Quick Access
            </Typography>
            
            <Grid container spacing={4} justifyContent="center" sx={{ px: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  onClick={() => {
                    console.log('User Roles clicked');
                    console.log('Current openRoles state:', openRoles);
                    setOpenRoles(true);
                    console.log('Setting openRoles to true');
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    p: 3,
                    height: 'auto',
                    minHeight: '200px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(128,0,0,0.05)',
                    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128,0,0,0.1)'}`,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(128,0,0,0.15)',
                      borderColor: '#800000',
                      backgroundColor: isDark ? 'rgba(128,0,0,0.1)' : 'rgba(128,0,0,0.08)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 15px rgba(128,0,0,0.2)'
                    }
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 40, color: '#800000', mb: 2 }} />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: isDark ? '#ffffff' : '#800000',
                    mb: 1
                  }}>
                  User Roles
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.85rem'
                  }}>
                    Manage user permissions and access levels
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  onClick={() => {
                    console.log('Policies clicked');
                    setOpenPolicy(true);
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    p: 3,
                    height: 'auto',
                    minHeight: '200px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(128,0,0,0.05)',
                    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128,0,0,0.1)'}`,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(128,0,0,0.15)',
                      borderColor: '#800000',
                      backgroundColor: isDark ? 'rgba(128,0,0,0.1)' : 'rgba(128,0,0,0.08)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 15px rgba(128,0,0,0.2)'
                    }
                  }}
                >
                  <PolicyIcon sx={{ fontSize: 40, color: '#800000', mb: 2 }} />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: isDark ? '#ffffff' : '#800000',
                    mb: 1
                  }}>
                  Policies
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.85rem'
                  }}>
                    View and manage system policies
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  onClick={() => {
                    console.log('Contact Us clicked');
                    setOpenContact(true);
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    p: 3,
                    height: 'auto',
                    minHeight: '200px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(128,0,0,0.05)',
                    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128,0,0,0.1)'}`,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(128,0,0,0.15)',
                      borderColor: '#800000',
                      backgroundColor: isDark ? 'rgba(128,0,0,0.1)' : 'rgba(128,0,0,0.08)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 15px rgba(128,0,0,0.2)'
                    }
                  }}
                >
                  <ContactIcon sx={{ fontSize: 40, color: '#800000', mb: 2 }} />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: isDark ? '#ffffff' : '#800000',
                    mb: 1
                  }}>
                  Contact Us
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.85rem'
                  }}>
                    Get in touch with our support team
                  </Typography>
                </Button>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  onClick={() => {
                    console.log('System Info clicked');
                    setOpenSystemInfoModal(true);
                  }}
                  variant="outlined"
                  fullWidth
                  sx={{
                    p: 3,
                    height: 'auto',
                    minHeight: '200px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(128,0,0,0.05)',
                    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128,0,0,0.1)'}`,
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(128,0,0,0.15)',
                      borderColor: '#800000',
                      backgroundColor: isDark ? 'rgba(128,0,0,0.1)' : 'rgba(128,0,0,0.08)'
                    },
                    '&:active': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 15px rgba(128,0,0,0.2)'
                    }
                  }}
                >
                  <InfoIcon sx={{ fontSize: 40, color: '#800000', mb: 2 }} />
                  <Typography variant="h6" sx={{ 
                    fontWeight: 600, 
                    color: isDark ? '#ffffff' : '#800000',
                    mb: 1
                  }}>
                  System Info
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    fontSize: '0.85rem'
                  }}>
                    View system information and status
                  </Typography>
                </Button>
              </Grid>
            </Grid>
          </Container>
        </Box>
        </Container>

        {/* Footer */}
          <Box sx={{
          width: '100%',
            py: 6,
            borderTop: '1px solid rgba(128, 0, 0, 0.2)',
            background: isDark 
            ? 'linear-gradient(135deg, rgba(139, 0, 0, 0.95) 0%, rgba(128, 0, 0, 0.9) 25%, rgba(139, 0, 0, 0.85) 50%, rgba(128, 0, 0, 0.9) 75%, rgba(139, 0, 0, 0.95) 100%)'
            : 'linear-gradient(135deg, rgba(139, 0, 0, 0.7) 0%, rgba(128, 0, 0, 0.6) 25%, rgba(139, 0, 0, 0.5) 50%, rgba(128, 0, 0, 0.6) 75%, rgba(139, 0, 0, 0.7) 100%)'
          }}>
          <Container maxWidth="xl">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Avatar sx={{ bgcolor: '#800000' }}>
                  <SchoolIcon />
                </Avatar>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#800000' }}>
                  CeciServe
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#ffffff', mb: 3 }}>
                Revolutionizing education through advanced technology and comprehensive management solutions.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton 
                  sx={{ color: '#800000' }}
                  component="a"
                  href="https://www.facebook.com/harley.villetaii"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FacebookIcon />
                </IconButton>
                <IconButton sx={{ color: '#800000' }}>
                  <TwitterIcon />
                </IconButton>
                <IconButton sx={{ color: '#800000' }}>
                  <LinkedInIcon />
                </IconButton>
                <IconButton sx={{ color: '#800000' }}>
                  <InstagramIcon />
                </IconButton>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#800000', mb: 2 }}>
                Contact Information
              </Typography>
              <List dense>
                  <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <EmailIcon sx={{ color: '#800000' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="harleyvilleta7777@gmail.com"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
                  <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <PhoneIcon sx={{ color: '#800000' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="+2 (476) 9891"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
                  <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <LocationIcon sx={{ color: '#800000' }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Ward ll, Minglanilla Cebu"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#800000', mb: 2 }}>
                Quick Links
              </Typography>
              <List dense>
                  <ListItem 
                    button 
                    onClick={() => setOpenPolicy(true)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                  <ListItemText 
                    primary="Privacy Policy"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
                  <ListItem 
                    button 
                    onClick={() => setOpenRoles(true)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                  <ListItemText 
                    primary="User Roles"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
                  <ListItem 
                    button 
                    onClick={() => setOpenContact(true)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                  <ListItemText 
                    primary="Support"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
                  <ListItem 
                    button 
                    onClick={() => setOpenMessages(true)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                  <ListItemText 
                    primary="System Messages"
                    sx={{ color: isDark ? '#cccccc' : '#666666' }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 4, borderColor: 'rgba(128, 0, 0, 0.2)' }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#ffffff' }}>
              © 2025 CeciServe. All rights reserved. | Student Affairs Management System
            </Typography>
          </Box>
        </Container>
        </Box>

      {/* Messages Modal */}
      <Dialog open={openMessages} onClose={() => setOpenMessages(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <InfoIcon />
          System Messages & Information
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Welcome to CeciServe
          </Typography>
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            CeciServe is a comprehensive school management system designed to streamline educational operations, 
            enhance student learning experiences, and provide administrators with powerful tools for data-driven decision making.
          </Typography>
          
          <Typography variant="h6" sx={{ 
            mb: 2, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            Key Features:
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Real-time Dashboard Analytics
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Comprehensive Student Management
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Advanced Violation Tracking System
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Activity and Event Management
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Automated Announcement System
            </Typography>
            
            <Typography variant="body1" sx={{ 
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              fontSize: '1rem',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}>
              <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
              Lost and Found Management System
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenMessages(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setOpenMessages(false);
              setOpenLogin(true);
            }}
            sx={{ 
              backgroundColor: '#800000',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#A52A2A'
              }
            }}
          >
            Get Started
          </Button>
        </DialogActions>
      </Dialog>

      {/* Roles Modal */}
      <Dialog open={openRoles} onClose={() => setOpenRoles(false)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <SecurityIcon />
          User Roles & Permissions
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, color: '#800000', fontWeight: 700 }}>
            System Access Levels
          </Typography>
          
          <Grid container spacing={3}>
            {roles.map((role, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ 
                  height: '100%',
                  border: `2px solid ${role.color}`,
                  borderRadius: 2,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: isDark 
                    ? '0 4px 20px rgba(0, 0, 0, 0.3)' 
                    : '0 4px 20px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: isDark 
                      ? '0 8px 30px rgba(0, 0, 0, 0.4)' 
                      : '0 8px 30px rgba(0, 0, 0, 0.15)'
                  }
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ 
                      color: role.color, 
                      fontWeight: 700, 
                      mb: 2 
                    }}>
                      {role.title}
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      mb: 3, 
                      color: isDark ? '#e0e0e0' : '#333333',
                      lineHeight: 1.6
                    }}>
                      {role.description}
                    </Typography>
                    
                    <Typography variant="subtitle2" sx={{ 
                      fontWeight: 600, 
                      mb: 2, 
                      color: role.color,
                      fontSize: '1rem'
                    }}>
                      Permissions:
                    </Typography>
                    <List dense>
                      {role.permissions.map((permission, idx) => (
                        <ListItem key={idx} sx={{ 
                          py: 0.5,
                          '&:hover': { 
                            backgroundColor: 'transparent' 
                          }
                        }}>
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <CheckCircleIcon sx={{ fontSize: 18, color: role.color }} />
                          </ListItemIcon>
                          <ListItemText 
                            primary={permission}
                            sx={{ 
                              '& .MuiListItemText-primary': { 
                                fontSize: '0.95rem',
                                fontWeight: 500,
                                color: isDark ? '#ffffff' : '#2c2c2c',
                                lineHeight: 1.4
                              } 
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRoles(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Policy Modal */}
      <Dialog open={openPolicy} onClose={() => setOpenPolicy(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <PolicyIcon />
          System Policies
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {policies.map((policy, index) => (
            <Accordion key={index} sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#800000' }}>
                  {policy.title}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
                  {policy.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPolicy(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Contact Modal */}
      <Dialog open={openContact} onClose={() => setOpenContact(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <ContactIcon />
          Contact Us
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <form onSubmit={handleContactSubmit}>
            <TextField
              fullWidth
              label="Name"
              value={contactForm.name}
              onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
              margin="normal"
              required
              sx={{
                '& .MuiInputLabel-root': {
                  color: isDark ? '#e0e0e0' : '#333333',
                  fontWeight: 500
                },
                '& .MuiInputBase-input': {
                  color: isDark ? '#ffffff' : '#2c2c2c',
                  fontSize: '1rem'
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                  },
                  '&:hover fieldset': {
                    borderColor: '#800000'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#800000'
                  }
                }
              }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
              margin="normal"
              required
              sx={{
                '& .MuiInputLabel-root': {
                  color: isDark ? '#e0e0e0' : '#333333',
                  fontWeight: 500
                },
                '& .MuiInputBase-input': {
                  color: isDark ? '#ffffff' : '#2c2c2c',
                  fontSize: '1rem'
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                  },
                  '&:hover fieldset': {
                    borderColor: '#800000'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#800000'
                  }
                }
              }}
            />
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={contactForm.message}
              onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
              margin="normal"
              required
              sx={{
                '& .MuiInputLabel-root': {
                  color: isDark ? '#e0e0e0' : '#333333',
                  fontWeight: 500
                },
                '& .MuiInputBase-input': {
                  color: isDark ? '#ffffff' : '#2c2c2c',
                  fontSize: '1rem',
                  lineHeight: 1.5
                },
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
                  },
                  '&:hover fieldset': {
                    borderColor: '#800000'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#800000'
                  }
                }
              }}
            />
            <Box sx={{ 
              mt: 3,
              p: 3,
              borderRadius: 2,
              backgroundColor: isDark ? 'rgba(128, 0, 0, 0.1)' : 'rgba(128, 0, 0, 0.05)',
              border: '1px solid rgba(128, 0, 0, 0.2)'
            }}>
              <Typography variant="h6" sx={{ 
                color: '#800000', 
                fontWeight: 700, 
                mb: 2,
                fontSize: '1.1rem'
              }}>
                Contact Information:
              </Typography>
              <List dense>
                <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <EmailIcon sx={{ color: '#800000', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="harleyvilleta7777@gmail.com"
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: isDark ? '#ffffff' : '#2c2c2c',
                        fontWeight: 500,
                        fontSize: '1rem'
                      }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <PhoneIcon sx={{ color: '#800000', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="+2 (476) 9891"
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: isDark ? '#ffffff' : '#2c2c2c',
                        fontWeight: 500,
                        fontSize: '1rem'
                      }
                    }}
                  />
                </ListItem>
                <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                  <ListItemIcon>
                    <LocationIcon sx={{ color: '#800000', fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Ward ll, Minglanilla Cebu"
                    sx={{
                      '& .MuiListItemText-primary': {
                        color: isDark ? '#ffffff' : '#2c2c2c',
                        fontWeight: 500,
                        fontSize: '1rem'
                      }
                    }}
                  />
                </ListItem>
              </List>
            </Box>
          </form>
        </DialogContent>
        <DialogActions sx={{ 
          p: 3,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: 'blur(10px)'
        }}>
          <Button 
            onClick={() => setOpenContact(false)}
            sx={{
              color: isDark ? '#e0e0e0' : '#333333',
              fontWeight: 500,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            onClick={handleContactSubmit}
            sx={{ 
              backgroundColor: '#800000',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#A52A2A'
              }
            }}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Modal */}
      <Dialog 
        open={openLogin} 
        onClose={() => setOpenLogin(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            backgroundColor: '#ffffff'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <form onSubmit={handleLoginSubmit}>
            <Box sx={{ 
              p: 4, 
              textAlign: 'center',
              backgroundColor: '#ffffff',
              position: 'relative'
            }}>
              {/* Close Button */}
              <IconButton
                onClick={() => setOpenLogin(false)}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: '#666666',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    color: '#333333'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              {/* Icon */}
              <Box sx={{
                width: 60,
                height: 60,
          backgroundColor: '#800000', 
                borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <DashboardIcon sx={{ color: 'white', fontSize: 30 }} />
              </Box>

              {/* Title */}
              <Typography variant="h4" sx={{ 
                mb: 1, 
                color: '#1c1e21',
                fontWeight: 700,
                fontSize: '28px'
              }}>
                Welcome Back
          </Typography>
              
              <Typography variant="body1" sx={{ 
                mb: 4, 
                color: '#606770',
                fontSize: '15px'
              }}>
                Sign in to your account
          </Typography>
          
              {/* Email Field */}
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 1, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Email*
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  placeholder="admin@school.com"
                  required
                  InputProps={{
                    startAdornment: (
                      <EmailIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff'
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>
              
              {/* Password Field */}
              <Box sx={{ mb: 3, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 1, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Password*
                </Typography>
                <TextField
                  fullWidth
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  placeholder="Enter your password"
                  required
                  InputProps={{
                    startAdornment: (
                      <DashboardIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    ),
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        sx={{ 
                          color: '#8a8d91',
                          '&:hover': {
                            color: '#800000'
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff'
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>

              {/* Remember Me Checkbox */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mb: 3,
                justifyContent: 'flex-start'
              }}>
                <Box sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: '#800000',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 1
                }}>
                  <Box sx={{ 
                    width: 8, 
                    height: 8, 
                    backgroundColor: 'white',
                    borderRadius: '50%'
                  }} />
                </Box>
                <Typography variant="body2" sx={{ 
                  color: '#1c1e21',
                  fontSize: '14px'
                }}>
                  Remember Me
                </Typography>
              </Box>
              
              {/* Sign In Button */}
            <Button
                type="submit"
                fullWidth
              variant="contained"
                disabled={false}
              sx={{
                backgroundColor: '#800000',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'none',
                  mb: 3,
                '&:hover': {
                  backgroundColor: '#A52A2A'
                  },
                  '&:disabled': {
                    backgroundColor: '#dddfe2',
                    color: '#8a8d91'
                }
              }}
            >
                Sign In
            </Button>
            
              {/* Registration Link */}
              <Typography variant="body2" sx={{ 
                color: '#606770',
                fontSize: '14px',
                mb: 2
              }}>
                Don't have an account?{' '}
                <Box 
                  component="span" 
                  sx={{ 
                    color: '#800000',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
              onClick={() => {
                setOpenLogin(false);
                    setOpenRegister(true);
                  }}
                >
                  Register.
                </Box>
              </Typography>
              
              {/* Forgot Password Link */}
              <Typography 
                variant="body2" 
              sx={{
                color: '#800000',
                  fontSize: '14px',
                  cursor: 'pointer',
                fontWeight: 600,
                '&:hover': {
                    textDecoration: 'underline'
                }
              }}
            >
                Forgot password?
              </Typography>
          </Box>
          </form>
        </DialogContent>
      </Dialog>

      {/* Register Modal */}
      <Dialog 
        open={openRegister} 
        onClose={() => setOpenRegister(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            backgroundColor: '#ffffff'
          }
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <form onSubmit={handleRegisterSubmit}>
            <Box sx={{ 
              p: 4, 
              textAlign: 'center',
              backgroundColor: '#ffffff',
              position: 'relative'
            }}>
              {/* Close Button */}
              <IconButton
                onClick={() => setOpenRegister(false)}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  color: '#666666',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    color: '#333333'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
              {/* Icon */}
              <Box sx={{
                width: 60,
                height: 60,
                backgroundColor: '#800000',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <DashboardIcon sx={{ color: 'white', fontSize: 30 }} />
              </Box>

              {/* Title */}
              <Typography variant="h4" sx={{ 
                mb: 1, 
                color: '#1c1e21',
                fontWeight: 700,
                fontSize: '28px'
              }}>
                Create Account
              </Typography>
              
              <Typography variant="body1" sx={{ 
                mb: 4, 
                color: '#606770',
                fontSize: '15px'
              }}>
                Join CeciServe today
              </Typography>
              
              {/* Role Selection */}
              <Box sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Role*
                </Typography>
                <FormControl fullWidth>
                  <Select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({...registerForm, role: e.target.value})}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f5f6f7',
                        border: '1px solid #dddfe2',
                        '& fieldset': {
                          border: 'none'
                        },
                        '&:hover fieldset': {
                          border: 'none'
                        },
                        '&.Mui-focused fieldset': {
                          border: '2px solid #800000'
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff'
                        }
                      },
                      '& .MuiSelect-select': {
                        color: '#1c1e21',
                        fontSize: '16px',
                        padding: '12px 16px'
                      }
                    }}
                  >
                    <MenuItem value="Student">Student</MenuItem>
                    <MenuItem value="Teacher">Teacher</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {/* Name Field */}
              <Box sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Full Name*
                </Typography>
                <TextField
                  fullWidth
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                  placeholder="Enter your full name"
                  required
                  InputProps={{
                    startAdornment: (
                      <PersonIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                          backgroundColor: '#ffffff'
                        }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>
              
              {/* Email Field */}
              <Box sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Email*
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  value={registerForm.email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  required
                  error={!!emailError}
                  helperText={emailError || "Enter your email address"}
                  InputProps={{
                    startAdornment: (
                      <EmailIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                          backgroundColor: '#ffffff'
                        }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>

              {/* Student ID Field - Only for Students */}
              {registerForm.role === 'Student' && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ 
                    mb: 0.5, 
                    color: '#1c1e21',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}>
                    Student ID*
                  </Typography>
                  <TextField
                    fullWidth
                    value={registerForm.studentId}
                    onChange={handleStudentIdChange}
                    placeholder="SCC-22-00000000"
                    required
                    error={!!studentIdError}
                    helperText={studentIdError || "Enter your Student ID"}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f5f6f7',
                        border: '1px solid #dddfe2',
                        '& fieldset': {
                          border: 'none'
                        },
                        '&:hover fieldset': {
                          border: 'none'
                        },
                        '&.Mui-focused fieldset': {
                          border: '2px solid #800000'
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff'
                        },
                        '&.Mui-error fieldset': {
                          border: '2px solid #d32f2f'
                        }
                      },
                      '& .MuiInputBase-input': {
                        color: '#1c1e21',
                        fontSize: '16px',
                        padding: '12px 16px'
                      },
                      '& .MuiFormHelperText-root': {
                        fontSize: '12px',
                        marginTop: 0.5,
                        color: studentIdError ? '#d32f2f' : '#8a8d91'
                      }
                    }}
                  />
                </Box>
              )}

              {/* Full Name Field - Only for Teachers */}
              {registerForm.role === 'Teacher' && (
                <Box sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ 
                    mb: 0.5, 
                    color: '#1c1e21',
                    fontWeight: 600,
                    fontSize: '13px'
                  }}>
                    Full Name*
                  </Typography>
                  <TextField
                    fullWidth
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                    placeholder="Enter your full name"
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f5f6f7',
                        border: '1px solid #dddfe2',
                        '& fieldset': {
                          border: 'none'
                        },
                        '&:hover fieldset': {
                          border: 'none'
                        },
                        '&.Mui-focused fieldset': {
                          border: '2px solid #800000'
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff'
                        }
                      },
                      '& .MuiInputBase-input': {
                        color: '#1c1e21',
                        fontSize: '16px',
                        padding: '12px 16px'
                      }
                    }}
                  />
                </Box>
              )}
              
              {/* Password Field */}
              <Box sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Password*
                </Typography>
                <TextField
                  fullWidth
                  type={showRegisterPassword ? "text" : "password"}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  placeholder="Create a password"
                  required
                  InputProps={{
                    startAdornment: (
                      <DashboardIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    ),
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        sx={{ 
                          color: '#8a8d91',
                          '&:hover': {
                            color: '#800000'
                          }
                        }}
                      >
                        {showRegisterPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff'
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>
              
              {/* Confirm Password Field */}
              <Box sx={{ mb: 2, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ 
                  mb: 0.5, 
                  color: '#1c1e21',
                  fontWeight: 600,
                  fontSize: '13px'
                }}>
                  Confirm Password*
                </Typography>
                <TextField
                  fullWidth
                  type={showConfirmPassword ? "text" : "password"}
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  placeholder="Confirm your password"
                  required
                  InputProps={{
                    startAdornment: (
                      <DashboardIcon sx={{ 
                        color: '#8a8d91', 
                        mr: 1,
                        fontSize: 20
                      }} />
                    ),
                    endAdornment: (
                      <IconButton
                        size="small"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        sx={{ 
                          color: '#8a8d91',
                          '&:hover': {
                            color: '#800000'
                          }
                        }}
                      >
                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: '#f5f6f7',
                      border: '1px solid #dddfe2',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover fieldset': {
                        border: 'none'
                      },
                      '&.Mui-focused fieldset': {
                        border: '2px solid #800000'
                      },
                      '&.Mui-focused': {
                        backgroundColor: '#ffffff'
                      }
                    },
                    '& .MuiInputBase-input': {
                      color: '#1c1e21',
                      fontSize: '16px',
                      padding: '12px 16px'
                    }
                  }}
                />
              </Box>
              
              {/* Create Account Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isRegistering}
                sx={{
                  backgroundColor: '#800000',
                  borderRadius: 2,
                  py: 1.5,
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'none',
                  mb: 2,
                  '&:hover': {
                    backgroundColor: '#A52A2A'
                  },
                  '&:disabled': {
                    backgroundColor: '#dddfe2',
                    color: '#8a8d91'
                  }
                }}
              >
                {isRegistering ? 'Creating Account...' : 'Create Account'}
              </Button>
              
              {/* Sign In Link */}
              <Typography variant="body2" sx={{ 
                color: '#606770',
                fontSize: '14px',
                mb: 1
              }}>
                Already have an account?{' '}
                <Box 
                  component="span" 
                  sx={{ 
                    color: '#800000',
                    cursor: 'pointer',
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                  onClick={() => {
                    setOpenRegister(false);
                    setOpenLogin(true);
                  }}
                >
                  Sign In.
                </Box>
              </Typography>
            </Box>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dashboard Feature Modal */}
      <Dialog open={openDashboardModal} onClose={() => setOpenDashboardModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <DashboardIcon />
          Dashboard Overview
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Real-Time Analytics & Insights
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            The Dashboard Overview provides comprehensive analytics and real-time insights into student activities and system performance. 
            Access interactive charts, detailed reporting, and key performance indicators to make data-driven decisions.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Interactive data visualization charts
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Real-time system performance metrics
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Comprehensive reporting tools
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Student activity monitoring
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenDashboardModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Management Feature Modal */}
      <Dialog open={openStudentModal} onClose={() => setOpenStudentModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <PeopleIcon />
          Student Management
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Complete Student Lifecycle Management
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            Manage the complete student lifecycle with comprehensive tools for academic records, disciplinary tracking, 
            and seamless parent communication. Keep all student information organized and accessible.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Comprehensive academic records management
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Disciplinary tracking and history
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Parent communication tools
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Student profile management
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenStudentModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Violation Tracking Feature Modal */}
      <Dialog open={openViolationModal} onClose={() => setOpenViolationModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <ReportIcon />
          Violation Tracking
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Advanced Disciplinary System
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            Monitor and manage student violations with an advanced disciplinary system featuring automated notifications, 
            escalation procedures, and comprehensive violation history tracking for better student behavior management.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Automated violation notifications
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Escalation procedures and workflows
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Comprehensive violation history tracking
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Behavior management analytics
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenViolationModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Management Feature Modal */}
      <Dialog open={openActivityModal} onClose={() => setOpenActivityModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <EventIcon />
          Activity Management
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            School Activities & Events
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            Organize and track school activities, events, and student participation with automated scheduling and notifications. 
            Manage everything from planning to execution with comprehensive tools.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Event planning and scheduling
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Student participation tracking
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Automated notifications
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Activity management tools
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenActivityModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Announcements Feature Modal */}
      <Dialog open={openAnnouncementModal} onClose={() => setOpenAnnouncementModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <CampaignIcon />
          Announcements
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Communication & Broadcasting
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            Broadcast important announcements, emergency notifications, and updates to the entire school community 
            with targeted messaging and delivery confirmation. Keep everyone informed and connected.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Emergency notification system
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Targeted messaging capabilities
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Delivery confirmation tracking
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Community-wide communication
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenAnnouncementModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lost and Found Feature Modal */}
      <Dialog open={openLostFoundModal} onClose={() => setOpenLostFoundModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <SearchIcon />
          Lost and Found Management
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Digital Lost & Found System
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            Track misplaced items, facilitate returns, and maintain detailed records of found objects with photo documentation. 
            Streamline the lost and found process with digital tools and automated matching.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Key Capabilities:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Photo documentation system
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Automated item matching
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Return facilitation tools
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Detailed record keeping
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenLostFoundModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Learn More Modal */}
      <Dialog open={openLearnMoreModal} onClose={() => setOpenLearnMoreModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <SchoolIcon />
          Learn More About CeciServe
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Discover CeciServe's Educational Solutions
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            CeciServe is a comprehensive school management system designed to revolutionize educational administration. 
            Our platform integrates cutting-edge technology with educational best practices to create a seamless, 
            efficient, and user-friendly experience for administrators, teachers, and students.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              Why Choose CeciServe?
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Modern, intuitive interface designed for educators
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Comprehensive feature set covering all school operations
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Scalable solution that grows with your institution
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Dedicated support and training resources
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenLearnMoreModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setOpenLearnMoreModal(false);
              setOpenLogin(true);
            }}
            sx={{ 
              backgroundColor: '#800000',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#A52A2A'
              }
            }}
          >
            Get Started
          </Button>
        </DialogActions>
      </Dialog>

      {/* System Info Modal */}
      <Dialog open={openSystemInfoModal} onClose={() => setOpenSystemInfoModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          backgroundColor: '#800000', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <InfoIcon />
          System Information & Technical Details
        </DialogTitle>
        <DialogContent sx={{ 
          p: 3,
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ 
            mb: 3, 
            color: isDark ? '#ffffff' : '#800000', 
            fontWeight: 700,
            fontSize: '1.25rem'
          }}>
            Technical Specifications & System Requirements
          </Typography>
          
          <Typography variant="body1" sx={{ 
            mb: 3, 
            lineHeight: 1.6,
            color: isDark ? '#e0e0e0' : '#333333',
            fontSize: '1rem'
          }}>
            CeciServe is built on modern web technologies and cloud infrastructure to ensure reliability, 
            security, and performance. Our system is designed to handle the demands of educational institutions 
            of all sizes with enterprise-grade security and scalability.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ 
              mb: 2, 
              color: isDark ? '#ffffff' : '#800000', 
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              System Features:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Cloud-based architecture with 99.9% uptime guarantee
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Enterprise-grade security with data encryption
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Responsive design compatible with all devices
              </Typography>
              <Typography variant="body1" sx={{ 
                color: isDark ? '#e0e0e0' : '#333333',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <CheckCircleIcon sx={{ color: '#800000', fontSize: '1.2rem' }} />
                Regular updates and feature enhancements
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px'
        }}>
          <Button 
            onClick={() => setOpenSystemInfoModal(false)}
            sx={{
              color: '#000000',
              fontWeight: 600,
              border: '1px solid #000000',
              borderRadius: 2,
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                border: '1px solid #800000'
              }
            }}
          >
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setOpenSystemInfoModal(false);
              setOpenContact(true);
            }}
            sx={{ 
              backgroundColor: '#800000',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#A52A2A'
              }
            }}
          >
            Contact Support
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({...snackbar, open: false})}
      >
        <Alert 
          onClose={() => setSnackbar({...snackbar, open: false})} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        @keyframes slideInFromLeft {
          0% {
            transform: translateX(-100px) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateX(-50px) scale(0.4);
            opacity: 0.5;
          }
          100% {
            transform: translateX(0) scale(0.3);
            opacity: 1;
          }
        }
        @keyframes slideInFromRight {
          0% {
            transform: translateX(100px) scale(0.3);
            opacity: 0;
          }
          50% {
            transform: translateX(50px) scale(0.4);
            opacity: 0.5;
          }
          100% {
            transform: translateX(0) scale(0.3);
            opacity: 1;
          }
        }
        @keyframes centerPulse {
          0%, 100% {
            box-shadow: 0 35px 120px rgba(0,0,0,0.6), 0 0 0 3px rgba(128,0,0,0.5), 0 0 50px rgba(128,0,0,0.3);
          }
          50% {
            box-shadow: 0 45px 150px rgba(0,0,0,0.7), 0 0 0 4px rgba(128,0,0,0.6), 0 0 70px rgba(128,0,0,0.4);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 0.7;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
        }
        @keyframes centerEnter {
          0% {
            transform: perspective(1000px) rotateY(15deg) scale(0.7);
            filter: blur(2px);
          }
          50% {
            transform: perspective(1000px) rotateY(7deg) scale(0.85);
            filter: blur(1px);
          }
          100% {
            transform: perspective(1000px) rotateY(0deg) scale(1);
            filter: blur(0px);
          }
        }
        @keyframes leftRunning {
          0%, 100% {
            transform: perspective(1000px) rotateY(15deg) scale(0.7) translateX(0px);
          }
          25% {
            transform: perspective(1000px) rotateY(10deg) scale(0.75) translateX(10px);
          }
          50% {
            transform: perspective(1000px) rotateY(5deg) scale(0.8) translateX(20px);
          }
          75% {
            transform: perspective(1000px) rotateY(10deg) scale(0.75) translateX(10px);
          }
        }
        @keyframes rightRunning {
          0%, 100% {
            transform: perspective(1000px) rotateY(-15deg) scale(0.7) translateX(0px);
          }
          25% {
            transform: perspective(1000px) rotateY(-10deg) scale(0.75) translateX(-10px);
          }
          50% {
            transform: perspective(1000px) rotateY(-5deg) scale(0.8) translateX(-20px);
          }
          75% {
            transform: perspective(1000px) rotateY(-10deg) scale(0.75) translateX(-10px);
          }
        }
        @keyframes leftRunningHover {
          0%, 100% {
            transform: perspective(1000px) rotateY(5deg) scale(0.75) translateX(0px);
          }
          50% {
            transform: perspective(1000px) rotateY(2deg) scale(0.8) translateX(15px);
          }
        }
        @keyframes rightRunningHover {
          0%, 100% {
            transform: perspective(1000px) rotateY(-5deg) scale(0.75) translateX(0px);
          }
          50% {
            transform: perspective(1000px) rotateY(-2deg) scale(0.8) translateX(-15px);
          }
        }
        @keyframes imageFadeIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
            filter: blur(10px);
          }
          50% {
            opacity: 0.7;
            transform: scale(0.9);
            filter: blur(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1);
            filter: blur(0px);
          }
        }
      `}</style>
      </Box>
    </Box>
  );
}