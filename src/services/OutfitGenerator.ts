import { getDBConnection } from './Database';
import { getWeather, getWeatherCategory } from './WeatherService';
import { isColorMatch } from '../utils/ColorMatcher';

export interface OutfitRequest {
    lat: number;
    lon: number;
    eventType: string; // 'Business', 'Sport', 'Casual'
}

export const generateOutfit = async ({ lat, lon, eventType }: OutfitRequest) => {
    const db = await getDBConnection();

    // 1. Get Weather
    const weather = await getWeather(lat, lon);
    const weatherCat = weather ? getWeatherCategory(weather.weatherCode, weather.temperature) : 'Normal';

    // 2. Fetch Items (Filtered by Laundry Logic inside fetchItems)
    const tops = await fetchItems(db, 'Upper');
    const bottoms = await fetchItems(db, 'Lower');
    const shoes = await fetchItems(db, 'Shoes');
    const outers = await fetchItems(db, 'Outer');

    // 3. Logic: Suggest if missing
    let bottom = bottoms.length > 0
        ? bottoms[Math.floor(Math.random() * bottoms.length)]
        : { id: -1, type: 'Lower', color_code: 'black', image_path: '', isSuggested: true, name: 'Black Pants' };

    // Pick Matching Top
    const matchingTops = tops.filter(t => isColorMatch(bottom.color_code, t.color_code));
    let top = matchingTops.length > 0
        ? matchingTops[Math.floor(Math.random() * matchingTops.length)]
        : tops.length > 0
            ? tops[Math.floor(Math.random() * tops.length)] // Fallback to any top
            : { id: -2, type: 'Upper', color_code: 'white', image_path: '', isSuggested: true, name: 'White T-Shirt' }; // Suggestion

    // If we ended up with a real top but it doesn't strictly match (fallback), maybe we should suggest a better one?
    // For now, let's keep it simple: Only suggest if strictly needed or totally empty.

    // Pick Matching Shoes
    const matchingShoes = shoes.filter(s => isColorMatch(bottom.color_code, s.color_code));
    let shoe = matchingShoes.length > 0
        ? matchingShoes[Math.floor(Math.random() * matchingShoes.length)]
        : shoes.length > 0
            ? shoes[Math.floor(Math.random() * shoes.length)]
            : { id: -3, type: 'Shoes', color_code: 'white', image_path: '', isSuggested: true, name: 'White Sneakers' };

    const outfit = {
        top,
        bottom,
        shoes: shoe,
        outer: null as any,
        weather: weatherCat,
    };

    if (weatherCat === 'Rain' || weatherCat === 'Cold') {
        const matchingOuters = outers.filter(o => isColorMatch(bottom.color_code, o.color_code));
        outfit.outer = matchingOuters.length > 0
            ? matchingOuters[Math.floor(Math.random() * matchingOuters.length)]
            : outers.length > 0
                ? outers[Math.floor(Math.random() * outers.length)]
                : { id: -4, type: 'Outer', color_code: 'navy', image_path: '', isSuggested: true, name: 'Navy Coat' };
    }

    return outfit;
};

const fetchItems = async (db: any, category: string) => {
    const results = await db.executeSql(`SELECT * FROM items WHERE type = ?`, [category]);
    const items = [];
    const threeDaysAgo = new Date().getTime() - (3 * 24 * 60 * 60 * 1000);

    results.forEach((result: any) => {
        for (let i = 0; i < result.rows.length; i++) {
            const item = result.rows.item(i);
            // Laundry Basket Logic: Exclude if worn within last 3 days
            if (item.last_worn_date) {
                const wornDate = new Date(item.last_worn_date).getTime();
                if (wornDate > threeDaysAgo) {
                    continue;
                }
            }
            items.push(item);
        }
    });
    return items;
};

export const markOutfitAsWorn = async (itemIds: number[]) => {
    const db = await getDBConnection();
    const now = new Date().toISOString();
    // Update each item
    for (const id of itemIds) {
        await db.executeSql(`UPDATE items SET last_worn_date = ? WHERE id = ?`, [now, id]);
    }
};
