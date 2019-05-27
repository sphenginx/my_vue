/*********************************
* date    2019-3-12              *
* works   house around modes     *
* author  sphenginx              *
**********************************/
/***基于jQuery实现周边环境功能
 *      ┌─┐       ┌─┐ + +
 *   ┌──┘ ┴───────┘ ┴──┐++
 *   │                 │
 *   │       ───       │++ + + +
 *   ███████───███████ │+
 *   │                 │+
 *   │       ─┴─       │
 *   │                 │
 *   └───┐         ┌───┘
 *       │         │
 *       │         │   + +
 *       │         │
 *       │         └──────────────┐
 *       │                        │
 *       │                        ├─┐
 *       │                        ┌─┘
 *       │                        │
 *       └─┐  ┐  ┌───────┬──┐  ┌──┘  + + + +
 *         │ ─┤ ─┤       │ ─┤ ─┤
 *         └──┴──┘       └──┴──┘  + + + +
 */
//引入绑定点击事件js
import EventWrapper from './EventWrapper.js';
//引入自定义覆盖物的css
import "./ComplexCustomOverlay.css";
import ComplexCustomOverlay from './ComplexCustomOverlay.js';

//合并参数
function extend(o, n, override) {
    for(let key in n){
        if(n.hasOwnProperty(key) && (!o.hasOwnProperty(key) || override)){
            o[key]=n[key];
        }
    }
    return o;
}

