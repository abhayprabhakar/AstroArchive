import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button, Grid, FormLabel, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const FormGrid = styled(Grid)(() => ({
  display: 'flex',
  flexDirection: 'column',
  marginTop: '24px',
  alignItems: 'center',
  textAlign: 'center',
  padding: '16px',
  borderRadius: '4px',
}));

const HiddenFileInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const UploadButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? 'white' : theme.palette.primary.dark,
  color: theme.palette.mode === 'dark' ? theme.palette.primary.dark : 'white',
  '&:hover': {
    backgroundColor: theme.palette.mode === 'dark' ? '#f0f0f0' : theme.palette.primary.main,
  },
  marginTop: '8px',
}));

function CustomFileUpload({ label, onChange, multiple, name }) {
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current.click();
  };

  const handleChange = (event) => {
    if (onChange) {
      onChange(event);
    }
  };

  return (
    <div>
      <UploadButton onClick={handleClick} component="span">
        {label}
      </UploadButton>
      <HiddenFileInput
        type="file"
        accept="image/*"
        onChange={handleChange}
        multiple={multiple}
        ref={fileInputRef}
        name={name} 
      />
    </div>
  );
}

export default function Images({ onImageDetailsChange, initialImageDetails, onIsValidChange }) {
  const [mainImage, setMainImage] = useState(initialImageDetails?.mainImage || null);
  const [lightFrames, setLightFrames] = useState(initialImageDetails?.lightFrames || []);
  const [darkFrames, setDarkFrames] = useState(initialImageDetails?.darkFrames || []);
  const [flatFrames, setFlatFrames] = useState(initialImageDetails?.flatFrames || []);
  const [biasFrames, setBiasFrames] = useState(initialImageDetails?.biasFrames || []);
  const [darkFlats, setDarkFlats] = useState(initialImageDetails?.darkFlats || []);

  const fixedPreviewHeight = 150;

  // useEffect to inform the parent component whenever the image details change
  useEffect(() => {
    const currentImageDetails = {
      mainImage,
      lightFrames,
      darkFrames,
      flatFrames,
      biasFrames,
      darkFlats,
    };
    onImageDetailsChange(currentImageDetails);

    // Check if the required field (mainImage) is filled
    const isValid = !!mainImage;
    onIsValidChange(isValid);

  }, [mainImage, lightFrames, darkFrames, flatFrames, biasFrames, darkFlats, onImageDetailsChange, onIsValidChange]);

  // useEffect to set the initial validity state when the component mounts
  useEffect(() => {
    const initialIsValid = !!initialImageDetails?.mainImage;
    onIsValidChange(initialIsValid);
  }, [initialImageDetails, onIsValidChange]);

  const handleMainImageChange = (event) => {
    const file = event.target.files[0];
    setMainImage(file);
  };

  const handleLightFramesChange = (event) => {
    const files = Array.from(event.target.files);
    setLightFrames(files);
  };

  const handleDarkFramesChange = (event) => {
    const files = Array.from(event.target.files);
    setDarkFrames(files);
  };

  const handleFlatFramesChange = (event) => {
    const files = Array.from(event.target.files);
    setFlatFrames(files);
  };

  const handleBiasFramesChange = (event) => {
    const files = Array.from(event.target.files);
    setBiasFrames(files);
  };

  const handleDarkFlatsChange = (event) => {
    const files = Array.from(event.target.files);
    setDarkFlats(files);
  };

  return (
    <Grid container spacing={3}>
      {/* Main Observation Image */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }} required>
            Main Observation Image
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            This is the primary image of your astronomical observation, showcasing the celestial object you focused on.
          </Typography>
          <CustomFileUpload
            label={mainImage ? mainImage.name : 'Choose Image'}
            onChange={handleMainImageChange}
            name="images.mainImage" 
          />
          {mainImage && (
            <div style={{ marginTop: '8px', height: fixedPreviewHeight, overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
              <img
                src={URL.createObjectURL(mainImage)}
                alt="Main Observation Preview"
                style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
              />
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Light Frames */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            Light Frames
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            These are the main exposure images captured through your telescope, containing the actual data of the celestial object. Multiple light frames are often stacked to increase signal-to-noise ratio.
          </Typography>
          <CustomFileUpload
            label={lightFrames.length > 0 ? `${lightFrames.length} files` : 'Choose Files'}
            onChange={handleLightFramesChange}
            multiple
            name="images.lightFrames" 
          />
          {lightFrames.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'grey' }}>
              {lightFrames.map((file, index) => (
                <div key={file.name} style={{ height: fixedPreviewHeight, width: 'auto', overflow: 'hidden', display: 'inline-block', marginRight: '4px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
                  />
                  <input 
                    type="hidden" 
                    name={`images.lightFrames[${index}]`} 
                    value={file.name} 
                  />
                </div>
              ))}
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Dark Frames */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            Dark Frames
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            These are images taken with the telescope's lens cap on, for the same exposure time and temperature as your light frames. They capture the thermal noise and hot pixels of the camera sensor, which can then be subtracted from the light frames.
          </Typography>
          <CustomFileUpload
            label={darkFrames.length > 0 ? `${darkFrames.length} files` : 'Choose Files'}
            onChange={handleDarkFramesChange}
            multiple
            name="images.darkFrames"
          />
          {darkFrames.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'grey' }}>
              {darkFrames.map((file, index) => (
                <div key={file.name} style={{ height: fixedPreviewHeight, width: 'auto', overflow: 'hidden', display: 'inline-block', marginRight: '4px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
                  />
                  <input 
                    type="hidden" 
                    name={`images.darkFrames[${index}]`} 
                    value={file.name} 
                  />
                </div>
              ))}
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Flat Frames */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            Flat Frames
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            These are images taken of a uniformly illuminated surface (like a tablet screen or a flat panel) to capture imperfections in the optical path, such as dust motes on the sensor or vignetting. They are used to correct the uneven illumination in your light frames.
          </Typography>
          <CustomFileUpload
            label={flatFrames.length > 0 ? `${flatFrames.length} files` : 'Choose Files'}
            onChange={handleFlatFramesChange}
            multiple
            name="images.flatFrames" 
          />
          {flatFrames.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'grey' }}>
              {flatFrames.map((file, index) => (
                <div key={file.name} style={{ height: fixedPreviewHeight, width: 'auto', overflow: 'hidden', display: 'inline-block', marginRight: '4px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
                  />
                  <input 
                    type="hidden" 
                    name={`images.flatFrames[${index}]`} 
                    value={file.name} 
                  />
                </div>
              ))}
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Bias Frames */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            Bias Frames
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            These are very short exposure images taken with the lens cap on. They capture the read noise of the camera sensor, which is a consistent electronic noise introduced during the readout process.
          </Typography>
          <CustomFileUpload
            label={biasFrames.length > 0 ? `${biasFrames.length} files` : 'Choose Files'}
            onChange={handleBiasFramesChange}
            multiple
            name="images.biasFrames" 
          />
          {biasFrames.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'grey' }}>
              {biasFrames.map((file, index) => (
                <div key={file.name} style={{ height: fixedPreviewHeight, width: 'auto', overflow: 'hidden', display: 'inline-block', marginRight: '4px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
                  />
                  <input 
                    type="hidden" 
                    name={`images.biasFrames[${index}]`} 
                    value={file.name} 
                  />
                </div>
              ))}
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Dark Flats */}
      <Grid item xs={12}>
        <FormGrid>
          <FormLabel component="legend" sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
            Dark Flats
          </FormLabel>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            These are dark frames taken for the same exposure time and temperature as your flat frames. They help to calibrate the flat frames by removing any thermal noise or hot pixels present during the flat frame acquisition.
          </Typography>
          <CustomFileUpload
            label={darkFlats.length > 0 ? `${darkFlats.length} files` : 'Choose Files'}
            onChange={handleDarkFlatsChange}
            multiple
            name="images.darkFlats" 
          />
          {darkFlats.length > 0 && (
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'grey' }}>
              {darkFlats.map((file, index) => (
                <div key={file.name} style={{ height: fixedPreviewHeight, width: 'auto', overflow: 'hidden', display: 'inline-block', marginRight: '4px' }}>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    style={{ maxHeight: '100%', width: 'auto', borderRadius: '4px' }}
                  />
                  <input 
                    type="hidden" 
                    name={`images.darkFlats[${index}]`} 
                    value={file.name} 
                  />
                </div>
              ))}
            </div>
          )}
        </FormGrid>
      </Grid>

      {/* Add this section to ensure the file data is properly included in form submission */}
      <div style={{ display: 'none' }}>
        {/* Include the image details as a JSON string */}
        <input 
          type="hidden" 
          name="images.fileData" 
          value={JSON.stringify({
            lightFrames: lightFrames.map(f => ({ name: f.name, size: f.size, type: f.type })),
            darkFrames: darkFrames.map(f => ({ name: f.name, size: f.size, type: f.type })),
            flatFrames: flatFrames.map(f => ({ name: f.name, size: f.size, type: f.type })),
            biasFrames: biasFrames.map(f => ({ name: f.name, size: f.size, type: f.type })),
            darkFlats: darkFlats.map(f => ({ name: f.name, size: f.size, type: f.type })),
          })}
        />
      </div>
    </Grid>
  );
}