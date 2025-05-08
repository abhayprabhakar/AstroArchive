// ObservationEntryForm.js - Integrates Location and Session components
import * as React from 'react';
import { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Container,
  Divider,
  Grid,
  Alert,
  AlertTitle,
  Tabs,
  Tab
} from '@mui/material';
import LocationDetails from './LocationDetails';
import SessionDetails from './SessionDetails';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SaveIcon from '@mui/icons-material/Save';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import HistoryIcon from '@mui/icons-material/History';
import ImageIcon from '@mui/icons-material/Image';

export default function ObservationEntryForm() {
  // State for form data
  const [activeTab, setActiveTab] = useState(0);
  const [locationData, setLocationData] = useState({
    location_id: null,
    name: '',
    latitude: '',
    longitude: '',
    bortle_class: 1,
    notes: '',
    isValid: false
  });
  const [sessionData, setSessionData] = useState({
    session_id: null,
    session_date: null,
    weather_conditions: '',
    seeing_conditions: '',
    moon_phase: '',
    light_pollution_index: 1,
    location_id: '',
    isValid: false
  });
  const [formValid, setFormValid] = useState(false);

  // Update session data when location changes
  useEffect(() => {
    if (locationData.location_id) {
      setSessionData(prev => ({
        ...prev,
        location_id: locationData.location_id
      }));
    }
  }, [locationData.location_id]);

  // Update form validity
  useEffect(() => {
    setFormValid(locationData.isValid && sessionData.isValid);
  }, [locationData.isValid, sessionData.isValid]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle location data changes
  const handleLocationDataChange = (data) => {
    setLocationData(data);
  };

  // Handle session data changes
  const handleSessionDataChange = (data) => {
    setSessionData(data);
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Astronomical Observation Entry
        </Typography>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="observation entry tabs"
          >
            <Tab icon={<LocationOnIcon />} label="Location" />
            <Tab 
              icon={<HistoryIcon />} 
              label="Session" 
              disabled={!locationData.location_id} 
            />
            <Tab 
              icon={<ImageIcon />} 
              label="Images" 
              disabled={!sessionData.session_id} 
            />
          </Tabs>
        </Box>

        {!locationData.location_id && activeTab === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Getting Started</AlertTitle>
            First, select or create a location for your astronomical observation
          </Alert>
        )}

        {locationData.location_id && !sessionData.session_id && activeTab === 1 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Location Selected</AlertTitle>
            Now, select an existing session at this location or create a new one
          </Alert>
        )}

        <Box role="tabpanel" hidden={activeTab !== 0}>
          {activeTab === 0 && (
            <LocationDetails 
              onFormDataChange={handleLocationDataChange} 
              initialData={locationData}
            />
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 1}>
          {activeTab === 1 && (
            <SessionDetails 
              onFormDataChange={handleSessionDataChange} 
              initialData={sessionData}
              selectedLocationId={locationData.location_id}
            />
          )}
        </Box>

        <Box role="tabpanel" hidden={activeTab !== 2}>
          {activeTab === 2 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6">
                Image Upload Component Would Go Here
              </Typography>
              <Typography variant="body1" color="text.secondary">
                This would allow users to upload images for the session at {locationData.name} on {sessionData.session_date?.format('YYYY-MM-DD')}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
            disabled={activeTab === 0}
          >
            Previous
          </Button>
          
          {activeTab < 2 ? (
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={() => setActiveTab(prev => Math.min(2, prev + 1))}
              disabled={(activeTab === 0 && !locationData.location_id) || 
                        (activeTab === 1 && !sessionData.session_id)}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              disabled={!formValid}
            >
              Complete Entry
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}