import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const databaseName = 'FitPick.db';

export const getDBConnection = async () => {
    return SQLite.openDatabase({ name: databaseName, location: 'default' });
};

export const createTables = async (db: SQLite.SQLiteDatabase) => {
    // Categories Table
    const queryCategories = `
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE
    );
  `;

    // Items Table
    const queryItems = `
    CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_path TEXT NOT NULL,
        category_id INTEGER,
        type TEXT, -- upper, lower, outer, shoes, accessory
        sub_type TEXT, -- T-Shirt, Sweater, Hoodie, Jeans, etc.
        color_code TEXT,
        last_worn_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `;

    // Outfits Table
    const queryOutfits = `
    CREATE TABLE IF NOT EXISTS outfits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        items_json TEXT NOT NULL, -- JSON array of item IDs
        event_type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `;

    await db.executeSql(queryCategories);
    await db.executeSql(queryItems);
    await db.executeSql(queryOutfits);

    // Migration: Add sub_type column if it doesn't exist
    try {
        await db.executeSql(`ALTER TABLE items ADD COLUMN sub_type TEXT;`);
        console.log("Migration: Added sub_type column");
    } catch (e: any) {
        // Column likely exists, ignore error
        // console.log("Migration check: sub_type likely exists");
    }
};

export const initDatabase = async () => {
    try {
        const db = await getDBConnection();
        await createTables(db);
        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};
