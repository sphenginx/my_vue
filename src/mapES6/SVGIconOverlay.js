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
 * 
 */
/**
  * 编写基于百度地图覆盖物的 SVGIconOverlay 圆形覆盖物、 
  *                        SVGIconOverlayPolygon 多边形覆盖物
  *
  * @Author     : Sphenginx
  * @DateTime   : 2019-04-15 16:50:57
  * @Version    : 2.0
  *
  */
 
//引入自定义覆盖物的css
import "./ComplexCustomOverlay.css";

//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}


// 圆形覆盖物
class SVGIconOverlay extends BMap.Overlay {
    // 构造方法
    constructor (point, txt, opts) {
        super();
        this._point = point;
        this._text = txt;
        this._divClassName = 'map-circlebox';
        let def = {
            'background': '#ff4848',
            'width': '62px',
            'height': '62px',
        }
        this._styles = extend(def, opts, true);
    } 

    initialize(map) {
        this._map = map;
        let div = document.createElement("div");
        div.className  = this._divClassName;
        let span = document.createElement("span");
        span.innerHTML = this._text;
        div.appendChild(span);
        this._map.getPanes().labelPane.appendChild(div);
        this._div = div;
        this._cwidth = this._div.clientWidth ? this._div.clientWidth : parseInt(this._styles['width']);
        this._cheight = this._div.clientHeight ? this._div.clientHeight : parseInt(this._styles['height']);
        return this._div;
    }

    draw() {
        this._map && this._updatePosition();
    }

    setText(text) {
        if(text && (!this._text || (this._text.toString() != text.toString()))){
            this._text = text;
            this._updateText();
            this._updatePosition(); 
        }
    }

    _updateText () {
        if (this._div) {
            let spanDom = this._div.getElementsByTagName('span')[0];
            spanDom.innerHTML = this._text;
            this._cwidth = this._div.clientWidth;
            this._cheight = this._div.clientHeight;
        }
    }

    setPosition (position) {
        if(position && (!this._point || !this._point.equals(position))){
            this._point = position;
            this._updatePosition();
        }
    }

    _updatePosition() {
        if (this._div && this._point) {
            let pixel = this._map.pointToOverlayPixel(this._point);
            this._div.style.position = "absolute";
            this._div.style.left = pixel.x - this._cwidth / 2 + "px";
            this._div.style.top  = pixel.y - this._cheight/ 2 + "px";
            if (this._styles) {
                for (let _key in this._styles) {
                    this._div.style[_key] = this._styles[_key];
                }
            }
        }
    }

    getText(){
        return this._text;
    }

    getMap(){
        return this._map;
    }

    getPosition(){
        return this._point;
    }
}


// 多边形覆盖物， 继承自圆形覆盖物
class SVGIconOverlayPolygon extends SVGIconOverlay {

    constructor (point, txt, num, ha) {
        super();
        this._point = point;
        this._text = txt;
        this._num = num;
        this._ha = ha;
        this._divClassName = 'map-polygonbox';
        this._background = null;
        this._zIndex = 'unset';
    }

    initialize (map) {
        this._map = map;
        let div = document.createElement("div");
        div.className  = this._divClassName;
        let span = document.createElement("span");
        let i = document.createElement("i");
        span.appendChild(document.createTextNode(this._text));
        span.appendChild(i);
        div.appendChild(span);
        this._map.getPanes().labelPane.appendChild(div);
        this._div = div;
        this._cwidth = this._div.clientWidth;
        this._cheight = this._div.clientHeight;
        return this._div;
    }

    // 设置背景颜色
    setBackGround (color = null, z = 1) {
        this._background = color;
        this._zIndex = z;
        this._updatePosition();
    }

    // 这里和circle不一样，需要重写
    _updatePosition () {
        if (this._div && this._point) {
            let pixel = this._map.pointToOverlayPixel(this._point);
            let iObj = this._div.getElementsByTagName('i')[0];
            this._div.style.position = "absolute";
            this._div.style.left = pixel.x - this._cwidth / 2 + "px";
            // top 需要减去 marker的高度 和 i（小箭头） 的高度
            this._div.style.top  = pixel.y - this._cheight - iObj.offsetHeight + "px";
            // 设置 z-index
            this._div.style['z-index'] = this._zIndex;
            if (this._background) {
                this._div.style['background'] = this._background;
                iObj.style['border-color'] = `${this._background} transparent transparent transparent`;
            }
        }
    }

    // 设置数字
    setNum  (num) {
        if(num && (!this._num || (this._num!= num))){
            this._num = num;
        }
    }

    getNum () {
        return this._num;
    }

    getHa  () {
        return this._ha;
    }
}

export {SVGIconOverlay, SVGIconOverlayPolygon}