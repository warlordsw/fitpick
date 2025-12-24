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

    // 1. Get Weather & Thresholds
    const weather = await getWeather(lat, lon);
    const temp = weather ? weather.temperature : 20; // Default 20C
    const weatherCat = weather ? getWeatherCategory(weather.weatherCode, temp) : 'Normal';

    // 2. Fetch All Items
    const tops = await fetchItems(db, 'Upper');
    const bottoms = await fetchItems(db, 'Lower');
    const shoes = await fetchItems(db, 'Shoes');
    const outers = await fetchItems(db, 'Outer');

    // 3. Select Base Item (Bottom)
    // Priority: Random real item
    let bottom = bottoms.length > 0
        ? bottoms[Math.floor(Math.random() * bottoms.length)]
        : null;

    // Logic: If no bottom, can't build outfit easily. Suggest buying basic jeans.
    if (!bottom) {
        bottom = createGhostItem('Lower', 'Blue', 'Jeans');
    }

    // 4. Select Top (Strict Match)
    let top = null;
    const matchingTops = tops.filter(t => isColorMatch(bottom!.color_code, t.color_code));

    // Strict Mode: Only pick if matches.
    if (matchingTops.length > 0) {
        // Filter by Sub-category based on weather if possible? 
        // e.g. if Cold (<10), prefer Sweater/Hoodie
        if (temp < 15) { // Updated Cool/Cold threshold logic
            const warerTops = matchingTops.filter(t => ['Sweater', 'Hoodie'].includes(t.sub_type));
            if (warerTops.length > 0) top = warerTops[Math.floor(Math.random() * warerTops.length)];
        }

        if (!top) {
            top = matchingTops[Math.floor(Math.random() * matchingTops.length)];
        }
    } else {
        // NO MATCH FOUND -> GHOST ITEM SUGGESTION
        // Find a color that matches the bottom
        // Simple logic: If bottom is Dark, suggest Light top. If valid color, use matcher reverse?
        // Let's suggest a Safe color (White/Black/Grey) or complementary.
        // For now, simpler: Suggest White or Black T-Shirt/Sweater depending on weather.
        const suggestedColor = 'White';
        const suggestedType = temp < 15 ? 'Sweater' : 'T-Shirt';
        top = createGhostItem('Upper', suggestedColor, suggestedType);
    }

    // 5. Select Shoes
    let shoe = null;
    const matchingShoes = shoes.filter(s => isColorMatch(bottom!.color_code, s.color_code));
    if (matchingShoes.length > 0) {
        shoe = matchingShoes[Math.floor(Math.random() * matchingShoes.length)];
    } else {
        shoe = createGhostItem('Shoes', 'White', 'Sneakers');
    }

    // 6. Select Outer (If needed)
    let outer = null;
    // Weather Logic: < 15C needs Outer OR Heavy Top. < 10C DEFINITELY needs Outer.
    // If raining, needs Raincoat/Jacket.
    if (temp < 15 || weatherCat === 'Rain') {
        const matchingOuters = outers.filter(o => isColorMatch(bottom!.color_code, o.color_code));
        if (matchingOuters.length > 0) {
            outer = matchingOuters[Math.floor(Math.random() * matchingOuters.length)];
        } else {
            // Only suggest buying if it's strictly necessary (< 10C or Rain)
            if (temp < 10 || weatherCat === 'Rain') {
                outer = createGhostItem('Outer', 'Black', weatherCat === 'Rain' ? 'Raincoat' : 'Jacket');
            }
        }
    }

    return {
        top,
        bottom,
        shoes: shoe,
        outer,
        weather: weatherCat,
        temperature: temp
    };
};

const createGhostItem = (type: string, color: string, subType: string) => ({
    id: -1 * Math.floor(Math.random() * 10000),
    type,
    sub_type: subType,
    color_code: color,
    image_path: '', // UI should handle empty path by showing "Buy This" icon
    isSuggested: true,
    name: `Buy: ${color} ${subType}`
});

const fetchItems = async (db: any, category: string) => {
    // Select sub_type as well
    const results = await db.executeSql(`SELECT * FROM items WHERE type = ?`, [category]);
    const items: any[] = [];
    const threeDaysAgo = new Date().getTime() - (3 * 24 * 60 * 60 * 1000);

    results.forEach((result: any) => {
        for (let i = 0; i < result.rows.length; i++) {
            const item = result.rows.item(i);
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
    // Filter out ghost items (negative IDs)
    const validIds = itemIds.filter(id => id > 0);

    for (const id of validIds) {
        await db.executeSql(`UPDATE items SET last_worn_date = ? WHERE id = ?`, [now, id]);
    }
};
