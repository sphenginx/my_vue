/***
 * 地图找房核心 js 类
 **************************************************************
 *                                                            *
 *   .=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-.       *
 *    |                     ______                     |      *
 *    |                  .-"      "-.                  |      *
 *    |                 /            \                 |      *
 *    |     _          |              |          _     |      *
 *    |    ( \         |,  .-.  .-.  ,|         / )    |      *
 *    |     > "=._     | )(__/  \__)( |     _.=" <     |      *
 *    |    (_/"=._"=._ |/     /\     \| _.="_.="\_)    |      *
 *    |           "=._"(_     ^^     _)"_.="           |      *
 *    |               "=\__|IIIIII|__/="               |      *
 *    |              _.="| \IIIIII/ |"=._              |      *
 *    |    _     _.="_.="\          /"=._"=._     _    |      *
 *    |   ( \_.="_.="     `--------`     "=._"=._/ )   |      *
 *    |    > _.="                            "=._ <    |      *
 *    |   (_/                                    \_)   |      *
 *    |                                                |      *
 *    '-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-='      *
 *                                                            *
 *           LASCIATE OGNI SPERANZA, VOI CH'ENTRATE           *
 **************************************************************
 */
//引入自定义icon及text覆盖物、 聚合js
import SVGIconOverlay  from './SVGIconOverlay.js';
import MarkerClusterer from './MarkerClusterer.js';
import SVGIconOverlayPolygon from './SVGIconOverlayPolygon.js';


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

function coreMap(opt) {
    //气泡颜色列表
    this.bubbleColorScope = [
        '#f17881', '#dd4f51','#ff4848',
        '#d12020', '#9d1212'
    ];
    this.bubbleColorScopeHa = [
        '#71c2f4', '#2ba3ee', '#118ad4',
        '#0d6aa3', '#074f7b'
    ];

    //气泡大小列表
    this.bubbleSizeScope = [20, 22.5, 25, 27.5, 30];
    this.bubbleSizeScopeHa = [6, 7, 8, 9, 10];

    this.areaAjaxHandle = null;
    this.marketAjaxHandle = null;
    this.bubbleAjaxHandle = null;
    this.testAjaxHandle = null;

    this.latlng = null; //{lat :'', lng:''}

    this._map = null;
    this._mapData = null;

    this._moveStartPoint = null; //移动开始坐标点
    this._moveEndPoint = null; //移动结束坐标点
    this._moveendTimeout = null;
    this.haAjaxHandle = null;

    this._sigZoomPan = false;
    this._clickMapPanEnable = true;

    this._cluster = null;
    this._clusterParamOri = {};
    this._clusterParam = {};


    this._dist = '';
    this._distColors = {};
    this.init(opt);
}

