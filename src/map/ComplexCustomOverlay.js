// 引入复杂覆盖物监听插件
import EventWrapper from './EventWrapper.js';

//引入自定义覆盖物的css
import "./ComplexCustomOverlay.css";

// require node package util
let util = require('util');

//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}

//自定义复杂覆盖物，继承自百度 overlay
class ComplexCustomOverlay extends BMap.Overlay {
    constructor (opts) {
        super();
        let def = {
            _point: '',
            _text: '',
            _initalizeCallBack: function () {
                let div = document.createElement("div");
                div.className  = 'map-ha-popbox';
                let span = document.createElement("span");
                span.className = 'name';
                let i = document.createElement("i");
                span.appendChild(document.createTextNode(this.getText()));
                span.appendChild(i);
                div.appendChild(span);
                return div;
            },
            _eventCallBack: function () {
                //元素的回调方法（渲染到地图上时才可调用）：点击、等 用 EventWrapper
                //可以用 this 获取 该复杂覆盖物本身，call的时候上下文的作用域变成了复杂覆盖物自己
                //这里把 this 赋给 me
                let me = this;
                EventWrapper.addDomListener(this._dom, "touchend", function() {
                    //这里 me 是 复杂覆盖物本身
                    console.log(me);
                    //注意： 这里this 指的是 dom 元素，不是复杂覆盖物自身
                    console.log(this);
                });
            }
        };
        this._setting = extend(def, opts, true);
    }
    //重写 initialize 方法
    initialize (map) {
        this._map = map;
        this._dom = '';
        if (util.isFunction(this._setting['_initalizeCallBack'])) {
            this._dom = this._setting['_initalizeCallBack'].call(this);
            this._map.getPanes().labelPane.appendChild(this._dom);
        }
        this._cwidth = this._dom.clientWidth;
        this._cheight = this._dom.clientHeight;
        if (util.isFunction(this._setting['_eventCallBack'])) {
            this._setting['_eventCallBack'].call(this);
        }
        //这里必须有返回值，map.clearOverlays 会操作 dom 元素
        return this._dom;
    }
    //重写 draw 方法
    draw () {
        this._map && this._updatePosition();
    }

    getMap  () {
        return this._map;
    }

    _updatePosition  () {
        if (this._dom && this.getOption('_point')) {
            let pixel = this._map.pointToOverlayPixel(this.getOption('_point'));
            this._dom.style.left = pixel.x - this._cwidth/2 + "px";
            this._dom.style.top  = pixel.y - this._cheight/2 + "px";
        }
    }
    getPosition  () {
        return this.getOption('_point');
    }
    getText () {
        return this.getOption('_text');
    }
    getNum  () {
        return this.getOption('_num');
    }
    getOption (key) {
        return this._setting[key];
    }
}

//export ComplexCustomOverlay
export default ComplexCustomOverlay;