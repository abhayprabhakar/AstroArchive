// In GearDetails.js - Follows the design pattern of SessionDetails and LocationDetails
import * as React from 'react';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import { styled } from '@mui/material/styles';
import { 
  TextField, 
  Select, 
  MenuItem, 
  FormControl, 
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
  Divider,
  Chip,
  Card,
  CardContent,
  InputAdornment,
  OutlinedInput
} from '@mui/material';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import TelePhoto from '@mui/icons-material/CameraEnhance';
import CameraIcon from '@mui/icons-material/PhotoCamera';
import TelescopeIcon from '@mui/icons-material/Visibility';
import FilterIcon from '@mui/icons-material/Tune';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import ComputerIcon from '@mui/icons-material/Computer';

const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

// Gear type options with icons
const gearTypes = [
  { value: 'Camera', label: 'Camera', icon: <CameraIcon fontSize="small" /> },
  { value: 'Lens', label: 'Lens', icon: <TelePhoto fontSize="small" /> },
  { value: 'Telescope', label: 'Telescope', icon: <TelescopeIcon fontSize="small" /> },
  { value: 'Mount', label: 'Mount', icon: <DeviceHubIcon fontSize="small" /> },
  { value: 'Filter', label: 'Filter', icon: <FilterIcon fontSize="small" /> },
  { value: 'Software', label: 'Software', icon: <ComputerIcon fontSize="small" /> },
  { value: 'Other', label: 'Other Accessory', icon: <DeviceHubIcon fontSize="small" /> }
];

// Get the icon for a gear type
const getGearIcon = (type) => {
  const gearType = gearTypes.find(gear => gear.value === type);
  return gearType ? gearType.icon : <DeviceHubIcon fontSize="small" />;
};

