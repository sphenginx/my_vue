//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}

//复杂覆盖物实例，继承自百度 overlay
class ComplexCustomOverlay extends BMap.Overlay {
    constructor (opts) {
        super();
        let def = {
            _point: '',
            _text: '',
            _initalizeCallBack () {
                let div = document.createElement("div");
                div.className  = 'map-ha-popbox';
                let span = document.createElement("span");
                let i = document.createElement("i");
                span.appendChild(document.createTextNode(this.getOption('_text')));
                span.appendChild(i);
                div.appendChild(span);
                this._map.getPanes().labelPane.appendChild(div);
                //必须有返回值
                return div;
            },
            _eventCallBack () {
                //覆盖物添加到地图之后的回调方法
            }
        };
        this._setting = extend(def, opts, true);
    }
    //重写 initialize 方法
    initialize (map) {
        this._map = map;
        this._div = '';
        if (typeof this._setting['_initalizeCallBack'] == 'function') {
            this._div = this._setting['_initalizeCallBack'].call(this);
            this._cwidth = this._div.clientWidth;
            this._cheight = this._div.clientHeight;
        }
        if (typeof this._setting['_eventCallBack'] == 'function') {
            this._setting['_eventCallBack'].call(this);
        }
        //这里必须有返回值，map.clearOverlays 会清除 initialize 的返回值
        return this._div;
    }
    //重写 draw 方法
    draw () {
        this._map && this._updatePosition();
    }

    getMap () {
        return this._map;
    }
    _updatePosition () {
        if (this._div && this.getOption('_point')) {
            let pixel = this._map.pointToOverlayPixel(this.getOption('_point'));
            this._div.style.left = pixel.x - this._cwidth/2 + "px";
            this._div.style.top  = pixel.y - this._cheight - 10 + "px";
        }
    }
    getPosition () {
        return this.getOption('_point');
    }
    getText () {
        return this.getOption('_text');
    }
    getNum () {
        return this.getOption('_num');
    }
    getOption (key) {
        return this._setting[key];
    }
}

//最后将插件对象暴露给全局对象
export default ComplexCustomOverlay;