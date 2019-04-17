// 周边环境复杂的自定义覆盖物
//复杂的自定义覆盖物
function ComplexCustomOverlay(point, text, num){
    this._point = point;
    this._text  = text;
    this._num   = num;
};
//复杂覆盖物实例，继承自百度 overlay
ComplexCustomOverlay.prototype = new BMap.Overlay();
//重写 initialize 方法
ComplexCustomOverlay.prototype.initialize = function(map){
    this._map = map;
    let div = document.createElement("div");
    let span = this._span = document.createElement("span");
    span.appendChild(document.createTextNode(this._text));
    div.appendChild(span);
    this._map.getPanes().labelPane.appendChild(div);
    this._div = div;
    this._cwidth = this._div.clientWidth;
    this._cheight = this._div.clientHeight;
    return div;
}
//重写 draw 方法
ComplexCustomOverlay.prototype.draw = function(){
    let pixel = this._map.pointToOverlayPixel(this._point);
    this._div.style.left = pixel.x - this._cwidth/2 + "px";
    this._div.style.top  = pixel.y - this._cheight  + "px";
}

ComplexCustomOverlay.prototype.getMap = function(){
    return this._map;
};
ComplexCustomOverlay.prototype.getPosition = function(){
    return this._point;
};
ComplexCustomOverlay.prototype.getText = function(){
    return this._text;  
};
ComplexCustomOverlay.prototype.getNum = function(){
    return this._num;
}

//最后将插件对象暴露给全局对象
export default ComplexCustomOverlay;