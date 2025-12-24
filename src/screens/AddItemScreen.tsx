import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Modal, SafeAreaView } from 'react-native';
// Replaced react-native-image-picker with react-native-image-crop-picker for better cropping support
import ImagePicker from 'react-native-image-crop-picker';
import RNFS from 'react-native-fs';
import { WebView } from 'react-native-webview';
// import { getColors } from 'react-native-image-colors'; // Removed due to Native Crash
import ColorDetectorWebView from '../components/ColorDetectorWebView';
import { theme, commonStyles } from '../styles/theme';
import { getDBConnection } from '../services/Database';

const subCategories: Record<string, string[]> = {
    'Upper': ['T-Shirt', 'Shirt', 'Sweater', 'Hoodie', 'Tank Top', 'Blazer'],
    'Lower': ['Jeans', 'Trousers', 'Shorts', 'Skirt', 'Sweatpants'],
    'Outer': ['Jacket', 'Coat', 'Raincoat', 'Vest'],
    'Shoes': ['Sneakers', 'Boots', 'Formal', 'Sandals', 'Heels']
};

const getSubCategories = (cat: string) => subCategories[cat] || [];

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
    const [subCategory, setSubCategory] = useState<string>('');
    const [color, setColor] = useState<string>(initialColor || '');
    const [isRemovingBackground, setIsRemovingBackground] = useState(false);
    const [shouldProcessBG, setShouldProcessBG] = useState(false);
    const [autoColorLoading, setAutoColorLoading] = useState(false);
    const [shouldDetectColor, setShouldDetectColor] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // Load Base64 for WebView (Interactive or Auto)
    const loadBase64 = async (path: string) => {
        try {
            const b64 = await RNFS.readFile(path, 'base64');
            setImageBase64Full(`data:image/jpeg;base64,${b64}`);
            // Do NOT set shouldDetectColor(true) automatically
        } catch (e) {
            console.error("Failed to read image for color", e);
        }
    };

    // Initial Trigger for Color Detection (WebView) - Now just a helper if needed or removed
    // We'll keep it compatible but changing behavior
    const startColorDetection = async (path: string) => {
        await loadBase64(path);
        // setShouldDetectColor(true); // Disable auto-show
    };

    // Callback when ColorDetectorWebView returns a color
    const handleColorDetected = (detectedColor: string) => {
        setShouldDetectColor(false);
        setAutoColorLoading(false);
        setColor(detectedColor);
        // Only alert if NOT in interactive mode (to avoid spamming user while tapping)
        if (!showColorPicker) {
            Alert.alert('Color Detected! 🎨', `We found this color: ${detectedColor}`);
        }
    };

    // Obsolete detectColor removed




    const handleTakePhoto = () => {
        Alert.alert(
            'Photography Tips 📸',
            'For best results:\n\n1. Place item on a plain, solid background (like a white sheet).\n2. Ensure good lighting.\n3. Keep the item flat.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open Camera', onPress: async () => {
                        try {
                            const image = await ImagePicker.openCamera({
                                cropping: true,
                                freeStyleCropEnabled: true, // Allow free-form cropping (rectangle)
                                mediaType: 'photo',
                                includeBase64: false,
                                cropperToolbarTitle: 'Edit Photo',
                                cropperActiveWidgetColor: theme.colors.primary,
                                cropperStatusBarColor: theme.colors.background,
                                cropperToolbarColor: theme.colors.surface,
                                cropperToolbarWidgetColor: theme.colors.text,
                                compressImageMaxWidth: 1080,
                                compressImageMaxHeight: 1080,
                                compressImageQuality: 0.8,
                            });

                            if (image && image.path) {
                                // Determine URI (check if needs file:// prefix for some libs, usually path is fine)
                                const uri = image.path;
                                setImageUri(uri);
                                setImageBase64Full(null);
                                setShouldProcessBG(false);
                                // MANUAL TRIGGER ONLY: No auto-detect here
                                startColorDetection(uri); // Pre-load Base64 but don't auto-detect
                                // Actually, startColorDetection sets shouldDetectColor=true which shows WebView.
                                // We want to pre-load Base64 but NOT set shouldDetectColor=true yet?
                                // Let's modify startColorDetection or just load base64 here.
                                // Re-using startColorDetection but adding a flag?
                                // Simpler: Just load base64 here so it's ready for interactive mode.

                                loadBase64(uri);
                            }
                        } catch (e: any) {
                            if (e.message !== 'User cancelled image selection') {
                                Alert.alert('Error', e.message);
                            }
                        }
                    }
                }
            ]
        );
    };

    const handleChoosePhoto = async () => {
        try {
            const image = await ImagePicker.openPicker({
                cropping: true,
                freeStyleCropEnabled: true, // Allow free-form cropping
                mediaType: 'photo',
                includeBase64: false,
                cropperToolbarTitle: 'Edit Photo',
                cropperActiveWidgetColor: theme.colors.primary,
                cropperStatusBarColor: theme.colors.background,
                cropperToolbarColor: theme.colors.surface,
                cropperToolbarWidgetColor: theme.colors.text,
                compressImageMaxWidth: 1080,
                compressImageMaxHeight: 1080,
                compressImageQuality: 0.8,
            });

            if (image && image.path) {
                const uri = image.path;
                setImageUri(uri);
                setImageBase64Full(null);
                setShouldProcessBG(false);
                // setTimeout(() => { startColorDetection(uri); }, 500);
                loadBase64(uri);
            }
        } catch (e: any) {
            if (e.message !== 'User cancelled image selection') {
                Alert.alert('Error', e.message);
            }
        }
    };

    const handleRemoveBackground = async () => {
        if (!imageUri) return;
        setIsRemovingBackground(true);
        try {
            // Strip file:// prefix if present for RNFS, though path usually doesn't have it from cropper
            let cleanUri = imageUri;
            if (cleanUri.startsWith('file://')) {
                cleanUri = cleanUri.replace('file://', '');
            }

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
        } catch (e: any) {
            console.error('Save error', e);
            Alert.alert('Error', 'Failed to save processed image: ' + e.message);
        } finally {
            setIsRemovingBackground(false);
        }
    };

    const saveItem = async () => {
        if (!imageUri) {
            Alert.alert('Missing Image', 'Please select an image first.');
            return;
        }
        if (!category) {
            Alert.alert('Missing Category', 'Please select a category.');
            return;
        }
        if (!color) {
            Alert.alert(
                'Color Required 🎨',
                'Please detect the item color before saving.\n\nTap the Palette icon 🎨 and touch the image to pick a color.',
                [
                    {
                        text: 'OK', onPress: () => {
                            if (imageBase64Full) setShowColorPicker(true);
                        }
                    }
                ]
            );
            return;
        }

        try {
            const db = await getDBConnection();
            await db.executeSql(
                `INSERT INTO items(image_path, type, sub_type, color_code, created_at) VALUES(?, ?, ?, ?, ?)`,
                [imageUri, category, subCategory || 'General', color || '#000000', new Date().toISOString()]
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
            <Text style={theme.typography.h2 as any}>Add New Item</Text>

            <View style={styles.imageContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles.previewImage} />
                ) : (
                    <Text style={styles.placeholderText}>No Image Selected</Text>
                )}
                {isRemovingBackground && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={{ color: '#fff', marginTop: 10 } as any}>✨ Magic in progress...</Text>
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

            {/* Hidden WebView for Auto Detection */}
            {shouldDetectColor && imageBase64Full && (
                <ColorDetectorWebView
                    imageUri={imageBase64Full}
                    mode="auto"
                    onColorDetected={handleColorDetected}
                    onError={(e) => {
                        setShouldDetectColor(false);
                        setAutoColorLoading(false);
                    }}
                />
            )}

            {/* Interactive Color Picker Modal */}
            <Modal visible={showColorPicker} animationType="slide" onRequestClose={() => setShowColorPicker(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{ padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#333' }}>
                        <View>
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Pick Color</Text>
                            <Text style={{ color: '#aaa', fontSize: 12 }}>Tap anywhere on the image to select a color</Text>
                        </View>
                        <TouchableOpacity onPress={() => setShowColorPicker(false)} style={{ padding: 10 }}>
                            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: 'bold' }}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    {imageBase64Full && (
                        <ColorDetectorWebView
                            imageUri={imageBase64Full}
                            mode="interactive"
                            onColorDetected={(c) => {
                                handleColorDetected(c);
                                setShowColorPicker(false);
                            }}
                            onError={() => setShowColorPicker(false)}
                        />
                    )}
                </SafeAreaView>
            </Modal>



            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.button} onPress={handleTakePhoto} disabled={isRemovingBackground}>
                    <Text style={theme.typography.button as any}>📸 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.button} onPress={handleChoosePhoto} disabled={isRemovingBackground}>
                    <Text style={theme.typography.button as any}>🖼️ Gallery</Text>
                </TouchableOpacity>
            </View>

            {imageUri && !isRemovingBackground && (
                <TouchableOpacity style={styles.magicButton} onPress={handleRemoveBackground}>
                    <Text style={[theme.typography.button as any, { fontSize: 18 }]}>🪄 Magic Remove Background</Text>
                </TouchableOpacity>
            )}

            <Text style={[theme.typography.h2 as any, { marginTop: 20 }]}>Category</Text>
            <View style={styles.categoryRow}>
                {['Upper', 'Lower', 'Outer', 'Shoes'].map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[styles.categoryChip, category === cat && styles.selectedChip]}
                        onPress={() => setCategory(cat)}
                    >
                        <Text style={[styles.categoryText, category === cat && styles.selectedCategoryText] as any}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {category !== '' && (
                <>
                    <Text style={[theme.typography.h2 as any, { marginTop: 20 }]}>Sub-Category</Text>
                    <View style={styles.categoryRow}>
                        {getSubCategories(category).map((sub) => (
                            <TouchableOpacity
                                key={sub}
                                style={[styles.categoryChip, subCategory === sub && styles.selectedChip]}
                                onPress={() => setSubCategory(sub)}
                            >
                                <Text style={[styles.categoryText, subCategory === sub && styles.selectedCategoryText] as any}>{sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <Text style={[theme.typography.h2 as any, { marginTop: 20 }]}>Color {autoColorLoading ? '(Detecting...)' : ''}</Text>


            <View style={styles.colorRow}>
                {/* Pick Color Button */}
                <TouchableOpacity
                    style={[styles.colorCircle, { backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderColor: theme.colors.primary, borderWidth: 1 }]}
                    onPress={() => {
                        if (!imageBase64Full) {
                            Alert.alert('No Image', 'Please select an image first.');
                            return;
                        }
                        setShowColorPicker(true);
                    }}
                >
                    <Text style={{ fontSize: 20 }}>🎨</Text>
                </TouchableOpacity>

                {/* Selected/Detected Color Display */}
                {color ? (
                    <View style={{ alignItems: 'center', marginLeft: 10 }}>
                        <TouchableOpacity
                            style={[styles.colorCircle, { backgroundColor: color }, styles.selectedColorCircle]}
                            onPress={() => { }}
                        />
                        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>{color}</Text>
                    </View>
                ) : (
                    <Text style={{ color: '#666', alignSelf: 'center', marginLeft: 10, fontStyle: 'italic' }}>No color selected</Text>
                )}
            </View>

            <TouchableOpacity style={[styles.saveButton, { marginTop: 30, marginBottom: 50 }]} onPress={saveItem} disabled={isRemovingBackground}>
                <Text style={theme.typography.button as any}>Save Item</Text>
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
