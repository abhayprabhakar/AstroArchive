import React, { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  FormLabel,
} from '@mui/material';

export default function CelestialObjectDropdown({ value, onChange }) {
  const [objectList, setObjectList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/json/RASC_Explore_The_Universe_210411.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.bookmarks) {
          const names = Object.values(data.bookmarks).map((item) => item.name);
          setObjectList(names);
        } else {
          console.error("Data or data.bookmarks is missing!");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading celestial objects:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <FormControl size='small'>
      <FormLabel htmlFor='celestial-object' required>Celestial Object Name</FormLabel>
      <Select
        labelId="celestial-object-label"
        id="celestial-object"
        value={value}
        label="Celestial Object"
        onChange={onChange}
      >
        {objectList.map((name, index) => (
          <MenuItem key={index} value={name}>
            {name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}