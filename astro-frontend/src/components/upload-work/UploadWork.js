import React, { useState } from 'react';
import {
  Box,
  Grid,
  Button,
  Typography,
  OutlinedInput,
  FormLabel,
  CssBaseline,
  FormControlLabel,
  Checkbox,
  Paper,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import MuiCard from '@mui/material/Card';

const Card = styled(MuiCard)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    alignSelf: 'center',
    width: '100%',
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    margin: 'auto',
    [theme.breakpoints.up('sm')]: {
      maxWidth: '650px',
    },
    boxShadow:
      'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
    ...theme.applyStyles('dark', {
      boxShadow:
        'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
    }),
  }));

const UploadContainer = styled(Box)(({ theme }) => ({
  height: '100dvh',
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
  '&::before': {
    content: '""',
    display: 'block',
    position: 'absolute',
    zIndex: -1,
    inset: 0,
    backgroundImage:
      'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
    backgroundRepeat: 'no-repeat',
    ...theme.applyStyles('dark', {
      backgroundImage:
        'radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
    }),
  },
}));

const FormGrid = ({ children }) => (
  <Grid item xs={12}>
    {children}
  </Grid>
);

export default function UploadYourWork(props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gear, setGear] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      alert('Please fill all required fields');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('gear', gear);
    formData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await res.json();
      if (res.ok) {
        alert('Upload successful!');
        setTitle('');
        setDescription('');
        setGear('');
        setFile(null);
        setPreview(null);
      } else {
        alert(result.message || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    }
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <UploadContainer>
        <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />
        <Card elevation={3} sx={{ maxWidth: 600, margin: 'auto', p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Upload Your Work
          </Typography>
          <Typography variant="body1" gutterBottom>
            Share your astrophotography masterpiece with the world.
          </Typography>

          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <Grid container spacing={3} mt={1}>
              <FormGrid>
                <FormLabel htmlFor="title" required>Title</FormLabel>
                <OutlinedInput
                  id="title"
                  name="title"
                  fullWidth
                  placeholder="Andromeda Galaxy"
                  size="small"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </FormGrid>

              <FormGrid>
                <FormLabel htmlFor="description">Description</FormLabel>
                <OutlinedInput
                  id="description"
                  name="description"
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Describe your shot..."
                  size="large"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormGrid>

              <FormGrid>
                <FormLabel htmlFor="gear">Gear Used</FormLabel>
                <OutlinedInput
                  id="gear"
                  name="gear"
                  fullWidth
                  placeholder="Canon 90D, EQ6-R Pro, etc."
                  size="small"
                  value={gear}
                  onChange={(e) => setGear(e.target.value)}
                />
              </FormGrid>

              <FormGrid>
                <FormLabel htmlFor="image" required>Upload Image</FormLabel>
                <OutlinedInput
                  id="image"
                  name="image"
                  type="file"
                  fullWidth
                  inputProps={{ accept: 'image/*' }}
                  size="small"
                  onChange={handleFileChange}
                />
              </FormGrid>

              {preview && (
                <FormGrid>
                  <Typography variant="subtitle2">Preview:</Typography>
                  <Box mt={1}>
                    <img
                      src={preview}
                      alt="Preview"
                      style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                    />
                  </Box>
                </FormGrid>
              )}

              <FormGrid>
                <FormControlLabel
                  control={<Checkbox name="agree" required />}
                  label="I confirm that this is my original work"
                />
              </FormGrid>

              <FormGrid>
                <Button type="submit" variant="contained" size="large" fullWidth>
                  Upload
                </Button>
              </FormGrid>
            </Grid>
          </form>
        </Card>
      </UploadContainer>
    </AppTheme>
  );
}
