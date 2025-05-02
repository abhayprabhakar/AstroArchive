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
import {useState} from 'react';


const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
}));

export default function AddressForm() {
  const [selectedObject, setSelectedObject] = useState('');
  return (
    <Grid container spacing={3}>
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
