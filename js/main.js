// some events we are interested in
let eventSet = 1936028772; // "setd"
let eventExch = 1165517672;
// reference to CSInterface object
var cs = new CSInterface();
var gExtensionID = cs.getExtensionID();

var fgcolor = "#000000";
var colors;
var saturationColors;

// global variables that should be read from settings file
// Settings.rawQuantity is how much rows and columns are in the grid layout

let flyoutXML = '\
<Menu> \
	<MenuItem Id="configure" Label="Configure" Enabled="true" Checked="false"/> \
	<MenuItem Label="---" /> \
	<MenuItem Id="hsbFlag" Label="HSB Saturation" Enabled="true" Checked="false"/> \
</Menu>';

var settingsShown = false;

// generic callback
cs.addEventListener("com.adobe.csxs.events.ThemeColorChanged", setAppTheme);
cs.addEventListener("com.adobe.PhotoshopJSONCallback" + gExtensionID, PhotoshopCallbackUnique);
// keydown callback
cs.addEventListener('keydown', keyListener);
// callback for flyout
cs.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", flyoutMenuHandler);

function onLoaded() {
    //　テーマを初期設定
    setAppTheme(null);
    Persistent(true);
    //　テーマが変わった時のイベントに登録
    cs.addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, setAppTheme);

    Register(true, eventSet.toString());
    Register(true, eventExch.toString());
    cs.setPanelFlyoutMenu(flyoutXML);

    // set settings
    loadSettings();
    $('#saturation').val(Settings.saturationMaxStep * 10);
    $('#temperature').val(Settings.tempStepDistance);
    $('#luminance').val(Settings.lumaStepDistance);

    // get fgcolor from tool
    cs.evalScript("getForegroundColor()", function (data) {
        // do rest of initialisation that depends on updated fgcolor
        fgcolor = `#${data}`;
        initColorsVectors();
        initSaturationVectors();
        refresh();
    })
}


// テーマを設定
function setAppTheme(e) {
    // この例ではイベントオブジェクト(e)は不要。
    // テーマ情報をCSInterfaceから取得：
    var hostEnv = window.__adobe_cep__.getHostEnvironment();
    var skinInfo = JSON.parse(hostEnv).appSkinInfo;
    var color = skinInfo.panelBackgroundColor.color;
    //var avg = (color.red + color.blue + color.green) / 3;
    // bg色の平均が128を超えるかどうかによってCSSを適用する：
    //var type = (avg > 128) ? "light" : "dark";
    //document.getElementById("topcoat-style").href = "css/topcoat-desktop-" + type + ".css";
    // パネルの body のbg色をツールに合わせる：
    var rgb = "rgb(" +
        Math.round(color.red) + "," +
        Math.round(color.green) + "," +
        Math.round(color.blue) + ")";
    document.body.style.backgroundColor = rgb;
}

// set PS panel persistence
function Persistent(inOn) {
    var event = new CSEvent();
    if (inOn) {
        event.type = "com.adobe.PhotoshopPersistent";
    } else {
        event.type = "com.adobe.PhotoshopUnPersistent";
    }
    event.scope = "APPLICATION";
    event.extensionId = gExtensionID;
    cs.dispatchEvent(event);
}

// set listening events
function Register(inOn, inEvents) {
    var event = new CSEvent();
    if (inOn) {
        event.type = "com.adobe.PhotoshopRegisterEvent";
    } else {
        event.type = "com.adobe.PhotoshopUnRegisterEvent";
    }
    event.scope = "APPLICATION";
    event.extensionId = gExtensionID;
    event.data = inEvents;
    cs.dispatchEvent(event);
}

function PhotoshopCallbackUnique(csEvent) {
    debug = csEvent;
    if (typeof csEvent.data === "string") {
        // color changed
        // check if color differs from our calculated centre color
        var eventData = csEvent.data.replace("ver1,{", "{");
        var eventDataParse = JSON.parse(eventData);
        //var jsonStringBack = JSON.stringify(eventDataParse);
        //JSLogIt(jsonStringBack);

        // no type coercion on switch statement
        var col = eventDataParse.eventData.to;
        var convert = require('color-convert');
        var newfg;
        if (col) {
            switch (col._obj) {
                case "HSBColorClass":
                    var rgb = convert.hsl.rgb(col.hue._value, col.saturation, col.brightness);
                    newfg = convert.rgb.hex(rgb);
                    break;
                case "RGBColor":
                    newfg = convert.rgb.hex(col.red, col.grain, col.blue);
                    break;
                case "CMYKColorClass":
                    var rgb = convert.cmyk.rgb(col.cyan, col.magenta, col.yellowColor, col.black);
                    newfg = convert.rgb.hex(rgb);
                    break;
                case "labColor":
                    var xyz = convert.lab.xyz.raw(col.luminance, col.a, col.b);
                    var rgb = convert.xyz.rgb(xyz);
                    newfg = convert.rgb.hex(rgb);
                    break;
                //default:
                //JSLogIt("PhotoshopCallbackUnique received unexpected value for color obj" + col._obj);
            }
            newfg = '#' + newfg;
            if (newfg !== fgcolor) {
                fgcolor = newfg;
                refresh();
            }
        } else {
            // exchange fg so get new one
            cs.evalScript("getForegroundColor()", function (data) {
                fgcolor = `#${data}`;
                refresh();
            })
        }
    }
}