coreMap.prototype = {
    constructor: coreMap,
    //地图尺寸调整
    resetMapSize: function(){
    },

    init: function(opt) {
        // 默认参数
        let def = {
            mapId: "allmap", //地图Id
            mapOpts: {
                minZoom: 9, //最小9： 1:25公里
                maxZoom: 19 //最大19：1:20米
            }, //地图初始化选项
            mapControl: [], //地图控件
            cityCode: "", //城市信息
            gps: "", //gps
            coordType: "bd09ll", //坐标的类型:bd09ll（百度经纬度坐标）、gcj02（国测局经纬度坐标）、wgs84（ GPS经纬度）
            distance: 1000, //默认距离 1000 米
            defaultCategoryClick: "", //默认点击元素
            categoryComplexClick: "", //复杂覆盖物的点击事件
            toast: "", //提示框
            params: "", //参数信息
            getHaCallBack: "", //获取小区及房源回调函数
            removeHaCallBack: "", //删除小区及房源回调函数
        };
        this._setting = extend(def, opt, true); //配置参数
        if (!this._setting.gps) {return;}
        this._initMapParams();
        this._initMap();
        this.addMapControl();
        this.renderCover();
    },

    _initMapParams: function(){
        //ajax参数信息
        let opt = {
            maplevel:4,
            lat:this.defaultLat,
            lng:this.defaultLng,
            level:5,
        };
        this.mapParams = extend(opt, this._setting.params, true);
    },
    //初始化地图信息
    _initMap: function() {
        let self = this;
        if (!self._setting.gps) {
            return;
        }
        self._map = new BMap.Map(self._setting.mapId, self._setting.mapOpts);
        let _centerPointArr =  self._setting.gps.split(',');
        self._centerPoint = new BMap.Point(_centerPointArr[0], _centerPointArr[1]);
        self._map.centerAndZoom(self._centerPoint, 12);
    },
    //添加地图控件
    addMapControl: function() {
        if (!this._setting.mapControl.length) {
            return;
        }
        for (let _control of this._setting.mapControl) {
            let _controlObj = new BMap[_control['code']](_control['opt']);
            this._map.addControl(_controlObj);
        }
    },
    //创建聚合
    createCluster: function() {
        this.toast("MarkerClusterer with self SVGIconOverlay is doing……");
    },

    //创建气泡
    createBubble: function() {
        let self = this;
        self._mapData = {
            "totalSize":12,
            "pageSize":50,
            "page":1,
            "items":[
                {"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"CHY","distName":"城阳区","cnt":311,"price":16297.0,"totalProp":4861,"gpsbd":"36.31294555037573,120.40283316283181","gpsgcj":"36.3070647188763,120.3963047783018","gpswgs":"36.306721,120.391145"},
                {"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"HUD","distName":"黄岛区","cnt":405,"price":17730.0,"totalProp":4576,"gpsbd":"35.96646199938002,120.20432279745013","gpsgcj":"35.96068243224001,120.19777528913025","gpswgs":"35.960556,120.192664"},
                {"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"JIM","distName":"即墨区","cnt":283,"price":13420.0,"totalProp":1800,"gpsbd":"36.395357685397805,120.45369998483531","gpsgcj":"36.38940535048655,120.44716470160277","gpswgs":"36.389065,120.442065"},
                {"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"JNN","distName":"胶南市","cnt":199,"price":16199.0,"totalProp":1358,"gpsbd":"35.8816006692505,120.04906426202793","gpsgcj":"35.87582118734366,120.04250288929296","gpswgs":"35.87567107475251,120.0372008988635"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"JZH","distName":"胶州市","cnt":342,"price":11006.0,"totalProp":1428,"gpsbd":"36.27061628534233,120.03991718779365","gpsgcj":"36.26467411480629,120.03337963054686","gpswgs":"36.264451,120.028057"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"LIC","distName":"李沧区","cnt":297,"price":22423.0,"totalProp":5186,"gpsbd":"36.15118269694625,120.43929563576854","gpsgcj":"36.1454615248841,120.43269165696572","gpswgs":"36.145173,120.427584"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"LSH","distName":"崂山区","cnt":227,"price":46061.0,"totalProp":4399,"gpsbd":"36.11384060370005,120.47535445173838","gpsgcj":"36.10754143428818,120.46895679504665","gpswgs":"36.107329,120.463955"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"LXI","distName":"莱西市","cnt":105,"price":7004.0,"totalProp":210,"gpsbd":"36.89493995473405,120.5242405756173","gpsgcj":"36.88907840894432,120.51768687694755","gpswgs":"36.888634,120.5128"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"PDU","distName":"平度市","cnt":158,"price":8859.0,"totalProp":878,"gpsbd":"36.78265235875982,119.99483417294888","gpsgcj":"36.77635543402469,119.98842121290043","gpswgs":"36.776013,119.983165"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"SHB","distName":"市北区","cnt":333,"price":27597.0,"totalProp":4204,"gpsbd":"36.08951959895757,120.36736189699246","gpsgcj":"36.08316437854241,120.36098794582354","gpswgs":"36.08291802411065,120.3558772591606"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"SHN","distName":"市南区","cnt":352,"price":38979.0,"totalProp":4556,"gpsbd":"36.08131784269713,120.41897142316857","gpsgcj":"36.07565494455253,120.41238568835725","gpswgs":"36.075369,120.407257"},{"saleOrLease":"forsale","cityCode":"qd","cityName":"青岛","distCode":"SIF","distName":"四方区","cnt":284,"price":22787.0,"totalProp":2788,"gpsbd":"36.1139228680802,120.36895861134823","gpsgcj":"36.107568546075775,120.36257755672264","gpswgs":"36.10731406883178,120.3574622581341"}
                ],
            "statistics": {
                "minDataValue":7004.0,
                "maxDataValue":46061.0,
                "maxCount":405,
                "minCount":105
            }
        };
        self._renderBubble(self._mapData);

    },
    //渲染气泡
    _renderBubble: function(data) {
        let self = this;
        for (let _dist of data.items) {
            let radius = 37.5;
            let color  = '#e4e4e4';
            if (parseInt(_dist.price)) {
                radius = self._getBubbleSize('cnt', _dist);
                color = self._getBubbleColor('price', _dist);
            }
            self._distColors[_dist.distCode] = color;
            let _text = _dist.distName;
            let _latlngArr = _dist.gpsbd.split(',');
            let _latlng = {lat: _latlngArr[0], lng: _latlngArr[1]}

            let icon_width = 2 * radius * 1.3;
            if (icon_width < 48) {
                icon_width = 48;
            }
            let distOverlay = self._getSVGIconOverlayCircle(_dist.distCode, radius, color, icon_width, _dist.distName, _latlng);
            //点击行政区气泡
            distOverlay.addEventListener("click", function(){
                self._clusterParam.district = _dist.distCode;
                self._dist = _dist.distCode;
                self._zoomPan(11, _latlng);
            });

            self._map.addOverlay(distOverlay);
        }
    },
    //获取 SVGIcon 圆形覆盖物
    _getSVGIconOverlayCircle: function (id, radius, color, icon_width, text, latlng) {
        let iconOptions = {
            idName: id,
            radius: radius,
            circleFillColor: color,
            weight: 0,
            opacity: 1,
            fillOpacity: 0.8,
            fontSize: 12,
            fontColor: "#fff",
            circleWeight: 5,
            circleColor: '#E4E4E4',
            showShadow: false,
            iconSize: new BMap.Pixel(icon_width, icon_width),
            iconAnchor: new BMap.Pixel(icon_width/2, icon_width/2)
        };
        return new SVGIconOverlay(latlng, text, iconOptions);
    },
    //获取 SVGIcon 多边形覆盖物
    _getSVGIconOverlayPolygon: function(properties) {
        let ha_name = properties.haName;
        let house_num = properties.cnt;
        let unit_price = properties.unit_price_format;
        let radius = 50;
        let fontSize = 12;
        if (!unit_price) unit_price = '--';
        let text = ha_name + " " + unit_price +properties.unit_price_unit+' '+ house_num + "套";
        let icon_width = this._getStrLen(text) * fontSize * 0.6;
        let icon_height = 50;
        let color = this._distColors[this._dist];
        let iconOptions = {
            idName: properties.id,
            radius: radius,
            circleFillColor: color,
            weight: 0,
            opacity: 1,
            fillOpacity: 0.8,
            fontSize: fontSize,
            fontColor: "#fff",
            circleWeight: 2,
            circleColor: '#E4E4E4',
            showShadow: false,
            rectSize:[icon_width, 40],
            iconSize:[icon_width, icon_height],
            iconAnchor:[icon_width/2, icon_height]
        };
        return new SVGIconOverlayPolygon(latlng, text, iconOptions);
    },
    renderAll: function() {
        this._map.clearOverlays();
        this._onChangeCenter();
        this.renderCover();
    },

    renderCover: function() {
        this._map.clearOverlays();
        this.createBubble();
    },

    //地图点击
    onMapClick: function() {
        let self = this;
        this._map.addEventListener('click', function(e) {
            if (!self._clickMapPanEnable) {
                return;
            }
            self.latlng = e.point;
            self.mapParams.lat = e.point.lat;
            self.mapParams.lng = e.point.lng;

            //移动中心点
            self._map.panTo(self.latlng);
        });
    },

    //弹出信息
    toast: function(msg) {
        if (!this._setting.toast) {
            return;
        }
        this._setting.toast(msg);
    },

    _enableMapOperate: function() {
        this._clickMapPanEnable = true;
        this._map.enableDragging();
        this._enableZoom();
    },

    _disableMapOperate: function() {
        this._clickMapPanEnable = false;
        this._map.disableDragging();
        this._disableZoom();
    },

    _disableZoom: function(){
        this._map.disableScrollWheelZoom();
        this._map.disableDoubleClickZoom();
    },

    _enableZoom: function(){
        this._map.enableScrollWheelZoom();
        this._map.enableDoubleClickZoom();
    },

    //缩放并且移动
    _zoomPan: function(zoom, latlng) {
        let self = this;
        self._sigZoomPan = true;
        self.mapParams.lat = latlng.lat;
        self.mapParams.lng = latlng.lng;
        if (self._map.getZoom() != zoom) {
            self._map.setZoom(zoom);
        } else {
            self._map.panTo(latlng);
        }
    },

    //获取气泡半径
    _getBubbleSize: function(size_key, properties) {
        let scope = this.bubbleSizeScope;
        return this._get_scope_value(properties[size_key],
                    this._mapData['statistics']['minCount'],
                    this._mapData['statistics']['maxCount'],
                    scope);
    },

    //获取气泡颜色
    _getBubbleColor: function(color_key, properties) {
        let scope = [];
        scope = this.bubbleColorScope;
        return this._get_scope_value(properties[color_key],
                    this._mapData['statistics']['minDataValue'],
                    this._mapData['statistics']['maxDataValue'],
                    scope);
    },

    _get_scope_value: function(value, min, max, scope) {
        let self = this;
        let step = (max - min) / scope.length;
        let start_value;
        let end_value;
        for (let i = 0; i< scope.length; i++) {
            start_value = i * step + min;
            if (i == scope.length-1) {
                end_value = max;
            } else {
                end_value = start_value + step;
            }
            if (value >= start_value && value <= end_value) {
                return scope[i];
            }
        }
    },

    run: function() {
        this.onMapClick();
    }
}

export default coreMap;