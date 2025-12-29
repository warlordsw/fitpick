import { getDBConnection } from './Database';
import { getWeather, getWeatherCategory } from './WeatherService';
import { isColorMatch } from '../utils/ColorMatcher';

export interface OutfitRequest {
    lat: number;
    lon: number;
    eventType: string; // 'Business', 'Sport', 'Casual'
    lockedItems?: {
        top?: any;
        bottom?: any;
        shoes?: any;
        outer?: any;
    };
}

// Helper to shuffle array for variety
const shuffle = (array: any[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
};

export const generateOutfit = async ({ lat, lon, eventType, lockedItems = {} }: OutfitRequest) => {
    const db = await getDBConnection();

    // 1. Get Weather & Thresholds
    const weather = await getWeather(lat, lon);
    const temp = weather ? weather.temperature : 20; // Default 20C
    const weatherCat = weather ? getWeatherCategory(weather.weatherCode, temp) : 'Normal';

    // 2. Fetch All Items
    let tops = await fetchItems(db, 'Upper');
    let bottoms = await fetchItems(db, 'Lower');
    let shoes = await fetchItems(db, 'Shoes');
    let outers = await fetchItems(db, 'Outer');

    // Shuffle for variety
    tops = shuffle(tops);
    bottoms = shuffle(bottoms);
    shoes = shuffle(shoes);
    outers = shuffle(outers);

    // Initialize with locked items or null
    let top = lockedItems.top || null;
    let bottom = lockedItems.bottom || null;
    let shoe = lockedItems.shoes || null;
    let outer = lockedItems.outer || null;

    // 3. Select Anchor Item (If nothing locked, pick Bottom as anchor)
    // If Top is locked but Bottom isn't, Top is anchor.
    // If Bottom is locked, Bottom is anchor.
    // Logic: Fill Bottom -> Top -> Shoes -> Outer

    // 3. Select Anchor Item (If nothing locked, pick Bottom as anchor)
    // If Top is locked but Bottom isn't, Top is anchor.
    // If Bottom is locked, Bottom is anchor.
    // Logic: Fill Bottom -> Top -> Shoes -> Outer

    if (!bottom) {
        // If Top is locked, try to find matching bottom
        if (top) {
            const matchingBottoms = bottoms.filter(b => isColorMatch(b.color_code, top.color_code));
            if (matchingBottoms.length > 0) {
                // Weather logic for bottom? (Shorts vs Jeans) - Maybe later.
                bottom = matchingBottoms[0];
            } else {
                // Suggest Ghost Bottom
                const colors = ['Black', 'Blue', 'Beige', 'Grey', 'Navy'];
                bottom = createGhostItem('Lower', colors[Math.floor(Math.random() * colors.length)], 'Jeans');
            }
        } else {
            // No lock, pick random bottom
            // Randomize between real items and ghost items if very few real items exist?
            // Actually, if we have bottoms, we pick one randomly (shuffled above).
            // Ghost Bottom if absolutely no bottoms.
            if (bottoms.length > 0) {
                bottom = bottoms[0];
            } else {
                const colors = ['Black', 'Blue', 'Beige', 'Grey', 'Navy'];
                bottom = createGhostItem('Lower', colors[Math.floor(Math.random() * colors.length)], 'Jeans');
            }
        }
    }

    // 4. Select Top (If not locked/picked)
    if (!top) {
        const matchingTops = tops.filter(t => isColorMatch(bottom.color_code, t.color_code));

        if (matchingTops.length > 0) {
            // Weather Logic
            if (temp < 15) {
                const warmerTops = matchingTops.filter(t => ['Sweater', 'Hoodie'].includes(t.sub_type));
                if (warmerTops.length > 0) top = warmerTops[0];
            }
            if (!top) top = matchingTops[0];
        } else {
            // Ghost Top - RANDOMIZE
            // Previously: bottom.color_code === 'Black' ? 'White' : 'Black';
            // Now: Pick from a few safe options or randomized.
            const validColors = ['White', 'Black', 'Grey', 'Beige', 'Navy'].filter(c => isColorMatch(bottom.color_code, c));
            const suggestedColor = validColors.length > 0 ? validColors[Math.floor(Math.random() * validColors.length)] : 'White';

            const suggestedType = temp < 15
                ? (Math.random() > 0.5 ? 'Sweater' : 'Hoodie')
                : (Math.random() > 0.5 ? 'T-Shirt' : 'Shirt');

            top = createGhostItem('Upper', suggestedColor, suggestedType);
        }
    }

    // 5. Select Shoes (If not locked)
    if (!shoe) {
        const matchingShoes = shoes.filter(s => isColorMatch(bottom.color_code, s.color_code));
        if (matchingShoes.length > 0) {
            shoe = matchingShoes[0];
        } else {
            const shoeColors = ['White', 'Black'].filter(c => isColorMatch(bottom.color_code, c));
            const shoeColor = shoeColors.length > 0 ? shoeColors[Math.floor(Math.random() * shoeColors.length)] : 'White';
            shoe = createGhostItem('Shoes', shoeColor, 'Sneakers');
        }
    }

    // 6. Select Outer (If needed & not locked)
    if (!outer && (temp < 15 || weatherCat === 'Rain')) {
        const matchingOuters = outers.filter(o => isColorMatch(bottom.color_code, o.color_code));
        if (matchingOuters.length > 0) {
            outer = matchingOuters[0];
        } else {
            if (temp < 10 || weatherCat === 'Rain') {
                const outerColors = ['Black', 'Navy', 'Camel', 'Grey'].filter(c => isColorMatch(bottom.color_code, c));
                const outerColor = outerColors.length > 0 ? outerColors[Math.floor(Math.random() * outerColors.length)] : 'Black';
                const type = weatherCat === 'Rain' ? 'Raincoat' : (Math.random() > 0.5 ? 'Jacket' : 'Coat');
                outer = createGhostItem('Outer', outerColor, type);
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
