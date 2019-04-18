/***
 *                 .-~~~~~~~~~-._       _.-~~~~~~~~~-.
 *             __.'              ~.   .~              `.__
 *           .'//                  \./                  \`.
 *         .'//                     |                     \`.
 *       .'// .-~"""""""~~~~-._     |     _,-~~~~"""""""~-. \`.
 *     .'//.-"                 `-.  |  .-'                 "-.\`.
 *   .'//______.============-..   \ | /   ..-============.______\`.
 * .'______________________________\|/______________________________`.
 *
 * reference from leaflet svgicon
 * 
 */
/**
  * 编写基于百度地图的 SVGIconOverlay 圆形 插件
  *
  * @Author     : Sphenginx
  * @DateTime   : 2019-04-15 16:50:57
  * @Version    : 1.0
  *
  */
"use strict";

//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}


function SVGIconOverlay(point, txt, opts) {
    this._point = point;
    this._text = txt;
    this.init(opts);
} 

SVGIconOverlay.prototype = new BMap.Overlay();

SVGIconOverlay.prototype.initialize = function(map) {
    this._map = map;
    let div = document.createElement("div");
    div.innerHTML = this._createSVG();
    this._map.getPanes().labelPane.appendChild(div);
    this._div = div;
    this._cwidth = this._div.clientWidth;
    this._cheight = this._div.clientHeight;
    return this._div;
}

SVGIconOverlay.prototype.draw = function(){
    this._map && this._updatePosition();
}

SVGIconOverlay.prototype.getMap = function(){
    return this._map;
};
SVGIconOverlay.prototype.getPosition = function(){
    return this._point;
};

SVGIconOverlay.prototype.setPosition = function (position) {
    if(position && (!this._point || !this._point.equals(position))){
        this._point = position;  
        this._updatePosition();
    }
};

SVGIconOverlay.prototype._updatePosition = function() {
    if (this._div && this._point) {
        let pixel = this._map.pointToOverlayPixel(this._point);
        this._div.style.position = "absolute";
        this._div.style.left = pixel.x - Math.ceil(parseInt(this._cwidth) / 2) + "px";
        this._div.style.top  = pixel.y - Math.ceil(parseInt(this._cheight)/ 2) + "px";
    }
};

SVGIconOverlay.prototype.getText = function(){
    return this._text;  
};

SVGIconOverlay.prototype.setText = function(text) {
    if(text && (!this._text || (this._text.toString() != text.toString()))){
        this._text = text;
        this._updateText();
        this._updatePosition(); 
    }
};

