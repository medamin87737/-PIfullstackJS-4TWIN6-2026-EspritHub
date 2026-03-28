import { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind, Droplets } from 'lucide-react';
import WeatherModal from './WeatherModal';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  city: string;
}

const weatherCodes: Record<number, { icon: React.ReactNode; description: string; color: string }> = {
  0: { icon: <Sun className="h-4 w-4" />, description: 'Ensoleillé', color: 'text-orange-500' },
  1: { icon: <Sun className="h-4 w-4" />, description: 'Partiellement ensoleillé', color: 'text-orange-400' },
  2: { icon: <Cloud className="h-4 w-4" />, description: 'Partiellement nuageux', color: 'text-gray-500' },
  3: { icon: <Cloud className="h-4 w-4" />, description: 'Nuageux', color: 'text-gray-600' },
  45: { icon: <Cloud className="h-4 w-4" />, description: 'Brouillard', color: 'text-gray-400' },
  48: { icon: <Cloud className="h-4 w-4" />, description: 'Brouillard givrant', color: 'text-gray-400' },
  51: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie légère', color: 'text-blue-500' },
  53: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie modérée', color: 'text-blue-600' },
  55: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie forte', color: 'text-blue-700' },
  61: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie', color: 'text-blue-600' },
  63: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie modérée', color: 'text-blue-600' },
  65: { icon: <CloudRain className="h-4 w-4" />, description: 'Pluie forte', color: 'text-blue-700' },
  71: { icon: <CloudSnow className="h-4 w-4" />, description: 'Neige légère', color: 'text-sky-400' },
  73: { icon: <CloudSnow className="h-4 w-4" />, description: 'Neige modérée', color: 'text-sky-500' },
  75: { icon: <CloudSnow className="h-4 w-4" />, description: 'Neige forte', color: 'text-sky-600' },
  95: { icon: <CloudLightning className="h-4 w-4" />, description: 'Orage', color: 'text-purple-600' },
  96: { icon: <CloudLightning className="h-4 w-4" />, description: 'Orage avec grêle', color: 'text-purple-700' },
  99: { icon: <CloudLightning className="h-4 w-4" />, description: 'Orage violent', color: 'text-purple-800' },
};

interface WeatherWidgetProps {
  collapsed: boolean;
  city?: string;
  lat?: number;
  lng?: number;
}

export default function WeatherWidget({ collapsed, city = 'Tunis', lat = 36.8065, lng = 10.1815 }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
        );
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des données météo');
        }

        const data = await response.json();
        const current = data.current;
        const weatherCode = current.weather_code;
        const weatherInfo = weatherCodes[weatherCode] || { icon: <Cloud className="h-4 w-4" />, description: 'Inconnu', color: 'text-gray-500' };

        setWeather({
          temperature: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          weatherCode: weatherCode,
          description: weatherInfo.description,
          city: city,
        });
        setError(null);
      } catch (err) {
        setError('Impossible de charger la météo');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng, city]);

  const handleClick = () => {
    setIsModalOpen(!isModalOpen);
  };

  if (collapsed) {
    return (
      <>
        <button 
          onClick={handleClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {loading ? (
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
          ) : weather ? (
            <span className={weatherCodes[weather.weatherCode]?.color || 'text-gray-500'}>
              {weatherCodes[weather.weatherCode]?.icon || <Cloud className="h-4 w-4" />}
            </span>
          ) : (
            <Cloud className="h-4 w-4" />
          )}
        </button>
        <WeatherModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          initialCity={city}
          initialLat={lat}
          initialLng={lng}
        />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClick}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground transition-colors hover:bg-accent"
          >
            <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            <span className="text-sm">Chargement...</span>
          </button>
        </div>
        <WeatherModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          initialCity={city}
          initialLat={lat}
          initialLng={lng}
        />
      </>
    );
  }

  if (error || !weather) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClick}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Cloud className="h-4 w-4" />
            <span className="text-sm hidden sm:inline">Météo</span>
          </button>
        </div>
        <WeatherModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)}
          initialCity={city}
          initialLat={lat}
          initialLng={lng}
        />
      </>
    );
  }

  const weatherInfo = weatherCodes[weather.weatherCode] || { icon: <Cloud className="h-4 w-4" />, description: 'Inconnu', color: 'text-gray-500' };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Bouton principal météo */}
        <button 
          onClick={handleClick}
          className="button-micro flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <span className={weatherInfo.color}>
            {weatherInfo.icon}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{weather.temperature}°</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">{weather.city}</span>
          </div>
        </button>

        {/* Détails affichés à côté (quand modal fermé) */}
        {!isModalOpen && (
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-border bg-card/50 px-2.5 py-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-500" />
              {weather.humidity}%
            </span>
            <span className="mx-1 text-border">|</span>
            <span className="flex items-center gap-1">
              <Wind className="h-3 w-3 text-sky-500" />
              {weather.windSpeed} <span className="text-[10px]">km/h</span>
            </span>
          </div>
        )}
      </div>
      <WeatherModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        initialCity={city}
        initialLat={lat}
        initialLng={lng}
      />
    </>
  );
}
