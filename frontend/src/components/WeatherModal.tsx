import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Search, Cloud, Sun, CloudRain, CloudSnow, CloudLightning, 
  Wind, Droplets, Thermometer, MapPin, Calendar, Minimize2,
  CloudSun, CloudFog
} from 'lucide-react';

interface City {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface DailyForecast {
  date: string;
  dayName: string;
  maxTemp: number;
  minTemp: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
}

interface WeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCity?: string;
  initialLat?: number;
  initialLng?: number;
}

const weatherCodes: Record<number, { icon: React.ReactNode; description: string; bg: string; color: string }> = {
  0: { icon: <Sun className="h-8 w-8" />, description: 'Ensoleillé', bg: 'from-orange-400 to-yellow-300', color: 'text-orange-500' },
  1: { icon: <Sun className="h-8 w-8" />, description: 'Partiellement ensoleillé', bg: 'from-orange-300 to-yellow-200', color: 'text-orange-400' },
  2: { icon: <CloudSun className="h-8 w-8" />, description: 'Partiellement nuageux', bg: 'from-blue-300 to-gray-200', color: 'text-gray-500' },
  3: { icon: <Cloud className="h-8 w-8" />, description: 'Nuageux', bg: 'from-gray-400 to-gray-300', color: 'text-gray-600' },
  45: { icon: <CloudFog className="h-8 w-8" />, description: 'Brouillard', bg: 'from-gray-300 to-gray-200', color: 'text-gray-400' },
  48: { icon: <CloudFog className="h-8 w-8" />, description: 'Brouillard givrant', bg: 'from-gray-300 to-blue-200', color: 'text-gray-400' },
  51: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie légère', bg: 'from-blue-400 to-blue-300', color: 'text-blue-500' },
  53: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie modérée', bg: 'from-blue-500 to-blue-400', color: 'text-blue-600' },
  55: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie forte', bg: 'from-blue-600 to-blue-500', color: 'text-blue-700' },
  61: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie', bg: 'from-blue-500 to-blue-400', color: 'text-blue-600' },
  63: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie modérée', bg: 'from-blue-600 to-blue-500', color: 'text-blue-600' },
  65: { icon: <CloudRain className="h-8 w-8" />, description: 'Pluie forte', bg: 'from-blue-700 to-blue-600', color: 'text-blue-700' },
  71: { icon: <CloudSnow className="h-8 w-8" />, description: 'Neige légère', bg: 'from-blue-200 to-white', color: 'text-sky-400' },
  73: { icon: <CloudSnow className="h-8 w-8" />, description: 'Neige modérée', bg: 'from-blue-300 to-blue-200', color: 'text-sky-500' },
  75: { icon: <CloudSnow className="h-8 w-8" />, description: 'Neige forte', bg: 'from-blue-400 to-blue-300', color: 'text-sky-600' },
  95: { icon: <CloudLightning className="h-8 w-8" />, description: 'Orage', bg: 'from-purple-600 to-gray-600', color: 'text-purple-600' },
  96: { icon: <CloudLightning className="h-8 w-8" />, description: 'Orage avec grêle', bg: 'from-purple-700 to-gray-600', color: 'text-purple-700' },
  99: { icon: <CloudLightning className="h-8 w-8" />, description: 'Orage violent', bg: 'from-purple-800 to-gray-700', color: 'text-purple-800' },
};

