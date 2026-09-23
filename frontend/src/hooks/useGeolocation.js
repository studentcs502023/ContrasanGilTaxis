import axios from 'axios';

// Servicio de geocodificación optimizado para autocompletado en tiempo real
export const buscarDireccionSanGil = async (query) => {
  if (!query || query.trim().length < 3) return [];

  try {
    const response = await axios.get('https://photon.komoot.io/api/', {
      params: {
        q: `${query} San Gil Santander`,
        limit: 5,
        lang: 'es',
        // Coordenadas centro de San Gil para priorizar resultados cercanos
        lat: 6.5550,
        lon: -73.1360,
      },
    });

    if (!response.data || !response.data.features) return [];

    return response.data.features.map((feature) => {
      const props = feature.properties;
      const [lng, lat] = feature.geometry.coordinates;

      // Construcción del nombre del lugar o dirección
      const nombreLugar = [props.name, props.street, props.city || 'San Gil']
        .filter(Boolean)
        .join(', ');

      return {
        nombre: nombreLugar,
        lat: lat,
        lng: lng,
      };
    });
  } catch (error) {
    console.error('Error al autocompletar la dirección:', error);
    return [];
  }
};