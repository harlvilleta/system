import React, { useEffect, useState } from "react";
import { Box, Typography, Paper, List, ListItem, ListItemText, Divider, IconButton, Snackbar, Alert, Tabs, Tab, CircularProgress } from "@mui/material";
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { db } from "../firebase";
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query } from "firebase/firestore";

export default function RecycleBin() {
  const [tab, setTab] = useState(0);
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [lostFound, setLostFound] = useState([]);
  const [violations, setViolations] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchAnnouncements(),
          fetchActivities(),
          fetchLostFound(),
          fetchViolations(),
          fetchStudents()
        ]);
      } catch (error) {
        console.error('Error loading recycle bin data:', error);
        setSnackbar({ open: true, message: 'Error loading recycle bin data', severity: 'error' });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, "recycle_bin_announcements"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    }
  };

  const fetchActivities = async () => {
    try {
      const q = query(collection(db, "recycle_bin_activities"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
    }
  };

  const fetchLostFound = async () => {
    try {
      const q = query(collection(db, "recycle_bin_lost_found"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setLostFound(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching lost & found:', error);
      setLostFound([]);
    }
  };

  const fetchViolations = async () => {
    try {
      const q = query(collection(db, "recycle_bin_violations"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setViolations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching violations:', error);
      setViolations([]);
    }
  };

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, "recycle_bin_students"), orderBy("deletedAt", "desc"));
      const snap = await getDocs(q);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const handleRestoreAnnouncement = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "announcements"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_announcements", id));
      setSnackbar({ open: true, message: "Announcement restored.", severity: "success" });
      fetchAnnouncements();
    } catch {
      setSnackbar({ open: true, message: "Error restoring announcement", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteAnnouncement = async (item) => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.title}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "recycle_bin_announcements", item.id));
        // Update local state immediately
        setAnnouncements(prev => prev.filter(a => a.id !== item.id));
        setSnackbar({ open: true, message: "Announcement permanently deleted.", severity: "success" });
      } catch (error) {
        console.error('Error permanently deleting announcement:', error);
        setSnackbar({ open: true, message: "Error deleting announcement", severity: "error" });
      }
      setIsSubmitting(false);
    }
  };

  const handleRestoreActivity = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "activities"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_activities", id));
      setSnackbar({ open: true, message: "Activity restored.", severity: "success" });
      fetchActivities();
    } catch {
      setSnackbar({ open: true, message: "Error restoring activity", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteActivity = async (item) => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.title || item.name}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "recycle_bin_activities", item.id));
        // Update local state immediately
        setActivities(prev => prev.filter(a => a.id !== item.id));
        setSnackbar({ open: true, message: "Activity permanently deleted.", severity: "success" });
      } catch (error) {
        console.error('Error permanently deleting activity:', error);
        setSnackbar({ open: true, message: "Error deleting activity", severity: "error" });
      }
      setIsSubmitting(false);
    }
  };

  const handleRestoreLostFound = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "lost_found"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_lost_found", id));
      setSnackbar({ open: true, message: "Lost & Found item restored.", severity: "success" });
      fetchLostFound();
    } catch {
      setSnackbar({ open: true, message: "Error restoring lost & found item", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteLostFound = async (item) => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.itemName}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "recycle_bin_lost_found", item.id));
        // Update local state immediately
        setLostFound(prev => prev.filter(lf => lf.id !== item.id));
        setSnackbar({ open: true, message: "Lost & Found item permanently deleted.", severity: "success" });
      } catch (error) {
        console.error('Error permanently deleting lost & found item:', error);
        setSnackbar({ open: true, message: "Error deleting lost & found item", severity: "error" });
      }
      setIsSubmitting(false);
    }
  };

  const handleRestoreViolation = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "violations"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_violations", id));
      setSnackbar({ open: true, message: "Violation restored.", severity: "success" });
      fetchViolations();
    } catch {
      setSnackbar({ open: true, message: "Error restoring violation", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteViolation = async (item) => {
    if (window.confirm(`Are you sure you want to permanently delete violation "${item.violation || item.studentName}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "recycle_bin_violations", item.id));
        // Update local state immediately
        setViolations(prev => prev.filter(v => v.id !== item.id));
        setSnackbar({ open: true, message: "Violation permanently deleted.", severity: "success" });
      } catch (error) {
        console.error('Error permanently deleting violation:', error);
        setSnackbar({ open: true, message: "Error deleting violation", severity: "error" });
      }
      setIsSubmitting(false);
    }
  };

  const handleRestoreStudent = async (item) => {
    setIsSubmitting(true);
    try {
      const { id, deletedAt, ...rest } = item;
      await addDoc(collection(db, "students"), { ...rest, restoredAt: new Date().toISOString() });
      await deleteDoc(doc(db, "recycle_bin_students", id));
      setSnackbar({ open: true, message: "Student restored.", severity: "success" });
      fetchStudents();
    } catch {
      setSnackbar({ open: true, message: "Error restoring student", severity: "error" });
    }
    setIsSubmitting(false);
  };

  const handlePermanentDeleteStudent = async (item) => {
    if (window.confirm(`Are you sure you want to permanently delete student "${item.firstName} ${item.lastName}"? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "recycle_bin_students", item.id));
        // Update local state immediately
        setStudents(prev => prev.filter(s => s.id !== item.id));
        setSnackbar({ open: true, message: "Student permanently deleted.", severity: "success" });
      } catch (error) {
        console.error('Error permanently deleting student:', error);
        setSnackbar({ open: true, message: "Error deleting student", severity: "error" });
      }
      setIsSubmitting(false);
    }
  };


  return (
    <Box>
      <Typography variant="h4" gutterBottom>Recycle Bin</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Announcements" />
        <Tab label="Activities" />
        <Tab label="Lost & Found" />
        <Tab label="Violations" />
        <Tab label="Students" />
      </Tabs>
      {tab === 0 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Announcements</Typography>
          <List>
            {announcements.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : announcements.map(a => (
              <React.Fragment key={a.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent !important'
                    }
                  }}
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreAnnouncement(a)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteAnnouncement(a)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{a.title}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{a.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category} | {a.audience || "All"} | {a.priority || "Normal"} | {a.date ? new Date(a.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      {tab === 1 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Activities</Typography>
          <List>
            {activities.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : activities.map(a => (
              <React.Fragment key={a.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent !important'
                    }
                  }}
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreActivity(a)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteActivity(a)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{a.title}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{a.description}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.category} | {a.organizer || ""} | {a.date ? new Date(a.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      {tab === 2 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Lost & Found Items</Typography>
          <List>
            {lostFound.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : lostFound.map(item => (
              <React.Fragment key={item.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent !important'
                    }
                  }}
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreLostFound(item)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteLostFound(item)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{item.itemName || item.title}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{item.description || item.message}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.category || item.type} | {item.location || item.foundLocation} | {item.date ? new Date(item.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      {tab === 3 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Violations</Typography>
          <List>
            {violations.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : violations.map(v => (
              <React.Fragment key={v.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent !important'
                    }
                  }}
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreViolation(v)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteViolation(v)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{v.violation || v.studentName}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{v.description || v.studentId}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {v.classification || v.course} | {v.severity || v.year} | {v.date ? new Date(v.date).toLocaleDateString() : ''}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      {tab === 4 && (
        <Paper sx={{ maxWidth: 700, mx: "auto", p: 2, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Deleted Students</Typography>
          <List>
            {students.length === 0 ? (
              <ListItem><ListItemText primary="Recycle bin is empty." /></ListItem>
            ) : students.map(s => (
              <React.Fragment key={s.id}>
                <ListItem 
                  alignItems="flex-start"
                  sx={{
                    '&:hover': {
                      backgroundColor: 'transparent !important'
                    }
                  }}
                  secondaryAction={
                    <>
                      <IconButton edge="end" aria-label="restore" onClick={() => handleRestoreStudent(s)} disabled={isSubmitting}>
                        <RestoreIcon color="primary" />
                      </IconButton>
                      <IconButton edge="end" aria-label="permanently delete" onClick={() => handlePermanentDeleteStudent(s)} disabled={isSubmitting} sx={{ ml: 1 }}>
                        <DeleteForeverIcon color="error" />
                      </IconButton>
                    </>
                  }
                >
                  <ListItemText
                    primary={<Typography fontWeight={700}>{s.firstName} {s.lastName}</Typography>}
                    secondary={<>
                      <Typography variant="body2" color="text.secondary">{s.studentId || s.email}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.course || 'N/A'} | {s.year || 'N/A'} | {s.section || 'N/A'}
                      </Typography>
                    </>}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 