const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export default function WeatherModal({ isOpen, onClose, initialCity = 'Tunis', initialLat = 36.8065, initialLng = 10.1815 }: WeatherModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City>({
    name: initialCity,
    latitude: initialLat,
    longitude: initialLng,
    country: 'Tunisie'
  });
  const [forecast, setForecast] = useState<DailyForecast[]>([]);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Search cities
  const searchCities = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCities([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=fr&format=json`
      );
      const data = await response.json();
      
      if (data.results) {
        setCities(data.results.map((result: any) => ({
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          country: result.country,
          admin1: result.admin1
        })));
      }
    } catch (error) {
      console.error('Error searching cities:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Fetch weather forecast
  const fetchForecast = useCallback(async (city: City) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max&timezone=auto&forecast_days=7`
      );
      const data = await response.json();

      if (data.daily) {
        const formatted: DailyForecast[] = data.daily.time.map((date: string, index: number) => {
          const dateObj = new Date(date);
          return {
            date: date,
            dayName: index === 0 ? 'Aujourd\'hui' : dayNames[dateObj.getDay()],
            maxTemp: Math.round(data.daily.temperature_2m_max[index]),
            minTemp: Math.round(data.daily.temperature_2m_min[index]),
            weatherCode: data.daily.weather_code[index],
            humidity: data.daily.relative_humidity_2m_mean[index],
            windSpeed: data.daily.wind_speed_10m_max[index],
          };
        });
        setForecast(formatted);
      }
    } catch (error) {
      console.error('Error fetching forecast:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedCity) {
      fetchForecast(selectedCity);
    }
  }, [isOpen, selectedCity, fetchForecast]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCities(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchCities]);

  if (!isOpen) return null;

  const selectedDayData = forecast[selectedDay];
  const weatherInfo = selectedDayData ? weatherCodes[selectedDayData.weatherCode] || weatherCodes[0] : weatherCodes[0];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${weatherInfo.bg} p-6 text-white shrink-0`}>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold">Météo</h2>
              <div className="mt-1 flex items-center gap-2 text-white/90">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{selectedCity.name}, {selectedCity.country}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Bouton minimiser */}
              <button 
                onClick={onClose}
                className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/30"
              >
                <Minimize2 className="h-4 w-4" />
                <span>Réduire</span>
              </button>
            </div>
          </div>

          {/* Current/Selected Day Display */}
          {selectedDayData && (
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-white/20 p-4 backdrop-blur-sm">
                  {weatherInfo.icon}
                </div>
                <div>
                  <p className="text-3xl font-bold">{selectedDayData.maxTemp}°C</p>
                  <p className="text-sm text-white/80">{selectedDayData.minTemp}°C min</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-medium">{weatherInfo.description}</p>
                <p className="text-sm text-white/80">
                  {new Date(selectedDayData.date).getDate()} {monthNames[new Date(selectedDayData.date).getMonth()]}
                </p>
              </div>
            </div>
          )}

          {/* Details */}
          {selectedDayData && (
            <div className="mt-6 flex gap-6">
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 backdrop-blur-sm">
                <Droplets className="h-4 w-4" />
                <span className="text-sm">{selectedDayData.humidity}% humidité</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 backdrop-blur-sm">
                <Wind className="h-4 w-4" />
                <span className="text-sm">{selectedDayData.windSpeed} km/h</span>
              </div>
            </div>
          )}
        </div>

        {/* Content - Scrollable avec hauteur auto */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {/* Search */}
          <div className="border-b p-4 bg-white dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une ville..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
              )}
            </div>

            {/* Search Results */}
            {cities.length > 0 && (
              <div className="absolute z-10 mt-1 w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {cities.map((city, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedCity(city);
                      setCities([]);
                      setSearchQuery('');
                      setSelectedDay(0);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium dark:text-white">{city.name}</p>
                      <p className="text-xs text-gray-500">{city.admin1}, {city.country}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 7 Day Forecast */}
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Prévisions 7 jours</h3>
            </div>

            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {forecast.map((day, index) => {
                  const dayWeather = weatherCodes[day.weatherCode] || weatherCodes[0];
                  const isSelected = selectedDay === index;
                  
                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDay(index)}
                      className={`flex min-w-[80px] flex-col items-center rounded-xl border p-3 transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className={`text-xs font-medium ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {day.dayName}
                      </span>
                      <div className={`my-2 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                        {dayWeather.icon}
                      </div>
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                        {day.maxTemp}°
                      </span>
                      <span className="text-xs text-gray-400">
                        {day.minTemp}°
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-4 py-3 dark:bg-gray-800/50">
            <p className="text-center text-xs text-gray-500">
              Données fournies par Open-Meteo • Cliquez sur un jour pour voir les détails
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
