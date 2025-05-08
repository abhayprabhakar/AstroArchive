import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Grid from '@mui/material/Grid';
import OutlinedInput from '@mui/material/OutlinedInput';
import { styled } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import dayjs from 'dayjs';

const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export default function ImageDetails({ onFormDataChange, initialData = {} }) {
  // State for form fields
  const [formState, setFormState] = useState({
    selectedObjectType: '',
    selectedObjectName: '',
    title: '',
    description: '',
    iso: '',
    exposure_time: '',
    focal_length: '',
    focus_score: '',
    aperture: '',
    capture_date_time: null,
    confirm_ownership: false,
    ...initialData // Pre-populate with any initial data
  });

  const [celestialObjects, setCelestialObjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const objectTypeApiMap = {
    'Black Hole': 'http://localhost:5000/api/celestial-objects/black_hole',
    'Galaxy': 'http://localhost:5000/api/celestial-objects/galaxy',
    'Nebula': 'http://localhost:5000/api/celestial-objects/nebula',
    'Planet': 'http://localhost:5000/api/celestial-objects/planet',
    'Star': 'http://localhost:5000/api/celestial-objects/star',
    'Star Cluster': 'http://localhost:5000/api/celestial-objects/star_cluster',
  };

  // Validate form fields
  const validateForm = () => {
    const requiredFields = {
      selectedObjectType: !formState.selectedObjectType,
      selectedObjectName: !formState.selectedObjectName,
      title: !formState.title,
      iso: !formState.iso,
      focal_length: !formState.focal_length,
      aperture: !formState.aperture,
      confirm_ownership: !formState.confirm_ownership
    };
    
    // Form is valid if there are no errors (all required fields have values)
    const isValid = !Object.values(requiredFields).some(field => field === true);
    
    // Update parent with validity status along with form data
    onFormDataChange({
      ...formState,
      isValid
    });
    
    return isValid;
  };

  // Handle input changes
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle date change separately
  const handleDateChange = (date) => {
    setFormState(prev => ({
      ...prev,
      capture_date_time: date
    }));
  };

  // Fetch celestial objects when object type changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (formState.selectedObjectType) {
          const apiUrl = objectTypeApiMap[formState.selectedObjectType];
          if (!apiUrl) {
            setError('Invalid object type selected');
            setLoading(false);
            return;
          }
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${formState.selectedObjectType}: ${response.status}`);
          }
          const data = await response.json();
          setCelestialObjects(data);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data.');
        setLoading(false);
      }
    };

    fetchData();
  }, [formState.selectedObjectType]);

  // Update parent component with form data whenever it changes
  useEffect(() => {
    // Validate whenever form state changes
    validateForm();
  }, [formState]);

  const handleObjectTypeChange = (event) => {
    setFormState(prev => ({
      ...prev,
      selectedObjectType: event.target.value,
      selectedObjectName: '' // Reset object name when type changes
    }));
  };

  const handleObjectNameChange = (event) => {
    setFormState(prev => ({
      ...prev,
      selectedObjectName: event.target.value
    }));
  };

  // Get unique object types
  const objectTypes = Object.keys(objectTypeApiMap);

  if (loading) {
    return <p>Loading celestial objects...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <Grid container spacing={3}>
      <FormGrid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <FormLabel htmlFor="selectedObjectType" required>Select Object Type</FormLabel>
          <Select
            labelId="object-type-label"
            id="selectedObjectType"
            name="selectedObjectType"
            value={formState.selectedObjectType}
            onChange={handleObjectTypeChange}
            displayEmpty
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {objectTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormGrid>

      <FormGrid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <FormLabel htmlFor="selectedObjectName" required>Select Object Name</FormLabel>
          <Select
            labelId="object-name-label"
            id="selectedObjectName"
            name="selectedObjectName"
            value={formState.selectedObjectName}
            onChange={handleObjectNameChange}
            displayEmpty
            disabled={!formState.selectedObjectType} // Disable if no object type is selected
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {celestialObjects.map((obj) => (
              <MenuItem key={obj.object_id} value={obj.object_id}>
                {obj.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FormGrid>
      
      <FormGrid size={{ xs: 12, md: 12 }}>
        <FormLabel htmlFor="title" required>
          Title
        </FormLabel>
        <OutlinedInput
          id="title"
          name="title"
          value={formState.title}
          onChange={handleInputChange}
          placeholder="Andromeda Galaxy"
          required
          size="small"
        />
      </FormGrid>

      <FormGrid size={{ xs: 12, md: 12 }}>
        <FormLabel htmlFor="description">
          Description
        </FormLabel>
        <TextField
          id="description"
          name="description"
          value={formState.description}
          onChange={handleInputChange}
          multiline
          rows={2}
          placeholder="Write about the image..."
          fullWidth
          variant="outlined"
        />
      </FormGrid>
        
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="iso" required>
          ISO
        </FormLabel>
        <OutlinedInput
          id="iso"
          name="iso"
          value={formState.iso}
          onChange={handleInputChange}
          placeholder="3200"
          required
          size="small"
        />
      </FormGrid>
      
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="exposure_time">Exposure Time (Seconds)</FormLabel>
        <TextField
          id="exposure_time"
          name="exposure_time"
          value={formState.exposure_time}
          onChange={handleInputChange}
          type="number"
          inputProps={{ step: 0.1, min: 0 }}
          variant="outlined"
          placeholder='30'
          size="small"
          fullWidth
        />
      </FormGrid>
      
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="focal_length" required>
          Focal Length (mm)
        </FormLabel>
        <OutlinedInput
          id="focal_length"
          name="focal_length"
          value={formState.focal_length}
          onChange={handleInputChange}
          placeholder="310"
          required
          size="small"
        />
      </FormGrid>
      
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="focus_score">
          Focus Score
        </FormLabel>
        <OutlinedInput
          id="focus_score"
          name="focus_score"
          value={formState.focus_score}
          onChange={handleInputChange}
          placeholder="7500"
          size="small"
        />
      </FormGrid>
      
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="aperture" required>
          Aperture
        </FormLabel>
        <OutlinedInput
          id="aperture"
          name="aperture"
          value={formState.aperture}
          onChange={handleInputChange}
          placeholder="2.8"
          required
          size="small"
        />
      </FormGrid>
      
      <FormGrid size={{xs:6}}>
        <FormLabel htmlFor="capture_date_time">
          Date & Time
        </FormLabel>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker 
            value={formState.capture_date_time ? dayjs(formState.capture_date_time) : null}
            onChange={handleDateChange}
          />
        </LocalizationProvider>
      </FormGrid>
      
      <FormGrid size={{ xs: 12 }}>
        <FormControlLabel
          control={
            <Checkbox 
              name="confirm_ownership" 
              checked={formState.confirm_ownership || false}
              onChange={(e) => {
                setFormState(prev => ({
                  ...prev,
                  confirm_ownership: e.target.checked
                }));
              }}
            />
          }
          label="I confirm this is my work"
        />
      </FormGrid>
    </Grid>
  );
}