export default function GearDetails({ onFormDataChange, initialData = {}, selectedImageId = null }) {
  // State for form fields with defaults
  const [formState, setFormState] = useState({
    gear_id: null,
    gear_type: '',
    brand: '',
    model: '',
    ...initialData // Pre-populate with any initial data
  });
  
  // State for managing the list of selected gear for the current image
  const [selectedGear, setSelectedGear] = useState(initialData?.selectedGear || []);
  
  // Additional state
  const [allGear, setAllGear] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gearLoading, setGearLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gearError, setGearError] = useState(null);
  const [gearDialogOpen, setGearDialogOpen] = useState(false);
  const [addGearDialogOpen, setAddGearDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isFormValid, setIsFormValid] = useState(false);
  const [userId, setUserId] = useState(null);
  
  // Popular brands for autocomplete suggestions
  const commonBrands = {
    'Camera': ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'ZWO', 'QHY', 'Olympus'],
    'Lens': ['Canon', 'Nikon', 'Sony', 'Sigma', 'Tamron', 'Tokina', 'Rokinon'],
    'Telescope': ['Celestron', 'Sky-Watcher', 'Orion', 'Meade', 'Takahashi', 'William Optics', 'GSO'],
    'Mount': ['Sky-Watcher', 'Celestron', 'iOptron', 'Losmandy', 'Orion', 'Meade', 'Rainbow Astro'],
    'Filter': ['Baader', 'Astronomik', 'IDAS', 'Optolong', 'Antlia', 'ZWO', 'Chroma'],
    'Software': ['PixInsight', 'Adobe Photoshop', 'DeepSkyStacker', 'Stellarium', 'Astro Pixel Processor', 'Siril', 'NINA'],
    'Other': ['Various']
  };

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

  // Validate form data
  const validateForm = (data) => {
    // Basic validation - gear must have type, brand and model
    const valid = data.gear_type && data.brand && data.model;
    setIsFormValid(valid);
    return valid;
  };

  // Fetch user's existing gear with auth token
  const fetchGear = async () => {
    try {
      setGearLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/gear', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch gear: ${response.status}`);
      }
      
      const data = await response.json();
      setAllGear(data);
      setGearLoading(false);
    } catch (err) {
      setGearError(err.message || 'An error occurred while fetching gear data.');
      setGearLoading(false);
    }
  };

  // Fetch image's associated gear if image ID is provided
  const fetchImageGear = async (imageId) => {
    if (!imageId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/images/${imageId}/gear`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image gear: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedGear(data);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching image gear data.');
      setLoading(false);
    }
  };

  // Effect to fetch data when component mounts or image ID changes
  useEffect(() => {
    fetchGear();
    if (selectedImageId) {
      fetchImageGear(selectedImageId);
    }
  }, [selectedImageId]);

  // Update parent component with selected gear whenever it changes
  useEffect(() => {
    if (selectedGear.length > 0 || userId) {
      onFormDataChange({ 
        selectedGear, 
        isValid: selectedGear.length > 0,
        user_id: userId 
      });
    }
  }, [selectedGear, userId, onFormDataChange]);

  // Select an existing gear item
  const handleSelectGear = (gear) => {
    // Check if gear is already selected
    if (selectedGear.some(item => item.gear_id === gear.gear_id)) {
      // It's already in the list, so show a message or handle accordingly
      setSaveError('This equipment is already added to the image.');
      setGearDialogOpen(false);
      return;
    }

    // Add to selected gear list
    setSelectedGear([...selectedGear, gear]);
    setGearDialogOpen(false);
    setSaveSuccess(true);
    setSaveError(null);
  };

  // Remove a gear item from the selected list
  const handleRemoveGear = (gearId) => {
    setSelectedGear(selectedGear.filter(item => item.gear_id !== gearId));
  };

  // Start creating a new gear item
  const handleCreateNewGear = () => {
    const newState = {
      gear_id: null,
      gear_type: '',
      brand: '',
      model: '',
    };
    setFormState(newState);
    validateForm(newState);
    setCreateMode(true);
    setAddGearDialogOpen(true);
    setSaveSuccess(false);
    setSaveError(null);
  };

  // Open edit dialog for an existing gear item
  const handleEditGear = (gear) => {
    setFormState({
      gear_id: gear.gear_id,
      gear_type: gear.gear_type,
      brand: gear.brand,
      model: gear.model
    });
    setCreateMode(false);
    setAddGearDialogOpen(true);
  };

  // Save gear with improved error handling
  const handleSaveGear = async () => {
    try {
      setLoading(true);
      setSaveSuccess(false);
      setSaveError(null);

      // Validate form data
      if (!validateForm(formState)) {
        throw new Error('Please fill in all required fields');
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

      const url = formState.gear_id 
        ? `http://localhost:5000/api/gear/${formState.gear_id}`
        : 'http://localhost:5000/api/gear';

      const method = formState.gear_id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gear_type: formState.gear_type,
          brand: formState.brand,
          model: formState.model,
          user_id: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${formState.gear_id ? 'update' : 'create'} gear`);
      }

      const data = await response.json();
      
      // If it's a new gear, add to the selected list
      if (!formState.gear_id && data.gear_id) {
        const newGear = {
          gear_id: data.gear_id,
          gear_type: formState.gear_type,
          brand: formState.brand,
          model: formState.model,
          user_id: currentUserId
        };
        
        // Add to selected gear list
        setSelectedGear([...selectedGear, newGear]);
        
        // Add to all gear list
        setAllGear([...allGear, newGear]);
      } else if (formState.gear_id) {
        // Update both lists if editing
        setAllGear(allGear.map(g => 
          g.gear_id === formState.gear_id 
            ? {...g, gear_type: formState.gear_type, brand: formState.brand, model: formState.model} 
            : g
        ));
        
        setSelectedGear(selectedGear.map(g => 
          g.gear_id === formState.gear_id 
            ? {...g, gear_type: formState.gear_type, brand: formState.brand, model: formState.model} 
            : g
        ));
      }
      
      setSaveSuccess(true);
      setAddGearDialogOpen(false);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while saving the gear.');
    } finally {
      setLoading(false);
    }
  };

  // Delete gear
  const handleDeleteGear = async () => {
    if (!formState.gear_id) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/gear/${formState.gear_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete gear');
      }

      // Remove from both lists
      setAllGear(allGear.filter(g => g.gear_id !== formState.gear_id));
      setSelectedGear(selectedGear.filter(g => g.gear_id !== formState.gear_id));
      
      // Reset form and close dialogs
      setFormState({
        gear_id: null,
        gear_type: '',
        brand: '',
        model: '',
      });
      
      setDeleteDialogOpen(false);
      setAddGearDialogOpen(false);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while deleting the gear.');
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  // Link gear to an image
  const handleLinkGearToImage = async () => {
    if (!selectedImageId || selectedGear.length === 0) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
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
          }
        } catch (error) {
          console.error('Error fetching user ID:', error);
        }
      }
      
      // Create an array of gear IDs
      const gearIds = selectedGear.map(gear => gear.gear_id);
      
      const response = await fetch(`http://localhost:5000/api/images/${selectedImageId}/gear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          gear_ids: gearIds,
          user_id: currentUserId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link gear to image');
      }
      
      setSaveSuccess(true);
      
    } catch (err) {
      setSaveError(err.message || 'An error occurred while linking gear to the image.');
    } finally {
      setLoading(false);
    }
  };

  // Filter gear by type for easier selection
  const filterGearByType = (type) => {
    return allGear.filter(gear => !type || gear.gear_type === type);
  };

  // Group the gear by type for organized display
  const getGroupedGear = () => {
    const grouped = {};
    gearTypes.forEach(type => {
      grouped[type.value] = filterGearByType(type.value);
    });
    return grouped;
  };

  if (loading && !selectedGear.length && !createMode) {
    return <CircularProgress />;
  }

  if (error && !selectedGear.length && !createMode) {
    return <Typography color="error">Error: {error}</Typography>;
  }

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Equipment Used
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => setGearDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Add Equipment
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={handleCreateNewGear}
          >
            New Equipment
          </Button>
        </Box>
      </Box>

      {saveSuccess && (
        <Box sx={{ mb: 2 }}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#e8f5e9', border: '1px solid #a5d6a7' }}>
            <Typography variant="body2" color="success.main">
              Equipment updated successfully.
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

      {selectedGear.length === 0 ? (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper', border: '1px dashed #ccc' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            No equipment added yet. Add the gear used to capture this image.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setGearDialogOpen(true)}
            >
              Add Existing
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={handleCreateNewGear}
            >
              Create New
            </Button>
          </Box>
        </Paper>
      ) : (
        <>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selected Equipment:
            </Typography>
            <Grid container spacing={2}>
              {selectedGear.map((gear) => (
                <Grid size={{xs: 12, sm: 6, md: 12}} item key={gear.gear_id}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getGearIcon(gear.gear_type)}
                          <Typography variant="subtitle2" sx={{ ml: 1 }}>
                            {gear.gear_type}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditGear(gear)}
                            sx={{ mr: 0.5 }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            onClick={() => handleRemoveGear(gear.gear_id)}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="body2" component="div">
                        <strong>{gear.brand}</strong> {gear.model}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </>
      )}

      {/* Dialog for selecting existing gear */}
      <Dialog 
        open={gearDialogOpen} 
        onClose={() => setGearDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            Select Equipment
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setGearDialogOpen(false)} 
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {gearLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : gearError ? (
            <Typography color="error">{gearError}</Typography>
          ) : allGear.length === 0 ? (
            <Typography>
              No equipment found. Create new equipment first.
            </Typography>
          ) : (
            <>
              {Object.entries(getGroupedGear()).map(([type, gearList]) => (
                gearList.length > 0 && (
                  <Box key={type} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getGearIcon(type)}
                      <Typography variant="subtitle1" sx={{ ml: 1, fontWeight: 'bold' }}>
                        {type}
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={1}>
                      {gearList.map((gear) => (
                        <Grid item size={{xs:12, sm: 6, md:4}} key={gear.gear_id}>
                          <Paper 
                            elevation={0} 
                            variant="outlined"
                            sx={{ 
                              p: 1.5, 
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': {
                                bgcolor: 'action.hover',
                                borderColor: 'primary.main'
                              },
                              bgcolor: selectedGear.some(g => g.gear_id === gear.gear_id) ? 'action.selected' : 'background.paper'
                            }}
                            onClick={() => handleSelectGear(gear)}
                          >
                            <Typography variant="body2" component="div">
                              <strong>{gear.brand}</strong> {gear.model}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            startIcon={<AddIcon />} 
            onClick={() => {
              handleCreateNewGear();
              setGearDialogOpen(false);
            }}
          >
            Create New Equipment
          </Button>
          <Button onClick={() => setGearDialogOpen(false)}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog for adding/editing gear */}
      <Dialog 
        open={addGearDialogOpen} 
        onClose={() => setAddGearDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {formState.gear_id ? 'Edit Equipment' : 'Add New Equipment'}
            <IconButton 
              edge="end" 
              color="inherit" 
              onClick={() => setAddGearDialogOpen(false)} 
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <FormGrid size={{xs:12}}>
              <FormControl fullWidth required sx={{ mb: 2 }}>
                <FormLabel htmlFor="gear_type">Equipment Type</FormLabel>
                <Select
                  id="gear_type"
                  name="gear_type"
                  value={formState.gear_type}
                  onChange={handleInputChange}
                  displayEmpty
                  renderValue={(selected) => {
                    if (!selected) {
                      return <em>Select equipment type</em>;
                    }
                    
                    const gearType = gearTypes.find(g => g.value === selected);
                    return (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {gearType?.icon}
                        <Typography sx={{ ml: 1 }}>{selected}</Typography>
                      </Box>
                    );
                  }}
                >
                  <MenuItem value="">
                    <em>Select equipment type</em>
                  </MenuItem>
                  {gearTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {type.icon}
                        <Typography sx={{ ml: 1 }}>{type.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormGrid>

            <FormGrid size={{xs:12}}>
              <FormLabel htmlFor="brand" required>
                Brand
              </FormLabel>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <Select
                  id="brand"
                  name="brand"
                  value={formState.brand}
                  onChange={handleInputChange}
                  displayEmpty
                  input={<OutlinedInput />}
                  renderValue={(selected) => {
                    if (!selected) {
                      return <em>Select or enter brand</em>;
                    }
                    return selected;
                  }}
                  inputProps={{ 'aria-label': 'Brand' }}
                  freeSolo
                >
                  <MenuItem value="">
                    <em>Select or enter brand</em>
                  </MenuItem>
                  {formState.gear_type && commonBrands[formState.gear_type] ? (
                    commonBrands[formState.gear_type].map((brand) => (
                      <MenuItem key={brand} value={brand}>
                        {brand}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>Select a gear type first</MenuItem>
                  )}
                  <MenuItem value="__custom">
                    <TextField
                      fullWidth
                      placeholder="Enter custom brand"
                      variant="standard"
                      size="small"
                      onChange={(e) => {
                        e.stopPropagation();
                        handleInputChange({
                          target: { name: 'brand', value: e.target.value }
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                  </MenuItem>
                </Select>
              </FormControl>
            </FormGrid>

            <FormGrid size={{xs:12}}>
              <FormLabel htmlFor="model" required>
                Model
              </FormLabel>
              <TextField
                id="model"
                name="model"
                value={formState.model}
                onChange={handleInputChange}
                placeholder="Enter model name"
                fullWidth
                variant="outlined"
                sx={{ mb: 2 }}
              />
            </FormGrid>
          </Grid>
        </DialogContent>
        <DialogActions>
          {formState.gear_id && (
            <Button 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ marginRight: 'auto' }}
            >
              Delete
            </Button>
          )}
          <Button onClick={() => setAddGearDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />}
            onClick={handleSaveGear}
            disabled={loading || !isFormValid}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation dialog for deleting gear */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Equipment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {formState.brand} {formState.model}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteGear}
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