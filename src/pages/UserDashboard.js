import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Chip, Button, useTheme, Divider
} from "@mui/material";
import { CheckCircle, Warning, Announcement, EventNote, Report, Event, Campaign, People, Assignment, Notifications, Receipt, Schedule, Info } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { db, auth, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc, getDoc, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper functions for activity logs
const getActivityLogIcon = (action) => {
  const actionLower = action?.toLowerCase() || '';
  
  if (actionLower.includes('lost') || actionLower.includes('found')) {
    return <Report sx={{ fontSize: 20, color: 'white' }} />;
  } else if (actionLower.includes('profile') || actionLower.includes('update')) {
    return <People sx={{ fontSize: 20, color: 'white' }} />;
  } else if (actionLower.includes('receipt') || actionLower.includes('submit')) {
    return <CheckCircle sx={{ fontSize: 20, color: 'white' }} />;
  } else if (actionLower.includes('violation') || actionLower.includes('report')) {
    return <Warning sx={{ fontSize: 20, color: 'white' }} />;
  } else if (actionLower.includes('announcement') || actionLower.includes('notification')) {
    return <Announcement sx={{ fontSize: 20, color: 'white' }} />;
  } else if (actionLower.includes('activity') || actionLower.includes('event')) {
    return <Event sx={{ fontSize: 20, color: 'white' }} />;
  } else {
    return <Campaign sx={{ fontSize: 20, color: 'white' }} />;
  }
};

const getActivityLogColor = (action) => {
  const actionLower = action?.toLowerCase() || '';
  
  if (actionLower.includes('lost') || actionLower.includes('found')) {
    return '#ff9800'; // Orange
  } else if (actionLower.includes('profile') || actionLower.includes('update')) {
    return '#2196f3'; // Blue
  } else if (actionLower.includes('receipt') || actionLower.includes('submit')) {
    return '#4caf50'; // Green
  } else if (actionLower.includes('violation') || actionLower.includes('report')) {
    return '#f44336'; // Red
  } else if (actionLower.includes('announcement') || actionLower.includes('notification')) {
    return '#9c27b0'; // Purple
  } else if (actionLower.includes('activity') || actionLower.includes('event')) {
    return '#00bcd4'; // Cyan
  } else {
    return '#607d8b'; // Blue Grey
  }
};

const getActivityLogStatusColor = (status) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('completed') || statusLower.includes('success')) {
    return 'success';
  } else if (statusLower.includes('pending') || statusLower.includes('processing')) {
    return 'warning';
  } else if (statusLower.includes('failed') || statusLower.includes('error')) {
    return 'error';
  } else {
    return 'default';
  }
};