// log errors
/*
function JSLogIt(inMessage) {
    cs.evalScript("LogIt('" + inMessage + "')");
} */

///////////////////////////////////////////////////////////////////////////////
// Key Listener & Storage
///////////////////////////////////////////////////////////////////////////////

cs.registerKeyEventsInterest(JSON.stringify([
    { "keyCode": 83},
    { "keyCode": 81},
    { "keyCode": 81, "shiftKey": true},
    { "keyCode": 69},
    { "keyCode": 69, "shiftKey": true},
]));

window.addEventListener('keydown', keyListener);

// listen to key inputs when in focus
function keyListener(e) {
    switch (e.key.toLowerCase()) {
        case "s":
            Settings.showSaturation =  !Settings.showSaturation;
            toggleSaturation();
            break;
        case "q":
            // either reduce temp plates or saturation plates
            if (e.shiftKey) {
                // reduce saturation panels
                if (Settings.oneSideSaturationQuantity > 2) {
                    Settings.oneSideSaturationQuantity--;
                    Settings.rawSaturationQuantity = (Settings.oneSideSaturationQuantity * 2) + 1;
                    document.documentElement.style.setProperty('--sat-rows', `${Settings.rawSaturationQuantity}`);
                    $('#saturation-grid').find(".grid-item:gt(" + (Settings.rawSaturationQuantity - 1) +")").hide();
                    refreshSaturation();
                }
            } else {
                // reduce temperature panels
                if (Settings.oneSideQuantity > 2) {
                    Settings.oneSideQuantity--;
                    Settings.rawQuantity = (Settings.oneSideQuantity * 2) + 1;
                    document.documentElement.style.setProperty('--temp-columns', `${Settings.rawQuantity}`);
                    $('#temperature-grid').find(".grid-item:gt(" + ( Math.pow(Settings.rawQuantity, 2) - 1) +")").hide();
                    refreshColors();
                }
            }
            break;
        case "e":
            if (e.shiftKey) {
                // increase saturation panels
                if (Settings.rawSaturationQuantity < Settings.maxSaturationQuantity) {
                    Settings.oneSideSaturationQuantity++;
                    Settings.rawSaturationQuantity = (Settings.oneSideSaturationQuantity * 2) + 1;
                    document.documentElement.style.setProperty('--sat-rows', `${Settings.rawSaturationQuantity}`);
                    $('#saturation-grid').find(".grid-item:lt(" + Settings.rawSaturationQuantity +")").show();
                    refreshSaturation();
                }
            } else {
                // increase temperature panels
                if (Settings.rawQuantity < Settings.maxTemperatureQuantity) {
                    Settings.oneSideQuantity++;
                    Settings.rawQuantity = (Settings.oneSideQuantity * 2) + 1;
                    document.documentElement.style.setProperty('--temp-columns', `${Settings.rawQuantity}`);
                    $('#temperature-grid').find(".grid-item:lt(" + Math.pow(Settings.rawQuantity, 2) +")").show();
                    refreshColors();
                }
            }
            break;
    }
    //saveSettings();
}

var Settings = {
    maxSaturationQuantity: 15,
    maxTemperatureQuantity: 11
};

// load settings on startup, if saturation is hidden, convert the html
function loadSettings() {
    Settings.showSaturation = (window.localStorage.showSaturation === undefined ?
        true: window.localStorage.showSaturation == 'true');
    Settings.tempStepDistance = Number(window.localStorage.tempStepDistance || 12);
    Settings.lumaStepDistance = window.localStorage.lumaStepDistance || 12;
    Settings.saturationMaxStep = window.localStorage.saturationMaxStep || 1;
    Settings.saturationHSB = (window.localStorage.saturationHSB == 'true');

    Settings.oneSideQuantity = window.localStorage.oneSideQuantity || 3;
    Settings.oneSideSaturationQuantity = window.localStorage.oneSideSaturationQuantity || 3;

    Settings.rawQuantity = (Settings.oneSideQuantity * 2) + 1;
    Settings.rawSaturationQuantity = (Settings.oneSideSaturationQuantity * 2) + 1;

    if (!Settings.showSaturation) {
        toggleSaturation();
    }
    document.documentElement.style.setProperty('--temp-columns', `${Settings.rawQuantity}`);
    document.documentElement.style.setProperty('--sat-rows', `${Settings.rawSaturationQuantity}`);
    cs.updatePanelMenuItem("HSB Saturation", true, Settings.saturationHSB);

    if (window.localStorage.width && window.localStorage.height) {
        window.__adobe_cep__.resizeContent(window.localStorage.width, window.localStorage.height);
    }
}

