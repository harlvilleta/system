import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  Avatar, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  useTheme
} from '@mui/material';
import { 
  Schedule, 
  Event, 
  LocationOn, 
  People, 
  AccessTime,
  CalendarToday,
  Visibility,
  Close
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function TeacherSchedule() {
  const theme = useTheme();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
  const [openStatsModal, setOpenStatsModal] = useState(false);
  const [statsModalType, setStatsModalType] = useState('');
  const [statsModalData, setStatsModalData] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        fetchTeacherMeetings(user);
      }
    });

    return unsubscribe;
  }, []);

  const fetchTeacherMeetings = (user) => {
    const teacherEmail = user?.email;
    const teacherUid = user?.uid;
    if (!teacherEmail && !teacherUid) return;

    try {
      // Listen to meetings where the teacher is a participant (by email or uid)
      const participantsValues = [teacherEmail, teacherUid].filter(Boolean);
      const qParticipants = query(
        collection(db, 'meetings'),
        where('participants', 'array-contains-any', participantsValues)
      );

      // Listen to meetings where the teacher is the organizer (by email or uid)
      const organizersValues = [teacherEmail, teacherUid].filter(Boolean);
      const qOrganizer = query(
        collection(db, 'meetings'),
        where('organizer', 'in', organizersValues)
      );

      const allDocsMap = new Map();

      const handleSnapshot = (snapshot) => {
        snapshot.docs.forEach(d => {
          allDocsMap.set(d.id, { id: d.id, ...d.data() });
        });
        const merged = Array.from(allDocsMap.values()).sort((a, b) => {
          const da = new Date(a.date || 0).getTime();
          const dbt = new Date(b.date || 0).getTime();
          return da - dbt;
        });
        setMeetings(merged);
        setLoading(false);
      };

      const unsubA = onSnapshot(qParticipants, handleSnapshot, (err) => {
        console.error('Error fetching participant meetings:', err);
        setError('Failed to load meetings');
        setLoading(false);
      });

      const unsubB = onSnapshot(qOrganizer, handleSnapshot, (err) => {
        console.error('Error fetching organizer meetings:', err);
        setError('Failed to load meetings');
        setLoading(false);
      });

      return () => { unsubA(); unsubB(); };
    } catch (error) {
      console.error('Error setting up meetings query:', error);
      setError('Failed to load meetings');
      setLoading(false);
    }
  };

  const getMeetingStatus = (meeting) => {
    const now = new Date();
    const meetingDate = new Date(meeting.date);
    
    if (meetingDate < now) {
      return { status: 'Past', color: 'default' };
    } else if (meetingDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
      return { status: 'Today', color: 'warning' };
    } else {
      return { status: 'Upcoming', color: 'success' };
    }
  };

  const formatMeetingTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setOpenMeetingDialog(true);
  };

  const handleCloseMeetingDialog = () => {
    setOpenMeetingDialog(false);
    setSelectedMeeting(null);
  };

  const handleOpenStatsModal = (type) => {
    let data = [];
    switch (type) {
      case 'total':
        data = meetings;
        break;
      case 'upcoming':
        data = upcomingMeetings;
        break;
      case 'today':
        data = meetings.filter(m => {
          const now = new Date();
          const meetingDate = new Date(m.date);
          return meetingDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && meetingDate > now;
        });
        break;
      case 'past':
        data = pastMeetings;
        break;
      default:
        data = meetings;
    }
    setStatsModalType(type);
    setStatsModalData(data);
    setOpenStatsModal(true);
  };

  const handleCloseStatsModal = () => {
    setOpenStatsModal(false);
    setStatsModalType('');
    setStatsModalData([]);
  };


  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const upcomingMeetings = meetings.filter(m => new Date(m.date) > new Date());
  const pastMeetings = meetings.filter(m => new Date(m.date) <= new Date());

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f6fa', 
      minHeight: '100vh',
      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }} gutterBottom>
          My Schedule
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View all meetings and events you're involved in
        </Typography>
      </Box>

      {/* Statistics Cards (match dashboard cards) */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2, boxShadow: 3, borderRadius: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s, background 0.2s', cursor: 'pointer',
            borderLeft: '4px solid #800000',
            '&:hover': { 
              boxShadow: 6, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
            }
          }}
          onClick={() => handleOpenStatsModal('total')}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {meetings.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary' }}>
                Total Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2, boxShadow: 3, borderRadius: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s, background 0.2s', cursor: 'pointer',
            borderLeft: '4px solid #800000',
            '&:hover': { 
              boxShadow: 6, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
            }
          }}
          onClick={() => handleOpenStatsModal('upcoming')}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {upcomingMeetings.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary' }}>
                Upcoming
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2, boxShadow: 3, borderRadius: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s, background 0.2s', cursor: 'pointer',
            borderLeft: '4px solid #800000',
            '&:hover': { 
              boxShadow: 6, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
            }
          }}
          onClick={() => handleOpenStatsModal('today')}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {meetings.filter(m => {
                  const now = new Date();
                  const meetingDate = new Date(m.date);
                  return meetingDate.getTime() - now.getTime() < 24 * 60 * 60 * 1000 && meetingDate > now;
                }).length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary' }}>
                Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            p: 2, boxShadow: 3, borderRadius: 2, 
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'box-shadow 0.2s, background 0.2s', cursor: 'pointer',
            borderLeft: '4px solid #800000',
            '&:hover': { 
              boxShadow: 6, 
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
            }
          }}
          onClick={() => handleOpenStatsModal('past')}>
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {pastMeetings.length}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : 'text.secondary' }}>
                Past
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight={600} sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436', 
            mb: 2 
          }}>
            Upcoming Meetings
          </Typography>
          <Grid container spacing={2}>
            {upcomingMeetings.map((meeting) => {
              const status = getMeetingStatus(meeting);
              return (
                <Grid item xs={12} md={6} key={meeting.id}>
                  <Card sx={{
                    boxShadow: 2,
                    borderRadius: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                    border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                    transition: 'box-shadow 0.2s, background 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '6px',
                      height: '100%',
                      background: 'linear-gradient(180deg, rgba(128,0,0,0.9), rgba(128,0,0,0.5))'
                    },
                    '&:hover': { 
                      boxShadow: 6, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" fontWeight={600} sx={{ 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436'
                        }}>
                          {meeting.title}
                        </Typography>
                        <Chip 
                          label={status.status} 
                          color={status.color} 
                          size="small" 
                          variant="outlined"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatMeetingTime(meeting.date)}
                        </Typography>
                      </Box>

                      {meeting.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.location}
                          </Typography>
                        </Box>
                      )}

                      {meeting.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {meeting.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <People sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            {meeting.participants?.length || 0} participants
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {meeting.organizer && (
                            <Chip 
                              label={`Organized by: ${meeting.organizer}`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          )}
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleViewMeeting(meeting)}
                            sx={{ ml: 1 }}
                          >
                            <Visibility />
                          </IconButton>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <Box>
          <Typography variant="h5" fontWeight={600} sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436', 
            mb: 2 
          }}>
            Past Meetings
          </Typography>
          <Paper sx={{ 
            maxHeight: 400, 
            overflow: 'auto',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: 2,
            boxShadow: theme.palette.mode === 'dark' ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}>
            <List>
              {pastMeetings.map((meeting, index) => (
                <React.Fragment key={meeting.id}>
                  <ListItem sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#9e9e9e' }}>
                        <Event />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={meeting.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatMeetingTime(meeting.date)}
                          </Typography>
                          {meeting.location && (
                            <Typography variant="body2" color="text.secondary">
                              Location: {meeting.location}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Chip label="Completed" color="default" size="small" />
                  </ListItem>
                  {index < pastMeetings.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Box>
      )}

      {/* No Meetings Message */}
      {meetings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Event sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No meetings scheduled
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You don't have any meetings or events scheduled at the moment.
          </Typography>
        </Box>
      )}

      {/* Meeting Details Dialog */}
      <Dialog 
        open={openMeetingDialog} 
        onClose={handleCloseMeetingDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Meeting Details</Typography>
            <IconButton onClick={handleCloseMeetingDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedMeeting && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h5" fontWeight={600} color="primary" gutterBottom>
                    {selectedMeeting.title}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccessTime sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Date & Time
                      </Typography>
                      <Typography variant="body1">
                        {formatMeetingTime(selectedMeeting.date)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {selectedMeeting.location || 'TBD'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <People sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Participants
                      </Typography>
                      <Typography variant="body1">
                        {selectedMeeting.participants?.length || 0} people
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Event sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Organizer
                      </Typography>
                      <Typography variant="body1">
                        {selectedMeeting.organizer || 'Unknown'}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedMeeting.description || 'No description provided'}
                    </Typography>
                  </Box>
                </Grid>

                {selectedMeeting.participants && selectedMeeting.participants.length > 0 && (
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Participant List
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {selectedMeeting.participants.map((participant, index) => (
                          <Chip 
                            key={index}
                            label={participant}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Box>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMeetingDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stats Modal */}
      <Dialog 
        open={openStatsModal} 
        onClose={handleCloseStatsModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {statsModalType === 'total' && 'All Meetings'}
              {statsModalType === 'upcoming' && 'Upcoming Meetings'}
              {statsModalType === 'today' && 'Today\'s Meetings'}
              {statsModalType === 'past' && 'Past Meetings'}
            </Typography>
            <IconButton onClick={handleCloseStatsModal}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {statsModalData.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No meetings found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {statsModalType === 'total' && 'You don\'t have any meetings scheduled.'}
                  {statsModalType === 'upcoming' && 'You don\'t have any upcoming meetings.'}
                  {statsModalType === 'today' && 'You don\'t have any meetings scheduled for today.'}
                  {statsModalType === 'past' && 'You don\'t have any past meetings.'}
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {statsModalData.map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  return (
                    <Grid item xs={12} md={6} key={meeting.id}>
                      <Card sx={{
                        boxShadow: 2,
                        borderRadius: 2,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                        transition: 'box-shadow 0.2s, background 0.2s',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '6px',
                          height: '100%',
                          background: 'linear-gradient(180deg, rgba(128,0,0,0.9), rgba(128,0,0,0.5))'
                        }
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                            <Typography variant="h6" fontWeight={600} sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436'
                            }}>
                              {meeting.title}
                            </Typography>
                            <Chip 
                              label={status.status} 
                              color={status.color} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              {formatMeetingTime(meeting.date)}
                            </Typography>
                          </Box>

                          {meeting.location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {meeting.location}
                              </Typography>
                            </Box>
                          )}

                          {meeting.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {meeting.description}
                            </Typography>
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <People sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="body2" color="text.secondary">
                                {meeting.participants?.length || 0} participants
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {meeting.organizer && (
                                <Chip 
                                  label={`Organized by: ${meeting.organizer}`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              )}
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={() => {
                                  handleCloseStatsModal();
                                  handleViewMeeting(meeting);
                                }}
                                sx={{ ml: 1 }}
                              >
                                <Visibility />
                              </IconButton>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatsModal} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

