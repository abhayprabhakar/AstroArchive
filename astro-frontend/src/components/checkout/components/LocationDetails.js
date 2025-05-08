// In LocationDetails.js - Improved form data handling with user_id
import * as React from 'react';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { 
  TextField, 
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
  Slider,
  Divider
} from '@mui/material';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

// Ensure validation feedback is available to the parent component
export default function LocationDetails({ onFormDataChange, initialData = {} }) {
  // Existing state setup
  const [formState, setFormState] = useState({
    location_id: null,
    name: '',
    latitude: '',
    longitude: '',
    bortle_class: 1,
    notes: '',
    ...initialData // Pre-populate with any initial data
  });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationsError, setLocationsError] = useState(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // Add state to track form validity
  const [isFormValid, setIsFormValid] = useState(!!formState.location_id);
  // Add state for user_id
  const [userId, setUserId] = useState(null);
  
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
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If it's the name field, update validation state
    if (name === 'name') {
      validateForm({ ...formState, [name]: value });
    }
  };
  
  // Validate form data
  const validateForm = (data) => {
    // Basic validation - location must have a name or a selected ID
    const valid = !!data.location_id || (data.name && data.name.trim() !== '');
    setIsFormValid(valid);
    return valid;
  };

  // Handle slider change with validation
  const handleSliderChange = (event, newValue) => {
    const updatedState = {
      ...formState,
      bortle_class: newValue
    };
    setFormState(updatedState);
    validateForm(updatedState);
  };
  
  // Fetch locations with auth token
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
      setLocationsError(err.message || 'An error occurred while fetching location data.');
      setLocationsLoading(false);
    }
  };

  // Fetch locations when component mounts
  useEffect(() => {
    fetchLocations();
  }, []);
  
  // Update parent component with form data whenever it changes
  useEffect(() => {
    if (formState.location_id || userId) {
      // Also pass the form validity and user_id to the parent
      const isValid = validateForm(formState);
      onFormDataChange({ ...formState, isValid, user_id: userId });
    }
  }, [formState, userId, onFormDataChange]);

  // After selecting a location, validate form
  const handleSelectLocation = (location) => {
    const updatedState = {
      location_id: location.location_id,
      name: location.name || '',
      latitude: location.latitude || '',
      longitude: location.longitude || '',
      bortle_class: location.bortle_class || 1,
      notes: location.notes || '',
    };
    setFormState(updatedState);
    validateForm(updatedState);
    setCreateMode(false);
    setLocationDialogOpen(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Create new location with validation
  const handleCreateNewLocation = () => {
    const newState = {
      location_id: null,
      name: '',
      latitude: '',
      longitude: '',
      bortle_class: 1,
      notes: '',
    };
    setFormState(newState);
    validateForm(newState);
    setCreateMode(true);
    setLocationDialogOpen(false);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Save location with improved error handling and user_id
  const handleSaveLocation = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      setSaveError(null);

      // Validate form data
      if (!validateForm(formState)) {
        throw new Error('Please complete all required fields');
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

      const url = formState.location_id 
        ? `http://localhost:5000/api/locations/${formState.location_id}`
        : 'http://localhost:5000/api/locations';

      const method = formState.location_id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formState.name,
          latitude: formState.latitude,
          longitude: formState.longitude,
          bortle_class: formState.bortle_class,
          notes: formState.notes,
          user_id: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${formState.location_id ? 'update' : 'create'} location`);
      }

      const data = await response.json();
      
      // If it's a new location, update the form with the new ID
      if (!formState.location_id && data.location_id) {
        const updatedState = {
          ...formState,
          location_id: data.location_id,
        };
        setFormState(updatedState);
        validateForm(updatedState);
        setCreateMode(false);
        
        // Notify parent of the updated data with the new ID
        onFormDataChange({ ...updatedState, isValid: true, user_id: currentUserId });
      }
      
      // Refresh locations list
      fetchLocations();
      setSaveSuccess(true);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while saving the location.');
    } finally {
      setLoading(false);
    }
  };

  // Delete location with validation
  const handleDeleteLocation = async () => {
    if (!formState.location_id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await fetch(`http://localhost:5000/api/locations/${formState.location_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      // Reset form and refresh locations
      const newState = {
        location_id: null,
        name: '',
        latitude: '',
        longitude: '',
        bortle_class: 1,
        notes: '',
      };
      setFormState(newState);
      validateForm(newState);
      
      // Notify parent of reset
      onFormDataChange({ ...newState, isValid: false, user_id: userId });
      
      fetchLocations();
      setDeleteDialogOpen(false);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while deleting the location.');
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formState.location_id && !createMode) {
    return <CircularProgress />;
  }

  if (error && !formState.location_id && !createMode) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {createMode ? 'Create New Location' : formState.location_id ? `Edit Location: ${formState.name}` : 'Select or Create a Location'}
        </Typography>
        <Box>
          {!createMode && !formState.location_id && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleCreateNewLocation}
              sx={{ mr: 1 }}
            >
              New Location
            </Button>
          )}
          <Button 
            variant="outlined" 
            startIcon={<LocationOnIcon />}
            onClick={() => setLocationDialogOpen(true)}
          >
            View All Locations
          </Button>
        </Box>
      </Box>

      {saveSuccess && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
            <Typography variant="body2" color="success.main">
              Location {formState.location_id ? 'updated' : 'created'} successfully.
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

      {(!formState.location_id && !createMode) ? (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', border: '1px dashed #ccc' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Please select an existing location or create a new one
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<LocationOnIcon />}
              onClick={() => setLocationDialogOpen(true)}
            >
              Select Existing
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleCreateNewLocation}
            >
              Create New
            </Button>
          </Box>
        </Paper>
      ) : (
        <>
          <Grid container spacing={3}>
            <FormGrid size={{xs:12, md:12}}>
              <FormLabel htmlFor="name" required>
                Location Name
              </FormLabel>
              <TextField
                id="name"
                name="name"
                value={formState.name}
                onChange={handleInputChange}
                placeholder="Enter location name"
                variant="outlined"
                required
                error={formState.name === ''}
                helperText={formState.name === '' ? 'Name is required' : ''}
              />
            </FormGrid>

            <FormGrid size={{xs:12, md:6}}>
              <FormLabel htmlFor="latitude">
                Latitude
              </FormLabel>
              <TextField
                id="latitude"
                name="latitude"
                value={formState.latitude}
                onChange={handleInputChange}
                placeholder="Decimal degrees (e.g., 40.7128)"
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
              />
            </FormGrid>

            <FormGrid size={{xs:12, md:6}}>
              <FormLabel htmlFor="longitude">
                Longitude
              </FormLabel>
              <TextField
                id="longitude"
                name="longitude"
                value={formState.longitude}
                onChange={handleInputChange}
                placeholder="Decimal degrees (e.g., -74.0060)"
                fullWidth
                variant="outlined"
                type="number"
                inputProps={{ step: 'any' }}
              />
            </FormGrid>

            <FormGrid size={{xs:12, md:12}}>
              <FormLabel htmlFor="bortle_class">
                Bortle Scale (Light Pollution)
              </FormLabel>
              <Slider
                id="bortle_class"
                name="bortle_class"
                value={formState.bortle_class}
                onChange={handleSliderChange}
                min={1}
                max={9}
                step={1}
                marks
                valueLabelDisplay="auto"
                aria-labelledby="bortle-class-slider"
              />
              <Typography variant="caption" color="text.secondary">
                1: Excellent dark-sky site, 9: Inner-city sky
              </Typography>
            </FormGrid>
              
            <FormGrid size={{xs:12, md:12}}>
              <FormLabel htmlFor="notes">
                Notes
              </FormLabel>
              <TextField
                id="notes"
                name="notes"
                value={formState.notes}
                onChange={handleInputChange}
                multiline
                rows={2}
                placeholder="Additional details about this location (access, parking, etc.)"
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
              onClick={handleSaveLocation}
              disabled={loading || !formState.name}
            >
              {loading ? <CircularProgress size={24} /> : formState.location_id ? 'Update Location' : 'Save Location'}
            </Button>
            
            {formState.location_id && (
              <Button 
                variant="outlined" 
                color="error" 
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete Location
              </Button>
            )}
          </Box>
        </>
      )}

      {/* Dialog for selecting existing locations */}
      <Dialog 
        open={locationDialogOpen} 
        onClose={() => setLocationDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Select Existing Location
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setLocationDialogOpen(false)} 
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {locationsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : locationsError ? (
            <Typography color="error">{locationsError}</Typography>
          ) : locations.length === 0 ? (
            <Typography>No locations found. Create a new one.</Typography>
          ) : (
            <List>
              {locations.map((location) => (
                <ListItem 
                  key={location.location_id} 
                  disablePadding
                  divider
                >
                  <ListItemButton onClick={() => handleSelectLocation(location)}>
                    <ListItemText
                      primary={location.name}
                      secondary={
                        <>
                          {location.latitude && location.longitude && (
                            <Typography component="span" variant="body2" color="text.primary">
                              {`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                            </Typography>
                          )}
                          {location.bortle_class && ` • Bortle: ${location.bortle_class}`}
                          {location.notes && ` • ${location.notes.substring(0, 50)}${location.notes.length > 50 ? '...' : ''}`}
                        </>
                      }
                    />
                    <Tooltip title="Edit this location">
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
              handleCreateNewLocation();
              setLocationDialogOpen(false);
            }}
          >
            Create New Location
          </Button>
          <Button onClick={() => setLocationDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog for deleting a location */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Location</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete location "{formState.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteLocation}
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