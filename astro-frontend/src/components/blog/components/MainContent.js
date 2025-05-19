import * as React from 'react';
import PropTypes from 'prop-types';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import { styled } from '@mui/material/styles';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RssFeedRoundedIcon from '@mui/icons-material/RssFeedRounded';
import CircularProgress from '@mui/material/CircularProgress';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const SyledCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  height: '100%',
  backgroundColor: (theme.vars || theme).palette.background.paper,
  '&:hover': {
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  '&:focus-visible': {
    outline: '3px solid',
    outlineColor: 'hsla(210, 98%, 48%, 0.5)',
    outlineOffset: '2px',
  },
}));

const SyledCardContent = styled(CardContent)({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: 16,
  flexGrow: 1,
  '&:last-child': {
    paddingBottom: 16,
  },
});

const StyledTypography = styled(Typography)({
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

function Author({ user, uploadDate }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
      }}
    >
      <Box
        sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center' }}
      >
        <Avatar
          alt={user.name}
          sx={{ width: 24, height: 24 }}
        />
        <Typography variant="caption">
          {user.name}
        </Typography>
      </Box>
      <Typography variant="caption">
        {new Date(uploadDate).toLocaleDateString()}
      </Typography>
    </Box>
  );
}

Author.propTypes = {
  user: PropTypes.shape({
    user_id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
  }).isRequired,
  uploadDate: PropTypes.string.isRequired,
};

export function Search() {
  return (
    <FormControl sx={{ width: { xs: '100%', md: '25ch' } }} variant="outlined">
      <OutlinedInput
        size="small"
        id="search"
        placeholder="Search…"
        sx={{ flexGrow: 1 }}
        startAdornment={
          <InputAdornment position="start" sx={{ color: 'text.primary' }}>
            <SearchRoundedIcon fontSize="small" />
          </InputAdornment>
        }
        inputProps={{
          'aria-label': 'search',
        }}
      />
    </FormControl>
  );
}

export default function MainContent() {
  const [focusedCardIndex, setFocusedCardIndex] = React.useState(null);
  const [posts, setPosts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState('All');
  const [filteredPosts, setFilteredPosts] = React.useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate(); // Get the navigate function

  React.useEffect(() => {
    const fetchRecentUploads = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/recent-uploads', {
          method: 'GET', // or 'POST', 'PUT', etc.
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' // optional but good if you're sending/receiving JSON
          }
        });
        const data = await response.json();
        setPosts(data.recent_uploads || []);
        setFilteredPosts(data.recent_uploads || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recent uploads:', error);
        setLoading(false);
      }
    };

    fetchRecentUploads();
  }, []);

  React.useEffect(() => {
    if (filter === 'All') {
      setFilteredPosts(posts);
    } else {
      // Filter by celestial object type if needed in the future
      setFilteredPosts(posts);
    }
  }, [filter, posts]);

  const handleFocus = (index) => {
    setFocusedCardIndex(index);
  };

  const handleBlur = () => {
    setFocusedCardIndex(null);
  };

  const handleFilterClick = (filterValue) => {
    setFilter(filterValue);
  };

  const getImageUrl = (imageId) => {
    return `http://localhost:5000/api/image/${imageId}`;
  };

  const handlePostClick = (imageId) => {
    navigate(`/imaging/${imageId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Create layout configurations based on the number of available posts
  const renderPosts = () => {
    if (filteredPosts.length === 0) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <Typography variant="h6">No astrophotographs found</Typography>
        </Box>
      );
    }

    // Display posts in a responsive grid
    return (
      <Grid container spacing={2}>
        {filteredPosts.map((post, index) => (
          <Grid item key={post.image_id} size={{xs: 12, md:index === 0 || index === 1 ? 6 : 4}}>
            <SyledCard
              variant="outlined"
              onFocus={() => handleFocus(index)}
              onBlur={handleBlur}
              tabIndex={0}
              className={focusedCardIndex === index ? 'Mui-focused' : ''}
              onClick={() => handlePostClick(post.image_id)} // Add onClick handler
              sx={{ cursor: 'pointer' }} // Indicate it's clickable
            >
              <CardMedia
                component="img"
                alt={post.title}
                image={getImageUrl(post.image_id)}
                sx={{
                  aspectRatio: '16 / 9',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              />
              <SyledCardContent>
                <Typography gutterBottom variant="caption" component="div">
                  {post.celestial_objects.length > 0 ? post.celestial_objects[0].object_type : 'Astrophotography'}
                </Typography>
                <Typography gutterBottom variant="h6" component="div">
                  {post.title}
                </Typography>
                <StyledTypography variant="body2" color="text.secondary" gutterBottom>
                  {post.description}
                </StyledTypography>
              </SyledCardContent>
              <Author user={post.user} uploadDate={post.upload_date} />
            </SyledCard>
          </Grid>
        ))}
      </Grid>
    );
  };

  // Extract unique object types for filters
  const objectTypes = ['All', ...new Set(posts.flatMap(post =>
    post.celestial_objects.map(obj => obj.object_type)
  ))];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div>
        <Typography variant="h1" gutterBottom>
          Home
        </Typography>
        <Typography>Stay in the loop with the latest astrophotographs</Typography>
      </div>
      <Box
        sx={{
          display: { xs: 'flex', sm: 'none' },
          flexDirection: 'row',
          gap: 1,
          width: { xs: '100%', md: 'fit-content' },
          overflow: 'auto',
        }}
      >
        <Search />
        <IconButton size="small" aria-label="RSS feed">
          <RssFeedRoundedIcon />
        </IconButton>
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', md: 'row' },
          width: '100%',
          justifyContent: 'space-between',
          alignItems: { xs: 'start', md: 'center' },
          gap: 4,
          overflow: 'auto',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            flexDirection: 'row',
            gap: 3,
            overflow: 'auto',
          }}
        >
          {objectTypes.map((type, index) => (
            <Chip
              key={index}
              onClick={() => handleFilterClick(type)}
              size="medium"
              label={type}
              sx={{
                backgroundColor: filter === type ? undefined : 'transparent',
                border: filter === type ? undefined : 'none',
              }}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            flexDirection: 'row',
            gap: 1,
            width: { xs: '100%', md: 'fit-content' },
            overflow: 'auto',
          }}
        >
          <Search />
          <IconButton size="small" aria-label="RSS feed">
            <RssFeedRoundedIcon />
          </IconButton>
        </Box>
      </Box>
      {renderPosts()}
    </Box>
  );
}