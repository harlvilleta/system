import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  IconButton,
  Autocomplete,
  useTheme
} from '@mui/material';
import {
  CalendarToday,
  Event,
  CheckCircle,
  Cancel,
  Warning,
  FilterList,
  Add,
  Visibility,
  Delete,
  Search
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';

export default function TeacherActivityScheduler() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    teacherName: '',
    department: '',
    activity: '',
    resource: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
    course: '',
    year: '',
    section: ''
  });
  const [conflictCheck, setConflictCheck] = useState(null);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [filterResource, setFilterResource] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Available resources and departments/courses
  const resources = [
    'Auditorium', 'Gymnasium', 'Library', 'Computer Lab', 'Science Lab',
    'Art Room', 'Music Room', 'Conference Room', 'Cafeteria', 'Outdoor Field'
  ];

  const departments = [
    'BSIT', 'BSBA', 'BSCRIM', 'BSHTM', 'BEED', 'BSED', 'BSHM'
  ];

  const courses = [
    'BSIT', 'BSBA', 'BSCRIM', 'BSHTM', 'BEED', 'BSED', 'BSHM'
  ];

  const years = [
    '1st Year', '2nd Year', '3rd Year', '4th Year'
  ];

  const sections = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'
  ];

  const timeSlots = [
    '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            setUserProfile(userData);
            setBookingForm(prev => ({
              ...prev,
              teacherName: userData.fullName || userData.name || user.displayName || '',
              department: userData.department || ''
            }));
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.email) return;

    const bookingsQuery = query(
      collection(db, 'activity_bookings'),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBookings(bookingsData);
      console.log('📅 Bookings updated:', bookingsData.length, 'total bookings');
    }, (error) => {
      console.error('❌ Error listening to bookings:', error);
    });

    return unsubscribe;
  }, [currentUser]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getBookingsForDate = (date) => {
    if (!date) return [];
    
    // Fix timezone issue: use local date formatting instead of toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Only include bookings that are not rejected (pending or approved)
    return bookings.filter(booking => 
      booking.date === dateStr && 
      booking.status !== 'rejected'
    );
  };

  const isPastDate = (date) => {
    if (!date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    let checkDate;
    if (typeof date === 'string') {
      // Handle date string like "2024-01-15" - use local timezone
      checkDate = new Date(date + 'T00:00:00');
    } else {
      // Handle Date object - create a new date with local timezone
      checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    checkDate.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Debug logging for October dates
    if (date && ((typeof date === 'object' && date.getMonth() === 9) || (typeof date === 'string' && date.includes('2024-10')))) {
      console.log('October date comparison:', {
        inputDate: date,
        checkDate: checkDate.toISOString(),
        today: today.toISOString(),
        isPast: checkDate < today,
        checkDateLocal: checkDate.toLocaleDateString(),
        todayLocal: today.toLocaleDateString()
      });
    }
    
    // Allow booking for today and future dates only
    return checkDate < today;
  };

  const getDateStatus = (date) => {
    if (!date) return 'empty';
    if (isPastDate(date)) return 'past';
    const dateBookings = getBookingsForDate(date);
    
    // Debug logging for October 15
    if (date && date.getDate() === 15 && date.getMonth() === 9) { // October is month 9 (0-indexed)
      console.log('October 15 status check:', {
        date: date.toISOString(),
        dateBookings: dateBookings,
        allBookingsForDate: bookings.filter(booking => booking.date === date.toISOString().split('T')[0]),
        status: dateBookings.length === 0 ? 'available' : 'booked'
      });
    }
    
    if (dateBookings.length === 0) return 'available';
    return 'booked';
  };

  const getDateColor = (date) => {
    const status = getDateStatus(date);
    switch (status) {
      case 'available': return '#4caf50'; // Green
      case 'booked': return '#f44336'; // Red
      case 'past': return '#9e9e9e'; // Gray for past dates
      default: return '#e0e0e0'; // Light gray for empty
    }
  };

  const getStatusDotColor = (date) => {
    const status = getDateStatus(date);
    switch (status) {
      case 'available': return '#4caf50'; // Green dot
      case 'booked': return '#f44336'; // Red dot
      case 'past': return '#9e9e9e'; // Gray dot for past dates
      default: return 'transparent'; // No dot for empty
    }
  };

  const handleDateClick = (date) => {
    if (!date) return;
    
    // Only prevent selection of past dates (not including today)
    if (isPastDate(date)) {
      setSnackbar({
        open: true,
        message: 'Cannot book past dates. Please select today or a future date.',
        severity: 'error'
      });
      return;
    }
    
    // Allow selection of today and future dates
    setSelectedDate(date);
    
    // Fix timezone issue: use local date formatting instead of toISOString()
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    console.log('Date click:', {
      originalDate: date,
      formattedDate: dateString,
      toISOString: date.toISOString().split('T')[0]
    });
    
    setBookingForm(prev => ({
      ...prev,
      date: dateString
    }));
    setConflictCheck(null); // Clear any existing conflict check when selecting a new date
    setBookingDialogOpen(true);
  };

  const checkConflict = (formData) => {
    const { resource, date, startTime, endTime } = formData;
    
    // Check if date is in the past (not including today)
    if (date && isPastDate(date)) {
      return {
        hasConflict: true,
        message: 'Cannot book past dates. Please select today or a future date.'
      };
    }
    
    // Validate time range
    if (startTime && endTime) {
      const start = new Date(`2000-01-01 ${startTime}`);
      const end = new Date(`2000-01-01 ${endTime}`);
      if (start >= end) {
        return {
          hasConflict: true,
          message: 'End time must be after start time.'
        };
      }
    }
    
    // Check for conflicting bookings (exclude rejected bookings)
    const conflictingBookings = bookings.filter(booking => 
      booking.resource === resource && 
      booking.date === date && 
      booking.status !== 'rejected'
    );

    // Check for time overlap with existing bookings
    for (const booking of conflictingBookings) {
      const bookingStart = booking.startTime || booking.time; // Support both old and new format
      const bookingEnd = booking.endTime || booking.time;
      
      // Convert times to comparable format
      const newStart = new Date(`2000-01-01 ${startTime}`);
      const newEnd = new Date(`2000-01-01 ${endTime}`);
      const existingStart = new Date(`2000-01-01 ${bookingStart}`);
      const existingEnd = new Date(`2000-01-01 ${bookingEnd}`);
      
      // Check for time overlap
      if ((newStart < existingEnd && newEnd > existingStart)) {
        const statusText = booking.status === 'pending' ? 'pending approval' : 'approved';
        return {
          hasConflict: true,
          message: `Conflict detected: ${resource} is already ${statusText} by ${booking.department} on ${new Date(date).toLocaleDateString()} from ${bookingStart} to ${bookingEnd}. Please choose another time slot.`
        };
      }
    }

    // Check if there are any rejected bookings for this slot (for informational purposes)
    const rejectedBookings = bookings.filter(booking => 
      booking.resource === resource && 
      booking.date === date && 
      booking.status === 'rejected'
    );

    let message = `This time slot (${startTime} - ${endTime}) is available. Submit your booking request for admin approval.`;
    if (rejectedBookings.length > 0) {
      message += ' (Note: This slot was previously rejected and is now available again.)';
    }

    return {
      hasConflict: false,
      message: message
    };
  };

  const handleFormChange = (field, value) => {
    const updatedForm = { ...bookingForm, [field]: value };
    setBookingForm(updatedForm);
    
    // Clear any existing conflict check when form changes
    setConflictCheck(null);
  };

  const handleSubmitBooking = async () => {
    try {
      console.log('Starting booking submission...', { bookingForm, currentUser });
      
      // Basic validation - only check if date is in the past (not including today)
      if (isPastDate(bookingForm.date)) {
        setSnackbar({
          open: true,
          message: 'Cannot book past dates. Please select today or a future date.',
          severity: 'error'
        });
        return;
      }

      // Validate required fields
      const teacherName = bookingForm.teacherName || userProfile?.fullName || userProfile?.name || currentUser?.displayName || currentUser?.email;
      if (!teacherName || !bookingForm.department || !bookingForm.activity || 
          !bookingForm.resource || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime ||
          !bookingForm.course || !bookingForm.year || !bookingForm.section) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields.',
          severity: 'error'
        });
        return;
      }

      // Validate user authentication
      if (!currentUser || !currentUser.uid) {
        setSnackbar({
          open: true,
          message: 'User not authenticated. Please log in again.',
          severity: 'error'
        });
        return;
      }

      const bookingData = {
        teacherName: teacherName,
        department: bookingForm.department,
        activity: bookingForm.activity,
        resource: bookingForm.resource,
        date: bookingForm.date,
        startTime: bookingForm.startTime,
        endTime: bookingForm.endTime,
        time: `${bookingForm.startTime} - ${bookingForm.endTime}`, // Keep for backward compatibility
        notes: bookingForm.notes || '',
        course: bookingForm.course,
        year: bookingForm.year,
        section: bookingForm.section,
        teacherId: currentUser.uid,
        teacherEmail: currentUser.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        updatedAt: new Date().toISOString()
      };

      console.log('Submitting booking data:', bookingData);
      const bookingRef = await addDoc(collection(db, 'activity_bookings'), bookingData);
      console.log('Booking submitted successfully!', bookingRef.id);

      // Create notification for admin
      try {
        await addDoc(collection(db, 'notifications'), {
          title: 'New Activity Booking Request',
          message: `${teacherName} from ${bookingForm.department} has requested to book ${bookingForm.resource} for ${bookingForm.activity} on ${new Date(bookingForm.date).toLocaleDateString()} at ${bookingForm.time}.`,
          type: 'activity_booking',
          senderId: currentUser.uid,
          senderName: teacherName,
          senderRole: 'Teacher',
          recipientRole: 'Admin',
          bookingId: bookingRef.id,
          status: 'pending',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'medium'
        });
        console.log('Notification created for admin');
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Don't fail the booking if notification fails
      }
      
      setSnackbar({
        open: true,
        message: 'Booking request submitted successfully!',
        severity: 'success'
      });
      
      setBookingDialogOpen(false);
      setBookingForm({
        teacherName: userProfile?.fullName || userProfile?.name || '',
        department: userProfile?.department || '',
        activity: '',
        resource: '',
        date: '',
        startTime: '',
        endTime: '',
        notes: '',
        course: '',
        year: '',
        section: ''
      });
      setConflictCheck(null);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSnackbar({
        open: true,
        message: 'Error submitting booking request',
        severity: 'error'
      });
    }
  };

  const handleDeleteBooking = (booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteBooking = async () => {
    try {
      await deleteDoc(doc(db, 'activity_bookings', bookingToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Booking request deleted successfully!',
        severity: 'success'
      });
      
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    } catch (error) {
      console.error('Error deleting booking:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting booking request',
        severity: 'error'
      });
    }
  };

  const cancelDeleteBooking = () => {
    setDeleteDialogOpen(false);
    setBookingToDelete(null);
  };

  const handleRefreshBookings = async () => {
    setRefreshing(true);
    try {
      // Force a refresh by re-querying the bookings
      const bookingsQuery = query(
        collection(db, 'activity_bookings'),
        orderBy('date', 'asc')
      );
      
      const snapshot = await getDocs(bookingsQuery);
      const bookingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setBookings(bookingsData);
      setSnackbar({
        open: true,
        message: 'Bookings refreshed successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error refreshing bookings:', error);
      setSnackbar({
        open: true,
        message: 'Error refreshing bookings',
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Warning sx={{ fontSize: 14, color: '#ff9800' }} />;
      case 'approved': return <CheckCircle sx={{ fontSize: 14, color: '#4caf50' }} />;
      case 'rejected': return <Cancel sx={{ fontSize: 14, color: '#f44336' }} />;
      default: return <Event sx={{ fontSize: 14, color: '#9e9e9e' }} />;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const resourceMatch = !filterResource || booking.resource === filterResource;
    const departmentMatch = !filterDepartment || booking.department === filterDepartment;
    const searchMatch = !searchQuery || 
      booking.activity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return resourceMatch && departmentMatch && searchMatch;
  });

  const myBookings = filteredBookings.filter(booking => booking.teacherId === currentUser?.uid);

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getBookingTooltip = (date) => {
    if (isPastDate(date)) {
      return 'Past date - Cannot book';
    }
    
    const dateStatus = getDateStatus(date);
    if (dateStatus === 'available') {
      return 'Available - Click to book';
    }
    
    if (dateStatus === 'booked') {
      const dateBookings = getBookingsForDate(date);
      return `Booked - ${dateBookings.map(booking => 
        `${booking.activity} - ${booking.department} (${booking.time})`
      ).join(', ')} - Click to book anyway`;
    }
    
    return 'Click to book';
  };

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 }, minHeight: '100vh' }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 3, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
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
          Activities
        </Typography>
      </Box>
      

      {/* Main Content with proper spacing */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={3} justifyContent="center">
          {/* Calendar Section */}
          <Grid item xs={12} lg={10} xl={8}>
            <Paper 
              onClick={() => console.log('Calendar clicked')}
              sx={{ 
                mb: 3,
                p: 3,
                bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
                border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
                borderLeft: '4px solid #800000',
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
              }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 2,
                bgcolor: theme.palette.mode === 'dark' ? '#333333' : '#f5f5f5',
                p: 1.5,
                borderRadius: 1
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                    fontWeight: 600,
                    fontSize: '1.1rem'
                  }}
                >
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Typography>
                <Box>
                  <IconButton onClick={() => navigateMonth(-1)} size="small">
                    <Typography variant="body1">‹</Typography>
                  </IconButton>
                  <IconButton onClick={() => navigateMonth(1)} size="small">
                    <Typography variant="body1">›</Typography>
                  </IconButton>
                </Box>
              </Box>

              {/* Clean Calendar Grid */}
              <Box
                sx={{
                  border: '1px solid #e0e0e0',
                  borderTop: '1px solid #e0e0e0',
                  borderLeft: '1px solid #e0e0e0',
                  backgroundColor: 'white'
                }}
              >
                {/* Day Headers Row */}
                <Box sx={{ display: 'flex' }}>
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <Box
                      key={day}
                      sx={{
                        flex: 1,
                        borderRight: '1px solid #e0e0e0',
                        borderBottom: '1px solid #e0e0e0',
                        minHeight: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#fafafa'
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          color: '#333',
                          fontSize: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {day}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Calendar Days Grid */}
                <Box>
                  {Array.from({ length: 6 }, (_, weekIndex) => (
                    <Box key={weekIndex} sx={{ display: 'flex' }}>
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        const cellIndex = weekIndex * 7 + dayIndex;
                        const date = getDaysInMonth(currentDate)[cellIndex];
                        
                        return (
                          <Box
                            key={dayIndex}
                            sx={{
                              flex: 1,
                              minHeight: 50,
                              borderRight: '1px solid #e0e0e0',
                              borderBottom: '1px solid #e0e0e0',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              padding: '8px',
                              cursor: date && !isPastDate(date) ? 'pointer' : 'default',
                              backgroundColor: date ? (getDateStatus(date) === 'available' ? '#f8fff8' : getDateStatus(date) === 'booked' ? '#ffeaea' : 'white') : 'transparent',
                              '&:hover': {
                                backgroundColor: date && !isPastDate(date) ? '#f5f5f5' : 'transparent'
                              }
                            }}
                            onClick={() => date && handleDateClick(date)}
                          >
                            {date && (
                              <Tooltip title={getBookingTooltip(date)} arrow>
                                <Box sx={{ position: 'relative', width: '100%' }}>
                                  {/* Date Number */}
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: isPastDate(date) ? '#999' : '#333',
                                      fontWeight: 400,
                                      fontSize: '14px',
                                      lineHeight: 1
                                    }}
                                  >
                                    {date.getDate()}
                                  </Typography>
                                  
                                  {/* Status Dot */}
                                  {getStatusDotColor(date) !== 'transparent' && (
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: getStatusDotColor(date)
                                      }}
                                    />
                                  )}
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 3, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#4caf50', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Available</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#f44336', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Booked</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, backgroundColor: '#9e9e9e', borderRadius: '50%' }} />
                  <Typography variant="caption" sx={{ color: '#666', fontSize: '11px' }}>Past Date</Typography>
                </Box>
              </Box>
          </Paper>
        </Grid>

      </Grid>

        {/* My Bookings Table */}
        <Paper 
          onClick={() => console.log('My Bookings Table clicked')}
          sx={{ 
            mt: 3,
            p: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f9fa', 
            border: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e9ecef',
            borderLeft: '4px solid #800000',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4,
        },
      }}>
          <Typography variant="h6" sx={{ 
          color: theme.palette.mode === 'dark' ? '#ffffff' : 'black',
          fontWeight: 600,
          mb: 2
        }} gutterBottom>
            Activity Booking History
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Activity</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Resource</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Date</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Time Range</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Status</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Notes</TableCell>
                  <TableCell sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                    fontWeight: 600
                  }}>Actions</TableCell>
                </TableRow>
                {/* Search Bar Row */}
                <TableRow>
                  <TableCell colSpan={7} sx={{ 
                    padding: '12px 16px',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                  }}>
                    <TextField
                      placeholder="Search bookings by activity, resource, department, or notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                      sx={{
                        width: '100%',
                        maxWidth: '500px',
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#ffffff',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: '0.9rem',
                        }
                      }}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {myBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                    }}>
                      No booking requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  myBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                      }}>{booking.activity}</TableCell>
                      <TableCell sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                      }}>{booking.resource}</TableCell>
                      <TableCell sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                      }}>{new Date(booking.date).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                      }}>
                        {booking.startTime && booking.endTime 
                          ? `${booking.startTime} - ${booking.endTime}`
                          : booking.time || 'N/A'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(booking.status)}
                          label={booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          sx={{
                            backgroundColor: 'transparent',
                            color: booking.status === 'pending' ? '#ff9800' :
                                   booking.status === 'approved' ? '#4caf50' :
                                   booking.status === 'rejected' ? '#f44336' : '#9e9e9e',
                            border: 'none',
                            '& .MuiChip-label': {
                              color: booking.status === 'pending' ? '#ff9800' :
                                     booking.status === 'approved' ? '#4caf50' :
                                     booking.status === 'rejected' ? '#f44336' : '#9e9e9e'
                            },
                            '& .MuiChip-icon': {
                              color: booking.status === 'pending' ? '#ff9800' :
                                     booking.status === 'approved' ? '#4caf50' :
                                     booking.status === 'rejected' ? '#f44336' : '#9e9e9e'
                            }
                          }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
                      }}>{booking.notes || '-'}</TableCell>
                      <TableCell>
                        <Tooltip title="Delete booking request">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteBooking(booking)}
                            sx={{
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666',
                              '&:hover': {
                                color: '#f44336', // Red on hover
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)'
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Booking Dialog */}
      <Dialog open={bookingDialogOpen} onClose={() => setBookingDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
          Book Facility
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Department</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.department}
                  onChange={(e) => handleFormChange('department', e.target.value)}
                  label="Department"
                >
                  {departments.map(dept => (
                    <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Activity/Event"
                value={bookingForm.activity}
                onChange={(e) => handleFormChange('activity', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Resource/Place</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.resource}
                  onChange={(e) => handleFormChange('resource', e.target.value)}
                  label="Resource/Place"
                >
                  {resources.map(resource => (
                    <MenuItem key={resource} value={resource}>{resource}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Date"
                type="date"
                value={bookingForm.date}
                onChange={(e) => handleFormChange('date', e.target.value)}
                InputLabelProps={{ shrink: true, sx: { fontSize: '0.8rem' } }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Start Time</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.startTime}
                  onChange={(e) => handleFormChange('startTime', e.target.value)}
                  label="Start Time"
                >
                  {timeSlots.map(time => (
                    <MenuItem key={time} value={time}>{time}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>End Time</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.endTime}
                  onChange={(e) => handleFormChange('endTime', e.target.value)}
                  label="End Time"
                >
                  {timeSlots.map(time => (
                    <MenuItem key={time} value={time}>{time}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes"
                multiline
                rows={2}
                value={bookingForm.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Additional details about your booking..."
              />
            </Grid>
            
            {/* Course, Year, and Section Selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Target Students (Select course, year, and section to specify which students will see this activity)
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Course</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.course}
                  onChange={(e) => handleFormChange('course', e.target.value)}
                  label="Course"
                >
                  {courses.map(course => (
                    <MenuItem key={course} value={course}>{course}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Year Level</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.year}
                  onChange={(e) => handleFormChange('year', e.target.value)}
                  label="Year Level"
                >
                  {years.map(year => (
                    <MenuItem key={year} value={year}>{year}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth required size="small">
                <InputLabel sx={{ fontSize: '0.8rem' }}>Section</InputLabel>
                <Select
                  size="small"
                  value={bookingForm.section}
                  onChange={(e) => handleFormChange('section', e.target.value)}
                  label="Section"
                >
                  {sections.map(section => (
                    <MenuItem key={section} value={section}>{section}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setConflictCheck(checkConflict(bookingForm))}
                disabled={!bookingForm.resource || !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime}
                sx={{ 
                  mt: 1,
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
                Check Availability
              </Button>
              {conflictCheck && (
                <Alert 
                  severity={conflictCheck.hasConflict ? 'error' : 'success'}
                  sx={{ mt: 1 }}
                >
                  {conflictCheck.message}
                </Alert>
              )}
            </Grid>
          </Grid>

        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBookingDialogOpen(false)}
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
            Cancel
          </Button>
          <Button
            onClick={handleSubmitBooking}
            variant="outlined"
            disabled={!bookingForm.department || 
                     !bookingForm.activity || !bookingForm.resource || 
                     !bookingForm.date || !bookingForm.startTime || !bookingForm.endTime ||
                     (conflictCheck && conflictCheck.hasConflict)}
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
            Submit Request
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={cancelDeleteBooking} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Warning sx={{ mr: 1, verticalAlign: 'middle', color: 'error.main' }} />
          Delete Booking Request
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to delete this booking request?
          </Typography>
          {bookingToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Booking Details:
              </Typography>
              <Typography variant="body2">
                <strong>Activity:</strong> {bookingToDelete.activity}
              </Typography>
              <Typography variant="body2">
                <strong>Resource:</strong> {bookingToDelete.resource}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {new Date(bookingToDelete.date).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {bookingToDelete.time}
              </Typography>
            </Box>
          )}
          <Alert severity="warning" sx={{ mt: 2 }}>
            This action cannot be undone. The booking request will be permanently deleted.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteBooking}>Cancel</Button>
          <Button
            onClick={confirmDeleteBooking}
            variant="contained"
            color="error"
          >
            Delete Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
