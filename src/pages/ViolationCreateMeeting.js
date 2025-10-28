import React, { useState, useEffect } from "react";
import { Typography, Box, Paper, TextField, Button, Grid, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip, Snackbar, Alert, Card, CardContent, CardHeader, Divider, useTheme, Autocomplete } from "@mui/material";
import { Chip } from "@mui/material";
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MenuItem } from "@mui/material";
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { logActivity } from '../firebase';
import emailjs from 'emailjs-com';

const EMAILJS_SERVICE_ID = 'service_7pgle82';
const EMAILJS_TEMPLATE_ID = 'template_f5q7j6q';
const EMAILJS_USER_ID = 'L77JuF4PF3ZtGkwHm';

export default function ViolationCreateMeeting() {
  const theme = useTheme();
  const [meetings, setMeetings] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [openMeetingModal, setOpenMeetingModal] = useState(false);
  const [openMeetingsModal, setOpenMeetingsModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [meetingForm, setMeetingForm] = useState({ 
    studentName: '', 
    location: '', 
    purpose: '', 
    date: '', 
    time: '', 
    description: '',
    teacherName: ''
  });
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);
  const [meetingSnackbar, setMeetingSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [meetingFilter, setMeetingFilter] = useState('all'); // 'all', 'scheduled', 'pending', 'completed'

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const snap = await getDocs(collection(db, "students"));
        const studentsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort students by creation date (newest first)
        const sortedStudents = studentsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setStudents(sortedStudents);
      } catch (e) {
        setStudents([]);
      }
    };

    const fetchTeachers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const teachersData = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === 'Teacher')
          .sort((a, b) => (a.fullName || a.displayName || '').localeCompare(b.fullName || b.displayName || ''));
        
        setTeachers(teachersData);
      } catch (e) {
        setTeachers([]);
      }
    };

    fetchStudents();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (openMeetingsModal) {
      const fetchMeetings = async () => {
        try {
          const snap = await getDocs(collection(db, 'meetings'));
          setMeetings(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
          setMeetings([]);
        }
      };
      fetchMeetings();
    }
  }, [openMeetingsModal, meetingSnackbar]);

  const handleMeetingFormChange = (e) => {
    const { name, value } = e.target;
    setMeetingForm(f => ({ ...f, [name]: value }));
  };


  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    setMeetingSubmitting(true);
    
    console.log('Starting meeting creation...');
    console.log('Meeting form data:', meetingForm);
    console.log('Available teachers:', teachers.length);
    console.log('Available students:', students.length);
    
    try {
      // Validate required fields
      if (!meetingForm.studentName) {
        throw new Error('Student name is required');
      }
      if (!meetingForm.purpose) {
        throw new Error('Meeting purpose is required');
      }
      if (!meetingForm.location) {
        throw new Error('Meeting location is required');
      }
      if (!meetingForm.date) {
        throw new Error('Meeting date is required');
      }
      if (!meetingForm.time) {
        throw new Error('Meeting time is required');
      }

      // Prepare participants array
      const participants = [];
      const student = students.find(s => `${s.firstName} ${s.lastName}` === meetingForm.studentName);
      console.log('Found student:', student);
      
      if (student && student.email) {
        participants.push(student.email);
      }
      
      // Add teacher to participants if specified
      if (meetingForm.teacherName) {
        const teacher = teachers.find(t => 
          t.fullName === meetingForm.teacherName || 
          t.displayName === meetingForm.teacherName || 
          t.email === meetingForm.teacherName
        );
        console.log('Found teacher:', teacher);
        
        if (teacher) {
          // Add both email and UID to participants for better detection
          if (teacher.email) {
            participants.push(teacher.email);
          }
          if (teacher.uid) {
            participants.push(teacher.uid);
          }
        }
      }

      const meetingData = {
        studentName: meetingForm.studentName || '',
        location: meetingForm.location || '',
        purpose: meetingForm.purpose || '',
        date: meetingForm.date || '',
        time: meetingForm.time || '',
        description: meetingForm.description || '',
        teacherName: meetingForm.teacherName || '',
        participants: participants,
        createdAt: new Date().toISOString(),
        type: 'meeting',
        status: 'Scheduled' // Set default status
      };

      // Only add teacher fields if a teacher is selected
      if (meetingForm.teacherName) {
        const selectedTeacher = teachers.find(t => 
          t.fullName === meetingForm.teacherName || 
          t.displayName === meetingForm.teacherName || 
          t.email === meetingForm.teacherName
        );
        
        if (selectedTeacher) {
          meetingData.teacherUid = selectedTeacher.uid;
          meetingData.teacherEmail = selectedTeacher.email || '';
        }
      }

      console.log('Meeting data to be saved:', meetingData);

      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      console.log('Meeting created successfully with ID:', docRef.id);
      
      // Send email notification to student
      if (student && student.email) {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: student.email,
              subject: `Meeting Scheduled: ${meetingForm.purpose}`,
              message: `Dear ${student.firstName} ${student.lastName},\n\nYou have a meeting scheduled.\n\nPurpose: ${meetingForm.purpose}\n${meetingForm.teacherName ? `Teacher: ${meetingForm.teacherName}\n` : ''}Location: ${meetingForm.location}\nDate: ${meetingForm.date}\nTime: ${meetingForm.time}\nDescription: ${meetingForm.description || ''}\n\nPlease be on time.\n\nThank you.`,
            },
            EMAILJS_USER_ID
          );
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }


      // Send notification to teacher if specified
      if (meetingForm.teacherName) {
        const teacher = teachers.find(t => 
          t.fullName === meetingForm.teacherName || 
          t.displayName === meetingForm.teacherName || 
          t.email === meetingForm.teacherName
        );
        if (teacher && teacher.email) {
          try {
            await addDoc(collection(db, 'notifications'), {
              recipientEmail: teacher.email,
              title: `New Meeting Assignment`,
              message: `You have been assigned to a meeting with ${meetingForm.studentName} on ${meetingForm.date} at ${meetingForm.time}.`,
              type: 'meeting',
              read: false,
              createdAt: new Date().toISOString(),
              meetingId: docRef.id
            });
          } catch (notificationError) {
            console.error("Teacher notification failed:", notificationError);
          }
        }
      }
      
      await logActivity({ message: `Meeting created for student: ${meetingForm.studentName}${meetingForm.teacherName ? ` with teacher: ${meetingForm.teacherName}` : ''}`, type: 'create_meeting' });
      
      // Refresh meetings data to update stats cards
      const meetingsSnap = await getDocs(collection(db, 'meetings'));
      setMeetings(meetingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      setMeetingSnackbar({ open: true, message: 'Meeting created successfully! Student and teacher have been notified.', severity: 'success' });
      setOpenMeetingModal(false);
      setMeetingForm({ 
        studentName: '', 
        location: '', 
        purpose: '', 
        date: '', 
        time: '', 
        description: '',
        teacherName: ''
      });
    } catch (e) {
      console.error('Meeting creation failed:', e);
      const errorMessage = e.message || 'Failed to create meeting. Please try again.';
      setMeetingSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
    setMeetingSubmitting(false);
  };

  const handleDeleteMeeting = async (id) => {
    try {
      await deleteDoc(doc(db, 'meetings', id));
      setMeetings(meetings => meetings.filter(m => m.id !== id));
      setMeetingSnackbar({ open: true, message: 'Meeting deleted.', severity: 'success' });
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to delete meeting.', severity: 'error' });
    }
  };

  const handleEditMeetingSave = async (updated) => {
    try {
      await updateDoc(doc(db, 'meetings', updated.id), updated);
      setMeetings(meetings => meetings.map(m => m.id === updated.id ? updated : m));
      setMeetingSnackbar({ open: true, message: 'Meeting updated.', severity: 'success' });
      setEditMeeting(null);
    } catch (e) {
      setMeetingSnackbar({ open: true, message: 'Failed to update meeting.', severity: 'error' });
    }
  };

  // Calculate meeting statistics
  const meetingStats = {
    total: meetings.filter(m => m.type === 'meeting').length,
    scheduled: meetings.filter(m => m.type === 'meeting' && m.status === 'Scheduled').length,
    completed: meetings.filter(m => m.type === 'meeting' && m.status === 'Completed').length
  };

  // Filter meetings based on selected filter
  const filteredMeetings = meetings.filter(m => {
    if (m.type !== 'meeting') return false;
    if (meetingFilter === 'all') return true;
    if (meetingFilter === 'scheduled') return m.status === 'Scheduled';
    if (meetingFilter === 'completed') return m.status === 'Completed';
    return true;
  });

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Create Meeting
      </Typography>
      
      {/* Meeting Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              boxShadow: 2, 
              borderLeft: '4px solid #800000',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              },
              bgcolor: meetingFilter === 'all' ? '#f5f5f5' : 'transparent'
            }}
            onClick={() => {
              setMeetingFilter('all');
              setOpenMeetingsModal(true);
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {meetingStats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Total Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              boxShadow: 2, 
              borderLeft: '4px solid #800000',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              },
              bgcolor: meetingFilter === 'scheduled' ? '#f5f5f5' : 'transparent'
            }}
            onClick={() => {
              setMeetingFilter('scheduled');
              setOpenMeetingsModal(true);
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {meetingStats.scheduled}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Scheduled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <Card 
            sx={{ 
              boxShadow: 2, 
              borderLeft: '4px solid #800000',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              },
              bgcolor: meetingFilter === 'completed' ? '#f5f5f5' : 'transparent'
            }}
            onClick={() => {
              setMeetingFilter('completed');
              setOpenMeetingsModal(true);
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {meetingStats.completed}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Create Meeting Form */}
      <Paper sx={{ p: { xs: 1, sm: 3 }, mb: 3, maxWidth: 1200, mx: 'auto', borderRadius: 3, boxShadow: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Schedule New Meeting</Typography>
        <Divider sx={{ mb: 2 }} />
        <form onSubmit={handleMeetingSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={students}
                getOptionLabel={(option) => `${option.firstName} ${option.lastName}`}
                value={selectedStudent}
                onChange={(event, newValue) => {
                  setSelectedStudent(newValue);
                  setMeetingForm(prev => ({
                    ...prev,
                    studentName: newValue ? `${newValue.firstName} ${newValue.lastName}` : ''
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Student Name"
                    required
                    helperText="Type to search for a student"
                    placeholder="Start typing student name..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    {option.firstName} {option.lastName} ({option.id})
                  </Box>
                )}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue || inputValue.length < 1) {
                    return []; // Don't show any options when not typing
                  }
                  const filtered = options.filter(option => {
                    const fullName = `${option.firstName} ${option.lastName}`.toLowerCase();
                    const studentId = option.id.toLowerCase();
                    const searchTerm = inputValue.toLowerCase();
                    return fullName.includes(searchTerm) || studentId.includes(searchTerm);
                  });
                  return filtered.slice(0, 4); // Limit to 4 results
                }}
                noOptionsText="No students found"
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                openOnFocus={false}
                disablePortal={false}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={teachers}
                getOptionLabel={(option) => `${option.fullName || option.displayName || option.email} (${option.email})`}
                value={teachers.find(t => t.fullName === meetingForm.teacherName) || null}
                onChange={(event, newValue) => {
                  setMeetingForm(prev => ({
                    ...prev,
                    teacherName: newValue ? newValue.fullName || newValue.displayName || newValue.email : ''
                  }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Teacher Name (Optional)"
                    name="teacherName"
                    fullWidth
                    helperText="Type to search for a teacher"
                    placeholder="Start typing teacher name..."
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {option.fullName || option.displayName || option.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.email}
                      </Typography>
                    </Box>
                  </Box>
                )}
                filterOptions={(options, { inputValue }) => {
                  if (!inputValue || inputValue.length < 2) {
                    return []; // Don't show any options when typing less than 2 characters
                  }
                  
                  const searchTerm = inputValue.toLowerCase().trim();
                  const filtered = options.filter(option => {
                    const fullName = (option.fullName || option.displayName || '').toLowerCase();
                    const email = (option.email || '').toLowerCase();
                    
                    // Exact email match (highest priority)
                    if (email === searchTerm) return true;
                    
                    // Email starts with search term
                    if (email.startsWith(searchTerm)) return true;
                    
                    // Name starts with search term
                    if (fullName.startsWith(searchTerm)) return true;
                    
                    // Name contains search term as whole word
                    if (fullName.includes(` ${searchTerm}`)) return true;
                    
                    return false;
                  });
                  
                  // Sort results: exact email matches first, then email starts with, then name matches
                  return filtered.sort((a, b) => {
                    const aEmail = (a.email || '').toLowerCase();
                    const bEmail = (b.email || '').toLowerCase();
                    const aName = (a.fullName || a.displayName || '').toLowerCase();
                    const bName = (b.fullName || b.displayName || '').toLowerCase();
                    
                    // Exact email match gets highest priority
                    if (aEmail === searchTerm && bEmail !== searchTerm) return -1;
                    if (bEmail === searchTerm && aEmail !== searchTerm) return 1;
                    
                    // Email starts with gets second priority
                    if (aEmail.startsWith(searchTerm) && !bEmail.startsWith(searchTerm)) return -1;
                    if (bEmail.startsWith(searchTerm) && !aEmail.startsWith(searchTerm)) return 1;
                    
                    // Name starts with gets third priority
                    if (aName.startsWith(searchTerm) && !bName.startsWith(searchTerm)) return -1;
                    if (bName.startsWith(searchTerm) && !aName.startsWith(searchTerm)) return 1;
                    
                    return 0;
                  }).slice(0, 5);
                }}
                noOptionsText="No teachers found"
                isOptionEqualToValue={(option, value) => option.id === value?.id}
                openOnFocus={false}
                disablePortal={false}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Purpose" 
                name="purpose" 
                value={meetingForm.purpose} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Purpose of the meeting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Location" 
                name="location" 
                value={meetingForm.location} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                required 
                helperText="Where will the meeting take place?"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Date" 
                name="date" 
                type="date" 
                value={meetingForm.date} 
                onChange={handleMeetingFormChange} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                required 
                helperText="Date of the meeting"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField 
                label="Meeting Time" 
                name="time" 
                type="time" 
                value={meetingForm.time} 
                onChange={handleMeetingFormChange} 
                InputLabelProps={{ shrink: true }} 
                fullWidth 
                required 
                helperText="Time of the meeting"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="Description" 
                name="description" 
                value={meetingForm.description} 
                onChange={handleMeetingFormChange} 
                fullWidth 
                multiline 
                minRows={3} 
                helperText="Detailed description of what will be discussed"
              />
            </Grid>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                type="submit" 
                variant="outlined" 
                size="large"
                disabled={meetingSubmitting || !meetingForm.studentName || !meetingForm.purpose || !meetingForm.date}
                sx={{ 
                  minWidth: 200,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                  '&:hover': { 
                    bgcolor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  },
                  '&:disabled': { 
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#cccccc', 
                    color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : '#666666', 
                    borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : '#999999' 
                  }
                }}
              >
                {meetingSubmitting ? "Creating..." : "Create Meeting"}
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => setOpenMeetingsModal(true)} 
                size="large"
                sx={{ 
                  minWidth: 200,
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : '#ffffff',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : '#000000',
                  '&:hover': { 
                    bgcolor: '#800000',
                    color: '#ffffff',
                    borderColor: '#800000'
                  }
                }}
              >
                View All Meetings
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* View Meetings Modal */}
      <Dialog 
        open={openMeetingsModal} 
        onClose={() => setOpenMeetingsModal(false)} 
        maxWidth="lg" 
        fullWidth
        disableEscapeKeyDown
        disableBackdropClick
      >
        <DialogTitle>
          <Typography variant="h6">
            Meetings {meetingFilter !== 'all' && `(${meetingFilter.charAt(0).toUpperCase() + meetingFilter.slice(1)})`}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Purpose</TableCell>
                  <TableCell>Teacher</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMeetings.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center">No meetings found.</TableCell></TableRow>
                ) : filteredMeetings.map((m, idx) => (
                  <TableRow key={m.id || idx}>
                    <TableCell>{m.date}</TableCell>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>{m.studentName}</TableCell>
                    <TableCell>{m.location}</TableCell>
                    <TableCell>{m.purpose}</TableCell>
                    <TableCell>{m.teacherName || 'Not assigned'}</TableCell>
                    <TableCell>
                      <Chip
                        label={m.status || 'Scheduled'}
                        color={
                          m.status === 'Completed' ? 'success' :
                          m.status === 'Scheduled' ? 'info' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small" color="info" onClick={() => setEditMeeting(m)}>
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Meeting">
                        <IconButton size="small" color="warning" onClick={() => setEditMeeting(m)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Meeting">
                        <IconButton size="small" color="error" onClick={() => handleDeleteMeeting(m.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeetingsModal(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Meeting Modal */}
      <Dialog 
        open={!!editMeeting} 
        onClose={() => setEditMeeting(null)} 
        maxWidth="sm" 
        fullWidth
        disableEscapeKeyDown
        disableBackdropClick
      >
        <DialogTitle>Edit Meeting</DialogTitle>
        <DialogContent>
          <TextField 
            label="Student Name" 
            value={editMeeting?.studentName || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, studentName: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField
            select
            label="Teacher Name (Optional)"
            value={editMeeting?.teacherName || ''}
            onChange={e => setEditMeeting({ ...editMeeting, teacherName: e.target.value })}
            fullWidth
            sx={{ mb: 1 }}
          >
            {teachers.map(t => (
              <MenuItem key={t.id} value={t.fullName || t.displayName || t.email}>
                {t.fullName || t.displayName || t.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField 
            label="Purpose" 
            value={editMeeting?.purpose || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, purpose: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField 
            label="Location" 
            value={editMeeting?.location || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, location: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
          />
          <TextField 
            label="Date" 
            type="date" 
            value={editMeeting?.date || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, date: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            label="Time" 
            type="time" 
            value={editMeeting?.time || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, time: e.target.value })} 
            fullWidth 
            sx={{ mb: 1 }} 
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            label="Description" 
            value={editMeeting?.description || ''} 
            onChange={e => setEditMeeting({ ...editMeeting, description: e.target.value })} 
            fullWidth 
            multiline 
            minRows={3} 
            sx={{ mb: 1 }} 
          />
          <TextField
            select
            label="Status"
            value={editMeeting?.status || 'Scheduled'}
            onChange={e => setEditMeeting({ ...editMeeting, status: e.target.value })}
            fullWidth
            sx={{ mb: 1 }}
          >
            <MenuItem value="Scheduled">Scheduled</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMeeting(null)}>Cancel</Button>
          <Button onClick={() => handleEditMeetingSave(editMeeting)} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar 
        open={meetingSnackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}
      >
        <Alert severity={meetingSnackbar.severity} onClose={() => setMeetingSnackbar({ ...meetingSnackbar, open: false })}>
          {meetingSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

