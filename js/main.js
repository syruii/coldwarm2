// some events we are interested in
var eventSet = 1936028772; // "setd"

// reference to CSInterface object
var cs = new CSInterface();
var gExtensionID = cs.getExtensionID();

var fgcolor = "#000000";
var colors;

// global variables that should be read from settings file
// fidelity is how much rows and columns are in the grid layout
var fidelity = 7;


// generic callback
cs.addEventListener("com.adobe.PhotoshopJSONCallback" + gExtensionID, PhotoshopCallbackUnique);

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

    // get fgcolor from tool
    cs.evalScript("getForegroundColor()", function (data) {
        // do rest of initialisation that depends on updated fgcolor
        fgcolor = `#${data}`;
        initColorsVectors();
        colorSquares();
    })
}

// set PS panel persistence

function setAppTheme(e) {
    // この例ではイベントオブジェクト(e)は不要。
    // テーマ情報をCSInterfaceから取得：
    var hostEnv = window.__adobe_cep__.getHostEnvironment();
    var skinInfo = JSON.parse(hostEnv).appSkinInfo;
    var color = skinInfo.panelBackgroundColor.color;
    var avg = (color.red + color.blue + color.green) / 3;
    // bg色の平均が128を超えるかどうかによってCSSを適用する：
    var type = (avg > 128) ? "light" : "dark";
    document.getElementById("topcoat-style").href = "css/topcoat-desktop-" + type + ".css";
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
            if (col) {
                switch (col._obj) {
                    case "HSBColorClass":
                        fgcolor = colorsys.hsvToHex(col.hue._value.col.saturation, col.brightness);
                        break;
                    case "RGBColor":
                        fgcolor = colorsys.rgbToHex(col.red, col.grain, col.blue);
                        break;
                    case "CMYKColorClass":
                        var rgb = colorsys.cmyk2rgb(col.cyan, col.magenta, col.yellowColor, col.black);
                        fgcolor = colorsys.rgbToHex(rgb);
                        break;
                    case "labColor":
                }
            }
            $(`.square-grid > div:nth-child(1)`).css("background-color", `#${fgcolor}`);
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
// Color calculation functions
///////////////////////////////////////////////////////////////////////////////

// populates color vector
function initColorsVectors() {
    colors = new Array(fidelity);
    for (var i = 0; i < fidelity; i++) {
        colors[i] = new Array(fidelity);
        for (var j = 0; j < fidelity; j++) {
            colors[i][j] = fgcolor;
        }
    }
}

// replaces bg color of squares with the colors contained in the color array
function colorSquares() {
    var childNum;
    for (var i = 0; i < fidelity; i++) {
        for (var j = 0; j < fidelity; j++) {
            childNum = (fidelity * i) + j + 1;
            $(`.square-grid > div:nth-child(${childNum})`).css("background-color", colors[i][j]);
        }
    }
}

