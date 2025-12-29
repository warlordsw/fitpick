import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { generateOutfit, markOutfitAsWorn } from '../services/OutfitGenerator';
import { theme, commonStyles } from '../styles/theme';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { map, filter } from 'rxjs/operators';

// Mock location or real if we had permission
const MOCK_LOCATION = { lat: 41.0082, lon: 28.9784 }; // Istanbul

import { getDBConnection } from '../services/Database';

const OutfitScreen = ({ navigation }: any) => {
    const [outfit, setOutfit] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [lockedItems, setLockedItems] = useState<any>({});
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerCategory, setPickerCategory] = useState('');
    const [availableItems, setAvailableItems] = useState<any[]>([]);

    useEffect(() => {
        // Shake detection (Keep existing)
        try {
            setUpdateIntervalForType(SensorTypes.accelerometer, 100);
            const subscription = accelerometer
                .pipe(map(({ x, y, z }) => Math.sqrt(x * x + y * y + z * z)), filter(val => val > 15))
                .subscribe((speed) => {
                    console.log(`Shake detected: ${speed}`);
                    handleGenerate();
                });
            return () => subscription.unsubscribe();
        } catch (e) { console.warn("Sensors not available"); }
    }, [lockedItems]); // Re-bind if lockedItems changes? No, handleGenerate uses current state.

    const handleGenerate = async () => {
        if (loading) return;
        setLoading(true);
        try {
            // Pass lockedItems to generator
            const newOutfit = await generateOutfit({
                lat: MOCK_LOCATION.lat,
                lon: MOCK_LOCATION.lon,
                eventType: 'Casual',
                lockedItems
            });
            setOutfit(newOutfit);
        } catch (error: any) {
            Alert.alert('Ops', error.message || 'Could not generate outfit');
        } finally {
            setLoading(false);
        }
    };

    const handleWear = async () => {
        if (!outfit) return;
        try {
            const ids = [outfit.top?.id, outfit.bottom?.id, outfit.shoes?.id, outfit.outer?.id].filter(id => !!id);
            await markOutfitAsWorn(ids);
            Alert.alert('Success', 'Outfit marked as worn! These items will rest in laundry for 3 days.');
            setOutfit(null);
            setLockedItems({}); // Reset locks after wearing
        } catch (error) {
            Alert.alert('Error', 'Could not mark as worn');
        }
    };

    const handleAddMissing = (item: any) => {
        // @ts-ignore
        navigation.navigate('AddItem', { initialCategory: item.type, initialColor: item.color_code });
    };

    const openPicker = async (category: string) => {
        setPickerCategory(category);
        setLoading(true);
        try {
            const db = await getDBConnection();
            const results = await db.executeSql(`SELECT * FROM items WHERE type = ? ORDER BY created_at DESC`, [category]);
            const items: any[] = [];
            results.forEach((result: any) => {
                for (let i = 0; i < result.rows.length; i++) {
                    items.push(result.rows.item(i));
                }
            });
            setAvailableItems(items);
            setPickerVisible(true);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const selectItem = (item: any) => {
        // Lock this item
        const key = item.type.toLowerCase(); // 'upper' -> top? Generator uses 'top', 'bottom', 'shoes', 'outer'
        // Map Item Type to Outfit Key
        let outfitKey = '';
        if (item.type === 'Upper') outfitKey = 'top';
        if (item.type === 'Lower') outfitKey = 'bottom';
        if (item.type === 'Shoes') outfitKey = 'shoes';
        if (item.type === 'Outer') outfitKey = 'outer';

        if (outfitKey) {
            setLockedItems({ ...lockedItems, [outfitKey]: item });
            // Also update current outfit view immediately? 
            // Or just wait for "Complete Look"?
            // Better to update local outfit state to show the locked item immediately
            setOutfit({ ...outfit, [outfitKey]: item });
        }
        setPickerVisible(false);
    };

    const toggleLock = (key: string, item: any) => {
        if (lockedItems[key]) {
            // Unlock
            const newLocks = { ...lockedItems };
            delete newLocks[key];
            setLockedItems(newLocks);
        } else {
            // Lock existing item
            if (item) setLockedItems({ ...lockedItems, [key]: item });
        }
    };

    const renderPiece = (item: any, label: string, key: string, category: string) => {
        const isLocked = !!lockedItems[key];

        return (
            <View style={styles.pieceContainer}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={styles.pieceLabel}>{label}</Text>
                    <TouchableOpacity onPress={() => item ? toggleLock(key, item) : openPicker(category)} style={{ marginLeft: 10 }}>
                        <Text style={{ fontSize: 16 } as any}>{isLocked ? '🔒' : '🔓'}</Text>
                    </TouchableOpacity>

                    {/* Edit Button to open Picker */}
                    <TouchableOpacity onPress={() => openPicker(category)} style={{ marginLeft: 10 }}>
                        <Text style={{ fontSize: 16 } as any}>✏️</Text>
                    </TouchableOpacity>
                </View>

                {item ? (
                    <View style={[styles.card, item.isSuggested && styles.suggestedCard, isLocked && styles.lockedCard]}>
                        {item.isSuggested ? (
                            <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionText}>Missing: {item.name}</Text>
                                <View style={{ height: 20, width: 20, backgroundColor: item.color_code, borderRadius: 10, marginVertical: 10 }} />
                                <TouchableOpacity style={styles.addButton} onPress={() => handleAddMissing(item)}>
                                    <Text style={styles.addButtonText}>+ Add This</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <Image source={{ uri: item.image_path }} style={styles.pieceImage} />
                                <View style={{ height: 10, width: '100%', backgroundColor: item.color_code }} />
                            </>
                        )}
                        {isLocked && <View style={styles.lockOverlay}><Text style={{ fontSize: 30 }}>🔒</Text></View>}
                    </View>
                ) : (
                    <TouchableOpacity style={[styles.card, styles.emptyCard]} onPress={() => openPicker(category)}>
                        <Text style={{ color: '#aaa', fontSize: 30 }}>+</Text>
                        <Text style={{ color: '#aaa' }}>Select {label}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 16 }}>
            <Text style={theme.typography.h2}>Smart Combinations</Text>

            {/* Modal for Item Picker */}
            {pickerVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={[theme.typography.h2, { color: theme.colors.text, marginBottom: 10 }]}>Select {pickerCategory}</Text>
                        <ScrollView horizontal>
                            {availableItems.map(item => (
                                <TouchableOpacity key={item.id} onPress={() => selectItem(item)} style={styles.pickerItem}>
                                    <Image source={{ uri: item.image_path }} style={styles.pickerImage} />
                                    <Text style={{ color: theme.colors.text, fontSize: 10, textAlign: 'center' }}>{item.color_code}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setPickerVisible(false)}>
                            <Text style={{ color: '#fff' }}>X</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#aaa' }}>Step 1: Lock items you want.</Text>
                <Text style={{ color: '#aaa' }}>Step 2: Generate.</Text>
            </View>

            <View style={styles.outfitContainer}>
                {/* Always show slots, even if empty, to allow picking */}
                {renderPiece(outfit?.outer, 'Outerwear', 'outer', 'Outer')}
                {renderPiece(outfit?.top, 'Top', 'top', 'Upper')}
                {renderPiece(outfit?.bottom, 'Bottom', 'bottom', 'Lower')}
                {renderPiece(outfit?.shoes, 'Shoes', 'shoes', 'Shoes')}

                {outfit && (
                    <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 10 }]} onPress={handleWear}>
                        <Text style={theme.typography.button}>Wear This Look</Text>
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleGenerate}>
                <Text style={theme.typography.button}>{loading ? 'Thinking...' : (Object.keys(lockedItems).length > 0 ? 'Complete Look ✨' : 'Generate New Outfit 🎲')}</Text>
            </TouchableOpacity>

            <View style={{ height: 50 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    outfitContainer: { marginTop: 20, alignItems: 'center' },
    pieceContainer: { marginBottom: 20, alignItems: 'center', width: '100%' },
    pieceLabel: { color: theme.colors.textSecondary, marginBottom: 5 },
    card: { width: 200, height: 200, borderRadius: 10, overflow: 'hidden', backgroundColor: '#333' },
    lockedCard: { borderWidth: 3, borderColor: theme.colors.primary },
    lockOverlay: { position: 'absolute', top: 5, right: 5 },
    emptyCard: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#666' },
    pieceImage: { width: '100%', height: 190, resizeMode: 'cover' },
    suggestedCard: { borderWidth: 2, borderColor: theme.colors.secondary, borderStyle: 'dashed', backgroundColor: 'rgba(3, 218, 198, 0.1)', justifyContent: 'center', alignItems: 'center' },
    suggestionContent: { alignItems: 'center', padding: 10 },
    suggestionText: { color: theme.colors.secondary, fontWeight: 'bold' as any, fontSize: 16, textAlign: 'center' },
    addButton: { backgroundColor: theme.colors.secondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15 },
    addButtonText: { color: '#000', fontWeight: 'bold' as any },
    button: { marginTop: 30, backgroundColor: theme.colors.secondary, padding: 15, borderRadius: 30, alignItems: 'center', width: '80%', alignSelf: 'center' },

    // Modal Styles
    modalOverlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: theme.colors.surface, padding: 20, borderRadius: 20, maxHeight: 400 }, // Changed bg to surface (dark)
    pickerItem: { marginRight: 10, alignItems: 'center' },
    pickerImage: { width: 80, height: 80, borderRadius: 10, marginBottom: 5 },
    closeButton: { marginTop: 20, backgroundColor: theme.colors.primary, padding: 10, borderRadius: 10, alignItems: 'center' } // Changed bg to primary
});

export default OutfitScreen;
