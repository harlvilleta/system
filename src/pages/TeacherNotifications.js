import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Button, List, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, Stack, Alert, IconButton,
  Badge, Tabs, Tab, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
  useTheme
} from "@mui/material";
import { 
  Warning, Announcement, Search, Info, NotificationsActive, 
  CalendarToday, AccessTime, LocationOn, Person, Description, 
  PriorityHigh, Close, Visibility, Event, MeetingRoom, Notifications, Share
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDocs } from "firebase/firestore";
import { auth } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function TeacherNotifications() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [meetingNotifications, setMeetingNotifications] = useState([]);
  const [lostFoundNotifications, setLostFoundNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        fetchAllNotifications(user.email);
      }
    });

    return unsubscribe;
  }, []);

  const fetchAllNotifications = async (teacherEmail) => {
    if (!teacherEmail) {
      setLoading(false);
      return;
    }

    try {
      // Fetch regular notifications
      const notificationsQuery = query(
        collection(db, "notifications"),
        where("recipientEmail", "==", teacherEmail),
        orderBy("createdAt", "desc")
      );
      
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snap) => {
        const notificationsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notificationsData);
      });

      // Fetch meeting notifications
      const meetingsQuery = query(
        collection(db, "meetings"),
        where("participants", "array-contains", teacherEmail),
        orderBy("date", "desc")
      );

      const unsubscribeMeetings = onSnapshot(meetingsQuery, (snap) => {
        const meetingsData = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'meeting',
          createdAt: doc.data().date,
          title: `Meeting: ${doc.data().title}`,
          message: `You have a meeting scheduled for ${new Date(doc.data().date).toLocaleDateString()}`,
          read: false
        }));
        setMeetingNotifications(meetingsData);
      });

      // Fetch lost and found notifications
      const lostFoundQuery = query(
        collection(db, "lost_items"),
        orderBy("createdAt", "desc")
      );

      const foundItemsQuery = query(
        collection(db, "found_items"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeLost = onSnapshot(lostFoundQuery, async (snap) => {
        const lostData = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          type: 'lost_found',
          notificationType: 'lost',
          title: `Lost Item: ${doc.data().name}`,
          message: `A new lost item has been reported: ${doc.data().name}`,
          read: false
        }));
        
        // Combine with found items
        try {
          const foundSnap = await getDocs(foundItemsQuery);
          const foundData = foundSnap.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            type: 'lost_found',
            notificationType: 'found',
            title: `Found Item: ${doc.data().name}`,
            message: `A new found item has been reported: ${doc.data().name}`,
            read: false
          }));
          
          const allLostFound = [...lostData, ...foundData].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
          setLostFoundNotifications(allLostFound);
        } catch (error) {
          console.error('Error fetching found items:', error);
          setLostFoundNotifications(lostData);
        }
      });

      setLoading(false);

      return () => {
        unsubscribeNotifications();
        unsubscribeMeetings();
        unsubscribeLost();
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId, collectionName = "notifications") => {
    try {
      await updateDoc(doc(db, collectionName, notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type, notificationType) => {
    switch (type) {
      case 'meeting': return <MeetingRoom />;
      case 'lost_found': return <Search />;
      case 'violation': return <Warning />;
      case 'announcement': return <Announcement />;
      case 'post_shared': return <Share />;
      default: return <Info />;
    }
  };

  const getNotificationColor = (type, notificationType) => {
    switch (type) {
      case 'meeting': return '#1976d2';
      case 'lost_found': 
        return notificationType === 'lost' ? '#ff9800' : '#4caf50';
      case 'violation': return '#f44336';
      case 'announcement': return '#2196f3';
      case 'post_shared': return '#2196f3';
      default: return '#757575';
    }
  };

  const handleViewDetails = (notification) => {
    // Always mark as read when clicked
    if (!notification.read) {
      markAsRead(notification.id, notification.type === 'meeting' ? 'meetings' : 
                 notification.type === 'lost_found' ? 'lost_items' : 'notifications');
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'meeting':
        navigate('/teacher-schedule');
        break;
      case 'lost_found':
        navigate('/lost-found');
        break;
      case 'announcement':
        navigate('/teacher-announcements');
        break;
      case 'violation':
        navigate('/teacher-violation-records');
        break;
      default:
        // For other notification types, show details dialog
        setSelectedNotification(notification);
        setOpenDetailDialog(true);
        break;
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const renderNotificationList = (notificationList, title) => (
    <Paper sx={{ 
      mb: 3,
      bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
      border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none'
    }}>
      <Box sx={{ 
        p: 2, 
        borderBottom: theme.palette.mode === 'dark' ? '1px solid #404040' : '1px solid #e0e0e0' 
      }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>
          {title}
        </Typography>
      </Box>
      <List>
        {notificationList.length === 0 ? (
          <ListItem>
            <ListItemText 
              primary={<Typography sx={{ color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>No notifications</Typography>}
              secondary={<Typography sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>You're all caught up!</Typography>}
            />
          </ListItem>
        ) : (
          notificationList.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem 
                button 
                onClick={() => handleViewDetails(notification)}
                sx={{
                  bgcolor: notification.read ? 'transparent' : (theme.palette.mode === 'dark' ? '#404040' : '#f5f5f5'),
                  '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#555555' : '#f0f0f0' }
                }}
              >
                <ListItemAvatar>
                  <Avatar>
                    {getNotificationIcon(notification.type, notification.notificationType)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight={notification.read ? 400 : 600}>
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Badge color="error" variant="dot" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < notificationList.length - 1 && <Divider />}
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
  );

  const renderNotificationDetails = () => {
    if (!selectedNotification) return null;

    const notification = selectedNotification;

    return (
      <Dialog 
        open={openDetailDialog} 
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: getNotificationColor(notification.type, notification.notificationType) }}>
              {getNotificationIcon(notification.type, notification.notificationType)}
            </Avatar>
            <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>{notification.title}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {notification.type === 'meeting' && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>
                <strong>Meeting Details:</strong>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Date & Time:</strong> {new Date(notification.date).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Location:</strong> {notification.location || 'TBD'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Description:</strong> {notification.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Organizer:</strong> {notification.organizer || 'Unknown'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {notification.type === 'lost_found' && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>
                <strong>Item Details:</strong>
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Item Name:</strong> {notification.name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Type:</strong> {notification.notificationType === 'lost' ? 'Lost Item' : 'Found Item'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Description:</strong> {notification.description || 'No description provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Location:</strong> {notification.location || 'Unknown location'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                    <strong>Reported:</strong> {new Date(notification.createdAt).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}

          {notification.type === 'violation' && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>
                <strong>Violation Details:</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                {notification.message}
              </Typography>
            </Box>
          )}

          {notification.type === 'announcement' && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, color: theme.palette.mode === 'dark' ? 'text.primary' : '#000000' }}>
                <strong>Announcement:</strong>
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#333333' }}>
                {notification.message}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const allNotifications = [...notifications, ...meetingNotifications, ...lostFoundNotifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = allNotifications.filter(n => !n.read).length;


  return (
    <Box sx={{ 
      p: { xs: 2, sm: 3 }, 
      bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f6fa', 
      minHeight: '100vh' 
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }} gutterBottom>
          Notifications
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
          Stay updated with all your notifications and alerts
        </Typography>
      </Box>

      {/* Statistics Card */}
      <Card sx={{ 
        mb: 3,
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
        border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none'
      }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar>
              <NotificationsActive />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? 'text.secondary' : '#666666' }}>
                Total: {allNotifications.length} notifications
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ 
        mb: 3,
        bgcolor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
        border: theme.palette.mode === 'dark' ? '1px solid #404040' : 'none'
      }}>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={`All (${allNotifications.length})`} />
          <Tab label={`Meetings (${meetingNotifications.length})`} />
          <Tab label={`Lost & Found (${lostFoundNotifications.length})`} />
          <Tab label={`System (${notifications.length})`} />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && renderNotificationList(allNotifications, "All Notifications")}
      {currentTab === 1 && renderNotificationList(meetingNotifications, "Meeting Notifications")}
      {currentTab === 2 && renderNotificationList(lostFoundNotifications, "Lost & Found Notifications")}
      {currentTab === 3 && renderNotificationList(notifications, "System Notifications")}

      {/* Notification Details Dialog */}
      {renderNotificationDetails()}
    </Box>
  );
}
