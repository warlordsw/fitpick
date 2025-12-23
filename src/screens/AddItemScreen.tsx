import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { WebView } from 'react-native-webview';
import { getColors } from 'react-native-image-colors';
import { theme, commonStyles } from '../styles/theme';
import { getDBConnection } from '../services/Database';

const BackgroundRemoverWebView = ({ imageBase64, onProcessed, onError }: any) => {
    const webviewRef = useRef<WebView>(null);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js"></script>
    </head>
    <body>
      <canvas id="output_canvas"></canvas>
      <img id="input_image" style="display:none;" />
      <script>
        const canvasElement = document.getElementById('output_canvas');
        const canvasCtx = canvasElement.getContext('2d');
        const inputImage = document.getElementById('input_image');
        
        const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
          return \`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/\${file}\`;
        }});
        
        selfieSegmentation.setOptions({
          modelSelection: 1, 
        });

        selfieSegmentation.onResults(onResults);

        function onResults(results) {
          canvasElement.width = results.image.width;
          canvasElement.height = results.image.height;
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          canvasCtx.globalCompositeOperation = 'source-over';
          canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);
          canvasCtx.globalCompositeOperation = 'source-in';
          canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

          const dataURL = canvasElement.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: dataURL }));
        }

        window.processImage = async (base64) => {
             inputImage.src = base64;
             inputImage.onload = async () => {
                 await selfieSegmentation.send({image: inputImage});
             };
        };
        
        setTimeout(() => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
         }, 1500);
      </script>
    </body>
    </html>
  `;

    // Note: Backticks in injectedJS must be standard.
    const injectedJS = `
    if (window.processImage) {
        window.processImage("${imageBase64}");
    }
  `;

    const onMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'ready' && imageBase64) {
                webviewRef.current?.injectJavaScript(injectedJS);
            } else if (message.type === 'success') {
                onProcessed(message.data);
            }
        } catch (e) { console.error(e); }
    };

    return (
        <View style={{ height: 0, width: 0, overflow: 'hidden' }}>
            <WebView
                ref={webviewRef}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                originWhitelist={['*']}
            />
        </View>
    );
};

