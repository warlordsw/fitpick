import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDBConnection } from '../services/Database';
import { theme, commonStyles } from '../styles/theme';

interface Item {
    id: number;
    image_path: string;
    type: string;
    color_code: string;
}

const WardrobeScreen = () => {
    const [items, setItems] = useState<Item[]>([]);

    const loadItems = async () => {
        try {
            const db = await getDBConnection();
            const results = await db.executeSql('SELECT * FROM items ORDER BY created_at DESC');
            const loadedItems: Item[] = [];
            results.forEach((result) => {
                for (let i = 0; i < result.rows.length; i++) {
                    loadedItems.push(result.rows.item(i));
                }
            });
            setItems(loadedItems);
        } catch (error) {
            console.error(error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadItems();
        }, [])
    );

    const renderItem = ({ item }: { item: Item }) => (
        <View style={styles.itemCard}>
            <Image source={{ uri: item.image_path }} style={styles.itemImage} />
            <View style={styles.itemInfo}>
                <Text style={styles.itemType}>{item.type}</Text>
                <View style={[styles.colorDot, { backgroundColor: item.color_code }]} />
            </View>
        </View>
    );

    return (
        <View style={commonStyles.container}>
            <Text style={[theme.typography.h2, { marginBottom: 20 }]}>My Wardrobe</Text>
            <FlatList
                data={items}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemCard: {
        width: '48%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        marginBottom: 15,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    itemImage: {
        width: '100%',
        height: 150,
        resizeMode: 'cover',
    },
    itemInfo: {
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    itemType: {
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    colorDot: {
        width: 15,
        height: 15,
        borderRadius: 7.5,
        borderWidth: 1,
        borderColor: '#fff',
    },
});

export default WardrobeScreen;
