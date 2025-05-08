import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CssBaseline from '@mui/material/CssBaseline';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Images from './components/Images'
import ImageDetails from './components/ImageDetails';
import SessionDetails from './components/SessionDetials'
import LocationDetails from './components/LocationDetails';
import GearDetails from './components/GearDetails'; // Import the GearDetails component
import CelestialObjectDetails from './components/CelestialObjectsDetails';
import Info from './components/Info';
import InfoMobile from './components/InfoMobile';
import PaymentForm from './components/PaymentForm';
import Review from './components/Review';
import SitemarkIcon from './components/SitemarkIcon';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeIconDropdown from '../shared-theme/ColorModeIconDropdown';
import {useState} from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

// Update steps to include Gear Details
const steps = ['Image Upload', 'Image Details', 'Location details', 'Gear details', 'Session details'];

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export default function Checkout(props) {
  const [formData, setFormData] = useState({});
  const [activeStep, setActiveStep] = React.useState(0);
  const [isImagesValid, setIsImagesValid] = React.useState(false);
  const [isImageDetailsValid, setIsImageDetailsValid] = React.useState(false);
  const [isSessionDetailsValid, setIsSessionDetailsValid] = React.useState(false);
  const [isGearDetailsValid, setIsGearDetailsValid] = React.useState(false); // Add gear validation state
  const [openSnackbar, setOpenSnackbar] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState('info');
  
  // Handler for image upload step
  const handleImageDetailsChange = (imageDetails) => {
    setFormData((prevData) => ({ ...prevData, images: imageDetails }));
  };

  const handleSessionDetailsChange = (sessionData) => {
    setFormData((prevData) => ({...prevData, sessionDetails: sessionData}))
  }

  const handleLocationDetailsChange = (locationData) => {
    setFormData((prevData) => ({...prevData, locationDetails: locationData}))
  }
  
  // Handler for gear details change
  const handleGearDetailsChange = (gearData) => {
    setFormData((prevData) => ({...prevData, gearDetails: gearData}));
    // Update the validity state based on the isValid property from GearDetails
    setIsGearDetailsValid(gearData.isValid);
  }
  
  // Handler for image details step
  const handleFormDataChange = (detailsData) => {
    setFormData((prevData) => ({ ...prevData, imageDetails: detailsData }));
    // Update the validity state based on the isValid property from ImageDetails
    setIsImageDetailsValid(detailsData.isValid);
  };
  
  const handleImagesValidChange = (isValid) => {
    setIsImagesValid(isValid);
  };
  
  function getStepContent(step) {
    switch (step) {
      case 0:
        return <Images 
          onImageDetailsChange={handleImageDetailsChange} 
          initialImageDetails={formData.images} 
          onIsValidChange={handleImagesValidChange}
        />;
      case 1:
        return <ImageDetails 
          onFormDataChange={handleFormDataChange}
          initialData={formData.imageDetails} 
        />;
      case 2:
        return <LocationDetails
          onFormDataChange={handleLocationDetailsChange}
          initialData={formData.locationDetails}
        />;
      case 3:
        return <GearDetails 
          onFormDataChange={handleGearDetailsChange}
          initialData={formData.gearDetails}
          selectedImageId={formData.imageDetails?.image_id} // Pass image_id if available
        />;
      case 4:
        return <SessionDetails 
          onFormDataChange={handleSessionDetailsChange}
          initialData={formData.sessionData}
        />;
      case 5:
        return <Review />;
      default:
        throw new Error('Unknown step');
    }
  }

  const handleNext = () => {
    // Validation for the first step
    if (activeStep === 0 && !isImagesValid) {
      setSnackbarMessage('Please upload a main observation image to continue.');
      setSnackbarSeverity('info');
      setOpenSnackbar(true);
      return;
    }
    
    // Validation for image details step
    if (activeStep === 1) {
      // Check if image details are valid
      if (!isImageDetailsValid) {
        setSnackbarMessage('Please fill in all required fields in Image Details to continue.');
        setSnackbarSeverity('info');
        setOpenSnackbar(true);
        return;
      }
      
      // Show success message for valid submission
      setSnackbarMessage('Image details saved successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    }
    
    if (activeStep === 2) {
      if (!formData.locationDetails || !formData.locationDetails.location_id) {
        setSnackbarMessage('Please select or create a location to continue.');
        setSnackbarSeverity('info');
        setOpenSnackbar(true);
        return;
      }
      
      setSnackbarMessage('Location details saved successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    }
    
    // Add validation for gear details step
    if (activeStep === 3) {
      if (!isGearDetailsValid) {
        setSnackbarMessage('Please add at least one equipment item to continue.');
        setSnackbarSeverity('info');
        setOpenSnackbar(true);
        return;
      }
      
      setSnackbarMessage('Gear details saved successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    }
    
    setActiveStep(activeStep + 1);
  };
  
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
  };

  const handleSubmit = async () => {
    console.log('Final Form Data:', formData);

    const formDataToSend = new FormData();
    
    // Add image files
    if (formData.images) {
      for (const key in formData.images) {
        if (formData.images[key]) {
          if (Array.isArray(formData.images[key])) {
            formData.images[key].forEach((file) => {
              formDataToSend.append(`images.${key}`, file);
            });
          } else {
            formDataToSend.append(`images.${key}`, formData.images[key]);
          }
        }
      }
    }

    // Add image details (excluding the isValid property)
    if (formData.imageDetails) {
      const { isValid, ...imageDetailsToSend } = formData.imageDetails;
      for (const key in imageDetailsToSend) {
        formDataToSend.append(`imageDetails.${key}`, imageDetailsToSend[key]);
      }
    }
    
    if (formData.locationDetails) {
      for (const key in formData.locationDetails) {
        formDataToSend.append(`locationDetails.${key}`, formData.locationDetails[key]);
      }
    }
    
    // Add gear details
    if (formData.gearDetails) {
      const { isValid, selectedGear } = formData.gearDetails;
      // Add selected gear as JSON string
      formDataToSend.append('gearDetails.selectedGear', JSON.stringify(selectedGear));
    }
  
    // Add session details if they exist
    if (formData.sessionDetails) {
      for (const key in formData.sessionDetails) {
        formDataToSend.append(`sessionDetails.${key}`, formData.sessionDetails[key]);
      }
    }

    try {
      const response = await fetch('http://localhost:5000/api/upload-image', {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        console.log('Data and images uploaded successfully!');
        // You might want to show a success message here
        setSnackbarMessage('Your work has been uploaded successfully!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
      } else {
        console.error('Error uploading data and images:', response);
        // Show error message
        setSnackbarMessage('Error uploading your work. Please try again.');
        setSnackbarSeverity('info');
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.error('Network error:', error);
      setSnackbarMessage('Network error. Please check your connection and try again.');
      setSnackbarSeverity('info');
      setOpenSnackbar(true);
    }
  };
  
  const handleBack = () => {
    setActiveStep(activeStep - 1);
  };
  
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box sx={{ position: 'fixed', top: '1rem', right: '1rem' }}>
        <ColorModeIconDropdown />
      </Box>

      <Grid
        container
        sx={{
          height: {
            xs: '100%',
            sm: 'calc(100dvh - var(--template-frame-height, 0px))',
          },
          mt: {
            xs: 4,
            sm: 0,
          },
        }}
      >
        

<Grid
  item
  xs={12}
  sm={7}
  lg={8}
  sx={{
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
    width: '100%',
    backgroundColor: { xs: 'transparent', sm: 'background.default' },
    alignItems: 'center',
    pt: { xs: 4, sm: 8 },
    px: { xs: 2, sm: 10 },
    gap: { xs: 4, md: 6 },
    mx: 'auto',
  }}
>
  {/* Upload heading at the top */}
  <Box
    sx={{
      width: '100%',
      maxWidth: { sm: '100%', md: 600 },
    }}
  >
    <Typography variant="h4" component="h1" gutterBottom>
      Upload Your Work
    </Typography>
    <Typography variant="body1" color="text.secondary">
      Please upload only astrophotography images that you have personally captured and processed.
      By submitting, you confirm that this is your original work and you hold the rights to share it.
      Content that violates this policy may be removed.
    </Typography>
  </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: { sm: 'space-between', md: 'flex-end' },
              alignItems: 'center',
              width: '100%',
              maxWidth: { sm: '100%', md: 600 },
            }}
          >
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                flexGrow: 1,
              }}
            >
              <Stepper
                id="desktop-stepper"
                activeStep={activeStep}
                sx={{ width: '100%', height: 40 }}
              >
                {steps.map((label) => (
                  <Step
                    sx={{ ':first-child': { pl: 0 }, ':last-child': { pr: 0 } }}
                    key={label}
                  >
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          </Box>
          <Card sx={{ display: { xs: 'flex', md: 'none' }, width: '100%' }}>
            <CardContent
              sx={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <Typography variant="subtitle2" gutterBottom>
                  Selected products
                </Typography>
                <Typography variant="body1">
                  {activeStep >= 2 ? '$144.97' : '$134.98'}
                </Typography>
              </div>
              <InfoMobile totalPrice={activeStep >= 2 ? '$144.97' : '$134.98'} />
            </CardContent>
          </Card>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              width: '100%',
              maxWidth: { sm: '100%', md: 600 },
              maxHeight: '720px',
              gap: { xs: 5, md: 'none' },
            }}
          >
            <Stepper
              id="mobile-stepper"
              activeStep={activeStep}
              alternativeLabel
              sx={{ display: { sm: 'flex', md: 'none' } }}
            >
              {steps.map((label) => (
                <Step
                  sx={{
                    ':first-child': { pl: 0 },
                    ':last-child': { pr: 0 },
                    '& .MuiStepConnector-root': { top: { xs: 6, sm: 12 } },
                  }}
                  key={label}
                >
                  <StepLabel
                    sx={{ '.MuiStepLabel-labelContainer': { maxWidth: '70px' } }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            {activeStep === steps.length ? (
              <Stack spacing={2} useFlexGap>
                <Typography variant="h1">📷</Typography>
                <Typography variant="h5">Thank you for uploading your Work!</Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                  Your work has been uploaded successfully into the database. Please contact adminstrator if there are any issues.
                </Typography>
                <Button
                  variant="contained"
                  sx={{ alignSelf: 'start', width: { xs: '100%', sm: 'auto' } }}
                >
                  Go to my work
                </Button>
              </Stack>
            ) : (
              <React.Fragment>
                {getStepContent(activeStep)}
                <Box
                  sx={[
                    {
                      display: 'flex',
                      flexDirection: { xs: 'column-reverse', sm: 'row' },
                      alignItems: 'end',
                      flexGrow: 1,
                      gap: 1,
                      pb: { xs: 12, sm: 0 },
                      mt: { xs: 2, sm: 0 },
                      mb: '80px',
                    },
                    activeStep !== 0
                      ? { justifyContent: 'space-between' }
                      : { justifyContent: 'flex-end' },
                  ]}
                >
                  {activeStep !== 0 && (
                    <Button
                      startIcon={<ChevronLeftRoundedIcon />}
                      onClick={handleBack}
                      variant="text"
                      sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                      Previous
                    </Button>
                  )}
                  {activeStep !== 0 && (
                    <Button
                      startIcon={<ChevronLeftRoundedIcon />}
                      onClick={handleBack}
                      variant="outlined"
                      fullWidth
                      sx={{ display: { xs: 'flex', sm: 'none' } }}
                    >
                      Previous
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    endIcon={<ChevronRightRoundedIcon />}
                    onClick={
                      activeStep === steps.length - 1
                        ? handleSubmit
                        : handleNext
                    }
                    sx={{ width: { xs: '100%', sm: 'fit-content' } }}
                  >
                    {activeStep === steps.length - 1 ? 'Submit your work' : 'Next'}
                  </Button>
                </Box>
              </React.Fragment>
            )}
          </Box>
        </Grid>
      </Grid>
      <Snackbar
        open={openSnackbar}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </AppTheme>
  );
}