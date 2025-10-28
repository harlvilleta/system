import React, { useState, useEffect } from "react";
import { Box, Typography, Grid, Card, CardContent, CardHeader, TextField, Button, MenuItem, Paper, List, ListItem, ListItemText, Divider, Stack, Snackbar, Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from "@mui/material";
import { EventNote, History, CheckCircle, Edit, Delete, Visibility, Event, Schedule, Category } from "@mui/icons-material";
import { collection, addDoc, getDocs, updateDoc, doc, orderBy, query, deleteDoc } from "firebase/firestore";
import { db, logActivity } from "../firebase";
import SearchIcon from '@mui/icons-material/Search';

const categories = ["Seminar", "Meeting", "Workshop", "Event", "Other"];

function ActivityForm({ onActivityAdded }) {
  const [form, setForm] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    organizer: "",
    location: "",
    category: "Seminar",
    maxParticipants: "",
    description: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.startTime || !form.endTime || !form.organizer || !form.location || !form.category || !form.maxParticipants || !form.description) {
      setSnackbar({ open: true, message: "Please fill in all fields.", severity: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "activities"), {
        ...form,
        createdAt: new Date().toISOString(),
        completed: false
      });
      await logActivity({ message: `Activity scheduled: ${form.title}`, type: 'add_activity' });
      setSnackbar({ open: true, message: "Activity scheduled!", severity: "success" });
      setForm({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        organizer: "",
        location: "",
        category: "Seminar",
        maxParticipants: "",
        description: ""
      });
      if (onActivityAdded) onActivityAdded();
    } catch (e) {
      setSnackbar({ open: true, message: "Error scheduling activity.", severity: "error" });
    }
    setIsSubmitting(false);
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Schedule New Activity</Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Title" name="title" value={form.title} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="date" label="Date" name="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="Start Time" name="startTime" value={form.startTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="time" label="End Time" name="endTime" value={form.endTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Organizer" name="organizer" value={form.organizer} onChange={handleChange} required />
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth label="Location" name="location" value={form.location} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth select label="Category" name="category" value={form.category} onChange={handleChange} required>
              {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
              </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth type="number" label="Max Participants" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth multiline minRows={3} label="Description" name="description" value={form.description} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12}>
            <Button 
              type="submit" 
              variant="outlined" 
              disabled={isSubmitting}
              sx={{ 
                bgcolor: 'white',
                color: 'black',
                borderColor: 'black',
                '&:hover': {
                  bgcolor: '#800000',
                  color: 'white',
                  borderColor: '#800000'
                }
              }}
            >
              {isSubmitting ? "Saving..." : "Save Activity"}
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

function SummaryCard({ stats, onCardClick }) {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000', mb: 2, mt: 1 }}>
        Activity Summary
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }} onClick={() => onCardClick('all')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Total
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }} onClick={() => onCardClick('scheduled')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {stats.scheduled}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Scheduled
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }} onClick={() => onCardClick('completed')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {stats.completed}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            boxShadow: 2, 
            borderLeft: '4px solid #800000',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 4
            }
          }} onClick={() => onCardClick('categories')}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="h4" sx={{ color: '#000000' }} fontWeight={700}>
                {stats.categories}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
        </Box>
  );
}

