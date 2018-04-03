// some events we are interested in
var eventSet = 1936028772; // "setd"
// reference to CSInterface object
var cs = new CSInterface();
var gExtensionID = cs.getExtensionID();

var fgcolor = "#000000";
var colors;
var saturationColors;

// global variables that should be read from settings file
// Settings.rawQuantity is how much rows and columns are in the grid layout

var flyoutXML = '\
<Menu> \
	<MenuItem Id="configure" Label="Configure" Enabled="true" Checked="false"/> \
	\
</Menu>';

var settingsShown = false;

// generic callback

cs.addEventListener("com.adobe.csxs.events.ThemeColorChanged", setAppTheme);
cs.addEventListener("com.adobe.PhotoshopJSONCallback" + gExtensionID, PhotoshopCallbackUnique);
// callback for flyout
cs.addEventListener("com.adobe.csxs.events.flyoutMenuClicked", flyoutMenuHandler)

function onLoaded() {
    //　テーマを初期設定
    setAppTheme(null);
    Persistent(true);
    //　テーマが変わった時のイベントに登録
    cs, addEventListener(CSInterface.THEME_COLOR_CHANGED_EVENT, setAppTheme);
    // 'r' 押下されると page reload
    document.onkeypress = function (e) {
        if (e.charCode == 114) {
            window.location.reload();
        }
    }
    Register(true, eventSet.toString());
    cs.setPanelFlyoutMenu(flyoutXML);

    // set settings
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

// set PS panel persistence

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
    try {
        if (typeof csEvent.data === "string") {
            // color changed
            // check if color differs from our calculated centre color
            var eventData = csEvent.data.replace("ver1,{", "{");
            var eventDataParse = JSON.parse(eventData);
            //var jsonStringBack = JSON.stringify(eventDataParse);
            //JSLogIt(jsonStringBack);

            // no type coercion on switch statement
            var col = eventDataParse.eventData.to;
            var convert = cep_node.require('color-convert');
            if (col) {
                switch (col._obj) {
                    case "HSBColorClass":
                        var rgb = convert.hsl.rgb(col.hue._value, col.saturation, col.brightness);
                        fgcolor = convert.rgb.hex(rgb);
                        break;
                    case "RGBColor":
                        fgcolor = convert.rgb.hex(col.red, col.grain, col.blue);
                        break;
                    case "CMYKColorClass":
                        var rgb = convert.cmyk.rgb(col.cyan, col.magenta, col.yellowColor, col.black);
                        fgcolor = convert.rgb.hex(rgb);
                        break;
                    case "labColor":
                        var xyz = convert.lab.xyz.raw(col.luminance, col.a, col.b);
                        var rgb = convert.xyz.rgb(xyz);
                        fgcolor = convert.rgb.hex(rgb);
                        break;
                    //default:
                        //JSLogIt("PhotoshopCallbackUnique received unexpected value for color obj" + col._obj);
                }
                fgcolor = '#' + fgcolor;
                refresh();
            }
        } else {
            JSLogIt("PhotoshopCallbackUnique expecting string for csEvent.data!");
        }
    } catch (e) {
        JSLogIt("PhotoshopCallbackUnique catch:" + e);
    }
}

// log errors
function JSLogIt(inMessage) {
    cs.evalScript("LogIt('" + inMessage + "')");
}

///////////////////////////////////////////////////////////////////////////////
// Grid panel functions
///////////////////////////////////////////////////////////////////////////////
var Settings = {
    showSaturation: true,
    tempStepDistance: 12,
    lumaStepDistance: 12,
    saturationMaxStep: 1,
    saturationRawDistanceMin: 2,
    saturationRawDistanceMax: 8,
    saturationHSB: false,
    oneSideQuantity: 3,
    rawQuantity: 7
}


// recalculates color panels and saturation
function refresh() {
    refreshColors();
    if (Settings.showSaturation) {
        refreshSaturation();
    }
}

// populates color vector
function initColorsVectors() {
    colors = new Array(Settings.rawQuantity);
    for (var i = 0; i < Settings.rawQuantity; i++) {
        colors[i] = new Array(Settings.rawQuantity);
        for (var j = 0; j < Settings.rawQuantity; j++) {
            colors[i][j] = fgcolor;
        }
    }
}

function initSaturationVectors() {
    saturationColors = new Array(Settings.rawQuantity);
    for (var i = 0; i < Settings.rawQuantity; i++) {
        saturationColors[i] = fgcolor;
    }
}

// replaces bg color of squares with the colors contained in the color array
function colorSquares() {
    var childNum;
    for (var i = 0; i < Settings.rawQuantity; i++) {
        for (var j = 0; j < Settings.rawQuantity; j++) {
            childNum = (Settings.rawQuantity * i) + j + 1;
            $(`.temperature-grid > div:nth-child(${childNum})`).css("background-color", colors[i][j]);
        }
    }
}

function colorSaturation() {
    for (var i = 0; i < Settings.rawQuantity; i++) {
        $(`.saturation-grid > div:nth-child(${i + 1})`).css("background-color", saturationColors[i]);
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
    var saturationDecreaseStep = (Settings.saturationMaxStep / Settings.oneSideQuantity);
    var convert = require('color-convert')
    var foregroundColor = convert.hex.rgb(fgcolor);

    for (var i = 0; i < Settings.rawQuantity; i++) {
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

// set click event for nth child in square grid
$('.temperature-grid').on('click', '> *', setColorFromCSS);

// set click event for nth children in saturation grid
$('.saturation-grid').on('click', '> *', setColorFromCSS);

function setColorFromCSS(e) {
    // set color and refresh
    // kind of hacky, extract rgb directly from css
    var colorString = e.target.style.backgroundColor;
    if (colorString) {
        var rgb = colorString.match(/\d+/g);
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

