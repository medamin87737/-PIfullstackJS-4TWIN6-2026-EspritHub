// Utility pour convertir location string → objet pour la carte
// La BD stocke toujours location comme string, mais la carte a besoin d'un objet

export interface LocationObject {
  lat: number;
  lng: number;
  address: string;
}

// Coordonnées par défaut pour Tunis
const DEFAULT_COORDS = {
  lat: 36.8065,
  lng: 10.1815,
  address: 'Tunis, Tunisia',
};

// Cache géocodage simple pour éviter les appels répétés
const geocodeCache: Record<string, LocationObject> = {};

/**
 * Convertit une location string en objet {lat, lng, address}
 * @param location String comme "Tunis, Tunisia" ou "Paris, France"
 * @returns Objet avec lat, lng, address
 */
export function parseLocation(location: string | undefined | null): LocationObject {
  if (!location) {
    return DEFAULT_COORDS;
  }

  // Si déjà en cache
  if (geocodeCache[location]) {
    return geocodeCache[location];
  }

  // Coordonnées connues pour les villes principales
  const knownLocations: Record<string, LocationObject> = {
    'tunis': { lat: 36.8065, lng: 10.1815, address: 'Tunis, Tunisia' },
    'tunis, tunisia': { lat: 36.8065, lng: 10.1815, address: 'Tunis, Tunisia' },
    'paris': { lat: 48.8566, lng: 2.3522, address: 'Paris, France' },
    'london': { lat: 51.5074, lng: -0.1278, address: 'London, UK' },
    'new york': { lat: 40.7128, lng: -74.006, address: 'New York, USA' },
    'dubai': { lat: 25.2048, lng: 55.2708, address: 'Dubai, UAE' },
    'casablanca': { lat: 33.5731, lng: -7.5898, address: 'Casablanca, Morocco' },
    'algiers': { lat: 36.7538, lng: 3.0588, address: 'Algiers, Algeria' },
    'cairo': { lat: 30.0444, lng: 31.2357, address: 'Cairo, Egypt' },
    'rabat': { lat: 34.0209, lng: -6.8416, address: 'Rabat, Morocco' },
    'marrakech': { lat: 31.6295, lng: -7.9811, address: 'Marrakech, Morocco' },
    'sfax': { lat: 34.7402, lng: 10.7603, address: 'Sfax, Tunisia' },
    'sousse': { lat: 35.8256, lng: 10.6411, address: 'Sousse, Tunisia' },
  };

  const normalized = location.toLowerCase().trim();
  
  // Chercher dans les locations connues
  for (const [key, coords] of Object.entries(knownLocations)) {
    if (normalized.includes(key)) {
      geocodeCache[location] = coords;
      return coords;
    }
  }

  // Si contient des coordonnées lat,lng dans le texte (format: "36.8,10.2" ou "lat:36.8,lng:10.2")
  const coordMatch = normalized.match(/(-?\d+\.?\d*)\s*[,;\s]\s*(-?\d+\.?\d*)/);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      const result = { lat, lng, address: location };
      geocodeCache[location] = result;
      return result;
    }
  }

  // Par défaut, retourner Tunis avec petit offset aléatoire pour éviter le stacking
  const result = {
    ...DEFAULT_COORDS,
    address: location,
  };
  geocodeCache[location] = result;
  return result;
}

/**
 * Convertit un objet location en string pour stockage
 * @param location Objet {lat, lng, address}
 * @returns String formatée
 */
export function locationToString(location: LocationObject | string): string {
  if (typeof location === 'string') {
    return location;
  }
  
  // Format: "36.8065,10.1815|Address"
  return `${location.lat.toFixed(4)},${location.lng.toFixed(4)}|${location.address}`;
}

/**
 * Extrait l'adresse d'une location string
 * @param location String de location
 * @returns Adresse lisible
 */
export function getLocationAddress(location: string | undefined): string {
  if (!location) return 'Non spécifié';
  
  // Si format "lat,lng|address", extraire l'adresse
  const parts = location.split('|');
  if (parts.length > 1) {
    return parts[1];
  }
  
  return location;
}

export default {
  parseLocation,
  locationToString,
  getLocationAddress,
};
