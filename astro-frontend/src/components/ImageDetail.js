import * as React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardMedia,
  CardContent,
  Grid,
  Paper,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  CircularProgress
} from '@mui/material';

// Icons
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SettingsIcon from '@mui/icons-material/Settings';
import StarIcon from '@mui/icons-material/Star';
import LayersIcon from '@mui/icons-material/Layers';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TelescopeIcon from '@mui/icons-material/Visibility';

// Components
import AppAppBar from './blog/components/AppAppBar';
import Footer from './blog/components/Footer';
import AppTheme from './shared-theme/AppTheme';
import CssBaseline from '@mui/material/CssBaseline';

const serverUrl = import.meta.env.VITE_API_SERVER_URL;

const ImageDetail = () => {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check for authentication
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/signin');
      return;
    }

    // Fetch image data
    const fetchImageData = async () => {
      try {
        setLoading(true);
        // This would be your actual API call
        const response = await fetch(`${serverUrl}/api/images/${imageId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch image data');
        }

        const data = await response.json();
        setImage(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImageData();
  }, [imageId, navigate]);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AppTheme>
        <CssBaseline enableColorScheme />
        <AppAppBar />
        <Container maxWidth="lg" sx={{ my: 12, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading image details...
          </Typography>
        </Container>
        <Footer />
      </AppTheme>
    );
  }

  if (error) {
    return (
      <AppTheme>
        <CssBaseline enableColorScheme />
        <AppAppBar />
        <Container maxWidth="lg" sx={{ my: 12 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="error">
              Error: {error}
            </Typography>
            <Button 
              variant="contained" 
              sx={{ mt: 3 }}
              onClick={() => navigate('/')}
            >
              Back to Gallery
            </Button>
          </Paper>
        </Container>
        <Footer />
      </AppTheme>
    );
  }

  // Mock data for development/preview
  // In production, this would be replaced by the actual API response
  const mockImage = {
    image_id: imageId || 'img-12345',
    title: 'Andromeda Galaxy (M31)',
    description: 'The Andromeda Galaxy, also known as Messier 31, is a spiral galaxy approximately 2.5 million light-years from Earth.',
    file_path: '/images/andromeda.jpg',
    capture_date_time: '2024-05-15T22:30:00',
    exposure_time: 180.5,
    iso: 800,
    aperture: 5.6,
    focal_length: 1200,
    focus_score: 0.92,
    user: {
      username: 'astro_photographer',
      name: 'Jane Doe'
    },
    objects: [
      { object: { name: 'Andromeda Galaxy', object_type: 'Galaxy', magnitude: 3.4 } },
      { object: { name: 'M110', object_type: 'Dwarf Galaxy', magnitude: 8.5 } }
    ],
    gear_used: [
      { gear: { gear_type: 'Telescope', brand: 'Celestron', model: 'EdgeHD 8" SCT' } },
      { gear: { gear_type: 'Camera', brand: 'Canon', model: 'EOS Ra' } },
      { gear: { gear_type: 'Mount', brand: 'Sky-Watcher', model: 'EQ6-R Pro' } }
    ],
    sessions: [
      { 
        session: { 
          session_date: '2024-05-15', 
          weather_conditions: 'Clear skies, 15°C', 
          seeing_conditions: 'Excellent, 4/5', 
          moon_phase: 'New Moon',
          light_pollution_index: 3,
          location: {
            name: 'Rancho del Cielo',
            latitude: 33.4857,
            longitude: -116.3456,
            bortle_class: 3
          }
        } 
      }
    ],
    processing_logs: [
      { 
        log_id: 'log1', 
        step_description: 'Dark frame subtraction', 
        timestamp: '2024-05-16T10:00:00',
        software_used: 'PixInsight',
        notes: 'Used master dark with 20 frames'
      },
      { 
        log_id: 'log2', 
        step_description: 'Alignment and stacking', 
        timestamp: '2024-05-16T10:30:00',
        software_used: 'DeepSkyStacker',
        notes: 'Star alignment with Bayer Drizzle'
      }
    ],
    frame_summary: {
      light_frame_count: 35,
      dark_frame_count: 20,
      flat_frame_count: 15,
      bias_frame_count: 25,
      dark_flat_count: 0
    },
    frameset: {
      raw_frames: [
        { frame_type: 'light', exposure_time: 180, iso: 800, temperature: 15.2, capture_time: '2024-05-15T22:35:00' },
        { frame_type: 'dark', exposure_time: 180, iso: 800, temperature: 15.0, capture_time: '2024-05-15T23:45:00' },
        { frame_type: 'flat', exposure_time: 1.5, iso: 800, temperature: 15.3, capture_time: '2024-05-16T05:30:00' }
      ]
    }
  };

  // Use mock data for preview or the actual data from API
  const imageData = image || mockImage;

  return (
    <AppTheme>
      <CssBaseline enableColorScheme />
      <AppAppBar />
      <Container maxWidth="lg" sx={{ my: 12 }}>
        {/* Back button */}
        <Box sx={{ mb: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/')}
          >
            Back to Gallery
          </Button>
        </Box>

        {/* Main image and image info */}
        <Grid container spacing={4}>
          <Grid size={{xs: 12, md: 8}}>
            <Card elevation={3}>
              <CardMedia
                component="img"
                height="600"
                image={`http://localhost:5000/api/image/${imageData.image_id}`}
                alt={imageData.title}
                sx={{ objectFit: 'contain', bgcolor: 'black' }}
              />
              <CardContent>
                <Typography variant="h4" gutterBottom>
                  {imageData.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" color="text.secondary">
                    By {imageData.user?.name || "Unknown photographer"}
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 2 }}>
                    <DateRangeIcon sx={{ fontSize: 'small', verticalAlign: 'middle', mr: 0.5 }} />
                    {formatDate(imageData.capture_date_time)}
                  </Typography>
                </Box>
                <Typography variant="body1" paragraph>
                  {imageData.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Technical details */}
          <Grid size={{xs: 12, md: 4}} >
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 1 }} />
                Capture Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Exposure Time" 
                    secondary={`${imageData.exposure_time}s`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="ISO" 
                    secondary={imageData.iso} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Aperture" 
                    secondary={`f/${imageData.aperture}`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Focal Length" 
                    secondary={`${imageData.focal_length}mm`} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Focus Score" 
                    secondary={`${imageData.focus_score}`} 
                  />
                </ListItem>
              </List>
            </Paper>

            {/* Celestial Objects */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <StarIcon sx={{ mr: 1 }} />
                Celestial Objects
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {imageData.objects && imageData.objects.length > 0 ? (
                <List dense>
                  {imageData.objects.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemText 
                        primary={item.object.name} 
                        secondary={`${item.object.object_type} • Magnitude: ${item.object.magnitude}`} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No celestial objects recorded
                </Typography>
              )}
            </Paper>

            {/* Equipment Used */}
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <CameraAltIcon sx={{ mr: 1 }} />
                Equipment Used
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {imageData.gear_used && imageData.gear_used.length > 0 ? (
                <List dense>
                  {imageData.gear_used.map((item, index) => (
                    <ListItem key={index} sx={{ gap: 2 }}>
                      <ListItemIcon>
                        {item.gear.gear_type === 'Telescope' ? (
                          <TelescopeIcon />
                        ) : (
                          <CameraAltIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${item.gear.brand} ${item.gear.model}`} 
                        secondary={item.gear.gear_type} 
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No equipment details recorded
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Accordions for additional details */}
        <Box sx={{ mt: 4 }}>
          {/* Session Details */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <DateRangeIcon sx={{ mr: 1 }} />
                Observation Session Details
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {imageData.sessions && imageData.sessions.length > 0 ? (
                imageData.sessions.map((item, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid size={{xs: 12, sm: 6}}>
                        <Typography variant="subtitle1">
                          Date: {new Date(item.session.session_date).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Moon Phase: {item.session.moon_phase}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Seeing Conditions: {item.session.seeing_conditions}
                        </Typography>
                        <Typography variant="body2">
                          Weather: {item.session.weather_conditions}
                        </Typography>
                      </Grid>
                      <Grid size={{xs: 12, sm: 6}}>
                        {item.session.location && (
                          <>
                            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center' }}>
                              <LocationOnIcon sx={{ mr: 0.5, fontSize: 'small' }} />
                              {item.session.location.name || 'Unknown Location'}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Coordinates: {item.session.location.latitude.toFixed(4)}, {item.session.location.longitude.toFixed(4)}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Bortle Class: {item.session.location.bortle_class}/9
                            </Typography>
                            <Typography variant="body2">
                              Light Pollution Index: {item.session.light_pollution_index}/10
                            </Typography>
                          </>
                        )}
                      </Grid>
                    </Grid>
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No session details recorded
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Frame Information */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <LayersIcon sx={{ mr: 1 }} />
                Frame Information
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Frame Summary */}
                <Grid size={{xs: 12, md: 4}} >
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Frame Summary
                    </Typography>
                    {imageData.frame_summary ? (
                      <List dense>
                        <ListItem>
                          <ListItemText primary="Light Frames" secondary={imageData.frame_summary.light_frame_count} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Dark Frames" secondary={imageData.frame_summary.dark_frame_count} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Flat Frames" secondary={imageData.frame_summary.flat_frame_count} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Bias Frames" secondary={imageData.frame_summary.bias_frame_count} />
                        </ListItem>
                        <ListItem>
                          <ListItemText primary="Dark Flats" secondary={imageData.frame_summary.dark_flat_count} />
                        </ListItem>
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No frame summary available
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                {/* Raw Frames Table */}
                <Grid size={{xs: 12, md: 8}} >
                  <TableContainer component={Paper} elevation={1}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Frame Type</TableCell>
                          <TableCell>Exposure</TableCell>
                          <TableCell>ISO</TableCell>
                          <TableCell>Temperature</TableCell>
                          <TableCell>Capture Time</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {imageData.frameset && imageData.frameset.raw_frames ? (
                          imageData.frameset.raw_frames.map((frame, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Chip 
                                  label={frame.frame_type.charAt(0).toUpperCase() + frame.frame_type.slice(1)} 
                                  size="small"
                                  color={
                                    frame.frame_type === 'light' ? 'primary' :
                                    frame.frame_type === 'dark' ? 'secondary' :
                                    frame.frame_type === 'flat' ? 'info' :
                                    frame.frame_type === 'bias' ? 'warning' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>{frame.exposure_time}s</TableCell>
                              <TableCell>{frame.iso}</TableCell>
                              <TableCell>{frame.temperature}°C</TableCell>
                              <TableCell>{formatDate(frame.capture_time)}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              No raw frame data available
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Processing History */}
          {/* <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <HistoryIcon sx={{ mr: 1 }} />
                Processing History
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {imageData.processing_logs && imageData.processing_logs.length > 0 ? (
                <TableContainer component={Paper} elevation={1}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Step</TableCell>
                        <TableCell>Software</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Notes</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {imageData.processing_logs.map((log, index) => (
                        <TableRow key={log.log_id || index}>
                          <TableCell>{log.step_description}</TableCell>
                          <TableCell>{log.software_used}</TableCell>
                          <TableCell>{formatDate(log.timestamp)}</TableCell>
                          <TableCell>{log.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No processing history recorded
                </Typography>
              )}
            </AccordionDetails>
          </Accordion> */}
        </Box>
      </Container>
      <Footer />
    </AppTheme>
  );
};

export default ImageDetail;