import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Button, List, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Stack, Alert, IconButton,
  Badge, Tabs, Tab, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, useTheme
} from "@mui/material";
import { 
  Warning, Announcement, Search, Info, NotificationsActive, 
  CalendarToday, AccessTime, LocationOn, Person, Description, 
  PriorityHigh, Close, Visibility, Event, MeetingRoom, Notifications,
  Assignment, PersonAddAlt1, Share, Archive
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function AdminNotifications() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [activityNotifications, setActivityNotifications] = useState([]);
  const [announcementNotifications, setAnnouncementNotifications] = useState([]);
  const [requestNotifications, setRequestNotifications] = useState([]);
  const [archivedNotifications, setArchivedNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        fetchAllNotifications();
      }
    });

    return unsubscribe;
  }, []);

  const fetchAllNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch all notifications (admin sees all notifications)
      const notificationsQuery = query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc")
      );

      // Optimize: Use single-time fetch instead of real-time listener for better performance
      const snapshot = await getDocs(notificationsQuery);
      const allNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: doc.data().type || 'general',
        timestamp: doc.data().createdAt
      }));

      setNotifications(allNotifications);
      
      // Categorize notifications (exclude archived)
      const activities = allNotifications.filter(n => 
        !n.archived && (n.type === 'activity' || n.type === 'activity_request' || n.type === 'event')
      );
      const announcements = allNotifications.filter(n => 
        !n.archived && n.type === 'announcement'
      );
      const requests = allNotifications.filter(n => 
        !n.archived && (n.type === 'teacher_request' || n.type === 'violation' || n.type === 'lost_found')
      );
      const archived = allNotifications.filter(n => n.archived);

      setActivityNotifications(activities);
      setAnnouncementNotifications(announcements);
      setRequestNotifications(requests);
      setArchivedNotifications(archived);
      setLoading(false);

      return () => {}; // No cleanup needed since we're using single-time fetch
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
      setLoading(false);
      return () => {};
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const archiveNotification = async (notificationId) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        archived: true,
        archivedAt: new Date().toISOString()
      });
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, archived: true, archivedAt: new Date().toISOString() }
            : n
        )
      );
      
      // Update archived notifications list
      const notificationToArchive = notifications.find(n => n.id === notificationId);
      if (notificationToArchive) {
        setArchivedNotifications(prev => [
          { ...notificationToArchive, archived: true, archivedAt: new Date().toISOString() },
          ...prev
        ]);
      }
      
      // Remove from active lists
      setActivityNotifications(prev => prev.filter(n => n.id !== notificationId));
      setAnnouncementNotifications(prev => prev.filter(n => n.id !== notificationId));
      setRequestNotifications(prev => prev.filter(n => n.id !== notificationId));
      
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleAnnouncementDeleted = async (announcementId) => {
    try {
      // Find all notifications related to this announcement
      const announcementNotifications = notifications.filter(n => 
        n.announcementId === announcementId
      );
      
      // Archive all related notifications
      for (const notification of announcementNotifications) {
        await updateDoc(doc(db, "notifications", notification.id), {
          archived: true,
          archivedAt: new Date().toISOString(),
          archivedReason: 'announcement_deleted'
        });
      }
    } catch (error) {
      console.error('Error handling announcement deletion:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'teacher_request':
        return <PersonAddAlt1 />;
      case 'violation':
        return <Warning />;
      case 'lost_found':
        return <Search />;
      case 'activity_request':
        return <Event />;
      case 'activity':
        return <Event />;
      case 'event':
        return <Event />;
      case 'meeting':
        return <Assignment />;
      case 'announcement':
        return <Announcement />;
      case 'post_shared':
        return <Share />;
      default:
        return <Notifications />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'teacher_request':
        return 'warning';
      case 'violation':
        return 'error';
      case 'lost_found':
        return 'info';
      case 'activity_request':
        return 'success';
      case 'activity':
        return 'success';
      case 'event':
        return 'success';
      case 'meeting':
        return 'primary';
      case 'announcement':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleViewDetails = (notification) => {
    // Always mark as read when clicked
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'teacher_request':
        navigate('/teacher-request');
        break;
      case 'lost_found_comment':
      case 'lost_found':
        navigate('/lost-found');
        break;
      case 'activity':
        navigate('/admin-activity-scheduler');
        break;
      case 'announcement':
      case 'announcements':
        // Navigate to announcements page with announcement ID if available
        if (notification.announcementId) {
          navigate('/admin-announcements', { 
            state: { 
              viewAnnouncementId: notification.announcementId,
              fromNotification: true 
            } 
          });
        } else {
          navigate('/admin-announcements');
        }
        break;
      case 'violation':
        navigate('/violation-review');
        break;
      case 'student':
        navigate('/students');
        break;
      default:
        // For other notification types, show details dialog
        setSelectedNotification(notification);
        setOpenDetailDialog(true);
        break;
    }
  };

  const allNotifications = [...notifications].filter(n => !n.archived);
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const renderNotificationList = (notificationList, title) => {

    if (notificationList.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Notifications sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }} gutterBottom>
            No {title.toLowerCase()} found
          </Typography>
          <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
            You'll see notifications here when they arrive.
          </Typography>
        </Box>
      );
    }

    return (
      <Paper sx={{ 
        mb: 3,
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f8f4f4',
        border: '1px solid #800000',
        '&:hover': {
          boxShadow: '0 4px 8px rgba(128, 0, 0, 0.1)'
        }
      }}>
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          bgcolor: '#800000',
          color: '#ffffff'
        }}>
          <Typography variant="h6" fontWeight={600} sx={{ color: '#ffffff' }}>
            {title}
          </Typography>
        </Box>
        <List sx={{ p: 0 }}>
          {notificationList.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem
                sx={{
                  bgcolor: notification.read ? 'transparent' : (theme.palette.mode === 'dark' ? '#404040' : '#f3f4f6'),
                  '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#505050' : '#f9fafb' },
                  cursor: 'pointer'
                }}
                onClick={() => handleViewDetails(notification)}
                secondaryAction={
                  !notification.archived ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        edge="end"
                        aria-label="archive"
                        onClick={(e) => {
                          e.stopPropagation();
                          archiveNotification(notification.id);
                        }}
                        size="small"
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { color: 'primary.main' }
                        }}
                      >
                        <Archive fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: `${getNotificationColor(notification.type)}.light` }}>
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={notification.read ? 400 : 600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                        {notification.title || notification.message}
                      </Typography>
                      {!notification.read && (
                        <Chip size="small" label="New" color="primary" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                        {notification.description || notification.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
                        {formatTimeAgo(notification.timestamp)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < notificationList.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    );
  };

  const renderNotificationDetails = () => {
    if (!selectedNotification) return null;

    return (
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: `${getNotificationColor(selectedNotification.type)}.light` }}>
              {getNotificationIcon(selectedNotification.type)}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {selectedNotification.title || selectedNotification.message}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
                {formatTimeAgo(selectedNotification.timestamp)}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
              {selectedNotification.description || selectedNotification.message}
            </Typography>
            
            {selectedNotification.type === 'violation' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>Violation Details:</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Student:</strong></TableCell>
                        <TableCell>{selectedNotification.studentName || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Violation Type:</strong></TableCell>
                        <TableCell>{selectedNotification.violationType || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Severity:</strong></TableCell>
                        <TableCell>
                          <Chip 
                            label={selectedNotification.severity || 'Medium'} 
                            color={selectedNotification.severity === 'High' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {selectedNotification.type === 'activity_request' && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>Activity Request Details:</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell><strong>Activity:</strong></TableCell>
                        <TableCell>{selectedNotification.activityName || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Requested By:</strong></TableCell>
                        <TableCell>{selectedNotification.requestedBy || 'N/A'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell><strong>Date:</strong></TableCell>
                        <TableCell>{selectedNotification.activityDate || 'N/A'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 }, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: '#8B0000', mb: 2, mt: 1 }}>
          Admin Notifications
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
          Manage all system notifications, activities, announcements, and requests
        </Typography>
      </Box>


      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All (${allNotifications.length})`} />
          <Tab label={`Activities (${activityNotifications.length})`} />
          <Tab label={`Announcements (${announcementNotifications.length})`} />
          <Tab label={`Requests (${requestNotifications.length})`} />
          <Tab label={`Archive (${archivedNotifications.length})`} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && renderNotificationList(allNotifications, "All Notifications")}
      {currentTab === 1 && renderNotificationList(activityNotifications, "Activity Notifications")}
      {currentTab === 2 && renderNotificationList(announcementNotifications, "Announcement Notifications")}
      {currentTab === 3 && renderNotificationList(requestNotifications, "Request Notifications")}
      {currentTab === 4 && renderNotificationList(archivedNotifications, "Archived Notifications")}

      {/* Notification Details Dialog */}
      {renderNotificationDetails()}
    </Box>
  );
}
