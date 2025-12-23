export const colorWheel = {
    'navy': ['brown', 'white', 'beige', 'grey'],
    'black': ['white', 'grey', 'red', 'blue'],
    'white': ['black', 'navy', 'blue', 'brown', 'green'],
    'brown': ['navy', 'beige', 'white', 'green'],
    'blue': ['white', 'black', 'grey', 'beige'],
    'red': ['black', 'white', 'navy', 'grey'],
    'green': ['brown', 'white', 'black'],
    'yellow': ['black', 'grey', 'navy'],
    'beige': ['navy', 'brown', 'black', 'green'],
    'grey': ['black', 'white', 'navy', 'blue', 'red'],
};

export const getMatchingColors = (colorName: string): string[] => {
    const key = colorName.toLowerCase();
    return colorWheel[key as keyof typeof colorWheel] || ['white', 'black'];
};

export const isColorMatch = (color1: string, color2: string): boolean => {
    const matches = getMatchingColors(color1);
    return matches.includes(color2.toLowerCase());
};