function saveSettings() {
    window.localStorage.showSaturation = Settings.showSaturation;
    window.localStorage.tempStepDistance = Settings.tempStepDistance;
    window.localStorage.lumaStepDistance = Settings.lumaStepDistance;
    window.localStorage.saturationMaxStep = Settings.saturationMaxStep;
    window.localStorage.saturationHSB = Settings.saturationHSB;

    window.localStorage.oneSideQuantity = Settings.oneSideQuantity;
    window.localStorage.oneSideSaturationQuantity = Settings.oneSideSaturationQuantity;


    window.localStorage.width = window.innerWidth;
    window.localStorage.height = window.innerHeight;
}



///////////////////////////////////////////////////////////////////////////////
// Grid panel functions
///////////////////////////////////////////////////////////////////////////////

// recalculates color panels and saturation
function refresh() {
    refreshColors();
    if (Settings.showSaturation) {
        refreshSaturation();
    }
}

function toggleSaturation() {
    if (Settings.showSaturation) {
        // hide saturation grid and fix grid
        // also fix height
        $('#saturation-grid').show()
        $('#grid-container').removeClass("grid-container-solo").addClass("grid-container-dual");
        document.documentElement.style.setProperty('--temp-content-width', '85.75vw');
        window.__adobe_cep__.resizeContent(window.innerWidth, Math.round(window.innerWidth * 0.9));
        refreshSaturation();
    } else {
        $('#saturation-grid').hide();
        $('#grid-container').removeClass("grid-container-dual").addClass("grid-container-solo");
        document.documentElement.style.setProperty('--temp-content-width', '100vw');
        window.__adobe_cep__.resizeContent(window.innerWidth, window.innerWidth + 20);
    }
}

// populates color vector
function initColorsVectors() {
    colors = new Array(Settings.maxTemperatureQuantity);
    for (var i = 0; i < Settings.maxTemperatureQuantity; i++) {
        colors[i] = new Array(Settings.maxTemperatureQuantity);
        for (var j = 0; j < Settings.maxTemperatureQuantity; j++) {
            colors[i][j] = fgcolor;
        }
    }
    // hide the unneeded grid items
    $('#temperature-grid').find(".grid-item:gt(" + ( Math.pow(Settings.rawQuantity, 2) - 1) +")").hide();
}

function initSaturationVectors() {
    saturationColors = new Array(Settings.maxSaturationQuantity);
    for (var i = 0; i < Settings.maxSaturationQuantity; i++) {
        saturationColors[i] = fgcolor;
    }
    // hide the unneeded grid items
    $('#saturation-grid').find(".grid-item:gt(" + (Settings.rawSaturationQuantity - 1) +")").hide();
}

// replaces bg color of squares with the colors contained in the color array
function colorSquares() {
    var childNum;
    for (var i = 0; i < Settings.rawQuantity; i++) {
        for (var j = 0; j < Settings.rawQuantity; j++) {
            childNum = (Settings.rawQuantity * i) + j + 1;
            $(`#temperature-grid > div:nth-child(${childNum})`).css("background-color", colors[i][j]);
        }
    }
}

function colorSaturation() {
    for (var i = 0; i < Settings.rawSaturationQuantity; i++) {
        $(`#saturation-grid > div:nth-child(${i + 1})`).css("background-color", saturationColors[i]);
    }
}

// calculates new colors and places them into the array
function refreshColors() {
    var currentTemp = - (Settings.tempStepDistance * Settings.oneSideQuantity);
    var currentLightness = (Settings.lumaStepDistance * Settings.oneSideQuantity);
    var convert = require('color-convert')
    var foregroundColor = convert.hex.rgb(fgcolor);
    for (var i = 0; i < Settings.rawQuantity; i++) {
        for (var j = 0; j < Settings.rawQuantity; j++) {
            colors[j][i] = '#' + convert.rgb.hex(
                getWarmerColorBrightnessFix(
                    addToAllChannels(foregroundColor, currentLightness),
                    currentTemp)
                );
            currentLightness -= Settings.lumaStepDistance;
        }
        currentTemp += Settings.tempStepDistance;
        currentLightness = (Settings.lumaStepDistance * Settings.oneSideQuantity);
    }

    colorSquares();
}

