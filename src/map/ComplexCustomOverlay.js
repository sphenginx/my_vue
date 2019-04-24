// 引入复杂覆盖物监听插件
import EventWrapper from './EventWrapper.js';

//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}

//复杂的自定义覆盖物
function ComplexCustomOverlay(opts){
    let def = {
        _point: '',
        _text: '',
        _initalizeCallBack: function () {
            let div = document.createElement("div");
            div.className  = 'map-ha-popbox';
            let span = document.createElement("span");
            span.className = 'name';
            let i = document.createElement("i");
            span.appendChild(document.createTextNode(this.getOption('_text')));
            span.appendChild(i);
            div.appendChild(span);
            this._map.getPanes().labelPane.appendChild(div);
            //必须有返回值
            return div;
        },
        _eventCallBack: function () {
            //元素的回调方法（渲染到地图上时才可调用）：点击、等 用 EventWrapper
            //可以用 this 获取 该复杂覆盖物本身，call的时候上下文的作用域变成了复杂覆盖物自己
            EventWrapper.addDomListener(this._div, "touchend", function(e){
                console.log(this._setting);
                console.log(this.getOption('_point'));
            });
        }
    };
    this._setting = extend(def, opts, true);
};
//复杂覆盖物实例，继承自百度 overlay
ComplexCustomOverlay.prototype = new BMap.Overlay();
//重写 initialize 方法
ComplexCustomOverlay.prototype.initialize = function(map){
    this._map = map;
    this._div = '';
    if (this._setting['_initalizeCallBack'] && typeof(this._setting['_initalizeCallBack']) == 'function') {
        this._div = this._setting['_initalizeCallBack'].call(this);
    }
    this._cwidth = this._div.clientWidth;
    this._cheight = this._div.clientHeight;
    if (this._setting['_eventCallBack'] && typeof(this._setting['_eventCallBack']) == 'function') {
        this._setting['_eventCallBack'].call(this);
    }
    return this._div;
}
//重写 draw 方法
ComplexCustomOverlay.prototype.draw = function(){
    this._map && this._updatePosition();
}

ComplexCustomOverlay.prototype.getMap = function(){
    return this._map;
};

ComplexCustomOverlay.prototype._updatePosition = function() {
    if (this._div && this.getOption('_point')) {
        let pixel = this._map.pointToOverlayPixel(this.getOption('_point'));
        this._div.style.left = pixel.x - this._cwidth/2 + "px";
        this._div.style.top  = pixel.y - this._cheight - 10 + "px";
    }
};
ComplexCustomOverlay.prototype.getPosition = function(){
    return this.getOption('_point');
};
ComplexCustomOverlay.prototype.getText = function(){
    return this.getOption('_text');
};
ComplexCustomOverlay.prototype.getNum = function(){
    return this.getOption('_num');
}
ComplexCustomOverlay.prototype.getOption = function(key) {
    return this._setting[key];
}

//最后将插件对象暴露给全局对象
export default ComplexCustomOverlay;