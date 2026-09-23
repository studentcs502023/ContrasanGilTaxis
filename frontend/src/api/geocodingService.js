// src/api/geocodingService.js
import axios from 'axios';

// Búsqueda de direcciones delimitada a la zona de San Gil, Santander
export const buscarDireccionSanGil = async (query) => {
  if (!query || query.trim().length < 3) return [];

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: `${query}, San Gil, Santander, Colombia`,
        format: 'json',
        addressdetails: 1,
        limit: 5,
      },
    });

    return response.data.map((item) => ({
      nombre: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Error al autocompletar la dirección:', error);
    return [];
  }
};