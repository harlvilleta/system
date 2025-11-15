import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, TextField, Button, Paper, Avatar, Snackbar, Alert, 
  Chip, Divider, Badge, IconButton, Tooltip, useTheme, Dialog, DialogTitle, DialogContent, DialogActions, Modal, Fade, Backdrop
} from "@mui/material";
import { 
  Search, Add, CloudUpload, AdminPanelSettings, Person, Visibility, 
  LocationOn, AccessTime, ContactSupport, Comment, Delete, ThumbUp, Reply, Favorite, History, CheckCircle
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc, serverTimestamp, where, getDocs } from "firebase/firestore";

export default function UserLostFound({ currentUser }) {
  const theme = useTheme();
  const [lostForm, setLostForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeLost: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [foundForm, setFoundForm] = useState({ 
    name: '', 
    description: '', 
    location: '', 
    image: null, 
    timeFound: '', 
    contactInfo: currentUser?.email || '' 
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [lostItems, setLostItems] = useState([]);
  const [foundItems, setFoundItems] = useState([]);
  const [lostSearch, setLostSearch] = useState('');
  const [foundSearch, setFoundSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'student', 'admin'
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState('');
  const [commentDialog, setCommentDialog] = useState({ open: false, itemId: null, itemType: '' });
  const [replyDialog, setReplyDialog] = useState({ open: false, itemId: null, itemType: '', parentCommentId: null });
  const [newReply, setNewReply] = useState('');
  const [commentLikes, setCommentLikes] = useState({});
  const [allItems, setAllItems] = useState([]);
  const [likes, setLikes] = useState({});
  const [shares, setShares] = useState({});
  const [userLikes, setUserLikes] = useState({});
  const [shareDialog, setShareDialog] = useState({ open: false, item: null });
  const [lostFormModal, setLostFormModal] = useState(false);
  const [foundFormModal, setFoundFormModal] = useState(false);
  const [historyModal, setHistoryModal] = useState({ open: false, type: '', items: [] });
  const [claimedItemsModal, setClaimedItemsModal] = useState({ open: false, items: [], loading: false });
  const [resolvedItemsModal, setResolvedItemsModal] = useState({ open: false, items: [], loading: false });
  const [claimedSearch, setClaimedSearch] = useState('');
  const [resolvedSearch, setResolvedSearch] = useState('');

  useEffect(() => {
    const unsubLost = onSnapshot(query(collection(db, 'lost_items'), orderBy('createdAt', 'desc')), snap => {
      const lostData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'lost' }));
      console.log('User - Lost items updated:', lostData);
      setLostItems(lostData);
    });
    const unsubFound = onSnapshot(query(collection(db, 'found_items'), orderBy('createdAt', 'desc')), snap => {
      const foundData = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'found' }));
      console.log('User - Found items updated:', foundData);
      setFoundItems(foundData);
    });
    return () => { unsubLost(); unsubFound(); };
  }, []);

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

  // Combine all items for the social feed
  useEffect(() => {
    const combined = [...lostItems, ...foundItems].sort((a, b) => new Date(b.createdAt?.toDate?.() || b.createdAt) - new Date(a.createdAt?.toDate?.() || a.createdAt));
    setAllItems(combined);
  }, [lostItems, foundItems]);

  const handleLostImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setSnackbar({ open: true, message: "Image file size must be less than 5MB", severity: "error" });
        return;
      }
      
      // Check image dimensions
      const img = new Image();
      img.onload = () => {
        const minWidth = 400;
        const minHeight = 300;
        const maxWidth = 2000;
        const maxHeight = 2000;
        
        if (img.width < minWidth || img.height < minHeight) {
          setSnackbar({ 
            open: true, 
            message: `Image must be at least ${minWidth}x${minHeight} pixels. Current: ${img.width}x${img.height}`, 
            severity: "error" 
          });
          return;
        }
        
        if (img.width > maxWidth || img.height > maxHeight) {
          setSnackbar({ 
            open: true, 
            message: `Image must be no larger than ${maxWidth}x${maxHeight} pixels. Current: ${img.width}x${img.height}`, 
            severity: "error" 
          });
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setLostForm(f => ({ ...f, image: reader.result }));
          setSnackbar({ open: true, message: "Image loaded successfully!", severity: "success" });
        };
        reader.readAsDataURL(file);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleFoundImage = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setSnackbar({ open: true, message: "Please select a valid image file", severity: "error" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setSnackbar({ open: true, message: "Image file size must be less than 5MB", severity: "error" });
        return;
      }
      
      // Check image dimensions
      const img = new Image();
      img.onload = () => {
        const minWidth = 400;
        const minHeight = 300;
        const maxWidth = 2000;
        const maxHeight = 2000;
        
        if (img.width < minWidth || img.height < minHeight) {
          setSnackbar({ 
            open: true, 
            message: `Image must be at least ${minWidth}x${minHeight} pixels. Current: ${img.width}x${img.height}`, 
            severity: "error" 
          });
          return;
        }
        
        if (img.width > maxWidth || img.height > maxHeight) {
          setSnackbar({ 
            open: true, 
            message: `Image must be no larger than ${maxWidth}x${maxHeight} pixels. Current: ${img.width}x${img.height}`, 
            severity: "error" 
          });
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setFoundForm(f => ({ ...f, image: reader.result }));
          setSnackbar({ open: true, message: "Image loaded successfully!", severity: "success" });
        };
        reader.readAsDataURL(file);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleLostSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Submit to pending reports for admin approval
      await addDoc(collection(db, 'pending_lost_reports'), { 
        ...lostForm, 
        status: 'pending',
        submittedBy: currentUser?.email,
        submittedByName: currentUser?.displayName || 'Student',
        submittedByPhoto: currentUser?.photoURL || null,
        createdAt: new Date().toISOString(),
        type: 'lost'
      });
      
      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        type: 'lost_item_report',
        title: 'New Lost Item Report',
        message: `${currentUser?.displayName || 'A student'} has submitted a lost item report for "${lostForm.name}"`,
        recipientEmail: 'admin@school.com', // You may need to adjust this
        recipientRole: 'Admin',
        createdAt: serverTimestamp(),
        read: false,
        data: {
          reportType: 'lost',
          itemName: lostForm.name,
          submittedBy: currentUser?.email,
          submittedByName: currentUser?.displayName || 'Student'
        }
      });
      
      setSnackbar({ open: true, message: 'Lost item report submitted for admin approval!', severity: 'success' });
      setLostForm({ name: '', description: '', location: '', image: null, timeLost: '', contactInfo: currentUser?.email || '' });
      setLostFormModal(false);
    } catch (err) {
      console.error('Error submitting lost item report:', err);
      setSnackbar({ open: true, message: 'Failed to submit lost item report.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Submit to pending reports for admin approval
      await addDoc(collection(db, 'pending_found_reports'), { 
        ...foundForm, 
        status: 'pending',
        submittedBy: currentUser?.email,
        submittedByName: currentUser?.displayName || 'Student',
        submittedByPhoto: currentUser?.photoURL || null,
        createdAt: new Date().toISOString(),
        type: 'found'
      });
      
      // Send notification to admin
      await addDoc(collection(db, 'notifications'), {
        type: 'found_item_report',
        title: 'New Found Item Report',
        message: `${currentUser?.displayName || 'A student'} has submitted a found item report for "${foundForm.name}"`,
        recipientEmail: 'admin@school.com', // You may need to adjust this
        recipientRole: 'Admin',
        createdAt: serverTimestamp(),
        read: false,
        data: {
          reportType: 'found',
          itemName: foundForm.name,
          submittedBy: currentUser?.email,
          submittedByName: currentUser?.displayName || 'Student'
        }
      });
      
      setSnackbar({ open: true, message: 'Found item report submitted for admin approval!', severity: 'success' });
      setFoundForm({ name: '', description: '', location: '', image: null, timeFound: '', contactInfo: currentUser?.email || '' });
      setFoundFormModal(false);
    } catch (err) {
      console.error('Error submitting found item report:', err);
      setSnackbar({ open: true, message: 'Failed to submit found item report.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Comment functionality
  const handleAddComment = async () => {
    if (!newComment.trim() || !commentDialog.itemId) return;
    
    try {
      const commentData = {
        id: Date.now().toString(),
        text: newComment.trim(),
        author: currentUser?.email || 'Anonymous',
        authorName: currentUser?.displayName || 'Student',
        authorProfilePic: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        likes: [],
        likeCount: 0,
        replies: []
      };
      
      const collectionName = commentDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      await updateDoc(doc(db, collectionName, commentDialog.itemId), {
        comments: arrayUnion(commentData)
      });

      // Send notification to admin about the comment
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientEmail: 'admin@school.com', // Admin email
          recipientName: 'Administrator',
          title: `💬 New Comment on ${commentDialog.itemType === 'lost' ? 'Lost' : 'Found'} Item`,
          message: `${currentUser?.displayName || 'Student'} commented on a ${commentDialog.itemType} item: "${newComment.substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
          type: 'lost_found_comment',
          itemId: commentDialog.itemId,
          itemType: commentDialog.itemType,
          commentId: commentData.createdAt,
          senderId: currentUser?.uid,
          senderEmail: currentUser?.email,
          senderName: currentUser?.displayName || 'Student',
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'medium'
        });
      } catch (notificationError) {
        console.error('Failed to send admin notification:', notificationError);
        // Don't fail the comment if notification fails
      }
      
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

      const replyData = {
        id: Date.now().toString(),
        text: newReply.trim(),
        author: currentUser?.email || 'Anonymous',
        authorName: currentUser?.displayName || 'Student',
        authorProfilePic: currentUser?.photoURL || '',
        createdAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        likes: [],
        likeCount: 0
      };
      
      const collectionName = replyDialog.itemType === 'lost' ? 'lost_items' : 'found_items';
      const itemRef = doc(db, collectionName, replyDialog.itemId);
      
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

  // Delete post functionality (only for own posts)
  const handleDeletePost = async (itemId, itemType) => {
    try {
      const collectionName = itemType === 'lost' ? 'lost_items' : 'found_items';
      await deleteDoc(doc(db, collectionName, itemId));
      setSnackbar({ open: true, message: 'Post deleted successfully!', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to delete post.', severity: 'error' });
    }
  };

  // Check if user can delete post
  const canDeletePost = (item) => {
    return item.reportedBy === currentUser?.email && item.postedBy === 'student';
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

  // Filter items based on search and view mode
  const getFilteredItems = (items, search) => {
    let filtered = items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())
    );

    // Filter by view mode
    if (viewMode === 'student') {
      filtered = filtered.filter(item => item.postedBy === 'student' || !item.postedBy);
    } else if (viewMode === 'admin') {
      filtered = filtered.filter(item => item.postedBy === 'admin');
    }

    return filtered;
  };

  // Helper function to determine if item is posted by admin
  const isAdminPost = (item) => {
    return item.postedBy === 'admin' || 
           (item.reportedBy && !item.reportedBy.includes('@') && item.reportedBy !== currentUser?.email);
  };

  // Helper function to get poster info
  const getPosterInfo = (item) => {
    if (isAdminPost(item)) {
      return {
        name: 'Admin',
        icon: <AdminPanelSettings />,
        color: 'primary'
      };
    } else if (item.postedBy === 'teacher' || (item.reportedBy && item.reportedBy === currentUser?.email && currentUser?.role === 'Teacher')) {
      return {
        name: 'Teacher',
        icon: <Person />,
        color: 'secondary'
      };
    } else {
      return {
        name: 'Student',
        icon: <Person />,
        color: 'secondary'
      };
    }
  };

  const filteredLost = getFilteredItems(lostItems, lostSearch);
  const filteredFound = getFilteredItems(foundItems, foundSearch);

  // Handle opening history modal
  const handleOpenHistory = (type) => {
    const items = type === 'found' ? foundItems : lostItems;
    setHistoryModal({ open: true, type, items });
  };

  // Handle closing history modal
  const handleCloseHistory = () => {
    setHistoryModal({ open: false, type: '', items: [] });
  };

  // Handle opening claimed items modal
  const handleOpenClaimedItems = async () => {
    setClaimedItemsModal({ open: true, items: [], loading: true });
    try {
      const q = query(
        collection(db, 'lost_items'),
        where('resolved', '==', true)
      );
      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'lost' }));
      // Sort by resolvedAt if available, otherwise by createdAt
      items.sort((a, b) => {
        const aDate = a.resolvedAt?.toDate?.() || a.resolvedAt || a.createdAt?.toDate?.() || a.createdAt;
        const bDate = b.resolvedAt?.toDate?.() || b.resolvedAt || b.createdAt?.toDate?.() || b.createdAt;
        return new Date(bDate) - new Date(aDate);
      });
      setClaimedItemsModal({ open: true, items, loading: false });
    } catch (err) {
      console.error('Error fetching claimed items:', err);
      setClaimedItemsModal({ open: true, items: [], loading: false });
      setSnackbar({ open: true, message: 'Failed to load claimed items', severity: 'error' });
    }
  };

  // Handle closing claimed items modal
  const handleCloseClaimedItems = () => {
    setClaimedItemsModal({ open: false, items: [], loading: false });
    setClaimedSearch('');
  };

  // Handle opening resolved items modal
  const handleOpenResolvedItems = async () => {
    setResolvedItemsModal({ open: true, items: [], loading: true });
    try {
      const q = query(
        collection(db, 'found_items'),
        where('resolved', '==', true)
      );
      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'found' }));
      // Sort by resolvedAt if available, otherwise by createdAt
      items.sort((a, b) => {
        const aDate = a.resolvedAt?.toDate?.() || a.resolvedAt || a.createdAt?.toDate?.() || a.createdAt;
        const bDate = b.resolvedAt?.toDate?.() || b.resolvedAt || b.createdAt?.toDate?.() || b.createdAt;
        return new Date(bDate) - new Date(aDate);
      });
      setResolvedItemsModal({ open: true, items, loading: false });
    } catch (err) {
      console.error('Error fetching resolved items:', err);
      setResolvedItemsModal({ open: true, items: [], loading: false });
      setSnackbar({ open: true, message: 'Failed to load resolved items', severity: 'error' });
    }
  };

  // Handle closing resolved items modal
  const handleCloseResolvedItems = () => {
    setResolvedItemsModal({ open: false, items: [], loading: false });
    setResolvedSearch('');
  };

  // Filter claimed items based on search
  const filteredClaimedItems = claimedItemsModal.items.filter(item =>
    (item.name || '').toLowerCase().includes(claimedSearch.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(claimedSearch.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(claimedSearch.toLowerCase()) ||
    (item.claimedBy || '').toLowerCase().includes(claimedSearch.toLowerCase())
  );

  // Filter resolved items based on search
  const filteredResolvedItems = resolvedItemsModal.items.filter(item =>
    (item.name || '').toLowerCase().includes(resolvedSearch.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(resolvedSearch.toLowerCase()) ||
    (item.location || '').toLowerCase().includes(resolvedSearch.toLowerCase()) ||
    (item.claimedBy || '').toLowerCase().includes(resolvedSearch.toLowerCase())
  );

  return (
    <Box sx={{ pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 }, pb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Lost and Found
      </Typography>
      
      {/* History Stat Cards */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
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
        </Grid>
      </Box>
      
      {/* Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column - Lost Items */}
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenClaimedItems}
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
                  startIcon={<CheckCircle sx={{ fontSize: '0.875rem' }} />}
                >
                  Claimed Items
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setLostFormModal(true)}
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
                  Report Lost Item
                </Button>
              </Box>
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
                const isOwnPost = item.reportedBy === currentUser?.email;
                
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
                        <Avatar sx={{ 
                          bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                 posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                          width: 32,
                          height: 32
                        }}>
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
                        {isOwnPost && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeletePost(item.id, item.type)}
                            sx={{ color: '#f44336', p: 0.5 }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
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

        {/* Right Column - Found Items */}
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenResolvedItems}
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
                  startIcon={<CheckCircle sx={{ fontSize: '0.875rem' }} />}
                >
                  Resolved
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setFoundFormModal(true)}
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
                  Report Found Item
                </Button>
              </Box>
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
                const isOwnPost = item.reportedBy === currentUser?.email;
                
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
                        <Avatar sx={{ 
                          bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                 posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                          width: 32,
                          height: 32
                        }}>
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
                        {isOwnPost && (
                          <IconButton 
                            size="small" 
                            onClick={() => handleDeletePost(item.id, item.type)}
                            sx={{ color: '#f44336', p: 0.5 }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
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

      {/* Lost Item Form Modal */}
      <Modal
        open={lostFormModal}
        onClose={() => setLostFormModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={lostFormModal}>
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
                  <Add sx={{ color: '#800000' }} />
                  Report Lost Item
                </Typography>
                <IconButton onClick={() => setLostFormModal(false)} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your report will be reviewed by an administrator before being posted.
              </Typography>

              {/* Form */}
              <form onSubmit={handleLostSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Item Name" 
                      value={lostForm.name} 
                      onChange={e => setLostForm(f => ({ ...f, name: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Location Lost" 
                      value={lostForm.location} 
                      onChange={e => setLostForm(f => ({ ...f, location: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      label="Description" 
                      multiline 
                      rows={3} 
                      value={lostForm.description} 
                      onChange={e => setLostForm(f => ({ ...f, description: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Time Lost" 
                      type="datetime-local" 
                      value={lostForm.timeLost} 
                      onChange={e => setLostForm(f => ({ ...f, timeLost: e.target.value }))} 
                      InputLabelProps={{ shrink: true }} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Contact Information" 
                      value={lostForm.contactInfo} 
                      onChange={e => setLostForm(f => ({ ...f, contactInfo: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        mb: 1,
                        fontSize: '0.85rem'
                      }}>
                        📸 Photo Requirements: Minimum 400x300px, Maximum 2000x2000px, Max 5MB
                      </Typography>
                      <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
                        Upload Image
                        <input type="file" accept="image/*" hidden onChange={handleLostImage} />
                      </Button>
                    </Box>
                    {lostForm.image && (
                      <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                        <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
                          Preview:
                        </Typography>
                        <img 
                          src={lostForm.image} 
                          alt="Lost item preview" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '300px',
                            borderRadius: '8px',
                            objectFit: 'cover'
                          }} 
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        onClick={() => setLostFormModal(false)}
                        sx={{
                          textTransform: 'none',
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          px: 3
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#800000', '&:hover': { bgcolor: '#6b0000' }, px: 3 }}>
                        Submit for Review
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Found Item Form Modal */}
      <Modal
        open={foundFormModal}
        onClose={() => setFoundFormModal(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={foundFormModal}>
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
                  <Add sx={{ color: '#4caf50' }} />
                  Report Found Item
                </Typography>
                <IconButton onClick={() => setFoundFormModal(false)} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your report will be reviewed by an administrator before being posted.
              </Typography>

              {/* Form */}
              <form onSubmit={handleFoundSubmit}>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Item Name" 
                      value={foundForm.name} 
                      onChange={e => setFoundForm(f => ({ ...f, name: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Location Found" 
                      value={foundForm.location} 
                      onChange={e => setFoundForm(f => ({ ...f, location: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth 
                      label="Description" 
                      multiline 
                      rows={3} 
                      value={foundForm.description} 
                      onChange={e => setFoundForm(f => ({ ...f, description: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Time Found" 
                      type="datetime-local" 
                      value={foundForm.timeFound} 
                      onChange={e => setFoundForm(f => ({ ...f, timeFound: e.target.value }))} 
                      InputLabelProps={{ shrink: true }} 
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Contact Information" 
                      value={foundForm.contactInfo} 
                      onChange={e => setFoundForm(f => ({ ...f, contactInfo: e.target.value }))} 
                      required 
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666',
                        mb: 1,
                        fontSize: '0.85rem'
                      }}>
                        📸 Photo Requirements: Minimum 400x300px, Maximum 2000x2000px, Max 5MB
                      </Typography>
                      <Button variant="outlined" component="label" startIcon={<CloudUpload />}>
                        Upload Image
                        <input type="file" accept="image/*" hidden onChange={handleFoundImage} />
                      </Button>
                    </Box>
                    {foundForm.image && (
                      <Box sx={{ mt: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#f9f9f9' }}>
                        <Typography variant="caption" sx={{ color: '#666', mb: 1, display: 'block' }}>
                          Preview:
                        </Typography>
                        <img 
                          src={foundForm.image} 
                          alt="Found item preview" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '300px',
                            borderRadius: '8px',
                            objectFit: 'cover'
                          }} 
                        />
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        onClick={() => setFoundFormModal(false)}
                        sx={{
                          textTransform: 'none',
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          px: 3
                        }}
                      >
                        Cancel
                      </Button>
                      <Button variant="contained" type="submit" disabled={loading} sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#388e3c' }, px: 3 }}>
                        Submit for Review
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
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
                          <Avatar sx={{ 
                            bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                   posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                            width: 40,
                            height: 40
                          }}>
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
                          onClick={() => {
                            handleCloseHistory();
                            setCommentDialog({ open: true, itemId: item.id, itemType: item.type });
                          }}
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

      {/* Claimed Items Modal */}
      <Modal
        open={claimedItemsModal.open}
        onClose={handleCloseClaimedItems}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={claimedItemsModal.open}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CheckCircle sx={{ color: '#4caf50' }} />
                  Claimed Items
                </Typography>
                <IconButton onClick={handleCloseClaimedItems} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              {claimedItemsModal.loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography>Loading claimed items...</Typography>
                </Box>
              ) : claimedItemsModal.items.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                  <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                    No claimed items yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                    Claimed lost items will appear here
                  </Typography>
                </Paper>
              ) : (
                <>
                  <TextField
                    fullWidth
                    placeholder="Search claimed items..." 
                    value={claimedSearch}
                    onChange={e => setClaimedSearch(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                    }}
                  />
                  <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {filteredClaimedItems.length === 0 ? (
                      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                        <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                          No items match your search
                        </Typography>
                      </Paper>
                    ) : filteredClaimedItems.map(item => {
                    const posterInfo = getPosterInfo(item);
                    return (
                      <Paper 
                        key={`claimed-${item.id}`} 
                        sx={{ 
                          mb: 2, 
                          p: 3,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                          borderRadius: 1.5,
                          borderLeft: '4px solid #4caf50'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                     posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                              width: 40,
                              height: 40
                            }}>
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
                          <Chip label="Claimed" color="success" size="small" sx={{ fontSize: '0.8rem', height: 28 }} />
                        </Box>

                        <Typography variant="body1" sx={{ 
                          mb: 2, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '1rem',
                          lineHeight: 1.5
                        }}>
                          {item.description}
                        </Typography>

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
                              Lost: {item.timeLost || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>

                        {item.claimedBy && (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)', borderRadius: 1, border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                            <Typography variant="subtitle2" sx={{ 
                              mb: 1, 
                              color: theme.palette.mode === 'dark' ? '#4caf50' : '#2e7d32',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}>
                              Claim Information
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444', fontSize: '0.75rem', mb: 0.5 }}>
                              <strong>Claimed by:</strong> {item.claimedBy}
                            </Typography>
                            {item.contactNumber && (
                              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444', fontSize: '0.75rem', mb: 0.5 }}>
                                <strong>Contact:</strong> {item.contactNumber}
                              </Typography>
                            )}
                            {item.resolvedAt && (
                              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#a0a0a0' : '#666666', fontSize: '0.65rem', mt: 0.5 }}>
                                Resolved on: {new Date(item.resolvedAt?.toDate?.() || item.resolvedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Resolved Items Modal */}
      <Modal
        open={resolvedItemsModal.open}
        onClose={handleCloseResolvedItems}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={resolvedItemsModal.open}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0' }}>
                <Typography variant="h4" sx={{ 
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <CheckCircle sx={{ color: '#4caf50' }} />
                  Resolved Items
                </Typography>
                <IconButton onClick={handleCloseResolvedItems} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  <Typography variant="h6">×</Typography>
                </IconButton>
              </Box>

              {resolvedItemsModal.loading ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography>Loading resolved items...</Typography>
                </Box>
              ) : resolvedItemsModal.items.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                  <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                    No resolved items yet
                  </Typography>
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#cccccc' : '#666666' }}>
                    Resolved found items will appear here
                  </Typography>
                </Paper>
              ) : (
                <>
                  <TextField
                    fullWidth
                    placeholder="Search resolved items..." 
                    value={resolvedSearch}
                    onChange={e => setResolvedSearch(e.target.value)}
                    size="small"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                    }}
                  />
                  <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {filteredResolvedItems.length === 0 ? (
                      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f5f5f5' }}>
                        <Typography variant="body1" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                          No items match your search
                        </Typography>
                      </Paper>
                    ) : filteredResolvedItems.map(item => {
                    const posterInfo = getPosterInfo(item);
                    return (
                      <Paper 
                        key={`resolved-${item.id}`} 
                        sx={{ 
                          mb: 2, 
                          p: 3,
                          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
                          border: theme.palette.mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid #e0e0e0',
                          borderRadius: 1.5,
                          borderLeft: '4px solid #4caf50'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ 
                              bgcolor: posterInfo.color === 'primary' ? '#1976d2' : 
                                     posterInfo.color === 'secondary' ? '#9c27b0' : '#757575',
                              width: 40,
                              height: 40
                            }}>
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
                          <Chip label="Resolved" color="success" size="small" sx={{ fontSize: '0.8rem', height: 28 }} />
                        </Box>

                        <Typography variant="body1" sx={{ 
                          mb: 2, 
                          color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
                          fontSize: '1rem',
                          lineHeight: 1.5
                        }}>
                          {item.description}
                        </Typography>

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
                              Found: {item.timeFound || 'Unknown'}
                            </Typography>
                          </Box>
                        </Box>

                        {item.claimedBy && (
                          <Box sx={{ mt: 2, p: 1.5, bgcolor: theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(46, 125, 50, 0.05)', borderRadius: 1, border: '1px solid rgba(46, 125, 50, 0.2)' }}>
                            <Typography variant="subtitle2" sx={{ 
                              mb: 1, 
                              color: theme.palette.mode === 'dark' ? '#4caf50' : '#2e7d32',
                              fontSize: '0.85rem',
                              fontWeight: 600
                            }}>
                              Resolution Information
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444', fontSize: '0.75rem', mb: 0.5 }}>
                              <strong>Claimed by:</strong> {item.claimedBy}
                            </Typography>
                            {item.contactNumber && (
                              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#d0d0d0' : '#444444', fontSize: '0.75rem', mb: 0.5 }}>
                                <strong>Contact:</strong> {item.contactNumber}
                              </Typography>
                            )}
                            {item.resolvedAt && (
                              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.mode === 'dark' ? '#a0a0a0' : '#666666', fontSize: '0.65rem', mt: 0.5 }}>
                                Resolved on: {new Date(item.resolvedAt?.toDate?.() || item.resolvedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Paper>
                    );
                  })}
                  </Box>
                </>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

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

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 