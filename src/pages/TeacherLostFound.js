import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, TextField, Button, Snackbar, Alert, MenuItem, Card, CardContent, Chip, Avatar, useTheme, Tabs, Tab, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Modal, Fade, Backdrop } from '@mui/material';
import { Add, Search, ThumbUp, Comment, AdminPanelSettings, Person, LocationOn, AccessTime, CloudUpload, Reply, Favorite, History, Visibility } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function TeacherLostFound({ currentUser: propCurrentUser, userProfile }) {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({ type: 'lost', name: '', description: '', location: '', image: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [allItems, setAllItems] = useState([]);
  const [userLikes, setUserLikes] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentDialog, setCommentDialog] = useState({ open: false, itemId: null, itemType: '' });
  const [replyDialog, setReplyDialog] = useState({ open: false, itemId: null, itemType: '', parentCommentId: null });
  const [newReply, setNewReply] = useState('');
  const [commentLikes, setCommentLikes] = useState({});
  const [historyModal, setHistoryModal] = useState({ open: false, type: '', items: [] });
  const [addItemModal, setAddItemModal] = useState({ open: false, type: '' });
  const [viewCommentsModal, setViewCommentsModal] = useState({ open: false, itemId: null, itemType: '', comments: [] });

  // Use passed currentUser prop or fallback to auth state
  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });
      return () => unsubscribe();
    }
  }, [propCurrentUser]);

  useEffect(() => {
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      const lostData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'lost' }));
      console.log('Teacher - Lost items updated:', lostData);
      setLostItems(lostData);
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      const foundData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'found' }));
      console.log('Teacher - Found items updated:', foundData);
      setFoundItems(foundData);
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

  // Combine all items for the social feed
  useEffect(() => {
    const combined = [...lostItems, ...foundItems].sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
    setAllItems(combined);
  }, [lostItems, foundItems]);

  // Load user's like status
  useEffect(() => {
    if (!currentUser?.email) return;

    const loadUserLikes = async () => {
      try {
        const allItems = [...lostItems, ...foundItems];
        const likeStatus = {};
        
        for (const item of allItems) {
          const collectionName = item.type === 'lost' ? 'lost_items' : 'found_items';
          const itemRef = doc(db, collectionName, item.id);
          const itemDoc = await getDoc(itemRef);
          
          if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            const likes = itemData.likes || [];
            likeStatus[`${item.type}-${item.id}`] = likes.includes(currentUser.email);
          }
        }
        
        setUserLikes(likeStatus);
      } catch (err) {
        console.error('Error loading user likes:', err);
      }
    };

    loadUserLikes();
  }, [currentUser?.email, lostItems, foundItems]);

  // Image upload handler
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
      return;
    }

    if (file.size > 200 * 1024) { // 200KB limit
      setSnackbar({ open: true, message: "Image file size must be less than 200KB", severity: "error" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setForm(f => ({ ...f, image: e.target.result }));
      setSnackbar({ open: true, message: "Image loaded!", severity: "success" });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: 'Please enter an item name', severity: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = { 
        ...form, 
        resolved: false, 
        createdAt: new Date().toISOString(),
        postedBy: (userProfile?.role === 'Teacher' || currentUser?.role === 'Teacher') ? 'teacher' : 'student',
        reportedBy: currentUser?.email
      };
      const col = form.type === 'lost' ? 'lost_items' : 'found_items';
      await addDoc(collection(db, col), payload);
      setForm({ type: form.type, name: '', description: '', location: '', image: null });
      setAddItemModal({ open: false, type: '' });
      setSnackbar({ open: true, message: `${form.type === 'lost' ? 'Lost' : 'Found'} item submitted!`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Submit failed: ' + err.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Like functionality
  const handleLike = async (itemId, itemType) => {
    if (!currentUser?.email) {
      setSnackbar({ open: true, message: 'Please log in to like posts.', severity: 'error' });
      return;
    }

    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) {
        setSnackbar({ open: true, message: 'Post not found.', severity: 'error' });
        return;
      }

      const itemData = itemDoc.data();
      const currentLikes = itemData.likes || [];
      const isLiked = currentLikes.includes(currentUser.email);

      if (isLiked) {
        // Unlike
        await updateDoc(itemRef, {
          likes: arrayRemove(currentUser.email),
          likeCount: (itemData.likeCount || 0) - 1
        });
        setUserLikes(prev => ({ ...prev, [`${itemType}-${itemId}`]: false }));
      } else {
        // Like
        await updateDoc(itemRef, {
          likes: arrayUnion(currentUser.email),
          likeCount: (itemData.likeCount || 0) + 1
        });
        setUserLikes(prev => ({ ...prev, [`${itemType}-${itemId}`]: true }));
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      setSnackbar({ open: true, message: 'Failed to update like.', severity: 'error' });
    }
  };


  // Check if user has liked a post
  const hasUserLiked = (item) => {
    return userLikes[`${item.type}-${item.id}`] || false;
  };

  // Comment functionality
  const handleAddComment = async () => {
    if (!newComment.trim() || !commentDialog.itemId) return;
    
    try {
      const collectionName = commentDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, commentDialog.itemId);
      
      const commentData = {
        id: Date.now().toString(),
        text: newComment.trim(),
        authorName: currentUser?.displayName || currentUser?.email || 'Anonymous',
        authorEmail: currentUser?.email,
        authorProfilePic: currentUser?.photoURL || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        likes: [],
        likeCount: 0,
        replies: []
      };
      
      await updateDoc(itemRef, {
        comments: arrayUnion(commentData)
      });
      
      setNewComment('');
      setCommentDialog({ open: false, itemId: null, itemType: '' });
      setSnackbar({ open: true, message: 'Comment added successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to add comment.', severity: 'error' });
    }
  };

  // Reply functionality
  const handleAddReply = async () => {
    if (!newReply.trim() || !replyDialog.itemId) {
      setSnackbar({ open: true, message: 'Please enter a reply.', severity: 'error' });
      return;
    }
    
    try {
      console.log('Adding reply:', {
        itemId: replyDialog.itemId,
        itemType: replyDialog.itemType,
        parentCommentId: replyDialog.parentCommentId,
        replyText: newReply.trim()
      });

      const collectionName = replyDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, replyDialog.itemId);
      
      const replyData = {
        id: Date.now().toString(),
        text: newReply.trim(),
        authorName: currentUser?.displayName || currentUser?.email || 'Anonymous',
        authorEmail: currentUser?.email,
        authorProfilePic: currentUser?.photoURL || '',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        likes: [],
        likeCount: 0
      };
      
      // Get current item data
      const itemDoc = await getDoc(itemRef);
      if (!itemDoc.exists()) {
        setSnackbar({ open: true, message: 'Item not found.', severity: 'error' });
        return;
      }

      const itemData = itemDoc.data();
      const comments = itemData.comments || [];
      
      console.log('Current comments:', comments);
      console.log('Looking for parent comment ID:', replyDialog.parentCommentId);
      
      // Find the parent comment and add reply
      let found = false;
      const updatedComments = comments.map((comment, index) => {
        console.log(`Checking comment ${index}:`, {
          commentId: comment.id,
          parentCommentId: replyDialog.parentCommentId,
          index: index.toString()
        });
        
        // Try multiple matching strategies
        const isMatch = comment.id === replyDialog.parentCommentId || 
                       (index.toString() === replyDialog.parentCommentId) ||
                       (comment.id && comment.id.toString() === replyDialog.parentCommentId);
        
        if (isMatch) {
          console.log('Found matching comment, adding reply');
          found = true;
          return {
              ...comment,
              id: comment.id || `comment_${Date.now()}_${index}`,
              replies: [...(comment.replies || []), replyData]
            };
        }
        return comment;
      });
      
      if (!found) {
        console.error('Parent comment not found');
        setSnackbar({ open: true, message: 'Parent comment not found.', severity: 'error' });
        return;
      }
      
      console.log('Updating comments:', updatedComments);
      await updateDoc(itemRef, { comments: updatedComments });
      
      setNewReply('');
      setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null });
      setSnackbar({ open: true, message: 'Reply added successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error adding reply:', err);
      setSnackbar({ open: true, message: 'Failed to add reply: ' + err.message, severity: 'error' });
    }
  };

  // Comment like functionality
  const handleCommentLike = async (itemId, itemType, commentId, isReply = false, parentCommentId = null) => {
    if (!currentUser?.email) {
      setSnackbar({ open: true, message: 'Please log in to like comments.', severity: 'error' });
      return;
    }

    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, itemId);
      const itemDoc = await getDoc(itemRef);
      
      if (!itemDoc.exists()) return;
      
      const itemData = itemDoc.data();
      const comments = itemData.comments || [];
      
      const updatedComments = comments.map(comment => {
        if (isReply && comment.id === parentCommentId) {
          // Handle reply like
          const updatedReplies = comment.replies.map(reply => {
            if (reply.id === commentId) {
              const currentLikes = reply.likes || [];
              const isLiked = currentLikes.includes(currentUser.email);
              
              return {
                ...reply,
                likes: isLiked 
                  ? currentLikes.filter(email => email !== currentUser.email)
                  : [...currentLikes, currentUser.email],
                likeCount: isLiked ? (reply.likeCount || 0) - 1 : (reply.likeCount || 0) + 1
              };
            }
            return reply;
          });
          
          return { ...comment, replies: updatedReplies };
        } else if (!isReply && comment.id === commentId) {
          // Handle main comment like
          const currentLikes = comment.likes || [];
          const isLiked = currentLikes.includes(currentUser.email);
          
          return {
            ...comment,
            likes: isLiked 
              ? currentLikes.filter(email => email !== currentUser.email)
              : [...currentLikes, currentUser.email],
            likeCount: isLiked ? (comment.likeCount || 0) - 1 : (comment.likeCount || 0) + 1
          };
        }
        return comment;
      });
      
      await updateDoc(itemRef, { comments: updatedComments });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to update comment like.', severity: 'error' });
    }
  };

  // Check if user has liked a comment
  const hasUserLikedComment = (comment, isReply = false) => {
    if (!currentUser?.email) return false;
    const likes = comment.likes || [];
    return likes.includes(currentUser.email);
  };

  // Handle opening view comments modal
  const handleViewComments = (item) => {
    setViewCommentsModal({
      open: true,
      itemId: item.id,
      itemType: item.type,
      comments: item.comments || []
    });
  };

  // Handle opening history modal
  const handleOpenHistory = (type) => {
    const items = type === 'found' ? foundItems : lostItems;
    setHistoryModal({ open: true, type, items });
  };

  // Handle closing history modal
  const handleCloseHistory = () => {
    setHistoryModal({ open: false, type: '', items: [] });
  };

  // Handle opening add item modal
  const handleOpenAddItem = (type) => {
    setAddItemModal({ open: true, type });
    setForm({ type, name: '', description: '', location: '', image: null });
  };

  // Handle closing add item modal
  const handleCloseAddItem = () => {
    setAddItemModal({ open: false, type: '' });
    setForm({ type: 'lost', name: '', description: '', location: '', image: null });
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (item.postedBy === 'admin' || (item.reportedBy && !item.reportedBy.includes('@'))) {
      return {
        name: 'Admin',
        icon: <AdminPanelSettings />,
        color: 'primary'
      };
    } else if (item.postedBy === 'teacher' || (item.reportedBy && item.reportedBy === currentUser?.email && (userProfile?.role === 'Teacher' || currentUser?.role === 'Teacher'))) {
      return {
        name: 'Teacher',
        icon: <Person />,
        color: 'secondary'
      };
    } else {
      return {
        name: 'Student',
        icon: <Person />,
        color: 'default'
      };
    }
  };

  const filteredLost = lostItems.filter(i =>
    (i.name || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(lostSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(lostSearch.toLowerCase())
  );

  const filteredFound = foundItems.filter(i =>
    (i.name || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.description || '').toLowerCase().includes(foundSearch.toLowerCase()) ||
    (i.location || '').toLowerCase().includes(foundSearch.toLowerCase())
  );

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Lost & Found
      </Typography>

      {/* History Stat Cards */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          {/* Found Items History Card */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                border: '1px solid rgba(76, 175, 80, 0.3)',
                borderLeft: '4px solid #4caf50',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(76, 175, 80, 0.3)',
                  borderColor: '#4caf50'
                }
              }}
              onClick={() => handleOpenHistory('found')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      bgcolor: 'rgba(76, 175, 80, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <History sx={{ color: '#4caf50', fontSize: 28 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                        fontWeight: 700,
                        mb: 0.5
                      }}>
                        Found Item History
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        mb: 1
                      }}>
                        View all found items records
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`Total: ${foundItems.length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            color: '#4caf50',
                            border: '1px solid #4caf50'
                          }} 
                        />
                        <Chip 
                          label={`Resolved: ${foundItems.filter(item => item.resolved).length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            color: '#4caf50',
                            border: '1px solid #4caf50'
                          }} 
                        />
                        <Chip 
                          label={`Active: ${foundItems.filter(item => !item.resolved).length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(76, 175, 80, 0.1)',
                            color: '#4caf50',
                            border: '1px solid #4caf50'
                          }} 
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Visibility sx={{ color: '#4caf50', fontSize: 24 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Lost Items History Card */}
          <Grid item xs={12} md={6}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                border: '1px solid rgba(128, 0, 0, 0.3)',
                borderLeft: '4px solid #800000',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 25px rgba(128, 0, 0, 0.3)',
                  borderColor: '#800000'
                }
              }}
              onClick={() => handleOpenHistory('lost')}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ 
                      p: 2, 
                      borderRadius: '50%', 
                      bgcolor: 'rgba(128, 0, 0, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <History sx={{ color: '#800000', fontSize: 28 }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                        fontWeight: 700,
                        mb: 0.5
                      }}>
                        Lost Item History
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        mb: 1
                      }}>
                        View all lost items records
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip 
                          label={`Total: ${lostItems.length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(128, 0, 0, 0.1)',
                            color: '#800000',
                            border: '1px solid #800000'
                          }} 
                        />
                        <Chip 
                          label={`Resolved: ${lostItems.filter(item => item.resolved).length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(128, 0, 0, 0.1)',
                            color: '#800000',
                            border: '1px solid #800000'
                          }} 
                        />
                        <Chip 
                          label={`Active: ${lostItems.filter(item => !item.resolved).length}`} 
                          size="small"
                          sx={{ 
                            bgcolor: 'rgba(128, 0, 0, 0.1)',
                            color: '#800000',
                            border: '1px solid #800000'
                          }} 
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Visibility sx={{ color: '#800000', fontSize: 24 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column - Found Items */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff' }}>
            {/* Found Items Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#4caf50',
                  display: 'inline-block'
                }} />
                Found Items
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenAddItem('found')}
                sx={{
                  bgcolor: 'transparent',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  border: theme.palette.mode === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
                  px: 2,
                  py: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: '#4caf50',
                    color: '#ffffff',
                    border: '1px solid #4caf50',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
                startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
              >
                Add Found Item
              </Button>
            </Box>

            {/* Found Items Search */}
            <TextField
              fullWidth
              placeholder="Search found items..." 
              value={foundSearch}
              onChange={e => setFoundSearch(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            {/* Found Items List */}
            <Box sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredFound.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                  <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                    No found items yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                    Be the first to report a found item!
                  </Typography>
                </Paper>
              ) : filteredFound.map(item => {
                const posterInfo = getPosterInfo(item);
                
                return (
                  <Paper 
                    key={`found-${item.id}`} 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                      borderRadius: 1.5,
                      borderLeft: '3px solid #4caf50'
                    }}
                  >
                    {/* Item Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar 
                          src={posterInfo.name === 'Teacher' && currentUser?.photoURL ? currentUser.photoURL : undefined}
                          sx={{ 
                            bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                   posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                            width: 32,
                            height: 32
                          }}
                        >
                          {posterInfo.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600, 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                            fontSize: '1rem'
                          }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontSize: '0.75rem'
                          }}>
                            {posterInfo.name} • {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={item.resolved ? 'Resolved' : 'Active'} 
                          color={item.resolved ? 'success' : 'warning'} 
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      </Box>
                    </Box>

                    {/* Item Content */}
                    <Typography variant="body2" sx={{ 
                      mb: 1.5, 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      fontSize: '0.9rem',
                      lineHeight: 1.4
                    }}>
                      {item.description}
                    </Typography>

                    {/* Image */}
                    {item.image && (
                      <Box sx={{ mb: 1.5 }}>
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          style={{ 
                            width: '100%', 
                            maxWidth: '200px',
                            height: 'auto', 
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                          }}
                        />
                      </Box>
                    )}

                    {/* Location and Time */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          fontSize: '0.75rem'
                        }}>
                          {item.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          fontSize: '0.75rem'
                        }}>
                          Found: {item.timeFound || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                      <Button
                        startIcon={<Comment />}
                        onClick={() => setCommentDialog({ open: true, itemId: item.id, itemType: item.type })}
                        sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
                      >
                        Comment {item.comments?.length > 0 && `(${item.comments.length})`}
                      </Button>
                      {item.comments?.length > 0 && (
                        <Button
                          startIcon={<Visibility />}
                          onClick={() => handleViewComments(item)}
                          sx={{ 
                            color: '#4caf50',
                            '&:hover': {
                              color: '#45a049',
                              backgroundColor: 'rgba(76, 175, 80, 0.1)'
                            }
                          }}
                        >
                          View Comments ({item.comments.length})
                        </Button>
                      )}
                      <Button
                        startIcon={<ThumbUp />}
                        onClick={() => handleLike(item.id, item.type)}
                        sx={{ 
                          color: hasUserLiked(item) ? '#1976d2' : (theme.palette.mode === 'dark' ? '#ffffff' : '#666666'),
                          '&:hover': {
                            color: hasUserLiked(item) ? '#1565c0' : '#1976d2'
                          }
                        }}
                      >
                        Like {item.likeCount > 0 && `(${item.likeCount})`}
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Right Column - Lost Items */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff' }}>
            {/* Lost Items Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5" sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Box sx={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  bgcolor: '#800000',
                  display: 'inline-block'
                }} />
                Lost Items
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleOpenAddItem('lost')}
                sx={{
                  bgcolor: 'transparent',
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  border: theme.palette.mode === 'dark' ? '1px solid #ffffff' : '1px solid #000000',
                  px: 2,
                  py: 1,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  borderRadius: 1,
                  '&:hover': {
                    bgcolor: '#800000',
                    color: '#ffffff',
                    border: '1px solid #800000',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 2px 8px rgba(128, 0, 0, 0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
                startIcon={<Add sx={{ fontSize: '0.875rem' }} />}
              >
                Add Lost Item
              </Button>
            </Box>

            {/* Lost Items Search */}
            <TextField
              fullWidth
              placeholder="Search lost items..." 
              value={lostSearch}
              onChange={e => setLostSearch(e.target.value)}
              size="small"
              sx={{ mb: 3 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />

            {/* Lost Items List */}
            <Box sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {filteredLost.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                  <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                    No lost items yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                    Be the first to report a lost item!
                  </Typography>
                </Paper>
              ) : filteredLost.map(item => {
                const posterInfo = getPosterInfo(item);
                
                return (
                  <Paper 
                    key={`lost-${item.id}`} 
                    sx={{ 
                      mb: 2, 
                      p: 2,
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                      border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                      borderRadius: 1.5,
                      borderLeft: '3px solid #800000'
                    }}
                  >
                    {/* Item Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar 
                          src={posterInfo.name === 'Teacher' && currentUser?.photoURL ? currentUser.photoURL : undefined}
                          sx={{ 
                            bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                   posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                            width: 32,
                            height: 32
                          }}
                        >
                          {posterInfo.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600, 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                            fontSize: '1rem'
                          }}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontSize: '0.75rem'
                          }}>
                            {posterInfo.name} • {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={item.resolved ? 'Resolved' : 'Active'} 
                          color={item.resolved ? 'success' : 'warning'} 
                          size="small"
                          sx={{ fontSize: '0.75rem', height: 24 }}
                        />
                      </Box>
                    </Box>

                    {/* Item Content */}
                    <Typography variant="body2" sx={{ 
                      mb: 1.5, 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      fontSize: '0.9rem',
                      lineHeight: 1.4
                    }}>
                      {item.description}
                    </Typography>

                    {/* Image */}
                    {item.image && (
                      <Box sx={{ mb: 1.5 }}>
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          style={{ 
                            width: '100%', 
                            maxWidth: '200px',
                            height: 'auto', 
                            objectFit: 'cover',
                            borderRadius: '6px',
                            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                          }}
                        />
                      </Box>
                    )}

                    {/* Location and Time */}
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          fontSize: '0.75rem'
                        }}>
                          {item.location}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime sx={{ fontSize: 14, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                        <Typography variant="caption" sx={{ 
                          color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                          fontSize: '0.75rem'
                        }}>
                          Lost: {item.timeLost || 'Unknown'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                      <Button
                        startIcon={<Comment />}
                        onClick={() => setCommentDialog({ open: true, itemId: item.id, itemType: item.type })}
                        sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
                      >
                        Comment {item.comments?.length > 0 && `(${item.comments.length})`}
                      </Button>
                      {item.comments?.length > 0 && (
                        <Button
                          startIcon={<Visibility />}
                          onClick={() => handleViewComments(item)}
                          sx={{ 
                            color: '#800000',
                            '&:hover': {
                              color: '#6b0000',
                              backgroundColor: 'rgba(128, 0, 0, 0.1)'
                            }
                          }}
                        >
                          View Comments ({item.comments.length})
                        </Button>
                      )}
                      <Button
                        startIcon={<ThumbUp />}
                        onClick={() => handleLike(item.id, item.type)}
                        sx={{ 
                          color: hasUserLiked(item) ? '#1976d2' : (theme.palette.mode === 'dark' ? '#ffffff' : '#666666'),
                          '&:hover': {
                            color: hasUserLiked(item) ? '#1565c0' : '#1976d2'
                          }
                        }}
                      >
                        Like {item.likeCount > 0 && `(${item.likeCount})`}
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>


      {/* Comment Dialog */}
      <Dialog open={commentDialog.open} onClose={() => setCommentDialog({ open: false, itemId: null, itemType: '' })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
          Add Comment
        </DialogTitle>
        <DialogContent>
                <TextField
            autoFocus
            margin="dense"
            label="Your comment"
                  fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
                  sx={{ 
              mt: 2,
                    '& .MuiOutlinedInput-root': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                },
                      '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCommentDialog({ open: false, itemId: null, itemType: '' })}
            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddComment}
            variant="contained"
            sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
          >
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onClose={() => setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null })} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
          Reply to Comment
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Your reply"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newReply}
            onChange={e => setNewReply(e.target.value)}
                            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                '& fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                },
              },
              '& .MuiInputLabel-root': {
                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReplyDialog({ open: false, itemId: null, itemType: '', parentCommentId: null })}
            sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddReply}
            variant="contained"
            sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' } }}
          >
            Add Reply
          </Button>
        </DialogActions>
      </Dialog>


      {/* Add Item Modal */}
      <Modal
        open={addItemModal.open}
        onClose={handleCloseAddItem}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={addItemModal.open}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: '80%', md: '60%', lg: '50%' },
            maxWidth: 600,
            maxHeight: '90vh',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <Box sx={{ p: 3 }}>
              {/* Modal Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Add sx={{ color: addItemModal.type === 'lost' ? '#800000' : '#4caf50' }} />
                  Report {addItemModal.type === 'lost' ? 'Lost' : 'Found'} Item
                </Typography>
                <IconButton onClick={handleCloseAddItem} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <TextField 
                  fullWidth 
                  size="medium" 
                  label="Item Name" 
                  value={form.name} 
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
                  sx={{ mb: 3 }} 
                  required
                />
                <TextField 
                  fullWidth 
                  size="medium" 
                  label="Description" 
                  multiline 
                  minRows={3} 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  sx={{ mb: 3 }} 
                  required
                />
                <TextField 
                  fullWidth 
                  size="medium" 
                  label="Location" 
                  value={form.location} 
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))} 
                  sx={{ mb: 3 }} 
                  required
                />
                
                {/* Image Upload */}
                <Box sx={{ mb: 3 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    sx={{ mb: 2 }}
                  >
                    Upload Image
                    <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
                  </Button>
                  {form.image && (
                    <Box sx={{ mt: 2 }}>
                      <img 
                        src={form.image} 
                        alt={addItemModal.type} 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          borderRadius: '8px',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                        }} 
                      />
                    </Box>
                  )}
                </Box>
                
                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    onClick={handleCloseAddItem}
                    sx={{
                      textTransform: 'none',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      px: 3
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    disabled={submitting} 
                    sx={{
                      textTransform: 'none', 
                      bgcolor: addItemModal.type === 'lost' ? '#800000' : '#4caf50', 
                      color: '#fff',
                      px: 3,
                      '&:hover': { 
                        bgcolor: addItemModal.type === 'lost' ? '#d32f2f' : '#388e3c'
                      }
                    }}
                  >
                    {submitting ? 'Submitting...' : `Submit ${addItemModal.type === 'lost' ? 'Lost' : 'Found'} Item`}
                  </Button>
                </Box>
              </form>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* History Modal */}
      <Modal
        open={historyModal.open}
        onClose={handleCloseHistory}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={historyModal.open}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '95%', sm: '90%', md: '80%', lg: '70%' },
            maxWidth: 1200,
            maxHeight: '90vh',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: 2,
            boxShadow: 24,
            overflow: 'auto',
            backdropFilter: 'blur(10px)',
            border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)'
          }}>
            <Box sx={{ p: 3 }}>
              {/* Modal Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <History sx={{ color: historyModal.type === 'lost' ? '#800000' : '#4caf50' }} />
                  {historyModal.type === 'lost' ? 'Lost Item' : 'Found Item'} History
                </Typography>
                <IconButton onClick={handleCloseHistory} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              {/* History Items List */}
              <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {historyModal.items.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                    <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                      No {historyModal.type} items in history
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                      {historyModal.type === 'lost' ? 'Lost' : 'Found'} items will appear here once reported
                    </Typography>
                  </Paper>
                ) : historyModal.items.map(item => {
                  const posterInfo = getPosterInfo(item);
                  
                  return (
                    <Paper 
                      key={`${historyModal.type}-history-${item.id}`} 
                      sx={{ 
                        mb: 2, 
                        p: 3,
                        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                        border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                        borderRadius: 1.5,
                        borderLeft: historyModal.type === 'lost' ? '4px solid #800000' : '4px solid #4caf50'
                      }}
                    >
                      {/* Item Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={posterInfo.name === 'Teacher' && currentUser?.photoURL ? currentUser.photoURL : undefined}
                            sx={{ 
                              bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                   posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                              width: 40,
                              height: 40
                            }}
                          >
                            {posterInfo.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ 
                              fontWeight: 600, 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              fontSize: '1.1rem'
                            }}>
                              {item.name}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              fontSize: '0.9rem'
                            }}>
                              {posterInfo.name} • {new Date(item.createdAt?.toDate?.() || item.createdAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            label={item.resolved ? 'Resolved' : 'Active'} 
                            color={item.resolved ? 'success' : 'warning'} 
                            size="small"
                            sx={{ fontSize: '0.8rem', height: 28 }}
                          />
                        </Box>
                      </Box>

                      {/* Item Content */}
                      <Typography variant="body1" sx={{ 
                        mb: 2, 
                        color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                        fontSize: '1rem',
                        lineHeight: 1.5
                      }}>
                        {item.description}
                      </Typography>

                      {/* Image */}
                      {item.image && (
                        <Box sx={{ mb: 2 }}>
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            style={{ 
                              width: '100%', 
                              maxWidth: '300px',
                              height: 'auto', 
                              objectFit: 'cover',
                              borderRadius: '8px',
                              border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                            }}
                          />
                        </Box>
                      )}

                      {/* Location and Time */}
                      <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontSize: '0.9rem'
                          }}>
                            {item.location}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }} />
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                            fontSize: '0.9rem'
                          }}>
                            {historyModal.type === 'lost' ? `Lost: ${item.timeLost || 'Unknown'}` : `Found: ${item.timeFound || 'Unknown'}`}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Action Buttons */}
                      <Box sx={{ display: 'flex', gap: 2, mt: 2, pt: 2, borderTop: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                        <Button
                          startIcon={<Comment />}
                          onClick={() => setCommentDialog({ open: true, itemId: item.id, itemType: item.type })}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                            borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000'
                          }}
                        >
                          Comment {item.comments?.length > 0 && `(${item.comments.length})`}
                        </Button>
                        <Button
                          startIcon={<ThumbUp />}
                          onClick={() => handleLike(item.id, item.type)}
                          variant="outlined"
                          size="small"
                          sx={{ 
                            color: hasUserLiked(item) ? '#1976d2' : (theme.palette.mode === 'dark' ? '#ffffff' : '#000000'),
                            borderColor: hasUserLiked(item) ? '#1976d2' : (theme.palette.mode === 'dark' ? '#ffffff' : '#000000')
                          }}
                        >
                          Like {item.likeCount > 0 && `(${item.likeCount})`}
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* View Comments Modal */}
      <Dialog 
        open={viewCommentsModal.open} 
        onClose={() => setViewCommentsModal({ open: false, itemId: null, itemType: '', comments: [] })}
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
          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Comment sx={{ color: '#4caf50' }} />
          Comments ({viewCommentsModal.comments.length})
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {viewCommentsModal.comments.length > 0 ? (
            <Box sx={{ maxHeight: '60vh', overflow: 'auto', p: 2 }}>
              {viewCommentsModal.comments.map((comment, index) => (
                <Paper key={comment.id || index} sx={{ 
                  p: 2, 
                  mb: 2, 
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5',
                  border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#4caf50' }}>
                      <Person sx={{ fontSize: 16 }} />
                    </Avatar>
                    <Typography variant="subtitle2" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                      fontWeight: 600
                    }}>
                      {comment.authorName || 'Anonymous'}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                      ml: 'auto'
                    }}>
                      {comment.timestamp ? new Date(comment.timestamp.toDate ? comment.timestamp.toDate() : comment.timestamp).toLocaleString() : 'Unknown time'}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                    mb: 1
                  }}>
                    {comment.text}
                  </Typography>
                  
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      {comment.replies.map((reply, replyIndex) => (
                        <Paper key={reply.id || replyIndex} sx={{ 
                          p: 1.5, 
                          mb: 1, 
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #e0e0e0'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: '#2196f3' }}>
                              <Reply sx={{ fontSize: 12 }} />
                            </Avatar>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                              fontWeight: 600
                            }}>
                              {reply.authorName || 'Anonymous'}
                            </Typography>
                            <Typography variant="caption" sx={{ 
                              color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                              ml: 'auto',
                              fontSize: '0.7rem'
                            }}>
                              {reply.timestamp ? new Date(reply.timestamp.toDate ? reply.timestamp.toDate() : reply.timestamp).toLocaleString() : 'Unknown time'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ 
                            color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                            fontSize: '0.85rem'
                          }}>
                            {reply.text}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Comment sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Comments Yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Be the first to comment on this item!
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5' }}>
          <Button 
            onClick={() => setViewCommentsModal({ open: false, itemId: null, itemType: '', comments: [] })}
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
              setViewCommentsModal({ open: false, itemId: null, itemType: '', comments: [] });
              setCommentDialog({ open: true, itemId: viewCommentsModal.itemId, itemType: viewCommentsModal.itemType });
            }}
            variant="contained"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#4caf50', 
              '&:hover': { 
                bgcolor: '#45a049' 
              }
            }}
          >
            Add Comment
          </Button>
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