function refreshSaturation() {
    var currentSaturationStep = Settings.saturationMaxStep;
    var saturationDecreaseStep = (Settings.saturationMaxStep / Settings.oneSideSaturationQuantity);
    var convert = require('color-convert')
    var foregroundColor = convert.hex.rgb(fgcolor);

    for (var i = 0; i < Settings.rawSaturationQuantity; i++) {
        if (Settings.saturationHSB) {
            saturationColors[i] = '#' + convert.rgb.hex(
                saturationMoveHSB(foregroundColor, currentSaturationStep)
                );
        } else {
            saturationColors[i] = '#' + convert.rgb.hex(
                saturationMove(foregroundColor, currentSaturationStep)
            );
        }
        currentSaturationStep -= saturationDecreaseStep;
    }
    colorSaturation();
}

// set click event for grid-items
$(document.body).on('click', '.grid-item', setColorFromCSS);


function setColorFromCSS(e) {
    // set color and refresh
    // kind of hacky, extract rgb directly from css
    var colorString = e.target.style.backgroundColor;
    var convert = require('color-convert');
    if (colorString) {
        var rgb = colorString.match(/\d+/g);
        fgcolor = convert.rgb.hex(rgb);
        cs.evalScript(`setForegroundColorRGB(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`, refresh)
    }
}

///////////////////////////////////////////////////////////////////////////////
// Setting panel functions
///////////////////////////////////////////////////////////////////////////////

function openSettings() {
    document.getElementById("optionsOverlay").style.height = "100%";
}

function closeSettings() {
    document.getElementById("optionsOverlay").style.height = "0%";
}


function flyoutMenuHandler(flyoutEvent) {
    switch (flyoutEvent.data.menuId) {
        case "configure":
            settingsShown = !settingsShown;
            cs.updatePanelMenuItem("Configure", true, settingsShown);
            if (settingsShown) {
                openSettings();
            } else {
                closeSettings();
            }
            break;
        case "hsbFlag":
            Settings.saturationHSB = !Settings.saturationHSB;
            cs.updatePanelMenuItem("HSB Saturation", true, Settings.saturationHSB);
            //saveSettings();
            refreshSaturation();
            break;
    }
}

function changeTemperature(inc) {
    if (inc) {
        document.getElementById("temperature").stepUp();
    } else {
        document.getElementById("temperature").stepDown();
    }
    var temp = $("#temperature").val();
    if (Settings.tempStepDistance != temp) {
        Settings.tempStepDistance = Number(temp);
        refreshColors();
    }
}

function checkTemperature(e) {
    if ($(this).val() > 20
        && e.keyCode !== 46 // keycode for delete
        && e.keyCode !== 8 // keycode for backspace
    ) {
        e.preventDefault();
        $(this).val(20);
    }
    var temp = $(this).val();
    if (Settings.tempStepDistance != temp) {
        Settings.tempStepDistance = Number(temp);
        refreshColors();
    }
}

function changeLuminance(inc) {
    if (inc) {
        document.getElementById("luminance").stepUp();
    } else {
        document.getElementById("luminance").stepDown();
    }
    var temp = $("#luminance").val();
    if (Settings.lumapStepDistance != temp) {
        Settings.lumaStepDistance = Number(temp);
        refreshColors();
    }
}

function checkLuminance(e) {
    if ($(this).val() > 20
        && e.keyCode !== 46 // keycode for delete
        && e.keyCode !== 8 // keycode for backspace
    ) {
        e.preventDefault();
        $(this).val(20);
    }
    var temp = $(this).val();
    if (Settings.lumaStepDistance != temp) {
        Settings.lumaStepDistance = Number(temp);
        refreshColors();
    }
}

function changeSaturation(inc) {
    if (inc) {
        document.getElementById("saturation").stepUp();
    } else {
        document.getElementById("saturation").stepDown();
    }
    var temp = $("#saturation").val() / 10;
    if (Settings.saturationMaxStep != temp) {
        Settings.saturationMaxStep = Number(temp);
        refreshSaturation();
    }
}

function checkSaturation(e) {
    if ($(this).val() > 10
        && e.keyCode !== 46 // keycode for delete
        && e.keyCode !== 8 // keycode for backspace
    ) {
        e.preventDefault();
        $(this).val(10);
    }
    var temp = $(this).val() / 10;
    if (Settings.saturationMaxStep != temp) {
        Settings.saturationMaxStep = Number(temp);
        refreshSaturation();
    }
}


//todo: dynamically added div squares must propogate higher
$(document.body).on('paste keydown keyup', '#temperature', checkTemperature);
$(document.body).on('paste keydown keyup', '#luminance', checkLuminance);
$(document.body).on('paste keydown keyup', '#saturation', checkSaturation);

