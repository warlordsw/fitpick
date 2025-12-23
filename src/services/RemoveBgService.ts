import RNFS from 'react-native-fs';
import { Alert } from 'react-native';

const API_URL = 'https://api.remove.bg/v1.0/removebg';

// Ideally, this should be stored securely or input by the user.
// For now, we will use a placeholder or check if one is stored.
let API_KEY = '';

export const setRemoveBgApiKey = (key: string) => {
    API_KEY = key;
};

export const getRemoveBgApiKey = () => API_KEY;

export const removeBackgroundApi = async (imageUri: string): Promise<string | null> => {
    if (!API_KEY) {
        throw new Error('MISSING_API_KEY');
    }

    try {
        const base64Img = await RNFS.readFile(imageUri, 'base64');

        const formData = new FormData();
        formData.append('image_file_b64', base64Img);
        formData.append('size', 'auto');

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'X-Api-Key': API_KEY,
                // 'Content-Type': 'multipart/form-data' is handled automatically by FormData, but sometimes fetch needs help with boundary
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Remove.bg API Error:', response.status, errorText);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();

        // Convert blob to base64 to save it
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onerror = () => {
                reject(new Error('Failed to read processed image blob'));
            };
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                // Remove the data URL prefix if present for saving
                const base64Content = base64data.split(',')[1];

                const originalFileName = imageUri.split('/').pop();
                const newFileName = `processed_${new Date().getTime()}_${originalFileName}`;
                const newPath = `${RNFS.DocumentDirectoryPath}/${newFileName}`;

                try {
                    await RNFS.writeFile(newPath, base64Content, 'base64');
                    console.log('Processed image saved to:', newPath);
                    resolve(`file://${newPath}`);
                } catch (writeError) {
                    reject(writeError);
                }
            };
            reader.readAsDataURL(blob);
        });

    } catch (error) {
        console.error('removeBackgroundApi failed:', error);
        throw error;
    }
};
