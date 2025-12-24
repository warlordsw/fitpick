import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { generateOutfit, markOutfitAsWorn } from '../services/OutfitGenerator';
import { theme, commonStyles } from '../styles/theme';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { map, filter } from 'rxjs/operators';

// Mock location or real if we had permission
const MOCK_LOCATION = { lat: 41.0082, lon: 28.9784 }; // Istanbul

const OutfitScreen = ({ navigation }: any) => {
    const [outfit, setOutfit] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Shake detection
        try {
            setUpdateIntervalForType(SensorTypes.accelerometer, 100);
            const subscription = accelerometer
                .pipe(map(({ x, y, z }) => Math.sqrt(x * x + y * y + z * z)), filter(val => val > 15)) // Shake threshold
                .subscribe((speed) => {
                    console.log(`Shake detected: ${speed}`);
                    handleGenerate();
                });

            return () => {
                subscription.unsubscribe();
            };
        } catch (e) {
            console.warn("Sensors not available");
        }
    }, []);

    const handleGenerate = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const newOutfit = await generateOutfit({
                lat: MOCK_LOCATION.lat,
                lon: MOCK_LOCATION.lon,
                eventType: 'Casual'
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
        } catch (error) {
            Alert.alert('Error', 'Could not mark as worn');
        }
    };

    const handleAddMissing = (item: any) => {
        // @ts-ignore
        navigation.navigate('AddItem', { initialCategory: item.type, initialColor: item.color_code });
    };

    const renderPiece = (item: any, label: string) => (
        <View style={styles.pieceContainer}>
            <Text style={styles.pieceLabel}>{label}</Text>
            {item ? (
                <View style={[styles.card, item.isSuggested && styles.suggestedCard]}>
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
                </View>
            ) : (
                <Text style={{ color: '#666' }}>Not needed</Text>
            )}
        </View>
    );

    return (
        <ScrollView contentContainerStyle={{ paddingBottom: 50, paddingHorizontal: 16 }}>
            <Text style={theme.typography.h2}>Smart Combinations</Text>
            <Text style={{ color: '#aaa', marginBottom: 20 }}>Shake your phone to style!</Text>

            {outfit && (
                <View style={styles.outfitContainer}>
                    <Text style={[theme.typography.h2, { alignSelf: 'center' }]}>Today's Look ({outfit.weather})</Text>
                    {renderPiece(outfit.outer, 'Outerwear')}
                    {renderPiece(outfit.top, 'Top')}
                    {renderPiece(outfit.bottom, 'Bottom')}
                    {renderPiece(outfit.shoes, 'Shoes')}

                    <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary, marginTop: 10 }]} onPress={handleWear}>
                        <Text style={theme.typography.button}>Wear This</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TouchableOpacity style={styles.button} onPress={handleGenerate}>
                <Text style={theme.typography.button}>{loading ? 'Thinking...' : 'Generate New Outfit'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    outfitContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    pieceContainer: {
        marginBottom: 20,
        alignItems: 'center',
        width: '100%',
    },
    pieceLabel: {
        color: theme.colors.textSecondary,
        marginBottom: 5,
    },
    card: {
        width: 200,
        height: 200,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#333'
    },
    pieceImage: {
        width: '100%',
        height: 190,
        resizeMode: 'cover',
    },
    suggestedCard: {
        borderWidth: 2,
        borderColor: theme.colors.secondary,
        borderStyle: 'dashed',
        backgroundColor: 'rgba(3, 218, 198, 0.1)', // Secondary color with opacity
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionContent: {
        alignItems: 'center',
        padding: 10,
    },
    suggestionText: {
        color: theme.colors.secondary,
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
    },
    addButton: {
        backgroundColor: theme.colors.secondary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 15,
    },
    addButtonText: {
        color: '#000',
        fontWeight: 'bold',
    },
    button: {
        marginTop: 30,
        backgroundColor: theme.colors.secondary,
        padding: 15,
        borderRadius: 30,
        alignItems: 'center',
        width: '80%',
        alignSelf: 'center',
    }
});

export default OutfitScreen;
