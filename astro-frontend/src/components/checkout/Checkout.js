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
import CircularProgress from '@mui/material/CircularProgress';

const serverUrl = import.meta.env.VITE_API_SERVER_URL;

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
  const [isUploading, setIsUploading] = React.useState(false);
  const [documentFiles, setDocumentFiles] = React.useState([]);
  
  /**
 * Handles chunked file uploads for large files
 * @param {File} file - The file to upload in chunks
 * @param {string} fileType - The type of file being uploaded ('image', 'documentation', etc.)
 * @param {string} fileId - Unique identifier for the file
 * @param {Function} onProgress - Callback for progress updates
 * @param {Function} onComplete - Callback when complete
 * @param {Function} onError - Callback for errors
 * @returns {Promise} - Promise that resolves when upload is complete
 */
async function uploadFileInChunks(file, fileType, fileId, onProgress, onComplete, onError) {
  // Configuration
  const chunkSize = 1024 * 1024; // 1MB chunks
  const totalChunks = Math.ceil(file.size / chunkSize);
  const endpoint = `${serverUrl}/api/chunk-upload`;
  
  try {
    // Initialize upload on server
    const initResponse = await fetch(`${endpoint}/init`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        totalChunks: totalChunks,
        uploadType: fileType,
        fileId: fileId
      }),
    });
    
    if (!initResponse.ok) {
      throw new Error('Failed to initialize chunked upload');
    }
    
    const initData = await initResponse.json();
    const uploadId = initData.uploadId;
    
    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', chunkIndex);
      formData.append('uploadId', uploadId);
      
      const chunkResponse = await fetch(`${endpoint}/chunk`, {
        method: 'POST',
        body: formData,
      });
      
      if (!chunkResponse.ok) {
        throw new Error(`Failed to upload chunk ${chunkIndex}`);
      }
      
      // Update progress (0-100%)
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      onProgress(fileId, progress);
    }
    
    // Complete the upload
    const completeResponse = await fetch(`${endpoint}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uploadId: uploadId,
        fileName: file.name,
        fileType: fileType,
      }),
    });
    
    if (!completeResponse.ok) {
      throw new Error('Failed to complete chunked upload');
    }
    
    const completeData = await completeResponse.json();
    onComplete(fileId, completeData.filePath);
    return completeData;
    
  } catch (error) {
    console.error('Chunked upload error:', error);
    onError(fileId, error.message);
    throw error;
  }
}
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

  // Handler for documentation file uploads
  const handleDocumentUpload = (files) => {
    setDocumentFiles(files);
  };
  
  function getStepContent(step) {
    switch (step) {
      case 0:
        return <Images 
          onImageDetailsChange={handleImageDetailsChange} 
          initialImageDetails={formData.images} 
          onIsValidChange={handleImagesValidChange}
          onDocumentUpload={handleDocumentUpload}
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

  /**
 * Modified handleSubmit function for Checkout.js with chunked upload logic
 * Replace the existing handleSubmit function with this one
 */
const handleSubmit = async () => {
  setIsUploading(true);
  
  try {
    console.log('Final Form Data:', formData);
    console.log('Documentation Files:', documentFiles);

    // Track uploads
    const uploadProgress = {};
    const uploadedFiles = {};
    const uploadErrors = {};

    const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
    
    // Function to update individual file progress
    const updateFileProgress = (fileId, progress) => {
      uploadProgress[fileId] = progress;
      // Calculate overall progress
      const totalProgress = Object.values(uploadProgress).reduce((sum, val) => sum + val, 0);
      const overallProgress = Object.keys(uploadProgress).length > 0 
        ? Math.round(totalProgress / Object.keys(uploadProgress).length)
        : 0;
      
      setSnackbarMessage(`Uploading... ${overallProgress}% complete`);
      setSnackbarSeverity('info');
      setOpenSnackbar(true);
    };

    // Function to record completed uploads
    const fileUploadComplete = (fileId, filePath) => {
      uploadedFiles[fileId] = filePath;
    };

    // Function to record errors
    const fileUploadError = (fileId, errorMessage) => {
      uploadErrors[fileId] = errorMessage;
    };

    // First upload all files in chunks
    const fileUploadPromises = [];
    
    // Upload main image if it exists
    if (formData.images && formData.images.mainImage) {
      const mainImage = formData.images.mainImage;
      const mainImageId = `main-image-${Date.now()}`;
      
      // Check if file is large enough to warrant chunking (over 5MB)
      if (mainImage.size > 5 * 1024 * 1024) {
        const mainImagePromise = uploadFileInChunks(
          mainImage, 
          'main-image', 
          mainImageId,
          updateFileProgress,
          fileUploadComplete,
          fileUploadError
        );
        fileUploadPromises.push(mainImagePromise);
      } else {
        // Track this file for later regular upload
        uploadedFiles[mainImageId] = null; // Will handle in regular FormData
      }
    }
    
    // Upload additional images if they exist
    if (formData.images && formData.images.additionalImages && Array.isArray(formData.images.additionalImages)) {
      formData.images.additionalImages.forEach((file, index) => {
        const additionalImageId = `additional-image-${index}-${Date.now()}`;
        
        // Check if file is large enough to warrant chunking (over 5MB)
        if (file.size > 5 * 1024 * 1024) {
          const additionalImagePromise = uploadFileInChunks(
            file,
            'additional-image',
            additionalImageId,
            updateFileProgress,
            fileUploadComplete,
            fileUploadError
          );
          fileUploadPromises.push(additionalImagePromise);
        } else {
          // Track this file for later regular upload
          uploadedFiles[additionalImageId] = null; // Will handle in regular FormData
        }
      });
    }
    
    // Upload documentation files if they exist
    if (documentFiles && documentFiles.length > 0) {
      documentFiles.forEach((file, index) => {
        const documentId = `documentation-${index}-${Date.now()}`;
        
        // Check if file is large enough to warrant chunking (over 5MB)
        if (file.size > 5 * 1024 * 1024) {
          const documentPromise = uploadFileInChunks(
            file,
            'documentation',
            documentId,
            updateFileProgress,
            fileUploadComplete,
            fileUploadError
          );
          fileUploadPromises.push(documentPromise);
        } else {
          // Track this file for later regular upload
          uploadedFiles[documentId] = null; // Will handle in regular FormData
        }
      });
    }
    
    // Wait for all large file uploads to complete
    if (fileUploadPromises.length > 0) {
      await Promise.all(fileUploadPromises);
    }
    
    // Check if there were any errors in file uploads
    const errorCount = Object.keys(uploadErrors).length;
    if (errorCount > 0) {
      setSnackbarMessage(`Error uploading ${errorCount} file(s). Please try again.`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      setIsUploading(false);
      return;
    }
    
    // Now create FormData for metadata and small files
    const formDataToSend = new FormData();
    
    // Add file paths for files uploaded in chunks
    for (const [fileId, filePath] of Object.entries(uploadedFiles)) {
      if (filePath !== null) {
        formDataToSend.append(`chunkedFiles[${fileId}]`, filePath);
      }
    }
    
    // Add small files directly
// Main image (if small)
if (formData.images && formData.images.mainImage && formData.images.mainImage.size <= 50 * 1024 * 1024) {
  formDataToSend.append('images.mainImage', formData.images.mainImage);
}

// Light frames (if small)
if (formData.images && formData.images.lightFrames && Array.isArray(formData.images.lightFrames)) {
  formData.images.lightFrames.forEach((file, index) => {
    if (file.size <= 5 * 1024 * 1024) {
      formDataToSend.append(`images.lightFrames[${index}]`, file);
    }
  });
}

// Dark frames (if small)
if (formData.images && formData.images.darkFrames && Array.isArray(formData.images.darkFrames)) {
  formData.images.darkFrames.forEach((file, index) => {
    if (file.size <= 5 * 1024 * 1024) {
      formDataToSend.append(`images.darkFrames[${index}]`, file);
    }
  });
}

// Flat frames (if small)
if (formData.images && formData.images.flatFrames && Array.isArray(formData.images.flatFrames)) {
  formData.images.flatFrames.forEach((file, index) => {
    if (file.size <= 5 * 1024 * 1024) {
      formDataToSend.append(`images.flatFrames[${index}]`, file);
    }
  });
}

// Bias frames (if small)
if (formData.images && formData.images.biasFrames && Array.isArray(formData.images.biasFrames)) {
  formData.images.biasFrames.forEach((file, index) => {
    if (file.size <= 5 * 1024 * 1024) {
      formDataToSend.append(`images.biasFrames[${index}]`, file);
    }
  });
}

// Dark flats (if small)
if (formData.images && formData.images.darkFlats && Array.isArray(formData.images.darkFlats)) {
  formData.images.darkFlats.forEach((file, index) => {
    if (file.size <= 5 * 1024 * 1024) {
      formDataToSend.append(`images.darkFlats[${index}]`, file);
    }
  });
}
    // Documentation files (if small)
    if (documentFiles && documentFiles.length > 0) {
      documentFiles.forEach((file, index) => {
        if (file.size <= 5 * 1024 * 1024) {
          formDataToSend.append(`documentation[${index}]`, file);
        }
      });
    }
    
    // Add image details (excluding the isValid property)
    // Add image details (excluding the isValid property)
    if (formData.imageDetails) {
      const { isValid, ...imageDetailsToSend } = formData.imageDetails;
      formDataToSend.append('imageDetails', JSON.stringify(imageDetailsToSend));
      
      // Also append individual fields for easier server-side processing
      for (const key in imageDetailsToSend) {
        // Special handling for object_id to ensure it's sent as-is
        if (key === 'object_id') {
          // Ensure object_id is sent as a string representation of the number
          formDataToSend.append(`imageDetails.${key}`, String(imageDetailsToSend[key]));
          console.log(`Sending object_id: ${imageDetailsToSend[key]}`);
        } else {
          formDataToSend.append(`imageDetails.${key}`, imageDetailsToSend[key]);
        }
      }
    }
    
    // Add location details
    if (formData.locationDetails) {
      formDataToSend.append('locationDetails', JSON.stringify(formData.locationDetails));
      
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
      formDataToSend.append('sessionDetails', JSON.stringify(formData.sessionDetails));
      
      for (const key in formData.sessionDetails) {
        formDataToSend.append(`sessionDetails.${key}`, formData.sessionDetails[key]);
      }
    }

    // Add celestial object details if they exist
    if (formData.celestialObjectDetails) {
      formDataToSend.append('celestialObjectDetails', JSON.stringify(formData.celestialObjectDetails));
    }

    // Send the final form data (metadata + small files)
    const response = await fetch(`${serverUrl}/api/finalize-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formDataToSend,
    });

    // Handle response
    if (response.ok) {
      const responseData = await response.json();
      console.log('Upload completed successfully:', responseData);
      
      setSnackbarMessage('Your work has been uploaded successfully!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      
      // Move to the next step (completion step)
      setActiveStep(steps.length); 
    } else {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      console.error('Error finalizing upload:', errorData);
      
      setSnackbarMessage(`Error uploading: ${errorData.message || 'Please try again.'}`);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  } catch (error) {
    console.error('Upload process error:', error);
    
    setSnackbarMessage('Error during upload process. Please try again.');
    setSnackbarSeverity('error');
    setOpenSnackbar(true);
  } finally {
    setIsUploading(false);
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
                  Your work has been uploaded successfully into the database. Please contact administrator if there are any issues.
                </Typography>
                <Button
                  variant="contained"
                  sx={{ alignSelf: 'start', width: { xs: '100%', sm: 'auto' } }}
                  onClick={() => window.location.href = '/'}
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
                      disabled={isUploading}
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
                      disabled={isUploading}
                    >
                      Previous
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    endIcon={activeStep === steps.length - 1 ? 
                      (isUploading ? <CircularProgress size={16} color="inherit" /> : null) : 
                      <ChevronRightRoundedIcon />}
                    onClick={
                      activeStep === steps.length - 1
                        ? handleSubmit
                        : handleNext
                    }
                    sx={{ width: { xs: '100%', sm: 'fit-content' } }}
                    disabled={isUploading}
                  >
                    {activeStep === steps.length - 1 ? 
                      (isUploading ? 'Uploading...' : 'Submit your work') : 
                      'Next'}
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