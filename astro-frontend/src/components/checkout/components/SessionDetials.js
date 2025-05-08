// In SessionDetails.js - Improved with user_id implementation
import * as React from 'react';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
  Slider, 
  Typography, 
  Button, 
  Box, 
  CircularProgress, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  IconButton,
  Divider
} from '@mui/material';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export default function SessionDetails({ onFormDataChange, initialData = {}, selectedLocationId = null }) {
  // State for form fields with improved defaults and validation
  const [formState, setFormState] = useState({
    session_id: null,
    session_date: dayjs(),
    weather_conditions: '',
    seeing_conditions: '',
    moon_phase: '',
    light_pollution_index: 1,
    location_id: selectedLocationId || '',
    ...initialData // Pre-populate with any initial data
  });
  
  // Additional state
  const [sessions, setSessions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(!!formState.session_id);
  // Add state for user_id
  const [userId, setUserId] = useState(null);

  // Moon phase options
  const moonPhases = [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent'
  ];

  // Get user ID from token
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        
        const response = await fetch('http://localhost:5000/api/user_id', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch user ID: ${response.status}`);
        }
        
        const data = await response.json();
        setUserId(data.user_id);
      } catch (err) {
        console.error('Error fetching user ID:', err);
      }
    };
    
    fetchUserId();
  }, []);

  // Handle input changes with validation
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const updatedState = {
      ...formState,
      [name]: value
    };
    setFormState(updatedState);
    validateForm(updatedState);
  };

  // Handle date change separately
  const handleDateChange = (date) => {
    const updatedState = {
      ...formState,
      session_date: date
    };
    setFormState(updatedState);
    validateForm(updatedState);
  };

  // Handle slider change for light pollution index
  const handleSliderChange = (event, newValue) => {
    const updatedState = {
      ...formState,
      light_pollution_index: newValue
    };
    setFormState(updatedState);
    validateForm(updatedState);
  };

  // Validate form data
  const validateForm = (data) => {
    // Basic validation - session must have a date
    const valid = !!data.session_id || (data.session_date && data.location_id);
    setIsFormValid(valid);
    return valid;
  };

  // Fetch existing sessions with authentication
  const fetchSessions = async (locationId = null) => {
    try {
      setSessionsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      let url = 'http://localhost:5000/api/sessions';
      
      // If locationId is provided, filter sessions by that location
      if (locationId) {
        url += `?location_id=${locationId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.status}`);
      }
      const data = await response.json();
      setSessions(data);
      setSessionsLoading(false);
    } catch (err) {
      setSessionsError(err.message || 'An error occurred while fetching session data.');
      setSessionsLoading(false);
    }
  };

  // Fetch locations for dropdown with authentication
  const fetchLocations = async () => {
    try {
      setLocationsLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch('http://localhost:5000/api/locations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.status}`);
      }
      const data = await response.json();
      setLocations(data);
      setLocationsLoading(false);
    } catch (err) {
      setLocationsLoading(false);
    }
  };

  // Effect to fetch sessions when component mounts or location changes
  useEffect(() => {
    if (localStorage.getItem('token')) {
      fetchSessions(selectedLocationId);
      fetchLocations();
    }
  }, [selectedLocationId]);

  // Update parent component with form data whenever it changes
  useEffect(() => {
    if (formState.session_id || userId) {
      // Pass the form validity and user_id to the parent
      const isValid = validateForm(formState);
      onFormDataChange({ ...formState, isValid, user_id: userId });
    }
  }, [formState, userId, onFormDataChange]);

  // Select an existing session
  const handleSelectSession = (session) => {
    const updatedState = {
      session_id: session.session_id,
      session_date: dayjs(session.session_date),
      weather_conditions: session.weather_conditions || '',
      seeing_conditions: session.seeing_conditions || '',
      moon_phase: session.moon_phase || '',
      light_pollution_index: session.light_pollution_index || 1,
      location_id: session.location_id || selectedLocationId || '',
    };
    setFormState(updatedState);
    validateForm(updatedState);
    setCreateMode(false);
    setSessionDialogOpen(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Start creating a new session
  const handleCreateNewSession = () => {
    const newState = {
      session_id: null,
      session_date: dayjs(),
      weather_conditions: '',
      seeing_conditions: '',
      moon_phase: '',
      light_pollution_index: 1,
      location_id: selectedLocationId || '',
    };
    setFormState(newState);
    validateForm(newState);
    setCreateMode(true);
    setSessionDialogOpen(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dayjs(dateString).format('MMM D, YYYY');
  };

  // Get location name by ID
  const getLocationName = (locationId) => {
    const location = locations.find(loc => loc.location_id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  // Save session with improved error handling and user_id
  const handleSaveSession = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      setSaveError(null);

      // Validate form data
      if (!validateForm(formState)) {
        throw new Error('Please select a location and set a date');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Get user ID if not already set
      let currentUserId = userId;
      if (!currentUserId) {
        try {
          const userResponse = await fetch('http://localhost:5000/api/user_id', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            currentUserId = userData.user_id;
            setUserId(currentUserId);
          } else {
            throw new Error('Failed to get user ID');
          }
        } catch (error) {
          console.error('Error fetching user ID:', error);
          throw new Error('Failed to authenticate user');
        }
      }

      const url = formState.session_id 
        ? `http://localhost:5000/api/sessions/${formState.session_id}`
        : 'http://localhost:5000/api/sessions';

      const method = formState.session_id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_date: formState.session_date.format('YYYY-MM-DD'),
          weather_conditions: formState.weather_conditions,
          seeing_conditions: formState.seeing_conditions,
          moon_phase: formState.moon_phase,
          light_pollution_index: formState.light_pollution_index,
          location_id: formState.location_id,
          user_id: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${formState.session_id ? 'update' : 'create'} session`);
      }

      const data = await response.json();
      
      // If it's a new session, update the form with the new ID
      if (!formState.session_id && data.session_id) {
        const updatedState = {
          ...formState,
          session_id: data.session_id,
        };
        setFormState(updatedState);
        validateForm(updatedState);
        setCreateMode(false);
        
        // Notify parent of the updated data with the new ID
        onFormDataChange({ ...updatedState, isValid: true, user_id: currentUserId });
      }
      
      // Refresh sessions list
      fetchSessions(formState.location_id);
      setSaveSuccess(true);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while saving the session.');
    } finally {
      setLoading(false);
    }
  };

  // Delete session with authentication
  const handleDeleteSession = async () => {
    if (!formState.session_id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`http://localhost:5000/api/sessions/${formState.session_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }

      // Reset form and refresh sessions
      const newState = {
        session_id: null,
        session_date: dayjs(),
        weather_conditions: '',
        seeing_conditions: '',
        moon_phase: '',
        light_pollution_index: 1,
        location_id: selectedLocationId || '',
      };
      setFormState(newState);
      validateForm(newState);
      
      // Notify parent of reset
      onFormDataChange({ ...newState, isValid: false, user_id: userId });
      
      fetchSessions(selectedLocationId);
      setDeleteDialogOpen(false);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while deleting the session.');
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formState.session_id && !createMode) {
    return <CircularProgress />;
  }

  if (error && !formState.session_id && !createMode) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {createMode ? 'Create New Session' : formState.session_id ? `Edit Session from ${formatDate(formState.session_date)}` : 'Select or Create a Session'}
        </Typography>
        <Box>
          {!createMode && !formState.session_id && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleCreateNewSession}
              sx={{ mr: 1 }}
            >
              New Session
            </Button>
          )}
          <Button 
            variant="outlined" 
            startIcon={<HistoryIcon />}
            onClick={() => setSessionDialogOpen(true)}
          >
            View {selectedLocationId ? "Location's" : "All"} Sessions
          </Button>
        </Box>
      </Box>

      {saveSuccess && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
            <Typography variant="body2" color="success.main">
              Session {formState.session_id ? 'updated' : 'created'} successfully.
            </Typography>
          </Paper>
        </Box>
      )}

      {saveError && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffebee', border: '1px solid #ef9a9a' }}>
            <Typography variant="body2" color="error">
              Error: {saveError}
            </Typography>
          </Paper>
        </Box>
      )}

      {(!formState.session_id && !createMode) ? (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', border: '1px dashed #ccc' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Please select an existing session or create a new one
            {selectedLocationId && ` for ${getLocationName(selectedLocationId)}`}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<HistoryIcon />}
              onClick={() => setSessionDialogOpen(true)}
            >
              Select Existing
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleCreateNewSession}
            >
              Create New
            </Button>
          </Box>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            {formState.session_id && !createMode && (
              <Grid item xs={12}>
                <Paper elevation={1} sx={{ p: 2, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" color="primary">
                    Using existing session from {formatDate(formState.session_date)}
                  </Typography>
                  {formState.location_id && (
                    <Typography variant="body2" color="text.secondary">
                      Location: {getLocationName(formState.location_id)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}
        
            <FormGrid size={{ xs: 12, md: 6 }}>
              <FormLabel htmlFor="session_date" required>
                Session Date
              </FormLabel>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker 
                  value={formState.session_date ? dayjs(formState.session_date) : null}
                  onChange={handleDateChange}
                />
              </LocalizationProvider>
            </FormGrid>

            <FormGrid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <FormLabel htmlFor="location_id">Location</FormLabel>
                <Select
                  labelId="location-id-label"
                  id="location_id"
                  name="location_id"
                  value={formState.location_id}
                  onChange={handleInputChange}
                  displayEmpty
                  error={!formState.location_id}
                >
                  <MenuItem value="">
                    <em>Select a location</em>
                  </MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location.location_id} value={location.location_id}>
                      {location.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGrid>

            <FormGrid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <FormLabel htmlFor="moon_phase">Moon Phase</FormLabel>
                <Select
                  labelId="moon-phase-label"
                  id="moon_phase"
                  name="moon_phase"
                  value={formState.moon_phase}
                  onChange={handleInputChange}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>Select moon phase</em>
                  </MenuItem>
                  {moonPhases.map((phase) => (
                    <MenuItem key={phase} value={phase}>
                      {phase}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGrid>

            <FormGrid size={{ xs: 12, md: 6 }}>
              <FormLabel htmlFor="light_pollution_index">
                Light Pollution Index (Bortle Scale)
              </FormLabel>
              <Slider
                id="light_pollution_index"
                name="light_pollution_index"
                value={formState.light_pollution_index}
                onChange={handleSliderChange}
                min={1}
                max={9}
                step={1}
                marks
                valueLabelDisplay="auto"
                aria-labelledby="light-pollution-slider"
              />
              <Typography variant="caption" color="text.secondary">
                1: Excellent dark-sky site, 9: Inner-city sky
              </Typography>
            </FormGrid>

            <FormGrid size={{ xs: 12, md: 12 }}>
              <FormLabel htmlFor="weather_conditions">
                Weather Conditions
              </FormLabel>
              <TextField
                id="weather_conditions"
                name="weather_conditions"
                value={formState.weather_conditions}
                onChange={handleInputChange}
                multiline
                rows={2}
                placeholder="Temperature, humidity, wind speed, etc."
                fullWidth
                variant="outlined"
              />
            </FormGrid>
              
            <FormGrid item size={{ xs: 12, md: 12 }}>
              <FormLabel htmlFor="seeing_conditions">
                Seeing Conditions
              </FormLabel>
              <TextField
                id="seeing_conditions"
                name="seeing_conditions"
                value={formState.seeing_conditions}
                onChange={handleInputChange}
                multiline
                rows={2}
                placeholder="Describe atmospheric stability, transparency, etc."
                fullWidth
                variant="outlined"
              />
            </FormGrid>
          </Grid>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<SaveIcon />}
              onClick={handleSaveSession}
              disabled={loading || !formState.location_id || !formState.session_date}
            >
              {loading ? <CircularProgress size={24} /> : formState.session_id ? 'Update Session' : 'Save Session'}
            </Button>
            
            {formState.session_id && (
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Session
              </Button>
            )}
          </Box>
        </>
      )}

      {/* Dialog for selecting existing sessions */}
      <Dialog 
        open={sessionDialogOpen} 
        onClose={() => setSessionDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Select {selectedLocationId ? `Session for ${getLocationName(selectedLocationId)}` : 'Existing Session'}
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setSessionDialogOpen(false)} 
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {sessionsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : sessionsError ? (
            <Typography color="error">{sessionsError}</Typography>
          ) : sessions.length === 0 ? (
            <Typography>
              No sessions found{selectedLocationId ? ` for ${getLocationName(selectedLocationId)}` : ''}. Create a new one.
            </Typography>
          ) : (
            <List>
              {sessions.map((session) => (
                <ListItem 
                  key={session.session_id} 
                  disablePadding
                  divider
                >
                  <ListItemButton onClick={() => handleSelectSession(session)}>
                    <ListItemText
                      primary={`Session on ${formatDate(session.session_date)}`}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {session.location_id ? getLocationName(session.location_id) : 'No location'} 
                          </Typography>
                          {session.moon_phase && ` • ${session.moon_phase}`}
                          {session.light_pollution_index && ` • Bortle: ${session.light_pollution_index}`}
                        </>
                      }
                    />
                    <Tooltip title="Edit this session">
                      <EditIcon color="primary" />
                    </Tooltip>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<AddIcon />} 
            onClick={() => {
              handleCreateNewSession();
              setSessionDialogOpen(false);
            }}
          >
            Create New Session
          </Button>
          <Button onClick={() => setSessionDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog for deleting a session */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Session</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete session from "{formatDate(formState.session_date)}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteSession}
            startIcon={loading ? <CircularProgress size={20} /> : <DeleteIcon />}
            disabled={loading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}