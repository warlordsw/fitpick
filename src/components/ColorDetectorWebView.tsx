import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface ColorDetectorWebViewProps {
    imageUri: string | null;
    onColorDetected: (color: string) => void;
    onError: (error: string) => void;
    mode?: 'auto' | 'interactive';
}

const ColorDetectorWebView: React.FC<ColorDetectorWebViewProps> = ({ imageUri, onColorDetected, onError, mode = 'auto' }) => {
    const webViewRef = useRef<WebView>(null);

    // HTML Content with embedded JS for Color Extraction
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <style>
                body { margin: 0; padding: 0; background: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
                canvas { object-fit: contain; max-width: 100%; max-height: 100%; }
            </style>
        </head>
        <body>
            <img id="targetImage" src="${imageUri}" style="display:none;" crossOrigin="Anonymous" />
            <canvas id="canvas"></canvas>
            <script>
                (function() {
                    const img = document.getElementById('targetImage');
                    const canvas = document.getElementById('canvas');
                    const ctx = canvas.getContext('2d');
                    const mode = "${mode}";

                    img.onload = function() {
                        try {
                            const width = img.naturalWidth; 
                            const height = img.naturalHeight;
                            
                            // For interactive mode, we want high res to pick accurate colors
                            // For auto, we can downscale for speed
                            
                            let renderWidth = width;
                            let renderHeight = height;

                            if (mode === 'auto') {
                                renderWidth = 100;
                                renderHeight = 100;
                            } else {
                                // Fit to screen logic handled visually by CSS, but canvas needs to draw full image
                                // or at least large enough to be clear.
                                // Let's keep original resolution for accuracy in interactive
                            }

                            canvas.width = renderWidth;
                            canvas.height = renderHeight;
                            ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

                            if (mode === 'auto') {
                                // AUTO MODE: Dominant Color (Center Average)
                                const centerX = Math.floor(renderWidth / 2);
                                const centerY = Math.floor(renderHeight / 2);
                                const pixelData = ctx.getImageData(centerX, centerY, 1, 1).data;
                                
                                const hex = rgbToHex(pixelData[0], pixelData[1], pixelData[2]);
                                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', color: hex }));
                            } 
                            // Interactive mode waits for click
                        } catch (err) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: err.toString() }));
                        }
                    };

                    img.onerror = function() {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: 'Image load failed' }));
                    };

                    // Helper
                    function rgbToHex(r, g, b) {
                        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                    }

                    // Click Listener for Interactive Mode
                    canvas.addEventListener('click', function(event) {
                        if (mode !== 'interactive') return;

                        const rect = canvas.getBoundingClientRect();
                        const scaleX = canvas.width / rect.width;
                        const scaleY = canvas.height / rect.height;

                        const x = (event.clientX - rect.left) * scaleX;
                        const y = (event.clientY - rect.top) * scaleY;

                        // 5x5 Average
                        const sampleSize = 5;
                        const startX = Math.max(0, Math.floor(x - sampleSize / 2));
                        const startY = Math.max(0, Math.floor(y - sampleSize / 2));
                        
                        const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
                        const data = imageData.data;
                        
                        let r = 0, g = 0, b = 0, count = 0;

                        for (let i = 0; i < data.length; i += 4) {
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            count++;
                        }

                        r = Math.floor(r / count);
                        g = Math.floor(g / count);
                        b = Math.floor(b / count);

                        const hex = rgbToHex(r, g, b);
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', color: hex }));
                    });

                })();
            </script>
        </body>
        </html>
    `;

    if (!imageUri) return null;

    // Interactive mode needs to be visible
    if (mode === 'interactive') {
        return (
            <View style={styles.interactiveContainer}>
                <WebView
                    ref={webViewRef}
                    originWhitelist={['*']}
                    source={{ html: htmlContent }}
                    javaScriptEnabled={true}
                    onMessage={(event) => {
                        try {
                            const data = JSON.parse(event.nativeEvent.data);
                            if (data.type === 'success') {
                                onColorDetected(data.color);
                            }
                        } catch (e) {
                            // ignore
                        }
                    }}
                    containerStyle={{ flex: 1 }}
                />
            </View>
        );
    }

    // Auto Mode (Hidden)
    return (
        <View style={styles.hiddenContainer}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: htmlContent }}
                javaScriptEnabled={true}
                onMessage={(event) => {
                    try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'success') {
                            onColorDetected(data.color);
                        } else {
                            onColorDetected('#000000');
                        }
                    } catch (e) {
                        onColorDetected('#000000');
                    }
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    hiddenContainer: {
        height: 0,
        width: 0,
        position: 'absolute',
        opacity: 0
    },
    interactiveContainer: {
        flex: 1,
        backgroundColor: '#000',
    }
});

export default ColorDetectorWebView;
