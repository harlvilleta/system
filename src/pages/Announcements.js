import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, TextField, Button, Stack, Snackbar, Alert, List, ListItem, ListItemText, Divider, MenuItem, Card, CardContent, CardHeader, Chip, Tabs, Tab, Badge, Dialog, DialogTitle, DialogContent, DialogActions, Select, InputAdornment, useTheme, CircularProgress, Grid } from "@mui/material";
import { CloudUpload, Image, Delete, Schedule, AccessTime, CheckCircle, Visibility } from "@mui/icons-material";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, getDoc, where } from "firebase/firestore";
import { db, logActivity, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import PrintIcon from '@mui/icons-material/Print';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { Tooltip } from "@mui/material";
import { auth } from "../firebase"; // Added auth import
import { useLocation } from "react-router-dom";

const categories = ["General", "Event", "Urgent", "Reminder", "Other"];
const audiences = ["All", "Student", "Teacher"];
const priorities = ["Normal", "High", "Urgent"];

// Function to convert file to base64
const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function Announcements() {
  const theme = useTheme();
  const location = useLocation();
  const [form, setForm] = useState({ title: "", message: "", date: "", audience: "All", scheduleDate: "", expiryDate: "", photo: null, visibility: "public" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [announcements, setAnnouncements] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [completedAnnouncements, setCompletedAnnouncements] = useState([]);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [viewAnnouncement, setViewAnnouncement] = useState(null);
  const [editAnnouncement, setEditAnnouncement] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState('Student');
  const [activities, setActivities] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoBase64, setPhotoBase64] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    // Get current user and role
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'Student');
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }
    });

    fetchAnnouncements();
    fetchRecycleBin();
    fetchActivities();
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    const now = new Date();
    // Include both manually completed announcements and expired announcements
    const completed = announcements.filter(a => 
      a.completed || (a.expiryDate && new Date(a.expiryDate) <= now)
    );
    setCompletedAnnouncements(completed);
  }, [announcements]);

  // Handle navigation from notification
  useEffect(() => {
    if (location.state?.fromNotification && location.state?.viewAnnouncementId && announcements.length > 0) {
      const targetAnnouncement = announcements.find(a => a.id === location.state.viewAnnouncementId);
      if (targetAnnouncement) {
        setViewAnnouncement(targetAnnouncement);
      }
    }
  }, [location.state, announcements]);

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setAnnouncements([]);
    }
  };

  const fetchRecycleBin = async () => {
    try {
      const q = query(collection(db, "recycle_bin_announcements"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setRecycleBin(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setRecycleBin([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setActivities([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file (JPEG, PNG, GIF, WebP)", severity: "error" });
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        setSnackbar({ open: true, message: "Image file size must be less than 5MB", severity: "error" });
        e.target.value = ''; // Clear the input
        return;
      }
      
      console.log('📷 Processing image:', file.name, 'Size:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
      
      try {
        // Convert to base64 for storage
        const base64String = await convertToBase64(file);
      setForm({ ...form, photo: file });
        setPhotoBase64(base64String);
        setPhotoPreview(base64String);
        setSnackbar({ open: true, message: "Image uploaded successfully!", severity: "success" });
      } catch (error) {
        console.error('Error processing image:', error);
        setSnackbar({ open: true, message: "Failed to process image. Please try again.", severity: "error" });
        setForm({ ...form, photo: null });
        setPhotoBase64('');
        setPhotoPreview(null);
      }
    }
  };

  const removePhoto = () => {
    setForm({ ...form, photo: null });
    setPhotoPreview(null);
    setPhotoBase64('');
  };

  const sendNotificationsToRole = async (role, announcementId, form, senderId, senderEmail, senderName) => {
    const usersQuery = query(
      collection(db, "users"),
      where("role", "==", role)
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    // Create notifications for each user
    const notificationPromises = usersSnapshot.docs.map(doc => {
      const user = doc.data();
      return addDoc(collection(db, "notifications"), {
        recipientEmail: user.email,
        recipientName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        title: `📢 New Announcement: ${form.title}`,
        message: form.message.length > 100 ? `${form.message.substring(0, 100)}...` : form.message,
        type: "announcement",
        announcementId: announcementId,
        senderId: senderId,
        senderEmail: senderEmail,
        senderName: senderName,
        read: false,
        createdAt: new Date().toISOString(),
        audience: form.audience
      });
    });
    
    await Promise.all(notificationPromises);
    console.log(`✅ Announcement notifications sent to ${usersSnapshot.docs.length} ${role.toLowerCase()}s`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      setSnackbar({ open: true, message: "Title and message are required", severity: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Get current user information
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email || 'unknown@school.com';
      const userName = currentUser?.displayName || userEmail.split('@')[0];
      
      // Use base64 photo data if available
      let photoUrl = photoBase64 || null;

      const announcementRef = await addDoc(collection(db, "announcements"), {
        title: form.title,
        message: form.message,
        date: form.date || new Date().toISOString(),
        audience: form.audience,
        scheduleDate: form.scheduleDate,
        expiryDate: form.expiryDate,
        photoUrl: photoUrl,
        visibility: form.visibility || "public",
        createdAt: new Date().toISOString(),
        postedBy: userName,
        postedByEmail: userEmail,
        postedByName: userName,
        status: 'Pending', // Default status for approval workflow
        reviewedBy: null,
        reviewedAt: null,
        reviewReason: null
      });

      // Create notifications based on audience
      if (form.audience === "All" || form.audience === "Student" || form.audience === "Teacher") {
        try {
          let targetRole = "Student";
          if (form.audience === "Teacher") {
            targetRole = "Teacher";
          } else if (form.audience === "All") {
            // For "All", we'll send to both students and teachers
            await sendNotificationsToRole("Student", announcementRef.id, form, currentUser.uid, userEmail, userName);
            await sendNotificationsToRole("Teacher", announcementRef.id, form, currentUser.uid, userEmail, userName);
          } else {
            await sendNotificationsToRole(targetRole, announcementRef.id, form, currentUser.uid, userEmail, userName);
          }
        } catch (notificationError) {
          console.error('❌ Error sending announcement notifications:', notificationError);
          // Don't fail the entire operation if notifications fail
        }
      }

      await logActivity({ message: `Announcement posted: ${form.title}`, type: 'add_announcement' });
      setSnackbar({ open: true, message: "Announcement submitted for approval!", severity: "success" });
      setForm({ title: "", message: "", date: "", audience: "All", scheduleDate: "", expiryDate: "", photo: null, visibility: "public" });
      setPhotoPreview(null);
      setPhotoBase64('');
      setFormModalOpen(false);
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error posting announcement", severity: "error" });
      setPhotoBase64('');
    }
    setIsSubmitting(false);
  };

  const handlePrint = (announcement) => {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
      <html><head><title>Print Announcement</title></head><body>
      <h2>${announcement.title}</h2>
      <p><strong>Category:</strong> ${announcement.category}</p>
      <p><strong>Audience:</strong> ${announcement.audience}</p>
      <p><strong>Priority:</strong> ${announcement.priority}</p>
      <p><strong>Date:</strong> ${announcement.date ? new Date(announcement.date).toLocaleDateString() : ''}</p>
      <p>${announcement.message}</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDelete = async (announcement) => {
    setIsSubmitting(true);
    try {
      // Move to recycle bin
      await addDoc(collection(db, "recycle_bin_announcements"), {
        ...announcement,
        deletedAt: new Date().toISOString(),
      });
      // Delete from announcements
      await deleteDoc(doc(db, "announcements", announcement.id));
      setSnackbar({ open: true, message: "Announcement moved to recycle bin.", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleRestore = async (item) => {
    setIsSubmitting(true);
    try {
      // Add back to announcements
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "announcements"), {
        ...rest,
        restoredAt: new Date().toISOString(),
      });
      // Remove from recycle bin
      await deleteDoc(doc(db, "recycle_bin_announcements", id));
      setSnackbar({ open: true, message: "Announcement restored.", severity: "success" });
      fetchAnnouncements();
      fetchRecycleBin();
    } catch (e) {
      setSnackbar({ open: true, message: "Error restoring announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDelete = async (item) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "recycle_bin_announcements", item.id));
      setSnackbar({ open: true, message: "Announcement permanently deleted.", severity: "success" });
      fetchRecycleBin();
    } catch (e) {
      setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePin = async (a, pin) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", a.id), { pinned: pin, pinnedAt: pin ? new Date().toISOString() : null });
      setSnackbar({ open: true, message: pin ? "Announcement pinned!" : "Unpinned.", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating pin.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleEditSave = async (updated) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", updated.id), updated);
      setSnackbar({ open: true, message: "Announcement updated!", severity: "success" });
      setEditAnnouncement(null);
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating announcement.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handleMarkCompleted = async (a) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "announcements", a.id), { completed: true, completedAt: new Date().toISOString() });
      setSnackbar({ open: true, message: "Announcement marked as completed!", severity: "success" });
      fetchAnnouncements();
    } catch (e) {
      setSnackbar({ open: true, message: "Error marking as completed.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  // Utility functions for each tab
  function getActiveAnnouncements(announcements, search) {
    const now = new Date();
    const allActive = announcements.filter(a =>
      !a.completed &&
      (!a.scheduleDate || new Date(a.scheduleDate) <= now) &&
      (!a.expiryDate || new Date(a.expiryDate) > now)
    );
    const sortedActive = [...allActive].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
    });
    
    // Apply search filter to all active announcements first
    const filteredActive = search
      ? sortedActive.filter(a => {
          // Handle visibility filters
          if (search.toLowerCase() === "public") {
            return a.visibility !== "private";
          }
          if (search.toLowerCase() === "private") {
            return a.visibility === "private";
          }
          // Handle other search terms
          return (a.title?.toLowerCase().includes(search.toLowerCase()) ||
                  a.message?.toLowerCase().includes(search.toLowerCase()));
        })
      : sortedActive;
    
    const recent = filteredActive.slice(0, 3);
    const mainList = filteredActive.slice(3);
    return { recent, mainList };
  }
  function getRecycleBinAnnouncements(recycleBin, search) {
    const sorted = [...recycleBin].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    return search
      ? sorted.filter(a => {
          // Handle visibility filters
          if (search.toLowerCase() === "public") {
            return a.visibility !== "private";
          }
          if (search.toLowerCase() === "private") {
            return a.visibility === "private";
          }
          // Handle other search terms
          return (a.title?.toLowerCase().includes(search.toLowerCase()) ||
                  a.message?.toLowerCase().includes(search.toLowerCase()));
        })
      : sorted;
  }
  function getCompletedAnnouncements(announcements, search) {
    const now = new Date();
    // Include both manually completed announcements and expired announcements
    const completed = announcements.filter(a => 
      a.completed || (a.expiryDate && new Date(a.expiryDate) <= now)
    );
    const sorted = [...completed].sort((a, b) => {
      const aDate = a.completedAt || (a.expiryDate ? new Date(a.expiryDate) : null) || a.date || 0;
      const bDate = b.completedAt || (b.expiryDate ? new Date(b.expiryDate) : null) || b.date || 0;
      return new Date(bDate) - new Date(aDate);
    });
    return search
      ? sorted.filter(a => {
          // Handle visibility filters
          if (search.toLowerCase() === "public") {
            return a.visibility !== "private";
          }
          if (search.toLowerCase() === "private") {
            return a.visibility === "private";
          }
          // Handle other search terms
          return (a.title?.toLowerCase().includes(search.toLowerCase()) ||
                  a.message?.toLowerCase().includes(search.toLowerCase()));
        })
      : sorted;
  }
  function getScheduledAnnouncements(announcements, search) {
    const now = new Date();
    const scheduled = announcements.filter(a =>
      !a.completed && a.scheduleDate && new Date(a.scheduleDate) > now
    );
    const sorted = [...scheduled].sort((a, b) => new Date(a.scheduleDate) - new Date(b.scheduleDate));
    return search
      ? sorted.filter(a => {
          // Handle visibility filters
          if (search.toLowerCase() === "public") {
            return a.visibility !== "private";
          }
          if (search.toLowerCase() === "private") {
            return a.visibility === "private";
          }
          // Handle other search terms
          return (a.title?.toLowerCase().includes(search.toLowerCase()) ||
                  a.message?.toLowerCase().includes(search.toLowerCase()));
        })
      : sorted;
  }
  function getExpiredAnnouncements(announcements, search) {
    const now = new Date();
    // Only show expired announcements that haven't been manually marked as completed
    // (Expired announcements are now counted as completed, so this list will be empty or minimal)
    const expired = announcements.filter(a =>
      !a.completed && a.expiryDate && new Date(a.expiryDate) <= now
    );
    const sorted = [...expired].sort((a, b) => new Date(b.expiryDate) - new Date(a.expiryDate));
    return search
      ? sorted.filter(a => {
          // Handle visibility filters
          if (search.toLowerCase() === "public") {
            return a.visibility !== "private";
          }
          if (search.toLowerCase() === "private") {
            return a.visibility === "private";
          }
          // Handle other search terms
          return (a.title?.toLowerCase().includes(search.toLowerCase()) ||
                  a.message?.toLowerCase().includes(search.toLowerCase()));
        })
      : sorted;
  }

  // Card click handler
  const handleCardClick = (cardType) => {
    setSelectedCard(cardType);
    setSearch(""); // Clear search when selecting a card
    setSelected([]); // Clear selected items
  };

  // Get filtered announcements based on selected card
  const getFilteredAnnouncements = () => {
    switch (selectedCard) {
      case 'total':
        return announcements; // Show all announcements
      case 'active':
        return mainList;
      case 'completed':
        return filteredCompleted;
      case 'scheduled':
        return scheduledList;
      case 'expired':
        return expiredList;
      default:
        return announcements;
    }
  };

  const getCardTitle = () => {
    switch (selectedCard) {
      case 'total':
        return 'Total Announcements';
      case 'active':
        return 'Active Announcements';
      case 'completed':
        return 'Completed Announcements';
      case 'scheduled':
        return 'Scheduled Announcements';
      case 'expired':
        return 'Expired Announcements';
      default:
        return 'All Announcements';
    }
  };

  // Use utility functions for each tab
  const { recent, mainList } = getActiveAnnouncements(announcements, search);
  const filteredRecycleBin = getRecycleBinAnnouncements(recycleBin, search);
  const filteredCompleted = getCompletedAnnouncements(announcements, search);
  const scheduledList = getScheduledAnnouncements(announcements, search);
  const expiredList = getExpiredAnnouncements(announcements, search);

  const total = announcements.length;
  const pinnedCount = announcements.filter(a => a.pinned).length;
  const urgentCount = announcements.filter(a => a.priority === 'Urgent').length;

  useEffect(() => {
    if (!bulkAction || selected.length === 0) return;
    const doBulk = async () => {
      setIsSubmitting(true);
      try {
        if (bulkAction === 'delete') {
          for (const id of selected) {
            const a = announcements.find(x => x.id === id);
            await addDoc(collection(db, "recycle_bin_announcements"), { ...a, deletedAt: new Date().toISOString() });
            await deleteDoc(doc(db, "announcements", id));
          }
          setSnackbar({ open: true, message: "Deleted selected announcements.", severity: "success" });
        } else if (bulkAction === 'complete') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { completed: true, completedAt: new Date().toISOString() });
          }
          setSnackbar({ open: true, message: "Marked as completed.", severity: "success" });
        } else if (bulkAction === 'pin') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { pinned: true, pinnedAt: new Date().toISOString() });
          }
          setSnackbar({ open: true, message: "Pinned selected.", severity: "success" });
        } else if (bulkAction === 'unpin') {
          for (const id of selected) {
            await updateDoc(doc(db, "announcements", id), { pinned: false, pinnedAt: null });
          }
          setSnackbar({ open: true, message: "Unpinned selected.", severity: "success" });
        }
        setSelected([]);
        setBulkAction(null);
        fetchAnnouncements();
        fetchRecycleBin();
      } catch (e) {
        setSnackbar({ open: true, message: "Bulk action failed.", severity: "error" });
      }
      setIsSubmitting(false);
    };
    doBulk();
  }, [bulkAction]);

  return (
    <Box sx={{ 
      pt: { xs: 2, sm: 3 }, 
      pl: { xs: 2, sm: 3, md: 4 }, 
      pr: { xs: 2, sm: 3, md: 4 },
      maxWidth: '100%',
      width: '100%'
    }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Announcements
      </Typography>
      
      <Box sx={{ width: '100%', p: { xs: 0.5, sm: 1 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
      </Stack>
      
      {/* Quick Access Cards */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ 
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2
        }}>
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedCard === 'total' ? 4 : 2,
              borderLeft: '4px solid #800000',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => handleCardClick('total')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {announcements.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Total Announcements
              </Typography>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedCard === 'active' ? 4 : 2,
              borderLeft: '4px solid #800000',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => handleCardClick('active')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {recent.length + mainList.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Active Announcements
              </Typography>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedCard === 'completed' ? 4 : 2,
              borderLeft: '4px solid #800000',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => handleCardClick('completed')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {filteredCompleted.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Completed
              </Typography>
            </CardContent>
          </Card>

          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: selectedCard === 'scheduled' ? 4 : 2,
              borderLeft: '4px solid #800000',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}
            onClick={() => handleCardClick('scheduled')}
          >
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: '#000000' }}>
                {scheduledList.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Scheduled
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Search Bar, Filters, and Create Button */}
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {/* Search Bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 400, flex: 1, minWidth: 300 }}>
          <TextField
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search announcements..."
            size="small"
            fullWidth
            autoFocus
            sx={{ 
              '& .MuiOutlinedInput-root': {
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)',
              color: '#000000',
                borderRadius: 2,
                '& fieldset': {
              borderColor: '#000000',
                  borderWidth: 2,
                },
                '&:hover fieldset': {
                borderColor: '#800000',
                  borderWidth: 2,
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#800000',
                  borderWidth: 2,
                },
              },
              '& .MuiInputBase-input': {
                color: '#000000',
                fontWeight: 500,
                '&::placeholder': {
                  color: '#666666',
                  opacity: 1,
                  fontWeight: 400,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#000000', opacity: 0.7 }} />
                </InputAdornment>
              ),
              endAdornment: search && (
                <IconButton 
                  size="small" 
                  onClick={() => setSearch("")}
                  sx={{ color: '#000000', opacity: 0.7 }}
                >
                  ×
                </IconButton>
              )
            }}
          />
                </Box>

        {/* Filter Buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ color: '#000000', fontWeight: 600, fontSize: '0.9rem', mr: 1 }}>
          Filters:
        </Typography>
        <Chip 
          label="All" 
          variant={search === "" ? "filled" : "outlined"}
          onClick={() => setSearch("")}
          sx={{ 
            color: search === "" ? '#ffffff' : '#000000',
              bgcolor: search === "" ? '#800000' : 'transparent',
            borderColor: '#000000',
            borderWidth: 2,
            fontWeight: 500,
              '&:hover': {
                bgcolor: '#800000',
                color: '#000000',
                borderColor: '#800000'
              }
          }}
        />
        <Chip 
          label="Students" 
          variant="outlined"
          onClick={() => setSearch("students")}
          sx={{ 
            color: '#000000',
              bgcolor: 'transparent',
            borderColor: '#000000',
            borderWidth: 2,
            fontWeight: 500,
              '&:hover': {
                bgcolor: '#800000',
                color: '#000000',
                borderColor: '#800000'
              }
          }}
        />
        <Chip 
          label="Teachers" 
          variant="outlined"
          onClick={() => setSearch("teachers")}
          sx={{ 
            color: '#000000',
              bgcolor: 'transparent',
            borderColor: '#000000',
            borderWidth: 2,
            fontWeight: 500,
              '&:hover': {
                bgcolor: '#800000',
                color: '#000000',
                borderColor: '#800000'
              }
          }}
        />
        <Chip 
          label="Public" 
          variant={search === "public" ? "filled" : "outlined"}
          onClick={() => setSearch(search === "public" ? "" : "public")}
          sx={{ 
            color: search === "public" ? '#ffffff' : '#000000',
            bgcolor: search === "public" ? '#800000' : 'transparent',
            borderColor: '#000000',
            borderWidth: 2,
            fontWeight: 500,
              '&:hover': {
                bgcolor: '#800000',
                color: '#000000',
                borderColor: '#800000'
              }
          }}
        />
        <Chip 
          label="Private" 
          variant={search === "private" ? "filled" : "outlined"}
          onClick={() => setSearch(search === "private" ? "" : "private")}
          sx={{ 
            color: search === "private" ? '#ffffff' : '#000000',
            bgcolor: search === "private" ? '#800000' : 'transparent',
            borderColor: '#000000',
            borderWidth: 2,
            fontWeight: 500,
              '&:hover': {
                bgcolor: '#800000',
                color: '#000000',
                borderColor: '#800000'
              }
          }}
        />
      </Box>

        {/* Create Announcement Button - Right Side */}
        {userRole === 'Admin' && (
          <Button 
            variant="outlined" 
            onClick={() => setFormModalOpen(true)}
          sx={{
              color: '#000000',
              backgroundColor: '#ffffff',
                borderColor: '#000000',
              borderWidth: '1px',
                fontWeight: 400,
              fontSize: '0.875rem',
              textTransform: 'none',
              fontFamily: 'inherit',
              px: 3,
              py: 1,
              minWidth: '160px',
              '&:hover': {
                backgroundColor: '#800000',
                color: '#ffffff',
                borderColor: '#800000',
                borderWidth: '1px'
              }
            }}
          >
            + Create Announcement
          </Button>
        )}
      </Box>

      {/* Recent and Scheduled Announcements Side by Side */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Recent Announcements - Left Side */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            maxWidth: '100%', 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#800000' }}>
              Active Announcements
            </Typography>
            <Box sx={{ 
              flex: 1,
              minHeight: '400px',
              maxHeight: '600px',
              overflow: 'auto'
            }}>
              {recent.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>No active announcements.</Typography>
              ) : (
                <Stack spacing={0.5} sx={{ maxWidth: '100%' }}>
                  {recent.map(a => (
                  <Card key={a.id} sx={{ 
                    borderLeft: a.priority === 'Urgent' ? '3px solid #d32f2f' : a.pinned ? '3px solid #800000' : '3px solid #800000', 
                    boxShadow: 1,
                    transition: 'all 0.3s ease',
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 1,
                    mb: 0.5,
                    px: 0.5,
                    py: 0.25,
                    minHeight: 'auto',
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
                    }
                  }}>
                    <CardHeader
                      title={<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                        <Typography fontWeight={700} sx={{ color: '#4caf50' }}>{a.title}</Typography>
                        {a.pinned && <Chip label="📌 Pinned" color="warning" size="small" sx={{ fontSize: '0.7rem' }} />}
                        {a.priority === 'Urgent' && <Chip label="🚨 Urgent" color="error" size="small" sx={{ fontSize: '0.7rem' }} />}
                        <Chip label="🟢 Active" color="success" variant="outlined" size="small" sx={{ fontSize: '0.7rem' }} />
                        <Chip label={`👤 ${a.audience}`} color="secondary" size="small" sx={{ fontSize: '0.7rem' }} />
                        <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" sx={{ fontSize: '0.7rem' }} />
                        {a.completed && <Chip label="✅ Completed" color="success" size="small" sx={{ fontSize: '0.7rem' }} />}
                      </Stack>}
                      subheader={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            📅 {a.date ? new Date(a.date).toLocaleString() : 'No date set'}
                          </Typography>
                          {a.expiryDate && (
                            <Typography variant="body2" color="text.secondary">
                              ⏰ Expires: {new Date(a.expiryDate).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      }
                      action={
                        <Stack direction="row" spacing={1}>
                            {userRole === 'Admin' && (
                              <>
                                <Tooltip title={a.pinned ? "Unpin" : "Pin"}><IconButton onClick={() => handlePin(a, !a.pinned)} disabled={isSubmitting}>{a.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}</IconButton></Tooltip>
                                <Tooltip title="Edit"><IconButton 
                                  onClick={() => setEditAnnouncement(a)}
                                  sx={{
                                    '&:hover': {
                                      color: '#f57c00',
                                      bgcolor: 'rgba(245, 124, 0, 0.04)'
                                    }
                                  }}
                                ><EditIcon /></IconButton></Tooltip>
                                <Tooltip title="Delete"><IconButton 
                                  onClick={() => handleDelete(a)} 
                                  disabled={isSubmitting}
                                  sx={{
                                    '&:hover': {
                                      color: '#f44336',
                                      bgcolor: 'rgba(244, 67, 54, 0.04)'
                                    }
                                  }}
                                ><DeleteIcon /></IconButton></Tooltip>
                                {!a.completed && <Tooltip title="Mark as Completed"><IconButton onClick={() => handleMarkCompleted(a)} disabled={isSubmitting}><Chip label="Complete" color="success" size="small" /></IconButton></Tooltip>}
                              </>
                            )}
                            <Tooltip title="View"><IconButton 
                              onClick={() => setViewAnnouncement(a)}
                              sx={{
                                '&:hover': {
                                  color: '#1976d2',
                                  bgcolor: 'rgba(25, 118, 210, 0.04)'
                                }
                              }}
                            ><VisibilityIcon /></IconButton></Tooltip>
                          <Tooltip title="Print"><IconButton 
                            onClick={() => handlePrint(a)}
                            sx={{
                              '&:hover': {
                                color: '#666666',
                                bgcolor: 'rgba(102, 102, 102, 0.04)'
                              }
                            }}
                          ><PrintIcon /></IconButton></Tooltip>
                        </Stack>
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                      {a.photoUrl && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                          <img
                            src={a.photoUrl}
                            alt="Announcement"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '300px',
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: '1px solid #e0e0e0',
                              display: 'block'
                            }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Scheduled Announcements - Right Side */}
        <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            maxWidth: '100%', 
            width: '100%', 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#0288d1' }}>
              Scheduled Announcements
            </Typography>
            <Box sx={{ 
              flex: 1,
              minHeight: '400px',
              maxHeight: '600px',
              overflow: 'auto'
            }}>
              {scheduledList.length === 0 ? (
                <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>No scheduled announcements.</Typography>
              ) : (
                <Stack spacing={0.5}>
                  {scheduledList.map(a => (
                    <Card key={a.id} sx={{ mb: 0.5, borderLeft: '3px solid #0288d1', boxShadow: 1, px: 0.5, py: 0.25, minHeight: 'auto' }}>
                      <CardHeader
                        title={<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          <Typography fontWeight={700}>{a.title}</Typography>
                          <Chip label="📅 Scheduled" color="primary" size="small" sx={{ fontSize: '0.7rem' }} />
                          <Chip label={a.audience} color="secondary" size="small" sx={{ fontSize: '0.7rem' }} />
                          <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" sx={{ fontSize: '0.7rem' }} />
                        </Stack>}
                        subheader={
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="body2" color="text.secondary">
                              📅 Scheduled: {a.scheduleDate ? new Date(a.scheduleDate).toLocaleString() : 'Not set'}
                            </Typography>
                            {a.expiryDate && (
                              <Typography variant="body2" color="text.secondary">
                                ⏰ Expires: {new Date(a.expiryDate).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        }
                        action={
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View"><IconButton 
                              onClick={() => setViewAnnouncement(a)}
                              sx={{
                                '&:hover': {
                                  color: '#1976d2',
                                  bgcolor: 'rgba(25, 118, 210, 0.04)'
                                }
                              }}
                            ><VisibilityIcon /></IconButton></Tooltip>
                            <Tooltip title="Print"><IconButton 
                              onClick={() => handlePrint(a)}
                              sx={{
                                '&:hover': {
                                  color: '#666666',
                                  bgcolor: 'rgba(102, 102, 102, 0.04)'
                                }
                              }}
                            ><PrintIcon /></IconButton></Tooltip>
                          </Stack>
                        }
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                        {a.photoUrl && (
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                            <img
                              src={a.photoUrl}
                              alt="Announcement"
                              style={{
                                maxWidth: '100%',
                                maxHeight: '300px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0',
                                display: 'block'
                              }}
                            />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      {/* Completed Announcements Section - Below the 2-column layout */}
      {filteredCompleted.length > 0 && (
        <Box sx={{ mb: 4, maxWidth: '100%', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#43a047' }}>
              ✅ Completed Announcements
            </Typography>
            <Chip 
              label={`${filteredCompleted.length} completed`} 
              color="success" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Stack spacing={0.5}>
            {filteredCompleted.map(a => (
              <Card key={a.id} sx={{ mb: 0.5, borderLeft: '3px solid #43a047', boxShadow: 1, px: 0.5, py: 0.25, minHeight: 'auto' }}>
                <CardHeader
                  title={<Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography fontWeight={700}>{a.title}</Typography>
                    {a.completed ? (
                      <Chip label="Completed" color="success" size="small" />
                    ) : (
                      <Chip label="⏰ Expired" color="error" size="small" />
                    )}
                    <Chip label={a.audience} color="secondary" size="small" />
                    <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" />
                  </Stack>}
                  subheader={
                    <Box>
                      {a.completedAt ? (
                        <Typography variant="body2" color="text.secondary">
                          Completed: {new Date(a.completedAt).toLocaleDateString()}
                        </Typography>
                      ) : a.expiryDate ? (
                        <Typography variant="body2" color="text.secondary">
                          Expired: {new Date(a.expiryDate).toLocaleDateString()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          {a.date ? new Date(a.date).toLocaleDateString() : ''}
                        </Typography>
                      )}
                    </Box>
                  }
                  action={
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View"><IconButton 
                        onClick={() => setViewAnnouncement(a)}
                        sx={{
                          '&:hover': {
                            color: '#1976d2',
                            bgcolor: 'rgba(25, 118, 210, 0.04)'
                          }
                        }}
                      ><VisibilityIcon /></IconButton></Tooltip>
                      <Tooltip title="Print"><IconButton 
                        onClick={() => handlePrint(a)}
                        sx={{
                          '&:hover': {
                            color: '#666666',
                            bgcolor: 'rgba(102, 102, 102, 0.04)'
                          }
                        }}
                      ><PrintIcon /></IconButton></Tooltip>
                    </Stack>
                  }
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                  {a.photoUrl && (
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                      <img
                        src={a.photoUrl}
                        alt="Announcement"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '300px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0',
                          display: 'block'
                        }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}
      {/* Filtered Announcements Section - Shows when a stats card is clicked */}
      {selectedCard && (
        <Box sx={{ mb: 4, maxWidth: '100%', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>{getCardTitle()}</Typography>
          {selected.length > 0 && userRole === 'Admin' && (
            <Paper sx={{ mb: 2, p: 1, bgcolor: '#f5f5f5', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography>{selected.length} selected</Typography>
              <Button size="small" color="error" onClick={() => setBulkAction('delete')}>Delete</Button>
              <Button size="small" color="success" onClick={() => setBulkAction('complete')}>Mark as Completed</Button>
              <Button size="small" color="info" onClick={() => setBulkAction('pin')}>Pin</Button>
              <Button size="small" color="warning" onClick={() => setBulkAction('unpin')}>Unpin</Button>
            </Paper>
          )}
          {getFilteredAnnouncements().length === 0 ? (
            <Typography align="center" color="text.secondary">No announcements yet.</Typography>
          ) : (
            <React.Fragment>
              {getFilteredAnnouncements().map(a => (
                <Card key={a.id} sx={{ 
                  mb: 0.5, 
                  borderLeft: a.priority === 'Urgent' ? '3px solid #d32f2f' : a.pinned ? '3px solid #800000' : '3px solid #800000', 
                  boxShadow: 1, 
                  position: 'relative',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 1,
                  px: 0.5,
                  py: 0.25,
                  minHeight: 'auto',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: 2,
                    bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 1)'
                  }
                }}>
                  {userRole === 'Admin' && (
                    <Box sx={{ position: 'absolute', left: 8, top: 8 }}>
                      <input type="checkbox" checked={selected.includes(a.id)} onChange={e => setSelected(sel => e.target.checked ? [...sel, a.id] : sel.filter(id => id !== a.id))} />
                    </Box>
                  )}
                  <CardHeader
                    title={<Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{a.title}</Typography>
                      {a.pinned && <Chip label="Pinned" color="info" size="small" icon={<PushPinIcon fontSize="small" />} />}
                      <Chip label={a.audience} color="secondary" size="small" />
                      <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" />
                      {a.completed && <Chip label="Completed" color="success" size="small" />}
                    </Stack>}
                    subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                    action={
                      <Stack direction="row" spacing={1}>
                        {userRole === 'Admin' && (
                          <>
                            <Tooltip title={a.pinned ? "Unpin" : "Pin"}><IconButton onClick={() => handlePin(a, !a.pinned)} disabled={isSubmitting}>{a.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}</IconButton></Tooltip>
                            <Tooltip title="Edit"><IconButton onClick={() => setEditAnnouncement(a)}><EditIcon /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton onClick={() => handleDelete(a)} disabled={isSubmitting}><DeleteIcon /></IconButton></Tooltip>
                            {!a.completed && <Tooltip title="Mark as Completed"><IconButton onClick={() => handleMarkCompleted(a)} disabled={isSubmitting}><Chip label="Complete" color="success" size="small" /></IconButton></Tooltip>}
                          </>
                        )}
                        <Tooltip title="View"><IconButton onClick={() => setViewAnnouncement(a)}><VisibilityIcon /></IconButton></Tooltip>
                        <Tooltip title="Print"><IconButton onClick={() => handlePrint(a)}><PrintIcon /></IconButton></Tooltip>
                      </Stack>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message}</Typography>
                    {a.photoUrl && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                        <img
                          src={a.photoUrl}
                          alt="Announcement"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e0e0e0',
                            display: 'block'
                          }}
                        />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </React.Fragment>
          )}
        </Box>
      )}

      {/* Scheduled Announcements Section - Only show if there are scheduled announcements not shown in the 2-column layout */}
      {scheduledList.length > 0 && (
        <Box sx={{ mb: 4, maxWidth: '100%', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0288d1' }}>
              📅 Additional Scheduled Announcements
            </Typography>
            <Chip 
              label={`${scheduledList.length} scheduled`} 
              color="primary" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          {scheduledList.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.1)' : 'rgba(2, 136, 209, 0.05)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.3)' : 'rgba(2, 136, 209, 0.2)'}`
            }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                📅 No Scheduled Announcements
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Announcements with future schedule dates will appear here
              </Typography>
            </Box>
          ) : scheduledList.map(a => (
            <Card key={a.id} sx={{ 
              mb: 0.5, 
              borderLeft: '3px solid #0288d1', 
              boxShadow: 1,
              px: 0.5,
              py: 0.25,
              minHeight: 'auto',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(2, 136, 209, 0.05)' : 'rgba(2, 136, 209, 0.02)'
            }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={700}>{a.title}</Typography>
                    <Chip 
                      label="Scheduled" 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" sx={{ fontSize: '0.7rem' }} />
                  </Box>
                }
                subheader={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      📅 Scheduled: {a.scheduleDate ? new Date(a.scheduleDate).toLocaleString() : 'Not set'}
                    </Typography>
                    {a.expiryDate && (
                      <Typography variant="body2" color="text.secondary">
                        ⏰ Expires: {new Date(a.expiryDate).toLocaleString()}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      👤 Audience: {a.audience || 'All'}
                    </Typography>
                  </Box>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View Details">
                      <IconButton onClick={() => setViewAnnouncement(a)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton onClick={() => handlePrint(a)}>
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {a.message}
                </Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        display: 'block'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {expiredList.length > 0 && (
        <Box sx={{ mb: 4, maxWidth: '100%', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#d32f2f' }}>
              ⏰ Expired Announcements
            </Typography>
            <Chip 
              label={`${expiredList.length} expired`} 
              color="error" 
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          {expiredList.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4,
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(211, 47, 47, 0.05)',
              borderRadius: 2,
              border: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.3)' : 'rgba(211, 47, 47, 0.2)'}`
            }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                ⏰ No Expired Announcements
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Announcements that have passed their expiry date will appear here
              </Typography>
            </Box>
          ) : expiredList.map(a => (
            <Card key={a.id} sx={{ 
              mb: 0.5, 
              borderLeft: '3px solid #d32f2f', 
              boxShadow: 1,
              px: 0.5,
              py: 0.25,
              minHeight: 'auto',
              bgcolor: theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.05)' : 'rgba(211, 47, 47, 0.02)'
            }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={700}>{a.title}</Typography>
                    <Chip 
                      label="Expired" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Chip label={a.visibility === "private" ? "🔒 Private" : "🌐 Public"} color={a.visibility === "private" ? "default" : "info"} size="small" sx={{ fontSize: '0.7rem' }} />
                  </Box>
                }
                subheader={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      ⏰ Expired: {a.expiryDate ? new Date(a.expiryDate).toLocaleString() : 'Not set'}
                    </Typography>
                    {a.scheduleDate && (
                      <Typography variant="body2" color="text.secondary">
                        📅 Was Scheduled: {new Date(a.scheduleDate).toLocaleString()}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      👤 Audience: {a.audience || 'All'}
                    </Typography>
                  </Box>
                }
                action={
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="View Details">
                      <IconButton onClick={() => setViewAnnouncement(a)}>
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Print">
                      <IconButton onClick={() => handlePrint(a)}>
                        <PrintIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                }
              />
              <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {a.message}
                </Typography>
                {a.photoUrl && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <img
                      src={a.photoUrl}
                      alt="Announcement"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '300px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        display: 'block'
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {/* Create Announcement Modal */}
      <Dialog open={formModalOpen} onClose={() => setFormModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Announcement</DialogTitle>
        <DialogContent dividers>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField label="Title" name="title" value={form.title} onChange={handleChange} required fullWidth />
              <TextField label="Message" name="message" value={form.message} onChange={handleChange} required fullWidth multiline minRows={1} />
              <TextField label="Target Audience" name="audience" value={form.audience} onChange={handleChange} select fullWidth>
                {audiences.map((aud) => <MenuItem key={aud} value={aud}>{aud}</MenuItem>)}
              </TextField>
              <TextField label="Post Visibility" name="visibility" value={form.visibility} onChange={handleChange} select fullWidth>
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </TextField>
              <TextField label="Date" name="date" type="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Schedule Date" name="scheduleDate" type="datetime-local" value={form.scheduleDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Expiry Date" name="expiryDate" type="datetime-local" value={form.expiryDate} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
              
              {/* Photo Upload Section */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Attach Photo (Optional)
                </Typography>
                
                {/* Choose Photo Button */}
                <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  onChange={handlePhotoChange}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUpload />}
                    sx={{
                      borderColor: '#800000',
                      color: '#800000',
                      '&:hover': {
                        borderColor: '#800000',
                        backgroundColor: 'rgba(128, 0, 0, 0.04)'
                      }
                    }}
                  >
                    Choose Photo
                  </Button>
                </label>
                </Box>
                
                {/* Image Preview - Centered in modal */}
                {photoPreview && (
                  <Box sx={{ 
                    mt: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%'
                  }}>
                    <Typography variant="subtitle2" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                      mb: 2, 
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      Photo Preview
                    </Typography>
                    <Box sx={{ 
                      position: 'relative',
                      p: 2, 
                      border: '2px solid #800000', 
                      borderRadius: 2, 
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(128, 0, 0, 0.1)' : 'rgba(128, 0, 0, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxWidth: '400px',
                      width: '100%'
                    }}>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                          maxWidth: '100%',
                          maxHeight: '350px',
                          objectFit: 'contain',
                        borderRadius: '8px',
                          display: 'block'
                      }}
                    />
                    <IconButton
                      onClick={removePhoto}
                      sx={{
                        position: 'absolute',
                          top: 8,
                          right: 8,
                        backgroundColor: 'error.main',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'error.dark'
                        }
                      }}
                      size="small"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                    </Box>
                  </Box>
                )}
              </Box>
              <DialogActions>
                <Button 
                  onClick={() => setFormModalOpen(false)} 
                  color="secondary"
                  sx={{
                    '&:hover': {
                      bgcolor: '#800000',
                      color: 'white',
                      borderColor: '#800000'
                    }
                  }}
                >Cancel</Button>
                <Button 
                  type="submit" 
                  variant="outlined" 
                  color="primary" 
                  disabled={isSubmitting}
                  sx={{
                    color: 'black',
                    borderColor: 'black',
                    '&:hover': {
                      bgcolor: '#800000',
                      color: 'white',
                      borderColor: '#800000'
                    },
                    '&:disabled': {
                      bgcolor: '#ccc',
                      color: '#666',
                      borderColor: '#ccc'
                    }
                  }}
                >
                  {isSubmitting ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={16} color="inherit" />
                      Posting...
                    </Box>
                  ) : (
                    "Post Announcement"
                  )}
                </Button>
              </DialogActions>
            </Stack>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!viewAnnouncement} onClose={() => setViewAnnouncement(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Announcement Details</DialogTitle>
        <DialogContent dividers>
          {viewAnnouncement && (
            <Box>
              <Typography variant="h6" fontWeight={700}>{viewAnnouncement.title}</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography><b>Audience:</b> {viewAnnouncement.audience}</Typography>
              <Typography><b>Visibility:</b> {viewAnnouncement.visibility === "private" ? "Private" : "Public"}</Typography>
              <Typography><b>Date:</b> {viewAnnouncement.date ? new Date(viewAnnouncement.date).toLocaleDateString() : ''}</Typography>
              <Typography sx={{ mt: 2 }}>{viewAnnouncement.message}</Typography>
              {viewAnnouncement.photoUrl && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <img
                    src={viewAnnouncement.photoUrl}
                    alt="Announcement"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      display: 'block'
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewAnnouncement(null)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={!!editAnnouncement} onClose={() => setEditAnnouncement(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Announcement</DialogTitle>
        <DialogContent dividers>
          {editAnnouncement && (
            <Box component="form" onSubmit={e => { e.preventDefault(); handleEditSave(editAnnouncement); }}>
              <TextField label="Title" value={editAnnouncement.title} onChange={e => setEditAnnouncement({ ...editAnnouncement, title: e.target.value })} fullWidth sx={{ mb: 1 }} />
              <TextField label="Message" value={editAnnouncement.message} onChange={e => setEditAnnouncement({ ...editAnnouncement, message: e.target.value })} fullWidth multiline minRows={1} sx={{ mb: 1 }} />
              <TextField label="Audience" value={editAnnouncement.audience} onChange={e => setEditAnnouncement({ ...editAnnouncement, audience: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                {audiences.map((aud) => <MenuItem key={aud} value={aud}>{aud}</MenuItem>)}
              </TextField>
              <TextField label="Post Visibility" value={editAnnouncement.visibility || "public"} onChange={e => setEditAnnouncement({ ...editAnnouncement, visibility: e.target.value })} select fullWidth sx={{ mb: 1 }}>
                <MenuItem value="public">Public</MenuItem>
                <MenuItem value="private">Private</MenuItem>
              </TextField>
              <TextField label="Date" type="date" value={editAnnouncement.date} onChange={e => setEditAnnouncement({ ...editAnnouncement, date: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth sx={{ mb: 1 }} />
              <DialogActions>
                <Button onClick={() => setEditAnnouncement(null)} color="secondary">Cancel</Button>
                <Button type="submit" variant="contained" color="primary">Save</Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      </Box>
    </Box>
  );
} 