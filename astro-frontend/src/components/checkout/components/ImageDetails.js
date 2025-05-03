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
import CelestialObjectDropdown from './Celestial/celestialObjects';
import {useState, useEffect} from 'react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material'; //Added Material UI components



const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));


export default function AddressForm() {
  const [selectedObject, setSelectedObject] = useState('');
  const [celestialObjects, setCelestialObjects] = useState([]);
  const [selectedObjectType, setSelectedObjectType] = useState('');
  const [selectedObjectName, setSelectedObjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

    const objectTypeApiMap = {
        'Black Hole': 'http://localhost:5000/api/celestial-objects/black_hole',
        'Galaxy': 'http://localhost:5000/api/celestial-objects/galaxy',
        'Nebula': 'http://localhost:5000/api/celestial-objects/nebula',
        'Planet': 'http://localhost:5000/api/celestial-objects/planet',
        'Star': 'http://localhost:5000/api/celestial-objects/star',
        'Star Cluster': 'http://localhost:5000/api/celestial-objects/star_cluster',
    };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (selectedObjectType) {
            const apiUrl = objectTypeApiMap[selectedObjectType]
             if (!apiUrl) {
                  setError('Invalid object type selected');
                  setLoading(false);
                  return;
              }
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${selectedObjectType}: ${response.status}`);
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
  }, [selectedObjectType]);

  const handleObjectTypeChange = (event) => {
    setSelectedObjectType(event.target.value);
    //setSelectedObjectName(''); // Reset object name when object type changes
  };

  const handleObjectNameChange = (event) => {
    setSelectedObjectName(event.target.value);
    // You can use the selectedObjectName to fetch more details or perform other actions
    console.log('Selected Object Name:', event.target.value);
  };

  // Get unique object types
    const objectTypes = Object.keys(objectTypeApiMap);


  if (loading) {
    return <p>Loading celestial objects...</p>; //  <---  Improve this (e.g., use a Material UI CircularProgress)
  }

  if (error) {
    return <p>Error: {error}</p>;  //  <---  Use a Material UI Alert
  }
  return (
    <Grid container spacing={3}>
      <FormGrid size={{ xs: 12, md: 6 }}>
        <FormControl fullWidth>
          <FormLabel htmlfor="object-type-label" required>Select Object Type</FormLabel>
          <Select
            labelId="object-type-label"
            value={selectedObjectType}
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
          <FormLabel htmlFor="object-name-label" required>Select Object Name</FormLabel>
          <Select
            labelId="object-name-label"
            value={selectedObjectName}
            onChange={handleObjectNameChange}
            displayEmpty
            disabled={!selectedObjectType} // Disable if no object type is selected
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
          type="name"
          placeholder="Andromeda Galaxy"
          required
          size="small"
        />
      </FormGrid>
        
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="iso" required>
          ISO
        </FormLabel>
        <OutlinedInput
          id="iso"
          name="iso"
          type="iso"
          placeholder="3200"
          required
          size="small"
        />
      </FormGrid>
      <FormGrid size={{ xs: 6 }}>
        <FormLabel htmlFor="exposure_time" required>Exposure Time (Seconds)</FormLabel>
        <TextField
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
          type="focal_length"
          placeholder="310"
          autoComplete="City"
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
          type="focus_score"
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
          type="aperture"
          placeholder="2.8"
          required
          size="small"
        />
      </FormGrid>
      <FormGrid size={{xs:6}}>
      <FormLabel htmlFor="capture_date_time" required>
          Date & Time
        </FormLabel>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker />
    </LocalizationProvider>
      </FormGrid>
      
      
{/* <CelestialObjectDropdown
  value={selectedObject}
  onChange={(e) => setSelectedObject(e.target.value)}
/> */}
      
      {/* <FormGrid size={{ xs: 12 }}>
        <FormControlLabel
          control={<Checkbox name="saveAddress" value="yes" />}
          label="I confirm this is my work"
        />
      </FormGrid> */}
    </Grid>
  );
}
