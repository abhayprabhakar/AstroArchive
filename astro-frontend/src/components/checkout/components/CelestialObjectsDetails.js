import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    FormLabel,
  } from '@mui/material';
import Grid from '@mui/material/Grid';
import OutlinedInput from '@mui/material/OutlinedInput';
import { styled } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TextField } from '@mui/material';
import CelestialObjectDropdown from './Celestial/celestialObjects';
import {useState} from 'react';


const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export default function celestialObjectDetails() {
    const [selectedObject, setSelectedObject] = useState('');
    const [objectTypes, setObjectTypes] = useState([
        'Black Hole',
        'Galaxy',
        'Nebula',
        'Quasar',
        'Planet',
        'Star',
        'Star Cluster'
      ]);
      const [selectedType, setSelectedType] = useState('');
    
      const handleTypeChange = (event) => {
        setSelectedType(event.target.value);
      };
  return (
    <Grid container spacing={3}>
        <FormControl>
            <FormLabel id="object-type-label" required>Celestial Object Type</FormLabel>
            <Select
                labelId="object-type-label"
                id="object-type-select"
                value={selectedType}
                onChange={handleTypeChange}
            >
                {objectTypes.map((type, index) => (
                <MenuItem key={index} value={type}>
                    {type}
                </MenuItem>
                ))}
            </Select>
            </FormControl>
        <CelestialObjectDropdown
        value={selectedObject}
        onChange={(e) => setSelectedObject(e.target.value)}
        />
      
      {/* <FormGrid size={{ xs: 12 }}>
        <FormControlLabel
          control={<Checkbox name="saveAddress" value="yes" />}
          label="I confirm this is my work"
        />
      </FormGrid> */}
    </Grid>
  );
}
