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
  * 编写基于百度地图的 SVGIconOverlayPolygon 多边形 插件
  *
  * @Author     : Sphenginx
  * @DateTime   : 2019-04-16 16:50:57
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

function SVGIconOverlayPolygon(point, txt, num, ha, opts) {
    this._point = point;
    this._text = txt;
    this._num = num;
    this._ha = ha;
    this.init(opts);
} 

SVGIconOverlayPolygon.prototype = new BMap.Overlay();

SVGIconOverlayPolygon.prototype.initialize = function(map) {
    this._map = map;
    let div = document.createElement("div");
    div.innerHTML = this._createSVG();
    this._map.getPanes().labelPane.appendChild(div);
    this._div = div;
    this._cwidth = this._div.clientWidth;
    this._cheight = this._div.clientHeight;
    return this._div;
}

SVGIconOverlayPolygon.prototype.draw = function() {
    this._map && this._updatePosition();
}

SVGIconOverlayPolygon.prototype.getMap = function() {
    return this._map;
};

SVGIconOverlayPolygon.prototype.getHa = function () {
    return this._ha;
}

SVGIconOverlayPolygon.prototype.getPosition = function() {
    return this._point;
};

SVGIconOverlayPolygon.prototype.setPosition = function (position) {
    if(position && (!this._point || !this._point.equals(position))){
        this._point = position;  
        this._updatePosition();
    }
};

SVGIconOverlayPolygon.prototype._updatePosition = function() {
    if (this._div && this._point) {
        let pixel = this._map.pointToOverlayPixel(this._point);
        this._div.style.position = "absolute";
        this._div.style.left = pixel.x - Math.ceil(parseInt(this._cwidth) / 2) + "px";
        this._div.style.top  = pixel.y - Math.ceil(parseInt(this._cheight)/ 2) + "px";
    }
};

SVGIconOverlayPolygon.prototype.getText = function(){
    return this._text;  
};

SVGIconOverlayPolygon.prototype.setText = function(text) {
    if(text && (!this._text || (this._text.toString() != text.toString()))){
        this._text = text;
        this._updateText();
        this._updatePosition(); 
    }
};

SVGIconOverlayPolygon.prototype.getNum = function(){
    return this._num;  
};

SVGIconOverlayPolygon.prototype.setNum = function(num) {
    if(num && (!this._num || (this._num!= num))){
        this._num = num;
    }
};

extend(SVGIconOverlayPolygon.prototype, 
{
    init: function (opts) {
        var options = {
            "polygonText": this._text,
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
    _createPolygon: function() {
        var cx = Number(this.options.circleAnchor.x)
        var cy = Number(this.options.circleAnchor.y)
        var fill = this.options.circleFillColor
        var fillOpacity = this.options.circleFillOpacity
        var radius = this.options.radius;
        var stroke = this.options.circleColor
        var strokeOpacity = this.options.circleOpacity
        var strokeWidth = this.options.circleWeight
        var className = this.options.className + "-polygon"
        var polygon_id = 'polygon_'+this.options.idName;
        var width = this.options.iconSize.x-4;
        var rect = '<rect id="'+ polygon_id +'" class="' + className + '" x="0" y="0" rx="20" ry="20" width="'+width+'" height="40" ' +
            '" fill="' + fill + '" fill-opacity="'+ fillOpacity +
            '" stroke="' + stroke + '" stroke-opacity=' + strokeOpacity + '" stroke-width="' + strokeWidth + '"';
        rect += ">";
        rect += "</rect>";

        var text = this._createText();
        var g_id = "g_"+this.options.idName;
        var triangle = this._createTriangle();
        var g = '<g id="'+g_id+'" class="ha_g">' + rect + text + triangle + '</g>';
        return g
    },
    _createSVG: function() {
        var polgyon = this._createPolygon();
        var className = this.options.className + "-svg";
        var style = "width:" + this.options.iconSize.x+ "px" + "; height:" + this.options.iconSize.y+ "px" + ";"
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" class="' + className + '" style="' + style + '">' + polgyon + '</svg>'
        return svg;
    },
    _createText: function() {
        var fontSize = this.options.fontSize + "px"
        var lineHeight = Number(this.options.fontSize)
        var x = Number(this.options.iconSize.x) / 2
        var y = this.options.rectSize.y - this.options.circleWeight - lineHeight;
        var polygonText = this.options.polygonText;
        var textColor = this.options.fontColor.replace("rgb(", "rgba(").replace(")", "," + this.options.fontOpacity + ")")
        var _text = '<text text-anchor="middle" x="'+ x +'" y="'+y+'" style="font-size: '+fontSize+'" fill="'+textColor+'" pointer-events="none">'+polygonText+'</text>';
        return _text;
    },
    _createTriangle: function() {
        var x_1 = this.options.iconSize.x / 2 - 10;
        var y_1 = this.options.rectSize.y - this.options.circleWeight;
        var x_2 = this.options.iconSize.x / 2 + 10;
        var y_2 = this.options.rectSize.y - this.options.circleWeight;
        var x_3 = this.options.iconSize.x / 2;
        var y_3 = this.options.rectSize.y + 10 - this.options.circleWeight;

        var fill = this.options.circleFillColor;
        var points = x_1 +','+ y_1 +' '+ x_2 +','+ y_2 +' '+ x_3 +','+ y_3;
        var html = '<polygon points="'+points+'" fill="'+fill+'" />';
        return html;
    },
    _updateText: function() {
        this.options.polygonText = this._text;
        if (this._div) {
            this._div.innerHTML = this._createSVG();
        }
    }
}, true);

export default SVGIconOverlayPolygon;