class HouseAround {
    constructor (opt) {
        this._map = null; //地图对象
        this._aroundList = {}; //周边小区信息
        this._currentCatory = null; //当前类别
        this._currentTitle = null; //当前名称
        this._categoryComplexData = {}; // 复杂覆盖物类别
        this._centerPoint = null; //百度中心点
        this._centerIcon = "";
        this._categoryIcon = "";
        this.routes = []; //路线信息
        this._init(opt);
    }
    _init (opt) {
        // 默认参数
        let def = {
            mapId: "allmap", //地图Id
            categoryElement: "#menu", //周边id 或者 class
            categoryTab: "#around_tab", //周边切换元素
            categoryLoop: "li", //轮询元素
            trafficElement: "#bus", //交通 id 或者 class
            trafficTab: "#traffic_tab",  //交通切换元素
            trafficLoop: "li", //轮询元素
            cityCode: "",
            haCode: "",
            haName: "", //当前小区名
            defaultCategoryClick: "", //默认点击元素
            categoryComplexClick: "", //复杂覆盖物的点击事件
            toast: "", //提示框
            gps: "", //gps
            coordType: "bd09ll", //坐标的类型:bd09ll（百度经纬度坐标）、gcj02（国测局经纬度坐标）、wgs84（ GPS经纬度）
            resultType: "", //返回结果的类型，每次只查询一种
            distance: 1000, //默认距离 1000 米
            centerMarkerClick: false, //中心点链接事件
            centerIcon: "", //中心点icon
            categoryIcon: "", //category icon
            needTranslate: true, //是否需要进行坐标偏移， 由wgs 转为 bd911
            currentGps: 1, //当前坐标系
            translateGps: 5, //需要转换的坐标系
            api: {
                infoUrl: "/api/ha/around",
                trafficUrl: "/api/ha/traffic"
            }
        };
        this._setting = extend(def, opt, true); //配置参数
        this._initAjaxParams();
        this._initMap();
    }
    _initAjaxParams () {
        //ajax参数信息
        this.ajaxParams = {
            cityCode: this._setting.cityCode,
            haCode: this._setting.haCode,
            gps: this._setting.gps,
            coordType: this._setting.coordType,
            distance: this._setting.distance,
            resultType: this._setting.resultType
        };
    }
    //初始化地图信息
    _initMap () {
        let self = this;
        if (!self._setting.gps) {
            return;
        }
        self._map = new BMap.Map(self._setting.mapId);
        let _centerPointArr =  self._setting.gps.split(',');
        self._centerPoint = new BMap.Point(_centerPointArr[0], _centerPointArr[1]);
        self._map.centerAndZoom(self._centerPoint, 16);
        self._map.enableScrollWheelZoom();
    }
    //检测中心点icon
    _checkCenterIcon () {
        if (this._setting.centerIcon) {
            const _img = this._setting.centerIcon;
            this._centerIcon = new BMap.Icon(_img, new BMap.Size(38,46), {anchor: new BMap.Size(19, 46)});
            return true;
        } 
        return false;
    }
    //检测类别icon
    _checkCategoryIcon () {
        if (this._setting.categoryIcon) {
            const _img = this._setting.categoryIcon;
            this._categoryIcon = new BMap.Icon(_img, new BMap.Size(38,46), {anchor: new BMap.Size(19, 46)});
            return true;
        }
        return false;
    }
    //显示加载中
    _showLoading () {
        if (typeof(this._setting.csfcLoading) == 'function') {
            this._setting.csfcLoading(true);
        }
    }
    _hideLoading () {
        if (typeof(this._setting.csfcLoading) == 'function') {
            this._setting.csfcLoading(false);
        }
    }
    //加载中心点marker并设置中心坐标
    renderCenter () {
        let self = this;
        //是否需要坐标偏移
        if (self._setting.needTranslate) {
            let convertor = new BMap.Convertor();
            convertor.translate([self._centerPoint], self._setting.currentGps, self._setting.translateGps, self._centerCallBack);
        } else {
            self._renderCenterMarker();
            self._map.setCenter(self._centerPoint);
        }
    }
    //中心点回调函数
    _centerCallBack (data) {
        let self = this;
        if(data.status === 0) {
            self._renderCenterMarker(data.points[0]);
            self._map.setCenter(data.points[0]);
        }
    }
    //初始化中心坐标的marker
    _renderCenterMarker (point) {
        let self = this;
        let _point = point || self._centerPoint;
        if (self._checkCenterIcon()) {
            var _centerMarker = new BMap.Marker(_point, {icon: self._centerIcon});
        } else {
            var _centerMarker = new BMap.Marker(_point);
        }
        self._map.addOverlay(_centerMarker);
        //中心点marker是否需要增加点击事件
        if (self._setting.centerMarkerClick) {
            _centerMarker.addEventListener('click', function(e) {
                // 绑定统计事件
                if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                    self._setting.trackEvent('touch', 'centerMarker');
                }
                self._setting.centerMarkerClick('pa');
            });
        }
    }
    //渲染周边环境列表
    renderCategory () {
        let self = this;
        if (self._aroundList[self._currentCatory]) {
            self._renderCategoryMapInfo(self._aroundList[self._currentCatory]);
        } else {
            self.ajaxParams.resultType = self._currentCatory;
            self._showLoading();
            $.ajax({
                method: 'GET',
                url: self._setting.api.infoUrl,
                data: self.ajaxParams,
                dataType: 'json',
                success: function(json) {
                    self._hideLoading();
                    if (json.status == 200) {
                        self._aroundList[self._currentCatory] = json.data.items;
                        self._renderCategoryMapInfo(json.data.items);
                    } else {
                        self._setting.toast('系统异常，请稍后再试！');
                    }
                }
            });
        }
    }
    //渲染周边的地图信息
    _renderCategoryMapInfo (data) {
        let self = this;
        if (self._setting.needTranslate) {
            let convertor = new BMap.Convertor();
            let pointArr = [];
            for (let i = 0; i < data.length; i++) {
                if (self._isCurrentHa(data[i]['code'])) {
                    continue;
                }
                let _gpsArr = data[i]['gps'].split(',');
                let wPoint = new BMap.Point(_gpsArr[0], _gpsArr[1]);
                pointArr.push(wPoint);
            }
            convertor.translate(pointArr, self._setting.currentGps, self._setting.translateGps, self._categoryCallBack);
        } else {
            for (let i = 0; i < data.length; i++) {
                if (self._isCurrentHa(data[i]['code'])) {
                    continue;
                }
                let _gpsArr = data[i]['gps'].split(',');
                let _wPoint = new BMap.Point(_gpsArr[0], _gpsArr[1]);
                self._renderCategoryMarker(_wPoint, i);
            }
        }
    }
    //如果当前点 和 中心点一致，防止覆盖中心点，则跳过渲染
    _isCurrentHa (hacode) {
        return this._setting.haCode == hacode;
    }
    //当前类别回调函数
    _categoryCallBack (data) {
        let self = this;
        if(data.status == 0) {
            for (let i = 0; i < data.points.length; i++) {
                self._renderCategoryMarker(data.points[i], i);
            }
        }
    }
    //渲染类别的marker信息
    _renderCategoryMarker (point, i) {
        let self = this;
        let _currentData = self._aroundList[self._currentCatory][i];
        //是否有复杂覆盖物的数据，则渲染复杂覆盖物信息 ! 这里只根据code 来判断，经纬度可能有一样的。
        if (self._categoryComplexData['code'] == _currentData['code']) {
            self._renderCategoryComplexOverlay(self._categoryComplexData);
            return;
        }
        //是否有自定义图标
        let _categoryMarker = new BMap.Marker(point);
        if (self._checkCategoryIcon()) {
            _categoryMarker = new BMap.Marker(point, {icon: self._categoryIcon});
        }
        self._map.addOverlay(_categoryMarker);
        self.addClickHandler(_currentData, _categoryMarker);
    }
    //渲染类别复杂覆盖物信息
    _renderCategoryComplexOverlay (data) {
        let self = this;
        let _gpsArr = data['gps'].split(',');
        let _point = new BMap.Point(_gpsArr[0], _gpsArr[1]);
        let _opt = {
            '_point': _point,
            '_text': data.name,
            '_code': data.code,
            '_eventCallBack': function () {
                // let me = this;
                // EventWrapper.addDomListener(this._div, "touchend", function(e){
                //     if (!self._setting.categoryComplexClick) {
                //         return;
                //     }
                //     self._setting.categoryComplexClick(me.getOption('_code'));
                // });
            }
        }
        let myComplexOvelay = new ComplexCustomOverlay(_opt); //创建信息窗口对象
        self._map.addOverlay(myComplexOvelay);
    }
    //绑定点击事件
    addClickHandler (data, marker) {
        let self = this;
        marker.addEventListener('click', function(e) {
            // 绑定统计事件
            if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                self._setting.trackEvent('touch', 'marker');
            }
            setTimeout(function(){
                self._categoryComplexData = data;
                self._map.clearOverlays();
                self._renderCenterMarker(); //只加载中心坐标marker，并不需要设置中心点为地图中心
                self._renderCategoryMapInfo(self._aroundList[self._currentCatory]);
            });
        });
    }
    _bindAroundHandler () {
        let self = this;
        //周边环境tab切换
        $(self._setting.categoryTab).click(function(){
            $(this).addClass("selected");
            $(self._setting.trafficTab).removeClass("selected");
            $(self._setting.trafficElement).hide();
            $(self._setting.categoryElement).show();
            if (self._currentCatory) {
                self._triggerClick(self._currentCatory);
            } else if (self._setting.defaultCategoryClick) {
                self._triggerClick(self._setting.defaultCategoryClick);
            }

            // 绑定统计事件
            if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                self._setting.trackEvent('touch', '周边环境');
            }
        });

        $(self._setting.categoryElement).find(self._setting.categoryLoop).click(function(){
            //当前元素添加选中样式
            $(this).addClass('selected').siblings().removeClass('selected');
            //周边环境当前类别
            self._currentCatory = $(this).attr('category');
            //当前环境名称
            self._currentTitle = $(this).attr('title');
            $('#header_title_p').html("附近环境-" + self._currentTitle);
            // 绑定统计事件
            if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                self._setting.trackEvent('touch', self._currentTitle);
            }
            //清除覆盖物
            self._map.clearOverlays();
            //重新加载中心点
            self.renderCenter();
            //加载当前类别点
            self.renderCategory();
        });

        //是否有元素触发点击事件
        if (self._setting.defaultCategoryClick) {
            self._triggerClick(self._setting.defaultCategoryClick);
        }
    }
    _triggerClick (triggerHandler) {
        let self = this;
        $(self._setting.categoryElement).find(self._setting.categoryLoop).each(function(i, e){
            if ($(e).attr('category') == triggerHandler) {
                $(e).trigger("click");
                return;
            }
        });
    }
    _bindTrafficHandler () {
        let self = this;
        //交通 tab 切换
        $(self._setting.trafficTab).click(function(){
            // 绑定统计事件
            if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                self._setting.trackEvent('touch', '周边公交');
            }
            $(this).addClass("selected");
            $(self._setting.categoryTab).removeClass("selected");
            $(self._setting.categoryElement).hide();
            $('#header_title_p').html("周边公交");
            $(self._setting.trafficElement).show();
            self.renderTraffic();
        });
    }
    //渲染周边交通
    renderTraffic () {
        let self = this;
        //清除覆盖物
        self._map.clearOverlays();
        //重新加载中心点
        self.renderCenter();
        if (self._aroundList['traffic']) {
            self._renderTrafficMapInfo(self._aroundList['traffic']);
        } else {
            self.ajaxParams.resultType = 'traffic';
            self._showLoading();
            $.ajax({
                method: 'GET',
                url: self._setting.api.trafficUrl,
                data: self.ajaxParams,
                dataType: 'json',
                success: function(json) {
                    self._hideLoading();
                    if (json.status == 200) {
                        if (!json.data.items.length) {
                            self._setting.toast('暂无周边公交数据！');
                            return;
                        }
                        self._aroundList['traffic'] = json.data.items;
                        self._renderTrafficMapInfo(json.data.items);
                    } else {
                        self._setting.toast('系统异常，请稍后再试！');
                    }
                }
            });
        }
    }
    _renderTrafficMapInfo (traffic) {
        let self = this;
        //清空路线信息
        self.routes = [];
        for (let i in traffic) {
            let _gpsArr = traffic[i]['bd09GPS'].split(',');
            let _tPoint = new BMap.Point(_gpsArr[0], _gpsArr[1]);
            let _opt = {
                '_point': _tPoint,
                '_text': traffic[i].name,
                '_routes': traffic[i].routes,
                '_traffic': self._setting.trafficElement,
                '_eventCallBack': function() { //基于bMaplib 绑定自定义覆盖物点击事件
                    let me = this;
                    EventWrapper.addDomListener(this._div, "touchend", function() {
                        // 绑定统计事件
                        if (self._setting.trackEvent && typeof(self._setting.trackEvent) == 'function') {
                            self._setting.trackEvent('touch', 'station');
                        }
                        $(this).addClass("on").siblings().removeClass("on");
                        let _rt = "";
                        let _routes = me.getOption('_routes');
                        for (let i in _routes) {
                            _rt += "<li>" + _routes[i].routeName +"</li>\r\n";
                        }
                        $(me.getOption('_traffic')).html(_rt);
                    });
                }
            }
            let myCompOverlay = new ComplexCustomOverlay(_opt);
            self._map.addOverlay(myCompOverlay);
            for (let t in traffic[i].routes) {
                self.routes.push(traffic[i].routes[t].routeName);
            }
        }
        self._renderRoutes();
    }
    //渲染路线信息
    _renderRoutes () {
        if (!this.routes.length) {
            return;
        }
        let _rt = "";
        let self = this;
        for (let i in self.routes) {
            _rt += "<li>" + self.routes[i] +"</li>\r\n";
        }
        $(self._setting.trafficElement).html(_rt);
    }
    main () {
        let self = this;
        //文档加载完成之后，绑定类别的点击事件
        $(document).ready(function(){
            self._bindAroundHandler();
            self._bindTrafficHandler();
        });
    }
}

//最后将插件对象暴露给全局对象
export default HouseAround;