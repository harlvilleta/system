import React, { useState, useEffect } from "react";
import { 
  Box, Grid, Card, CardContent, Typography, Paper, Avatar, Chip, CardHeader, Stack, useTheme, 
  TextField, InputAdornment, IconButton, Button, Stack as MuiStack, Divider
} from "@mui/material";
import { 
  Announcement, Person, CalendarToday, EventNote, Search, Visibility, Print, 
  PushPin, PushPinOutlined, Edit, Delete, CheckCircle, Info
} from "@mui/icons-material";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function UserAnnouncements() {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCard, setSelectedCard] = useState('total');

  useEffect(() => {
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(announcementsQuery, (snap) => {
      const announcementsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(announcementsData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Utility functions for filtering announcements
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
    const recent = sortedActive.slice(0, 3);
    const mainList = sortedActive.slice(3);
    const filteredMain = search
      ? mainList.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : mainList;
    return { recent, mainList: filteredMain };
  }

  function getCompletedAnnouncements(announcements, search) {
    const completed = announcements.filter(a => a.completed);
    const sorted = [...completed].sort((a, b) => new Date(b.completedAt || b.date) - new Date(a.completedAt || a.date));
    return search
      ? sorted.filter(a =>
          (a.title?.toLowerCase().includes(search.toLowerCase()) ||
           a.message?.toLowerCase().includes(search.toLowerCase()))
        )
      : sorted;
  }

  // Card click handler
  const handleCardClick = (cardType) => {
    setSelectedCard(cardType);
    setSearch(""); // Clear search when selecting a card
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
      default:
        return 'All Announcements';
    }
  };

  // Use utility functions for each tab
  const { recent, mainList } = getActiveAnnouncements(announcements, search);
  const filteredCompleted = getCompletedAnnouncements(announcements, search);

  const total = announcements.length;
  const pinnedCount = announcements.filter(a => a.pinned).length;
  const urgentCount = announcements.filter(a => a.priority === 'Urgent').length;

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
        <MuiStack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        </MuiStack>
        
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
                  {announcements.filter(a => a.scheduleDate && new Date(a.scheduleDate) > new Date()).length}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  Scheduled
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Search Bar and Filters */}
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
                    <Search sx={{ color: '#000000', opacity: 0.7 }} />
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
              label="With Photos" 
              variant="outlined"
              onClick={() => setSearch("photo")}
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
          </Box>
        </Box>

        {/* Recent and Completed Announcements Side by Side */}
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
                Recent Announcements
              </Typography>
              <Box sx={{ 
                flex: 1,
                minHeight: '400px',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                {recent.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>No recent announcements.</Typography>
                ) : (
                  <MuiStack spacing={0.5} sx={{ maxWidth: '100%' }}>
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
                        title={<MuiStack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                          <Typography fontWeight={700} sx={{ color: '#4caf50' }}>{a.title}</Typography>
                          {a.pinned && <Chip label="📌 Pinned" color="warning" size="small" sx={{ fontSize: '0.7rem' }} />}
                          {a.priority === 'Urgent' && <Chip label="🚨 Urgent" color="error" size="small" sx={{ fontSize: '0.7rem' }} />}
                          <Chip label="🆕 Recent" color="success" variant="outlined" size="small" sx={{ fontSize: '0.7rem' }} />
                          <Chip label={`👤 ${a.audience || 'All'}`} color="secondary" size="small" sx={{ fontSize: '0.7rem' }} />
                          {a.completed && <Chip label="✅ Completed" color="success" size="small" sx={{ fontSize: '0.7rem' }} />}
                        </MuiStack>}
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
                          <MuiStack direction="row" spacing={1}>
                            <IconButton 
                              onClick={() => {/* View action */}}
                              sx={{
                                '&:hover': {
                                  color: '#1976d2',
                                  bgcolor: 'rgba(25, 118, 210, 0.04)'
                                }
                              }}
                            ><Visibility /></IconButton>
                            <IconButton 
                              onClick={() => {/* Print action */}}
                              sx={{
                                '&:hover': {
                                  color: '#666666',
                                  bgcolor: 'rgba(102, 102, 102, 0.04)'
                                }
                              }}
                            ><Print /></IconButton>
                          </MuiStack>
                        }
                      />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message || a.content}</Typography>
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
                  </MuiStack>
                )}
              </Box>
            </Box>
          </Grid>

          {/* Completed Announcements - Right Side */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ 
              maxWidth: '100%', 
              width: '100%', 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 700, color: '#43a047' }}>
                Completed Announcements
              </Typography>
              <Box sx={{ 
                flex: 1,
                minHeight: '400px',
                maxHeight: '600px',
                overflow: 'auto'
              }}>
                {filteredCompleted.length === 0 ? (
                  <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>No completed announcements.</Typography>
                ) : (
                  <MuiStack spacing={0.5}>
                    {filteredCompleted.map(a => (
                      <Card key={a.id} sx={{ mb: 0.5, borderLeft: '3px solid #43a047', boxShadow: 1, px: 0.5, py: 0.25, minHeight: 'auto' }}>
                        <CardHeader
                          title={<MuiStack direction="row" alignItems="center" spacing={1}>
                            <Typography fontWeight={700}>{a.title}</Typography>
                            <Chip label="Completed" color="success" size="small" />
                            <Chip label={a.audience || 'All'} color="secondary" size="small" />
                          </MuiStack>}
                          subheader={a.completedAt ? new Date(a.completedAt).toLocaleDateString() : a.date ? new Date(a.date).toLocaleDateString() : ''}
                          action={
                            <MuiStack direction="row" spacing={1}>
                              <IconButton 
                                onClick={() => {/* View action */}}
                                sx={{
                                  '&:hover': {
                                    color: '#1976d2',
                                    bgcolor: 'rgba(25, 118, 210, 0.04)'
                                  }
                                }}
                              ><Visibility /></IconButton>
                              <IconButton 
                                onClick={() => {/* Print action */}}
                                sx={{
                                  '&:hover': {
                                    color: '#666666',
                                    bgcolor: 'rgba(102, 102, 102, 0.04)'
                                  }
                                }}
                              ><Print /></IconButton>
                            </MuiStack>
                          }
                        />
                        <CardContent>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message || a.content}</Typography>
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
                  </MuiStack>
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Main List for current tab */}
        <Box sx={{ mb: 4, maxWidth: '100%', width: '100%' }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>{getCardTitle()}</Typography>
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
                  <CardHeader
                    title={<MuiStack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight={700}>{a.title}</Typography>
                      {a.pinned && <Chip label="Pinned" color="info" size="small" icon={<PushPin fontSize="small" />} />}
                      <Chip label={a.audience || 'All'} color="secondary" size="small" />
                      {a.completed && <Chip label="Completed" color="success" size="small" />}
                    </MuiStack>}
                    subheader={a.date ? new Date(a.date).toLocaleDateString() : ''}
                    action={
                      <MuiStack direction="row" spacing={1}>
                        <IconButton onClick={() => {/* View action */}}><Visibility /></IconButton>
                        <IconButton onClick={() => {/* Print action */}}><Print /></IconButton>
                      </MuiStack>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{a.message || a.content}</Typography>
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
      </Box>
    </Box>
  );
} 