const AddItemScreen = ({ navigation, route }: any) => {
    const { initialCategory, initialColor } = route.params || {};

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64Full, setImageBase64Full] = useState<string | null>(null);
    const [category, setCategory] = useState<string>(initialCategory || '');
    const [color, setColor] = useState<string>(initialColor || '');
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [shouldProcessBG, setShouldProcessBG] = useState(false);
    const [autoColorLoading, setAutoColorLoading] = useState(false);

    // Helper: Detect Color
    const detectColor = async (uri: string) => {
        setAutoColorLoading(true);
        try {
            // Re-enabled Auto-Color
            const result = await getColors(uri, {
                fallback: '#000000',
                cache: true,
                key: uri,
            });

            let detected = '#000000';
            if (result.platform === 'android') {
                detected = result.vibrant || result.dominant || result.average || '#000000';
            } else if (result.platform === 'ios') {
                detected = result.primary || result.background || '#000000';
            }
            setColor(detected);
        } catch (e) {
            console.error('Color detection failed', e);
        } finally {
            setAutoColorLoading(false);
        }
    };

    const handleTakePhoto = async () => {
        // Updated options for Cropping
        const result = await launchCamera({
            mediaType: 'photo',
            saveToPhotos: true,
            includeBase64: false, // Don't need base64 here
            quality: 0.8,
            // allowsEditing: true // STILL DISABLED to isolate crash
        });

        if (result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri || null;
            if (uri) {
                setImageUri(uri);
                setImageBase64Full(null);
                setShouldProcessBG(false);
                detectColor(uri); // ENABLED
            }
        }
    };

    const handleChoosePhoto = async () => {
        // Updated options for Cropping
        const result = await launchImageLibrary({
            mediaType: 'photo',
            includeBase64: false,
            quality: 0.8,
            // allowsEditing: true // STILL DISABLED to isolate crash
        });

        if (result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri || null;
            if (uri) {
                setImageUri(uri);
                setImageBase64Full(null);
                setShouldProcessBG(false);
                detectColor(uri); // ENABLED
            }
        }
    };

    const handleRemoveBackground = async () => {
        if (!imageUri) return;
        setIsRemovingBackground(true);
        try {
            // Strip file:// prefix if present for RNFS
            const cleanUri = imageUri.startsWith('file://') ? imageUri.replace('file://', '') : imageUri;
            const b64 = await RNFS.readFile(cleanUri, 'base64');
            // Standard template literal with no escaping in tool call (unless tool escapes it, but I assume literal)
            setImageBase64Full(`data:image/jpeg;base64,${b64}`);
            setShouldProcessBG(true);
        } catch (e: any) {
            Alert.alert('Error reading file', e.message);
            setIsRemovingBackground(false);
        }
    };

    const handleWebViewProcessed = async (dataUrl: string) => {
        setShouldProcessBG(false);
        const base64Data = dataUrl.split(',')[1];
        const newPath = `${RNFS.DocumentDirectoryPath}/processed_${new Date().getTime()}.png`;
        try {
            await RNFS.writeFile(newPath, base64Data, 'base64');
            setImageUri(`file://${newPath}`);
            Alert.alert('Magic Complete!', 'Background removed successfully.');
            // Re-detect color for processed image if needed? Or keep original.
            // Let's keep original for now as BG removal might affect color detection (make it black).
        } catch (e: any) {
            console.error('Save error', e);
            Alert.alert('Error', 'Failed to save processed image: ' + e.message);
        } finally {
            setIsRemovingBackground(false);
        }
    };

    const saveItem = async () => {
        if (!imageUri || !category) {
            Alert.alert('Missing Info', 'Please select an image and a category.');
            return;
        }

        try {
            const db = await getDBConnection();
            await db.executeSql(
                `INSERT INTO items(image_path, type, color_code, created_at) VALUES(?, ?, ?, ?)`,
                [imageUri, category, color || '#000000', new Date().toISOString()]
            );
            Alert.alert('Success', 'Item added to wardrobe!');
            navigation.goBack();
        } catch (error: any) {
            console.error('Save Failed:', error);
            // Detailed Error Alert for User Debugging
            Alert.alert('Save Failed', `Database Error: ${error.message || JSON.stringify(error)}`);
        }
    };

    return (
        <ScrollView style={commonStyles.container}>
            <Text style={theme.typography.h2}>Add New Item</Text>

            <View style={styles.imageContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                    <Text style={styles.placeholderText}>No Image Selected</Text>
                )}
                {isRemovingBackground && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ color: '#fff', marginTop: 10 }}>✨ Magic in progress...</Text>
                    </View>
                )}
                {autoColorLoading && (
                    <View style={[styles.loadingOverlay, { backgroundColor: 'transparent', justifyContent: 'flex-start', paddingTop: 10 }]}>
                        <ActivityIndicator size="small" color="#fff" />
                    </View>
                )}
            </View>

            {shouldProcessBG && imageBase64Full && (
                <BackgroundRemoverWebView
                    imageBase64={imageBase64Full}
                    onProcessed={handleWebViewProcessed}
                    onError={(e: string) => { setIsRemovingBackground(false); setShouldProcessBG(false); Alert.alert('Error', e); }}
                />
            )}

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleTakePhoto} disabled={isRemovingBackground}>
                    <Text style={theme.typography.button}>📸 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleChoosePhoto} disabled={isRemovingBackground}>
                    <Text style={theme.typography.button}>🖼️ Gallery</Text>
                </TouchableOpacity>
            </View>

            {imageUri && !isRemovingBackground && (
                <TouchableOpacity style={styles.magicButton} onPress={handleRemoveBackground}>
                    <Text style={[theme.typography.button, { fontSize: 18 }]}>🪄 Magic Remove Background</Text>
                </TouchableOpacity>
            )}

            <Text style={[theme.typography.h2, { marginTop: 20 }]}>Category</Text>
            <View style={styles.categoryRow}>
                {['Upper', 'Lower', 'Outer', 'Shoes'].map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, category === cat && styles.selectedChip]}
                        onPress={() => setCategory(cat)}
                    >
                        <Text style={[styles.categoryText, category === cat && styles.selectedCategoryText]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={[theme.typography.h2, { marginTop: 20 }]}>Color {autoColorLoading ? '(Detecting...)' : ''}</Text>
            <View style={styles.colorRow}>
                {['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#800080', '#FFA500', '#A52A2A'].map((c) => (
                    <TouchableOpacity
                        key={c}
                        style={[styles.colorCircle, { backgroundColor: c }, color === c && styles.selectedColorCircle]}
                        onPress={() => setColor(c)}
                    />
                ))}
                {/* Auto-detected color preview if not in list */}
                {color && !['#000000', '#FFFFFF', '#FF0000', '#0000FF', '#008000', '#FFFF00', '#800080', '#FFA500', '#A52A2A'].includes(color) && (
                    <TouchableOpacity
                        style={[styles.colorCircle, { backgroundColor: color }, styles.selectedColorCircle]}
                        onPress={() => { }}
                    />
                )}
            </View>

            <TouchableOpacity style={[styles.saveButton, { marginTop: 30, marginBottom: 50 }]} onPress={saveItem} disabled={isRemovingBackground}>
                <Text style={theme.typography.button}>Save Item</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    imageContainer: {
        width: '100%',
        height: 300,
        backgroundColor: '#2a2a2a',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    placeholderText: {
        color: '#888',
        fontSize: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        backgroundColor: theme.colors.surface,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 0.48,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444'
    },
    magicButton: {
        backgroundColor: '#FFD700', // Gold for Magic
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 15,
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    saveButton: {
        backgroundColor: theme.colors.success,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    categoryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 10,
    },
    categoryChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#333',
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#444',
    },
    selectedChip: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryText: {
        color: '#fff',
    },
    selectedCategoryText: {
        fontWeight: 'bold',
    },
    colorRow: {
        flexDirection: 'row',
        marginTop: 10,
        flexWrap: 'wrap'
    },
    colorCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 15,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#444',
    },
    selectedColorCircle: {
        borderColor: '#fff',
        borderWidth: 3,
        transform: [{ scale: 1.2 }]
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default AddItemScreen;