extend(SVGIconOverlay.prototype, 
{
    init: function (opts) {
        var options = {
            "circleText": this._text,
            "className": "svg-icon",
            "circleAnchor": null, //defaults to [iconSize.x/2, iconSize.x/2]
            "circleColor": null, //defaults to color
            "circleOpacity": null, // defaults to opacity
            "circleFillColor": "rgb(255,255,255)",
            "circleFillOpacity": null, //default to opacity 
            "circleRatio": 0.5,
            "circleWeight": null, //defaults to weight
            "color": "rgb(0,102,255)",
            "fillColor": null, // defaults to color
            "fillOpacity": 0.4,
            "fontColor": "rgb(0, 0, 0)",
            "fontOpacity": "1",
            "fontSize": null, // defaults to iconSize.x/4
            "iconAnchor": null, //defaults to [iconSize.x/2, iconSize.y] (point tip)
            "iconSize": new BMap.Pixel(32, 48),
            "opacity": 1,
            "popupAnchor": null,
            "weight": 2,
            "showShadow": true
        }

        options = extend(options, opts, true);

        //in addition to setting option dependant defaults, Point-based options are converted to Point objects
        if (!options.circleAnchor) {
            options.circleAnchor = new BMap.Pixel(Number(options.iconSize.x)/2, Number(options.iconSize.x)/2)
        }
        if (!options.circleColor) {
            options.circleColor = options.color
        }
        if (!options.circleFillOpacity) {
            options.circleFillOpacity = options.opacity
        }
        if (!options.circleOpacity) {
            options.circleOpacity = options.opacity
        }
        if (!options.circleWeight) {
            options.circleWeight = options.weight
        }
        if (!options.fillColor) {
            options.fillColor = options.color
        }
        if (!options.fontSize) {
            options.fontSize = Number(options.iconSize.x/4) 
        }
        if (!options.iconAnchor) {
            options.iconAnchor = new BMap.Size(Number(options.iconSize.x)/2, Number(options.iconSize.y))
        }
        if (!options.popupAnchor) {
            options.popupAnchor = new BMap.Size(0, (-0.75)*(options.iconSize.y))
        }

        if (!options.radius) {
            options.radius = options.iconSize.x/2 * Number(options.circleRatio)
        }

        this.options = options;
    },
    _createCircle: function() {
        var cx = Number(this.options.circleAnchor.x)
        var cy = Number(this.options.circleAnchor.y)
        var fill = this.options.circleFillColor
        var fillOpacity = this.options.circleFillOpacity
        var radius = this.options.radius;
        var stroke = this.options.circleColor
        var strokeOpacity = this.options.circleOpacity
        var strokeWidth = this.options.circleWeight
        var className = this.options.className + "-circle"
        var circle_id = 'circle_'+this.options.idName;
        var circle = '<circle id="'+circle_id+'" class="' + className + '" cx="' + cx + '" cy="' + cy + '" r="' + radius*0.8 +
            '" fill="' + fill + '" fill-opacity="'+ fillOpacity +
            '" stroke="' + stroke + '" stroke-opacity=' + strokeOpacity + '" stroke-width="' + strokeWidth + '"';
        var radius_from = radius * 0.6;
        var circle_animate = '<animate attributeName="r" from="'+radius_from+'" to="'+radius+'" dur="0.4s" begin="0s" fill="freeze" id="circ-anim" repeatCount="1" keyTimes="0;1" keySplines="0,.56,.35,1.1" />';
        circle += ">";
        circle += circle_animate
        circle += "</circle>";
        //circle += '<circle cx="'+cx+'" cy="'+cy+'" r="40" stroke="black" stroke-width="1" fill="none" />';

        var text = this._createText()
        var g_id = "g_"+this.options.idName;
        var g_animate = 
            '<animate xlink:href="#'+circle_id+'" attributeName="fill" from="'+fill+'" to="'+'#ff6600'+'" dur="0.2s" begin="mouseover" fill="freeze" repeatCount="1" keyTimes="0;1" keySplines="0,.56,.35,1.1"/>'+
            '<animate xlink:href="#'+circle_id+'" attributeName="fill" from="'+'#ff6600'+'" to="'+fill+'" dur="0.2s" begin="mouseout" fill="freeze" repeatCount="1" keyTimes="0;1" keySplines="0,.56,.35,1.1"/>';
        var g = '<g id="'+g_id+'">' + circle + text + g_animate +'</g>';
        return g
    },
    _createSVG: function() {
        var circle = this._createCircle();
        var className = this.options.className + "-svg";
        var style = "width:" + this.options.iconSize.x+ "px" + "; height:" + this.options.iconSize.y+ "px" + ";"
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="' + className + '" style="' + style + '">' + circle + '</svg>'
        return svg;
    },
    _createText: function() {
        var fontSize = this.options.fontSize + "px"
        var lineHeight = Number(this.options.fontSize)
        var x = Number(this.options.iconSize.x) / 2
        var y = x + (lineHeight * 0.35) //35% was found experimentally 
        var circleText = this.options.circleText;
        var textColor = this.options.fontColor.replace("rgb(", "rgba(").replace(")", "," + this.options.fontOpacity + ")")
        var _text = "";
        if (circleText instanceof Array) {
            for(let i in circleText){
                let _val = circleText[i];
                y  += i * 15;
                _text += '<text text-anchor="middle" x="'+ x +'" y="'+ y +'" style="font-size: '+fontSize+'" fill="'+textColor+'" pointer-events="none">'+_val+'</text>';
            }
        } else {
            _text = '<text text-anchor="middle" x="'+ x +'" y="'+y+'" style="font-size: '+fontSize+'" fill="'+textColor+'" pointer-events="none">'+circleText+'</text>';
        }
        return _text;
    },
    _updateText: function() {
        this.options.circleText = this._text;
        if (this._div) {
            this._div.innerHTML = this._createSVG();
        }
    }
}, true);

export default SVGIconOverlay;