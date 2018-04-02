///////////////////////////////////////////////////////////////////////////////
// Definitions of all the color calculation functions
// Translated from Actionscript from original source
// !!!!
// Colors should be given to all these functions as rgb arrays [r, g, b]
// 0 <= r, g, b <= 255
// return value is always an rgb array for colors
///////////////////////////////////////////////////////////////////////////////

// adds value to all color channels of input color
// returns an rgb array
function addToAllChannels(rgb, value) {
    var r = rgb[0] + value;
    var g = rgb[1] + value;
    var b = rgb[2] + value;

    if (r > 255) { r = 255; }
    if (g > 255) { g = 255; }
    if (b > 255) { b = 255; }
    if (r < 0) { r = 0; }
    if (g < 0) { g = 0; }
    if (b < 0) { b = 0; }

    return [r, g, b];
}

function getWarmerColorBrightnessFix(rgb, distance) {
    var startBrightness = getLumaGray(rgb);

    var r = rgb[0];
    var g = rgb[1];
    var b = rgb[2];

    r += distance;
    b -= distance;
    if (r > 255) { r = 255; }
    if (b > 255) { b = 255; }
    if (r < 0) { r = 0; }
    if (b < 0) { b = 0; }

    var endBrightness = getLumaGray([r, g, b]);
    return addToAllChannels([r, g, b], (startBrightness - endBrightness) * 2);
}

// calculate luminance the hard way
function getLumaGray(rgb) {
    // magic numbers are sRGB luminance values
    return gam_sRGB(
        0.2126555 * inv_gam_sRGB(rgb[0]) +
        0.715158 * inv_gam_sRGB(rgb[1]) +
        0.072187 * inv_gam_sRGB(rgb[2])
    );
}

// takes in a number
function inv_gam_sRGB(ic) {
    var c = ic/255;
    //todo: could break if comparing big number
    if (c <= 0.04045) {
        return c/12.92;
    } else {
        return Math.pow(((c+0.044)/(1.055)), 2.4);
    }
}

// takes in a big number
// returns a 0 <= number <= 255
function gam_sRGB(v) {
    if (v <= 0.0031308) {
        v *= 12.92;
    } else {
        v = 1.055 * Math.pow(v, 1.0/2.4) - 0.055;
    }
    return Math.round(v*255);
}

function compareTwoColors24(colorOne, colorTwo) {
    //todo
    // var red = getRed24(colorOne) - getRed24(colorB);
}
