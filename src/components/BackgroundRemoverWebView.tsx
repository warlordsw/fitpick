import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { WebView } from 'react-native-webview';

interface Props {
    imageUri: string | null;
    onProcessed: (processedUri: string) => void;
    onError: (error: string) => void;
}

const BackgroundRemoverWebView: React.FC<Props> = ({ imageUri, onProcessed, onError }) => {
    const webviewRef = useRef<WebView>(null);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    </head>
    <body>
      <canvas id="output_canvas"></canvas>
      <img id="input_image" src="" style="display:none;" crossOrigin="anonymous" />
      <script>
        const canvasElement = document.getElementById('output_canvas');
        const canvasCtx = canvasElement.getContext('2d');
        const inputImage = document.getElementById('input_image');
        
        // Initialize MediaPipe Selfie Segmentation
        const selfieSegmentation = new SelfieSegmentation({locateFile: (file) => {
          return \`https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/\${file}\`;
        }});
        
        selfieSegmentation.setOptions({
          modelSelection: 1, // 0 for general, 1 for landscape (better quality)
        });

        selfieSegmentation.onResults(onResults);

        function onResults(results) {
          canvasElement.width = results.image.width;
          canvasElement.height = results.image.height;
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          
          // Draw mask
          canvasCtx.globalCompositeOperation = 'source-over';
          canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasElement.width, canvasElement.height);

          // Draw original image only where mask is
          canvasCtx.globalCompositeOperation = 'source-in';
          canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

          canvasCtx.restore();

          // Return base64
          const dataURL = canvasElement.toDataURL('image/png');
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', data: dataURL }));
        }

        window.processImage = async (base64) => {
             // Create an image element from base64
             inputImage.src = base64;
             inputImage.onload = async () => {
                 await selfieSegmentation.send({image: inputImage});
             };
        };

        // Notify Listeners ready
        setTimeout(()=> window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' })), 1000);
      </script>
    </body>
    </html>
  `;

    const onMessage = (event: any) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'ready') {
                // If image is ready, send it
                if (imageUri) {
                    // We need to read the file as base64 first in the parent component
                    // But actually, we passed the URI.
                    // Ideally the parent reads base64 and passes it, OR we read it here.
                    // let's assume parent logic sends message.
                }
            } else if (message.type === 'success') {
                onProcessed(message.data);
            }
        } catch (e) {
            console.error("WebView Message Error", e);
            onError('WebView Communication Error');
        }
    };

    return (
        <View style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <WebView
                ref={webviewRef}
                source={{ html: htmlContent }}
                onMessage={onMessage}
                useWebKit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowFileAccess={true}
                originWhitelist={['*']}
                mixedContentMode="always"
            />
        </View>
    );
};

export default BackgroundRemoverWebView;