function ExportButton({ activities }) {
  const handleExport = () => {
    const csvRows = [
      ["Title", "Date", "Status", "Category", "Organizer", "Location", "Max Participants", "Description"],
      ...activities.map(a => [
        a.title, a.date, a.completed ? 'Completed' : 'Scheduled', a.category, a.organizer, a.location, a.maxParticipants, a.description
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = csvContent;
    link.download = "activities.csv";
    link.click();
  };
  return (
    <Button 
      variant="outlined" 
      onClick={handleExport} 
      sx={{ 
        mb: 2,
        mr: 2,
        bgcolor: 'white',
        color: 'black',
        borderColor: 'black',
        '&:hover': {
          bgcolor: '#800000',
          color: 'white',
          borderColor: '#800000'
        }
      }}
    >
      Export to CSV
    </Button>
  );
}

function HistoryButton({ onClick }) {
  return (
    <Button 
      variant="outlined" 
      onClick={onClick}
      sx={{ 
        mb: 2,
        bgcolor: 'white',
        color: 'black',
        borderColor: 'black',
        '&:hover': {
          bgcolor: '#800000',
          color: 'white',
          borderColor: '#800000'
        }
      }}
    >
      History
    </Button>
  );
}

function HistoryModal({ activities, onView, onEdit, onDelete, search, onSearch, open, onClose }) {
  const theme = useTheme();
  const filteredActivities = activities.filter(activity => 
    activity.title.toLowerCase().includes(search.toLowerCase()) ||
    activity.category.toLowerCase().includes(search.toLowerCase()) ||
    (activity.completed ? 'completed' : 'scheduled').includes(search.toLowerCase())
  );

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '70vh',
          height: '70vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        fontWeight: 700, 
        color: '#800000',
        borderBottom: '1px solid #e0e0e0',
        pb: 2
      }}>
        Activity History
      </DialogTitle>
      <DialogContent sx={{ p: 3, overflow: 'hidden' }}>
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
          <Box sx={{ width: '300px' }}>
            <SearchBar value={search} onChange={onSearch} placeholder="Search activities..." />
          </Box>
        </Box>
        <TableContainer sx={{ maxHeight: 'calc(70vh - 200px)', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>Title</TableCell>
                <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>Date</TableCell>
                <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>Status</TableCell>
                <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>Category</TableCell>
                <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredActivities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {search ? 'No activities found matching your search.' : 'No activities found.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredActivities.map((activity) => (
                  <TableRow 
                    key={activity.id} 
                    hover
                    sx={{ 
                      '&:hover': { 
                        backgroundColor: 'rgba(128, 0, 0, 0.04)' 
                      } 
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{activity.title}</TableCell>
                    <TableCell>
                      {activity.date ? new Date(activity.date).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: activity.completed ? '#4caf50' : '#ff9800',
                          fontWeight: 500
                        }}
                      >
                        {activity.completed ? 'Completed' : 'Scheduled'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#800000',
                          fontWeight: 500
                        }}
                      >
                        {activity.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => onView(activity)}
                          sx={{
                            '&:hover': { 
                              bgcolor: 'rgba(25, 118, 210, 0.04)'
                            }
                          }}
                        >
                          <Visibility sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onEdit(activity)}
                          sx={{
                            padding: '4px',
                            '&:hover': { 
                              bgcolor: 'rgba(245, 124, 0, 0.04)'
                            }
                          }}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => onDelete(activity)}
                          sx={{
                            '&:hover': {
                              bgcolor: 'rgba(211, 47, 47, 0.04)'
                            }
                          }}
                        >
                          <Delete sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          sx={{
            color: 'black',
            borderColor: 'black',
            '&:hover': {
              bgcolor: '#800000',
              color: 'white',
              borderColor: '#800000'
            }
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <TextField
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      size="small"
      fullWidth
      sx={{ mb: 2 }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        )
      }}
    />
  );
}



function ScheduledActivities({ activities, onMarkCompleted, onViewActivity, search, onSearch }) {
  const filtered = activities.filter(a => !a.completed && (
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.organizer?.toLowerCase().includes(search.toLowerCase()) ||
    a.category?.toLowerCase().includes(search.toLowerCase())
  ));
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>Scheduled Activities</Typography>
      <SearchBar value={search} onChange={onSearch} placeholder="Search scheduled..." />
      {filtered.length === 0 ? (
        <Typography align="center" color="text.secondary">No scheduled activities.</Typography>
      ) : (
        <>
          {filtered.map((a) => (
            <Card 
              key={a.id} 
              sx={{ 
                mb: 2, 
                borderLeft: '4px solid #ff9800', 
                boxShadow: 3,
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                borderRadius: 2,
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                  borderLeft: '4px solid #f57c00',
                  '& .card-title': {
                    color: 'primary.main'
                  }
                }
              }}
              onClick={() => onViewActivity(a)}
            >
              <CardHeader
                title={
                  <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                    <Typography 
                      fontWeight={700} 
                      className="card-title"
                      sx={{ fontSize: '1.1rem', transition: 'color 0.3s ease' }}
                    >
                      {a.title}
                    </Typography>
                    <Chip 
                      label={a.category} 
                      color="primary" 
                      size="small" 
                      variant="outlined"
                    />
                    <Chip 
                      label="Scheduled" 
                      color="warning" 
                      size="small" 
                    />
                  </Stack>
                }
                subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
              />
              <CardContent sx={{ pt: 0 }}>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {a.description || 'No description available'}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
                  {a.organizer && (
                    <Chip 
                      label={`👤 ${a.organizer}`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                  {a.location && (
                    <Chip 
                      label={`📍 ${a.location}`} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '0.75rem' }}
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      fontWeight: 500,
                      flexGrow: 1
                    }}
                  >
                    📅 {a.date ? new Date(a.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    }) : 'Date TBD'}
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="success" 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click when button is clicked
                      onMarkCompleted(a);
                    }}
                    sx={{ 
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem'
                    }}
                  >
                    ✓ Complete
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </Paper>
  );
}

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewActivity, setViewActivity] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [searchScheduled, setSearchScheduled] = useState("");
  const [openEventModal, setOpenEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSnackbar, setEventSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', 'scheduled', 'completed', 'categories'
  const [openActivitiesModal, setOpenActivitiesModal] = useState(false);

  // Summary stats
  const stats = {
    total: activities.length,
    scheduled: activities.filter(a => !a.completed).length,
    completed: activities.filter(a => a.completed).length,
    categories: Array.from(new Set(activities.map(a => a.category))).length
  };

  // Filter activities based on selected filter
  const filteredActivities = activities.filter(activity => {
    if (activityFilter === 'all') return true;
    if (activityFilter === 'scheduled') return !activity.completed;
    if (activityFilter === 'completed') return activity.completed;
    if (activityFilter === 'categories') return true; // Show all for categories view
    return true;
  });

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const q = query(collection(db, "activities"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (e) {
        setActivities([]);
      }
    };
    fetchActivities();
  }, [refresh]);

  const handleActivityAdded = () => setRefresh(r => !r);

  const handleCardClick = (filter) => {
    setActivityFilter(filter);
    setOpenActivitiesModal(true);
  };

  const handleMarkCompleted = async (activity) => {
    try {
      await updateDoc(doc(db, "activities", activity.id), { completed: true });
      setSnackbar({ open: true, message: "Marked as completed!", severity: "success" });
      setRefresh(r => !r);
    } catch (e) {
      setSnackbar({ open: true, message: "Error marking as completed.", severity: "error" });
    }
  };

  const handleView = (activity) => setViewActivity(activity);
  const handleEdit = (activity) => {
    setEditActivity(activity);
    setEditForm({ ...activity });
  };
  const handleDelete = async (activity) => {
    if (window.confirm(`Delete activity: ${activity.title}?`)) {
      try {
        await deleteDoc(doc(db, "activities", activity.id));
        await logActivity({ message: `Activity deleted: ${activity.title}`, type: 'delete_activity' });
        setSnackbar({ open: true, message: "Activity deleted.", severity: "success" });
        setRefresh(r => !r);
      } catch (e) {
        setSnackbar({ open: true, message: "Error deleting activity.", severity: "error" });
      }
    }
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsEditSubmitting(true);
    try {
      await updateDoc(doc(db, "activities", editActivity.id), {
        ...editForm,
        updatedAt: new Date().toISOString(),
      });
      await logActivity({ message: `Activity updated: ${editForm.title}`, type: 'edit_activity' });
      setSnackbar({ open: true, message: "Activity updated!", severity: "success" });
      setEditActivity(null);
      setEditForm(null);
      setRefresh(r => !r);
    } catch (e) {
      setSnackbar({ open: true, message: "Error updating activity.", severity: "error" });
    }
    setIsEditSubmitting(false);
  };

  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm(f => ({ ...f, [name]: value }));
  };
  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...eventForm,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setEventSnackbar({ open: true, message: 'Event proposal submitted for approval!', severity: 'success' });
      setOpenEventModal(false);
      setEventForm({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
    } catch (e) {
      setEventSnackbar({ open: true, message: 'Failed to submit event proposal.', severity: 'error' });
    }
    setEventSubmitting(false);
  };

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {/* Schedule Event approval removed */}
        </Grid>
        <Grid item xs={12}>
          <SummaryCard stats={stats} onCardClick={handleCardClick} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <ExportButton activities={activities} />
            <HistoryButton onClick={() => setShowHistory(true)} />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <ActivityForm onActivityAdded={handleActivityAdded} />
        </Grid>
      </Grid>
      
      {/* History Modal */}
      <HistoryModal
        activities={activities}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        search={searchHistory}
        onSearch={setSearchHistory}
        open={showHistory}
        onClose={() => setShowHistory(false)}
      />
      
      {/* Schedule Event Modal removed */}
      <Snackbar open={eventSnackbar.open} autoHideDuration={4000} onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })}>
        <Alert onClose={() => setEventSnackbar({ ...eventSnackbar, open: false })} severity={eventSnackbar.severity} sx={{ width: '100%' }}>
          {eventSnackbar.message}
        </Alert>
      </Snackbar>
      {/* View Activity Modal */}
      <Dialog open={!!viewActivity} onClose={() => setViewActivity(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Typography variant="h5" fontWeight={700}>{viewActivity?.title}</Typography>
            <Chip 
              label={viewActivity?.category || 'General'} 
              color="primary" 
              size="small" 
            />
            <Chip 
              label={viewActivity?.completed ? 'Completed' : 'Scheduled'} 
              color={viewActivity?.completed ? 'success' : 'warning'} 
              size="small" 
            />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {viewActivity && (
            <Box>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📅 Date & Time
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.date ? new Date(viewActivity.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : 'Not specified'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        👤 Organizer
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.organizer || 'Not specified'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📍 Location
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.location || 'Not specified'}
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        🏷️ Category
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.category || 'General'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        👥 Max Participants
                      </Typography>
                      <Typography variant="body1" fontWeight={500}>
                        {viewActivity.maxParticipants || 'No limit'}
                      </Typography>
                    </Box>
                    
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        📊 Status
                      </Typography>
                      <Chip 
                        label={viewActivity.completed ? 'Completed' : 'Scheduled'} 
                        color={viewActivity.completed ? 'success' : 'warning'} 
                        size="small"
                      />
                    </Box>
                  </Stack>
                </Grid>
                
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      📝 Description
                    </Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        border: '1px solid',
                        borderColor: 'grey.200',
                        borderRadius: 1
                      }}
                    >
                      <Typography variant="body1">
                        {viewActivity.description || 'No description provided'}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setViewActivity(null)} 
            variant="outlined"
            size="large"
          >
            Close
          </Button>
          {!viewActivity?.completed && (
            <Button 
              onClick={() => {
                handleMarkCompleted(viewActivity);
                setViewActivity(null);
              }}
              variant="contained" 
              color="success"
              size="large"
            >
              Mark as Completed
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {/* Edit Activity Modal */}
      <Dialog open={!!editActivity} onClose={() => setEditActivity(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Activity</DialogTitle>
        <DialogContent>
          {editForm && (
            <Box component="form" onSubmit={handleEditSubmit} sx={{ mt: 2 }}>
              <Stack spacing={2}>
                <TextField label="Title" name="title" value={editForm.title} onChange={handleEditChange} fullWidth required />
                <TextField label="Date" name="date" type="date" value={editForm.date} onChange={handleEditChange} InputLabelProps={{ shrink: true }} fullWidth required />
                <TextField label="Organizer" name="organizer" value={editForm.organizer} onChange={handleEditChange} fullWidth required />
                <TextField label="Location" name="location" value={editForm.location} onChange={handleEditChange} fullWidth required />
                <TextField label="Category" name="category" value={editForm.category} onChange={handleEditChange} select fullWidth required>
                  {categories.map((cat) => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </TextField>
                <TextField label="Max Participants" name="maxParticipants" type="number" value={editForm.maxParticipants} onChange={handleEditChange} fullWidth required />
                <TextField label="Description" name="description" value={editForm.description} onChange={handleEditChange} fullWidth multiline minRows={2} required />
                <Stack direction="row" spacing={2}>
                  <Button type="submit" variant="contained" color="primary" disabled={isEditSubmitting}>
                    {isEditSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button onClick={() => setEditActivity(null)} disabled={isEditSubmitting}>Cancel</Button>
                </Stack>
              </Stack>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Activities Modal */}
      <Dialog 
        open={openActivitiesModal} 
        onClose={() => setOpenActivitiesModal(false)} 
        maxWidth="lg" 
        fullWidth
        disableEscapeKeyDown
        disableBackdropClick
      >
        <DialogTitle>
          <Typography variant="h5" fontWeight={700}>
            {activityFilter === 'all' && 'All Activities'}
            {activityFilter === 'scheduled' && 'Scheduled Activities'}
            {activityFilter === 'completed' && 'Completed Activities'}
            {activityFilter === 'categories' && 'Activity Categories'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Title
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Category
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Date
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Time
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Location
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#800000', color: '#ffffff', fontWeight: 600, fontSize: '16px', padding: '16px' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id} hover>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      {activity.title}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#800000',
                          fontWeight: 500
                        }}
                      >
                        {activity.category}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      {activity.date}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      {activity.time}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      {activity.location}
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: activity.completed ? '#4caf50' : '#ff9800',
                          fontWeight: 500
                        }}
                      >
                        {activity.completed ? 'Completed' : 'Scheduled'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: 14, fontWeight: 500, padding: '12px 16px' }}>
                      <Stack direction="row" spacing={1}>
                        <IconButton 
                          size="small" 
                          onClick={() => setViewActivity(activity)}
                          sx={{ 
                            '&:hover': { bgcolor: 'rgba(128, 0, 0, 0.1)' }
                          }}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          onClick={() => setEditActivity(activity)}
                          sx={{ 
                            '&:hover': { bgcolor: 'rgba(128, 0, 0, 0.1)' }
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenActivitiesModal(false)} variant="outlined">
            Close
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