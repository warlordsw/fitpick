import axios from 'axios';

export interface WeatherData {
    temperature: number;
    weatherCode: number;
    isDay: number;
}

export const getWeather = async (lat: number, lon: number): Promise<WeatherData | null> => {
    try {
        const response = await axios.get(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
        );
        const { current_weather } = response.data;
        return {
            temperature: current_weather.temperature,
            weatherCode: current_weather.weathercode,
            isDay: current_weather.is_day,
        };
    } catch (error) {
        console.error('Error fetching weather:', error);
        return null;
    }
};

export const getWeatherCategory = (code: number, temp: number): 'Rain' | 'Cold' | 'Hot' | 'Normal' => {
    // Simple mapping
    // Codes: 0-3 clear/Cloudy, 51-67 rain/drizzle, 71-77 snow, 80-82 showers, 95-99 storm
    if (code >= 51 && code <= 99) return 'Rain';
    if (temp < 10) return 'Cold';
    if (temp > 25) return 'Hot';
    return 'Normal';
};