// User Overview Component
function UserOverview({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userViolations, setUserViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activityBookings, setActivityBookings] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState({
    totalViolations: 0,
    pendingViolations: 0,
    resolvedViolations: 0,
    unreadNotifications: 0,
    totalAnnouncements: 0,
    totalActivities: 0,
    totalSubmissions: 0
  });

  useEffect(() => {
    if (!currentUser) {
      return;
    }


    // Fetch user profile from Firestore
    const fetchUserProfile = async () => {
      try {
        console.log('🔍 Fetching data for user:', currentUser.email);
        
        // Fetch student data from students collection FIRST (priority)
        // Try multiple email matching strategies
        let studentsSnapshot = null;
        
        // Strategy 1: Match registeredEmail field
        const studentsQuery1 = query(
          collection(db, 'students'),
          where('registeredEmail', '==', currentUser.email)
        );
        studentsSnapshot = await getDocs(studentsQuery1);
        console.log('📚 Strategy 1 - registeredEmail match:', studentsSnapshot.size, 'documents found');
        
        // Strategy 2: Match email field (if no results)
        if (studentsSnapshot.empty) {
          const studentsQuery2 = query(
            collection(db, 'students'),
            where('email', '==', currentUser.email)
          );
          studentsSnapshot = await getDocs(studentsQuery2);
          console.log('📚 Strategy 2 - email field match:', studentsSnapshot.size, 'documents found');
        }
        
        // Strategy 3: Case-insensitive registeredEmail match (if no results)
        if (studentsSnapshot.empty) {
          const studentsQuery3 = query(
            collection(db, 'students'),
            where('registeredEmail', '==', currentUser.email.toLowerCase())
          );
          studentsSnapshot = await getDocs(studentsQuery3);
          console.log('📚 Strategy 3 - Lowercase registeredEmail match:', studentsSnapshot.size, 'documents found');
        }
        
        // Strategy 4: Get all students and filter client-side (if still no results)
        if (studentsSnapshot.empty) {
          console.log('📚 Strategy 4 - Fetching all students for client-side filtering...');
          const allStudentsQuery = query(collection(db, 'students'));
          const allStudentsSnapshot = await getDocs(allStudentsQuery);
          
          const matchingStudents = allStudentsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return (data.registeredEmail && data.registeredEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                   (data.email && data.email.toLowerCase() === currentUser.email.toLowerCase());
          });
          
          if (matchingStudents.length > 0) {
            console.log('📚 Strategy 4 - Found', matchingStudents.length, 'matching students');
            studentsSnapshot = { 
              empty: false, 
              docs: matchingStudents,
              size: matchingStudents.length 
            };
          }
        }
        
        if (!studentsSnapshot.empty) {
          // Get the first matching student record
          const studentDoc = studentsSnapshot.docs[0];
          const studentDataFromDB = studentDoc.data();
          setStudentData(studentDataFromDB);
          console.log('✅ Student data fetched from students collection:', studentDataFromDB);
          console.log('🎯 Student ID from students collection:', studentDataFromDB.studentId);
        } else {
          console.log('❌ No student data found in students collection for:', currentUser.email);
          setStudentData(null);
        }
        
        // Only fetch from users collection if no student data found
        if (studentsSnapshot.empty) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
            console.log('📄 User profile fetched from users collection:', userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();

    // Fetch user violations from admin records
    const violationsQuery = query(
      collection(db, "violations"),
      where("studentEmail", "==", currentUser.email)
    );

    // Fetch announcements from admin records
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );

    // Note: Removed activity_bookings query as we only show admin-created activities

    // Fetch recent activities (admin-created)
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    // Fetch receipts/submissions
    const receiptsQuery = query(
      collection(db, "receipts"),
      where("studentEmail", "==", currentUser.email),
      orderBy("createdAt", "desc")
    );
    let unsubActivities;
    try {
      unsubActivities = onSnapshot(activitiesQuery, (snap) => {
        try {
          const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log('📋 Admin Activities fetched:', items.length, 'items');
          console.log('📋 Admin Activities data:', items);
          
          // Filter activities based on student's course, year, and section
          const studentCourse = studentData?.course || userProfile?.course;
          const studentYear = studentData?.year || userProfile?.year;
          const studentSection = studentData?.section || userProfile?.section;
          
          const filteredItems = items.filter(activity => {
            // Use flexible matching to handle case differences and data type differences
            // Activity must have course, year, and section that match the student's
            const courseMatch = activity.course?.toLowerCase() === studentCourse?.toLowerCase();
            const yearMatch = activity.year?.toString() === studentYear?.toString();
            const sectionMatch = activity.section?.toLowerCase() === studentSection?.toLowerCase();
            
            // Activity matches if all fields match the student's course, year, and section
            return courseMatch && yearMatch && sectionMatch;
          });
          
          console.log('📋 Filtered Activities for student:', {
            total: items.length,
            filtered: filteredItems.length,
            studentCourse,
            studentYear,
            studentSection
          });
          
          setActivities(filteredItems);
          
          // Update stats with filtered count
          setStats(prev => ({
            ...prev,
            totalActivities: filteredItems.length
          }));
        } catch (error) {
          console.error("Error processing activities data:", error);
        }
      }, (error) => {
        console.error("Dashboard - Activities query error (orderBy may not exist):", error);
        // If orderBy fails, try without it
        const activitiesQueryFallback = query(
          collection(db, "activities"),
          limit(10)
        );
        const unsubFallback = onSnapshot(activitiesQueryFallback, (snap) => {
          try {
            const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
              .sort((a, b) => {
                const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
                const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
                return dateB - dateA;
              });
            
            // Filter activities based on student's course, year, and section
            const studentCourse = studentData?.course || userProfile?.course;
            const studentYear = studentData?.year || userProfile?.year;
            const studentSection = studentData?.section || userProfile?.section;
            
            const filteredItems = items.filter(activity => {
              // Use flexible matching to handle case differences and data type differences
              const courseMatch = !activity.course || activity.course?.toLowerCase() === studentCourse?.toLowerCase();
              const yearMatch = !activity.year || activity.year?.toString() === studentYear?.toString();
              const sectionMatch = !activity.section || activity.section?.toLowerCase() === studentSection?.toLowerCase();
              
              // Activity matches if all specified fields match (or if field is not specified in activity)
              return courseMatch && yearMatch && sectionMatch;
            });
            
            console.log('📋 Filtered Activities (fallback) for student:', {
              total: items.length,
              filtered: filteredItems.length,
              studentCourse,
              studentYear,
              studentSection
            });
            
            setActivities(filteredItems);
            
            // Update stats with filtered count
            setStats(prev => ({
              ...prev,
              totalActivities: filteredItems.length
            }));
          } catch (err) {
            console.error("Error processing activities data (fallback):", err);
          }
        });
        // Store fallback unsubscribe function
        unsubActivities = unsubFallback;
      });
    } catch (error) {
      console.error("Error setting up activities query:", error);
      // Fallback query without orderBy
      const activitiesQueryFallback = query(
        collection(db, "activities"),
        limit(10)
      );
      unsubActivities = onSnapshot(activitiesQueryFallback, (snap) => {
        try {
          const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
              const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
              return dateB - dateA;
            });
          
          // Filter activities based on student's course, year, and section
          const studentCourse = studentData?.course || userProfile?.course;
          const studentYear = studentData?.year || userProfile?.year;
          const studentSection = studentData?.section || userProfile?.section;
          
          const filteredItems = items.filter(activity => {
            // Use flexible matching to handle case differences and data type differences
            // Activity must have course, year, and section that match the student's
            const courseMatch = activity.course?.toLowerCase() === studentCourse?.toLowerCase();
            const yearMatch = activity.year?.toString() === studentYear?.toString();
            const sectionMatch = activity.section?.toLowerCase() === studentSection?.toLowerCase();
            
            // Activity matches if all fields match the student's course, year, and section
            return courseMatch && yearMatch && sectionMatch;
          });
          
          console.log('📋 Filtered Activities (fallback) for student:', {
            total: items.length,
            filtered: filteredItems.length,
            studentCourse,
            studentYear,
            studentSection
          });
          
          setActivities(filteredItems);
          
          // Update stats with filtered count
          setStats(prev => ({
            ...prev,
            totalActivities: filteredItems.length
          }));
        } catch (err) {
          console.error("Error processing activities data (fallback):", err);
        }
      });
    }

    const unsubReceipts = onSnapshot(receiptsQuery, (snap) => {
      try {
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalSubmissions: items.length
        }));
      } catch (error) {
        console.error("Error processing receipts data:", error);
      }
    }, (error) => {
      console.error("Dashboard - Receipts query error:", error);
    });



    const unsubViolations = onSnapshot(violationsQuery, (snap) => {
      try {
        console.log("Dashboard - Firebase query result:", snap.docs.length, "violations");
        const violations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort by createdAt in descending order (newest first) in JavaScript
        const sortedViolations = violations.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setUserViolations(sortedViolations);
        
        // Calculate violation statistics
        const totalViolations = sortedViolations.length;
        const pendingViolations = sortedViolations.filter(v => v.status === 'Pending').length;
        const resolvedViolations = sortedViolations.filter(v => v.status === 'Solved').length;
        
        setStats(prev => ({
          ...prev,
          totalViolations,
          pendingViolations,
          resolvedViolations
        }));
        
      } catch (error) {
        console.error("Error processing violations data:", error);
      }
    }, (error) => {
      console.error("Dashboard - Firebase query error:", error);
    });

    const unsubAnnouncements = onSnapshot(announcementsQuery, (snap) => {
      try {
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter out private announcements - only show public announcements to students
        const publicAnnouncements = items.filter(a => a.visibility !== "private");
        // Filter to show only active announcements (not completed, not expired, within schedule/expiry dates)
        const now = new Date();
        const activeAnnouncements = publicAnnouncements.filter(a => {
          // Check if completed (manually or expired)
          const isCompleted = a.completed || (a.expiryDate && new Date(a.expiryDate) <= now);
          if (isCompleted) return false;
          
          // Check if scheduled date has passed
          if (a.scheduleDate && new Date(a.scheduleDate) > now) return false;
          
          // Check if expiry date hasn't passed
          if (a.expiryDate && new Date(a.expiryDate) <= now) return false;
          
          return true;
        });
        setAnnouncements(activeAnnouncements);
        setAnnouncementCount(activeAnnouncements.length);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalAnnouncements: activeAnnouncements.length
        }));
      } catch (error) {
        console.error("Error processing announcements data:", error);
      }
    }, (error) => {
      console.error("Dashboard - Announcements query error:", error);
    });

    // Note: Removed activity bookings subscription as we only show admin-created activities


    return () => {
      unsubViolations();
      unsubAnnouncements();
      if (unsubActivities && typeof unsubActivities === 'function') {
        unsubActivities();
      }
      unsubReceipts();
    };
  }, [currentUser]);

  // Limit to 3 records per container to maintain consistent sizing
  const recentAnnouncements = announcements?.slice(0, 3) || [];
  const recentActivityBookings = activityBookings?.slice(0, 3) || [];
  const recentActivityLogs = activityLogs?.slice(0, 5) || [];
  
  // Only show admin-created activities
  const allActivities = activities.slice(0, 2).map(activity => ({
    ...activity,
    type: 'admin-created',
    source: 'Admin'
  })).sort((a, b) => {
    // Sort by date, newest first
    const dateA = new Date(a.date || a.createdAt?.toDate?.() || a.createdAt || 0);
    const dateB = new Date(b.date || b.createdAt?.toDate?.() || b.createdAt || 0);
    return dateB - dateA;
  });
  
  // Debug: Log admin activities
  console.log('🔍 Admin Activities Debug:', {
    activities: activities,
    activitiesLength: activities?.length || 0,
    allActivities: allActivities,
    allActivitiesLength: allActivities?.length || 0
  });

  // Debug: Log activity bookings data
  console.log('🔍 Recent Activity Bookings Debug:', {
    activityBookings: activityBookings,
    recentActivityBookings: recentActivityBookings,
    activityBookingsLength: activityBookings?.length || 0,
    recentActivityBookingsLength: recentActivityBookings?.length || 0,
    showingLimit: '3 records per container',
    studentProfile: {
      course: studentData?.course || userProfile?.course || 'Not set',
      year: studentData?.year || userProfile?.year || 'Not set', 
      section: studentData?.section || userProfile?.section || 'Not set'
    }
  });

  // Get user display info - prioritize studentData from students collection
  const getUserDisplayInfo = () => {
    console.log('🔍 getUserDisplayInfo called with:', {
      hasStudentData: !!studentData,
      hasUserProfile: !!userProfile,
      studentDataKeys: studentData ? Object.keys(studentData) : 'none',
      userProfileKeys: userProfile ? Object.keys(userProfile) : 'none'
    });

    // Use studentData from students collection if available
    if (studentData) {
      console.log('✅ Using studentData from students collection');
      console.log('🎯 Student ID from students collection:', studentData.id);
      console.log('📧 Email from students collection:', studentData.registeredEmail);
      
      return {
        name: studentData.fullName || currentUser?.displayName || 'Student',
        firstName: studentData.firstName || '',
        lastName: studentData.lastName || '',
        middleInitial: '', // Not in the data you showed
        email: studentData.registeredEmail || studentData.email || currentUser?.email,
        photo: studentData.image || currentUser?.photoURL,
        role: 'Student',
        studentId: studentData.id || '', // Use 'id' field instead of 'studentId'
        course: studentData.course || 'Not provided',
        yearLevel: '', // Not in the data you showed
        section: studentData.section || 'Not provided',
        contact: '', // Not in the data you showed
        address: '', // Not in the data you showed
        sex: studentData.sex || 'Not provided',
        age: '', // Not in the data you showed
        birthdate: '' // Not in the data you showed
      };
    }
    
    // Fallback to userProfile if no studentData
    if (userProfile) {
      console.log('⚠️ Falling back to userProfile from users collection');
      console.log('🎯 Student ID from users collection:', userProfile.studentId);
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        middleInitial: userProfile.middleInitial || '',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student',
        studentId: userProfile.studentId || '', // Don't fallback to UID if no studentId
        course: userProfile.course || '',
        yearLevel: userProfile.year || '',
        section: userProfile.section || '',
        contact: userProfile.contact || '',
        address: userProfile.address || '',
        sex: userProfile.sex || '',
        age: userProfile.age || '',
        birthdate: userProfile.birthdate || ''
      };
    }
    
    // Final fallback
    console.log('❌ Using final fallback - no data from either collection');
    return {
      name: currentUser?.displayName || 'Student',
      firstName: '',
      lastName: '',
      middleInitial: '',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student',
      studentId: '', // Don't show UID hash as Student ID
      course: '',
      yearLevel: '',
      section: '',
      contact: '',
      address: '',
      sex: '',
      age: '',
      birthdate: ''
    };
  };

  const userInfo = getUserDisplayInfo();

  // Function to handle View All Activities button click
  const handleViewAllActivities = () => {
    navigate('/activity');
  };

  // Debug: Log user profile data
  console.log('🔍 UserDashboard Debug:', {
    userProfile: userProfile,
    studentData: studentData,
    userInfo: userInfo,
    dataSource: studentData ? 'students collection' : userProfile ? 'users collection' : 'fallback'
  });

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 2, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2
          }}
          gutterBottom 
        >
          Hi {userInfo.name}
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: { xs: 16, sm: 18 },
            wordBreak: 'break-word',
            lineHeight: 1.4
          }}
        >
          Welcome back, {userInfo.name}! Here's your student dashboard overview
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Total Violations Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderLeft: '4px solid #800000',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeft: '4px solid #660000'
              }
            }}
            onClick={() => navigate('/violations')}
          >
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                {stats.totalViolations}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                Total Violations
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Announcements Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderLeft: '4px solid #800000',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeft: '4px solid #660000'
              }
            }}
            onClick={() => navigate('/announcements')}
          >
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                {stats.totalAnnouncements}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                Total Announcements
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Activities Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderLeft: '4px solid #800000',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeft: '4px solid #660000'
              }
            }}
            onClick={() => navigate('/activity')}
          >
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                {stats.totalActivities}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                Total Activities
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Submissions Card */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            sx={{ 
              borderRadius: 2,
              boxShadow: 3,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderLeft: '4px solid #800000',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeft: '4px solid #660000'
              }
            }}
            onClick={() => navigate('/receipt-submission')}
          >
            <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                {stats.totalSubmissions}
              </Typography>
              <Typography variant="body2" sx={{ color: '#000000', fontWeight: 500 }}>
                Total Submissions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Active Announcements */}
        <Grid item xs={12} lg={6} sx={{ mt: 2 }}>
          <Card sx={{ 
            border: 'none',
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436' }}>
                  Recent Announcements
                </Typography>
                <Button 
                  size="small" 
                  component={Link} 
                  to="/announcements"
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
                  View All
                </Button>
              </Box>
              
              {recentAnnouncements.length > 0 ? (
                <List>
                  {recentAnnouncements.map((announcement, index) => (
                    <React.Fragment key={announcement.id}>
                      <ListItem sx={{ px: 0, py: 1, '&:hover': { backgroundColor: 'transparent' } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: 'transparent'
                          }}>
                            <Info sx={{ 
                              fontSize: 16, 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' 
                            }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                              {announcement.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', mb: 0.5 }}>
                                {announcement.content || announcement.message}
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>
                                {new Date(announcement.timestamp || announcement.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={announcement.status || 'Pending'} 
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                   (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666',
                            border: 'none',
                            '& .MuiChip-label': {
                              color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                     (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666'
                            }
                          }}
                        />
                      </ListItem>
                      {index < recentAnnouncements.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Info sx={{ 
                    fontSize: 32, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', 
                    mb: 1 
                  }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' }}>
                    No announcements yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Teacher Activity */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderLeft: '4px solid #800000',
            boxShadow: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
            borderRadius: 2,
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                  Activities for You
                </Typography>
                <Button 
                  size="small" 
                  onClick={handleViewAllActivities}
                  sx={{ 
                    textTransform: 'none',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    '&:hover': {
                      backgroundColor: 'rgba(128, 0, 0, 0.1)',
                      borderColor: '#800000',
                      color: '#800000',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 8px rgba(128, 0, 0, 0.2)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  variant="outlined"
                >
                  View All
                </Button>
              </Box>
              
              <Typography variant="body2" sx={{ 
                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666', 
                mb: 2,
                fontStyle: 'italic'
              }}>
                Activities created by administrators
              </Typography>
              
              {allActivities.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  {allActivities.map((activity) => (
                    <Card 
                      key={activity.id}
                      sx={{ 
                        border: '1px solid',
                        borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(128, 0, 0, 0.02)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.palette.mode === 'dark' ? '0 8px 25px rgba(0, 0, 0, 0.3)' : '0 8px 25px rgba(128, 0, 0, 0.15)',
                          borderColor: '#800000'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Avatar sx={{ 
                            bgcolor: 'success.main',
                            width: 48, 
                            height: 48,
                            flexShrink: 0
                          }}>
                            <Event sx={{ fontSize: 24 }} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="h6" fontWeight={600} sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              mb: 1,
                              fontSize: '1.1rem'
                            }}>
                              {activity.activity || activity.title || activity.name}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1.5 }}>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}>
                                <strong>📝 Description:</strong> {activity.description || activity.content || 'No description available'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}>
                                <strong>📍 Location:</strong> {activity.location || 'TBA'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}>
                                <strong>📅 Date:</strong> {activity.date ? new Date(activity.date).toLocaleDateString() : 'TBA'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5
                              }}>
                                <strong>⏰ Time:</strong> {activity.time || activity.startTime ? `${activity.startTime} - ${activity.endTime || 'TBA'}` : 'TBA'}
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip 
                                label={activity.status || 'Active'} 
                                size="small"
                                color={activity.status === 'active' ? 'success' : activity.status === 'inactive' ? 'default' : 'primary'}
                                sx={{ 
                                  fontWeight: 500,
                                  textTransform: 'capitalize',
                                  fontSize: '0.75rem'
                                }}
                              />
                              <Chip 
                                label="Admin" 
                                size="small"
                                sx={{ 
                                  fontWeight: 500,
                                  backgroundColor: '#800000',
                                  color: 'white',
                                  fontSize: '0.7rem'
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Event sx={{ fontSize: 48, color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                    No admin activities available
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mt: 1, display: 'block' }}>
                    Administrators will create activities that will appear here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
         </Grid>
       </Grid>

       {/* Recent Activity Log */}
       <Grid container spacing={3} sx={{ mt: 2 }}>
         <Grid item xs={12}>
           <Card sx={{ 
             borderLeft: '4px solid #800000',
             boxShadow: 3,
             bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
             borderRadius: 2,
             height: 'fit-content'
           }}>
             <CardContent>
               <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                 <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                   Recent Activity Log
                 </Typography>
                 <Button 
                   size="small" 
                   sx={{ 
                     textTransform: 'none',
                     color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                     borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                     '&:hover': {
                       backgroundColor: 'rgba(128, 0, 0, 0.1)',
                       borderColor: '#800000',
                       color: '#800000',
                       transform: 'translateY(-1px)',
                       boxShadow: '0 4px 8px rgba(128, 0, 0, 0.2)'
                     },
                     transition: 'all 0.2s ease-in-out'
                   }}
                   variant="outlined"
                 >
                   View All
                 </Button>
               </Box>
               
               {recentActivityLogs.length > 0 ? (
                 <List>
                   {recentActivityLogs.map((log, index) => (
                     <React.Fragment key={log.id}>
                       <ListItem sx={{ 
                         px: 0, 
                         py: 1,
                         '&:hover': {
                           backgroundColor: 'transparent'
                         }
                       }}>
                         <ListItemAvatar>
                           <Avatar sx={{ 
                             bgcolor: getActivityLogColor(log.action),
                             width: 40, 
                             height: 40
                           }}>
                             {getActivityLogIcon(log.action)}
                           </Avatar>
                         </ListItemAvatar>
                         <ListItemText
                           primary={
                             <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                               {log.action}
                             </Typography>
                           }
                           secondary={
                             <Box>
                               <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 0.5 }}>
                                 {log.description || log.message || 'No description available'}
                               </Typography>
                               <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                                 {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recently'}
                               </Typography>
                             </Box>
                           }
                         />
                         <Chip 
                           label={log.status || 'Completed'} 
                           size="small"
                           color={getActivityLogStatusColor(log.status)}
                           sx={{ 
                             fontWeight: 500,
                             textTransform: 'capitalize'
                           }}
                         />
                       </ListItem>
                       {index < recentActivityLogs.length - 1 && <Divider />}
                     </React.Fragment>
                   ))}
                 </List>
               ) : (
                 <Box sx={{ textAlign: 'center', py: 3 }}>
                   <Report sx={{ fontSize: 48, color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 1 }} />
                   <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                     No recent activity
                   </Typography>
                   <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mt: 1, display: 'block' }}>
                     Your recent actions will appear here
                   </Typography>
                 </Box>
               )}
             </CardContent>
           </Card>
         </Grid>
       </Grid>
     </Box>
   );
 }

// Main User Dashboard Component
export default function UserDashboard({ currentUser, userProfile }) {
  const theme = useTheme();
  const navigate = useNavigate();

  // Remove conflicting auth listener - App.js handles authentication state
  // UserDashboard now receives currentUser and userProfile as props from App.js

  // Removed full-page loading spinner per requirements

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Please log in to access the dashboard.</Typography>
      </Box>
    );
  }

  return <UserOverview currentUser={currentUser} />;
} 