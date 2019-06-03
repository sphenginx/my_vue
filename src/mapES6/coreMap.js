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
import {MyGeoLocationControl, MyScaleControl} from './MyBMapControl.js';
import {SVGIconOverlay, SVGIconOverlayPolygon}  from './SVGIconOverlay.js';
import MarkerClusterer from './MarkerClusterer.js';
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

// 地图核心类
class coreMap {
    constructor (opt) {
        //气泡颜色列表
        this.bubbleColorScope = [
            '#f17881', '#dd4f51','#ff4848',
            '#d12020', '#9d1212',
        ];

        //气泡大小列表
        this.bubbleSizeScope = [24, 26, 28, 30, 32];

        this.bubbleAjaxHandle = null;
        this.clusterAjaxHandle = null;
        this.haAjaxHandle = null;
        this._haData = {}; //小区数据
        this._centerPoint = []; //中心点信息
        this._centerMarker = null;

        //加载更多小区的移动距离
        this._loadMoreHaDistance = 500;
        // 聚合图标填充色
        this._clusterFillColor = '#ff4848';
        // 点击小区之后的颜色
        this._haClickedColor = '#009688';

        this.levelDistrictMin = 9;
        this.levelDistrictMax = 14;
        this.levelHaMin = 15;
        this.levelHaMax = 19;

        this._map = null;
        this._mapData = null;
        this._distParams = {};   //行政区参数
        this._clusterParam = {}; //小区列表参数
        this._haParam = {};      //小区房源参数
        this._haClickedMarker = null; //点击的小区图标

        this._moveStartPoint = null; //移动开始坐标点
        this._moveEndPoint = null; //移动结束坐标点
        this._moveendTimeout = null;
        this._moveStartHandler = null;
        this._moveEndHandler = null;
        this._zoomEndHandler = null;

        this._sigGetHaCallBack = false; //回调标识
        this._sigZoomPan = false; //zoom 和 移动标识
        this._sigGeoLocation = false; //定位标识
        this._sigHaClick = false; //是否点击了小区图标
        this._sigDistrictClick = false; //是否点击了行政区
        this._sigNotNeedLoadMoveEvent = false; //是否需要重新渲染moveend 事件
        //自适应zoom
        this._adaptateZoom = true;

        this._cluster = null;

        this._dist = '';
        this._defaultZoom = 12; //默认展示级别
        this._distClickZoom = 17; //点击行政区 跳转到 1：100 米的比例尺
        this._distColors = {};
        this.init(opt);
    }
    init (opt) {
        // 默认参数
        let def = {
            mapId: "allmap", //地图Id
            mode: "trade", // trade: 房屋置换、二手房、租房 |  ha：楼盘小区模式
            mapOpts: {
                minZoom: 9, //最小9： 1:25公里
                maxZoom: 19, //最大19：1:20米
            }, //地图初始化选项
            mapControl: [], //地图控件
            cityCode: "", //城市信息
            gps: "", //gps
            toast: "", //提示框
            api: {
                distUrl: "/api/deal/distSearch",
                haListUrl: "/api/deal/haSearch",
                haHouseUrl: "/api/deal/search",
            },
            params: "", //参数信息
            getHaCallBack: "", //获取小区及房源回调函数
            removeHaCallBack: "", //删除小区及房源回调函数
        };
        this._setting = extend(def, opt, true); //配置参数
        this._initMapParams();
        this._initMap();
        this.addMapControl();
        this.renderCover();
    }
    _initMapParams () {
        //小区 ajax 参数信息
        this._clusterParam = {...this._setting.params};
        //行政区 地图 ajax 参数信息
        this._distParams = {...this._setting.params};
        //获取房源 ajax 参数信息
        this._haParam = {...this._setting.params};
        this._haParam['pageSize'] = 10; //默认展示10条
        // 构建行政区的额外参数
        this._distParams['pageSize'] = 50; // 要获取所有行政区的数据，这里传 50
        this._distParams['propType'] = 11; // 只查楼盘小区类型的
        let opt = {
            // district: '',
            gps: this._setting.gps,
            lng: '',
            lat: '',
            coordType: "bd09ll",
            distance: 1000
        };
    }
    //初始化地图信息
    _initMap () {
        this._map = new BMap.Map(this._setting.mapId, this._setting.mapOpts);
        let _centerPointArr =  this._setting.gps.split(',');
        this._centerPoint = new BMap.Point(_centerPointArr[0], _centerPointArr[1]);
        this._map.centerAndZoom(this._centerPoint, this._defaultZoom);
    }
    //添加地图控件
    addMapControl () {
        if (!this._setting.mapControl.length) {
            return;
        }
        let me = this;
        for (let {ctrlClass, opt} of this._setting.mapControl) {
            let _controlObj = new ctrlClass(opt);
            this._map.addControl(_controlObj);
        }
    }
    //初始化中心坐标 Symbol icon
    renderCenter () {
        let point = this._centerPoint;
        if (!point['lat'] || !point['lng']) {
            return false;
        }

        //为了防止多个marker同时出现，先移除之前的marker
        if (this._centerMarker) {
            this._map.removeOverlay(this._centerMarker);
        }

        $($('.BMap_Marker').find('img')).each(function(){
            if ($(this).attr('src').indexOf('geolocation') > -1) {
                $(this).closest('.BMap_Marker').remove();
            }
        });

        let me = this;
        let _icon = new BMap.Symbol(BMap_Symbol_SHAPE_CIRCLE, {
            scale: 10,
            fillColor: "#0a7fff",
            fillOpacity: 1,
            strokeColor: "#0a7fff",
            strokeOpacity: 0.2,
            strokeWeight: 40,
        });

        me._centerMarker = new BMap.Marker(point, {icon: _icon});
        me._map.addOverlay(me._centerMarker);
        me._centerMarker.addEventListener('click', () => {
            me.toast('我的位置');
        });
    }
    //创建气泡
    createBubble () {
        let self = this;
        self._getBubbleData(data => {
            self._mapData = data;
            self._renderBubble(data);
        });
    }

    //获取气泡数据
    _getBubbleData (callback) {
        let self = this;
        if (self.bubbleAjaxHandle) {
            self._hideLoading();
            self.bubbleAjaxHandle.abort();
        }
        self._showLoading();
        // let saleOrLeaseArr = {1: "forsale", 2: "lease"};
        if (!self._distParams['saleOrLease']) {
            self._distParams['saleOrLease'] = "forsale"; //saleOrLeaseArr[self._distParams.flag];
        }
        self.bubbleAjaxHandle = $.ajax({
            url: self._setting.api.distUrl,
            data: self._distParams,
            dataType: 'json',
            success: function(data) {
                // console.log(data);
                self._hideLoading();
                if (data.status == 200) {
                    if (!data.data.totalSize) {
                        self.toast("根据条件未获取到行政区数据！");
                        return false;
                    }
                    callback.call(self, data.data);
                } else {
                    self.toast(data.errmsg);
                }
            },
            complete: function() {
                self._hideLoading();
                self.bubbleAjaxHandle = null;
            }
        })
    }

    //渲染气泡
    _renderBubble (data) {
        let self = this;
        let _points = [];
        for (let _dist of data.items) {
            //没有坐标进行下次轮询
            if (!_dist['gpsbd']) {
                continue;
            }
            let radius = 24;
            let color  = '#e4e4e4';
            if (parseInt(_dist.price)) {
                radius = self._getBubbleSize('cnt', _dist);
                color = self._getBubbleColor('price', _dist);
            }
            self._distColors[_dist.distCode] = color;
            let _text = _dist.distName;
            let _latlngArr = _dist['gpsbd'].split(',');
            let _latlng = new BMap.Point(_latlngArr[1], _latlngArr[0]);
            //组合坐标信息
            _points.push(_latlng);
            let distOverlay = self._getSVGIconOverlayCircle(radius * 2, color, _dist.distName, _latlng);
            self._map.addOverlay(distOverlay);
            //绑定行政区气泡的点击事件
            EventWrapper.addDomListener(distOverlay._div, "touchend", () => {
                // 点击行政区时暂时 去掉 district 参数
                self._sigDistrictClick = true;
                self._clusterParam['district'] = _dist.distCode;
                //改善型置换，需要跳转至该行政区评分最高的小区
                if (self._setting.params['flag'] == 1) {
                    self._clusterParam['orderBy'] = 1;
                }
                //套利型置换, 需要跳转至该行政区平均单价最低的小区
                if (self._setting.params['flag'] == 2) {
                    self._clusterParam['orderBy'] = 3;
                }
                self._dist = _dist.distCode;
                self._zoomPan(self._distClickZoom, _latlng);
            });
        }
        //是否自适应缩放级别
        if (self._adaptateZoom) {
            self._adaptateZoom = false;
            self.adaptateZoom(_points);
        }
    }
    //自适应缩放级别 及 中心点
    adaptateZoom (points) {  
        if(!points.length) return;
        let maxLng = points[0].lng;
        let minLng = points[0].lng;
        let maxLat = points[0].lat;
        let minLat = points[0].lat;
        let res;
        for (let res of points) {
            if(res.lng > maxLng) maxLng = res.lng;
            if(res.lng < minLng) minLng = res.lng;
            if(res.lat > maxLat) maxLat = res.lat;
            if(res.lat < minLat) minLat = res.lat;
        };  
        let cenLng = (parseFloat(maxLng) + parseFloat(minLng))/2;
        let cenLat = (parseFloat(maxLat) + parseFloat(minLat))/2;
        let zoom = this.getZoom(maxLng, minLng, maxLat, minLat);
        this._temporaryRemoveMapEventListener();
        this._map.centerAndZoom(new BMap.Point(cenLng, cenLat), zoom);
        this.onZoom();
        this.onMove();
    }
    //根据经纬极值计算绽放级别。  
    getZoom (maxLng, minLng, maxLat, minLat) {  
        let zoom = ["20", "50", "100", "200", "500", "1000", "2000", "5000", "10000", "20000", "25000", "50000", "100000", "200000",]//级别19到6。  
        let pointA = new BMap.Point(maxLng, maxLat);  // 创建点坐标A  
        let pointB = new BMap.Point(minLng, minLat);  // 创建点坐标B  
        let distance = this._map.getDistance(pointA, pointB).toFixed(1);  //获取两点距离,保留小数点后两位  
        let _zoom = 0;
        for (let i in zoom) {
            if(zoom[i] - distance > 0){  
                _zoom = 19 - i + 4;//之所以会多3，是因为地图范围常常是比例尺距离的10倍以上。所以级别会增加3。
                return _zoom > this._defaultZoom ? this._defaultZoom : _zoom;
            }
        }
    }
    //创建聚合
    createCluster () {
        let self = this;
        if (self.clusterAjaxHandle) {
            self._hideLoading();
            self.clusterAjaxHandle.abort();
        }
        self._showLoading();
        self._checkClusterParam();
        //获取小区数据
        self.clusterAjaxHandle = $.ajax({
            url: self._setting.api.haListUrl,
            data:self._clusterParam,
            dataType:'json',
            success: function(data) {
                self._hideLoading();
                if (data.status == 200) {
                    if (!data.data.totalSize) {
                        // self.toast("暂未获取到该位置附近小区信息!");
                        return false;
                    }
                    self._createClusters(data.data);
                    self._checkSigDistrictClick(data.data);
                } else {
                    self.toast(data.errmsg);
                }
            },
            complete: function() {
                self._hideLoading();
                self.clusterAjaxHandle = null;
            }
        })
    }
    // 检测小区搜索参数信息
    _checkClusterParam () {
        let self = this;
        //如果不是点击行政区加载小区列表，那么不传行政区 及 排序参数
        if (!self._sigDistrictClick) {
            delete self._clusterParam['district'];
            delete self._clusterParam['orderBy'];
            self._clusterParam['distance'] = 1000;
        } else {
            delete self._clusterParam['gps'];
            delete self._clusterParam['lng'];
            delete self._clusterParam['lat'];
            delete self._clusterParam['distance'];
        }
    }
    //检测是否是行政区点击进来的！
    _checkSigDistrictClick (data) {
        let self = this;
        if (!self._sigDistrictClick) {
            return;
        }

        // 点击行政区标识 设为 false
        self._sigDistrictClick = false;

        let latlng = data.orderByFirstGps;
        if (!latlng) {
            return;
        }

        let _arr = latlng.split(',');
        let _position = new BMap.Point(_arr[1], _arr[0]);
        // 行政区标识设为true，不重新加载地图移动的事件
        self._sigNotNeedLoadMoveEvent = true;
        self._map.panTo(_position);
    }
    _createClusters (data) {
        let self = this;
        let markers = [];
        for (let _ha of data.items) {
            // 没有价格则不显示该小区
            if (!_ha.price) {
                continue;
            }
            let haOverlay = self._getSVGIconOverlayPolygon(_ha);
            markers.push(haOverlay);
        }

        // 构造百度地图聚合的参数
        let opts = {
            coreMap: self,
            textCallBack: self._getClusterTextCallBack,
            markerCallBack: self._getMarkerCallBack,
            markers: markers,
            styles: {'background': self._clusterFillColor}
        };
        if (!self._cluster) {
            self._cluster = new MarkerClusterer(self._map, opts);
            return true;
        }
        self._cluster.addMarkers(markers);
        return true;
    }
    //根据缩放级别获取 减去的经纬度信息
    _getMiuteLat () {
        let self = this;
        let _zoom = self._map.getZoom();
        let _zoomObj = {
            15: 0.01, //1:500的比例尺，纬度大概减去0.01就会在地图上一半的中间了
            16: 0.005, //1:200的比例尺，纬度大概减去0.005就会在地图上一半的中间了
            17: 0.003, //1:100的比例尺，纬度大概减去0.003就会在地图上一半的中间了
            18: 0.0015, //1:50的比例尺，纬度大概减去0.0015就会在地图上一半的中间了
            19: 0.0008, //1:20的比例尺，纬度大概减去0.0008就会在地图上一半的中间了
        };
        return _zoomObj[_zoom];
    }
    // 获取 Text 的回调方法
    _getClusterTextCallBack (markers) {
        let self = this._coreMap;
        let _haNum = markers.length;
        // 新楼盘地图找房
        if (self._setting.mode == 'ha') {
            return  `${_haNum}个小区`;
        }

        // 房屋置换、二手房、租房
        let _houseNum = 0;
        if (['trade', 'forsale', 'lease'].includes(self._setting.mode)) {
            for(let marker of markers) {
                _houseNum += marker.getNum();
            }
            return `<span style="margin-top: 4px;display: block;">${_haNum}个小区<br>${_houseNum}套</span>`;
        }
        return '';
    }
    // 复杂覆盖物的点击事件
    _getMarkerCallBack (marker) {
        let self = this._coreMap;
        // 房屋置换、二手房、租房
        if (['trade', 'forsale', 'lease'].includes(self._setting.mode)) {
            EventWrapper.addDomListener(marker._div, 'touchend', function() {
                let currentHa = marker.getHa();
                if (self._haClickedMarker) {
                    let clickedHa = self._haClickedMarker.getHa();
                    if (clickedHa['haCode'] == currentHa['haCode']) {
                        return true;
                    }
                }
                //更新marker的填充颜色
                marker.setBackGround(self._haClickedColor);
                // self._sigHaClick = true;
                let _latlng = {...marker.getPosition()}
                // 产品需求： 小区气泡位于除列表外，地图页面的中央 ！！！
                _latlng['lat'] -= self._getMiuteLat();
                let _position = new BMap.Point(_latlng.lng, _latlng.lat);
                self._map.panTo(_position);
                //此时不触发 地图移动超过 500米 加载更多小区的事件
                self._sigNotNeedLoadMoveEvent = true;
                //如果有小区图标变了颜色，则把前置的小区图标的颜色回归正常
                self._checkPrevHaMarker();
                // 当前小区变为 前置小区
                self._haClickedMarker = marker;
                // 获取小区房源列表
                self.getHaDetail(currentHa);
            });
            return true;
        }

        // 新楼盘地图找房
        if (self._setting.mode == 'ha') {
            EventWrapper.addDomListener(marker._div, 'touchend', () => {
                let currentHa = marker.getHa();
                if (typeof self._setting.haMarkerClickCallBack == 'function') {
                    self._setting.haMarkerClickCallBack(currentHa['haCode']);
                }
            });
            return true;
        }
    }
    // 检测是否有小区点过了
    _checkPrevHaMarker () {
        let self = this;
        //是否有已点击的小区图标信息
        if (self._haClickedMarker) {
            self._haClickedMarker.setBackGround(self._clusterFillColor, 'unset');
            self._haClickedMarker = null;
        }
    }
    //获取小区详情
    getHaDetail (ha) {
        let self = this;
        let _haCode = ha['haCode'];
        if (this._triggerHaCallBack(_haCode)) {
            return true;
        }
        //构造参数信息
        self._haParam['ha'] = _haCode;
        self._haParam['page'] = 1;
        self._getHaHouseData(data => {
            self._haData[_haCode] = {
                ha,
                houseList: data,
            }
            self._triggerHaCallBack(_haCode);
        });
    }
    //加载更多房源
    loadMoreHouse (_haCode) {
        let self = this;
        //获取下一页数据
        self._haParam['page'] += 1;
        self._getHaHouseData(data => {
            self._haData[_haCode]['houseList']['items'].push.apply(self._haData[_haCode]['houseList']['items'], data.items);
            self._triggerHaCallBack(_haCode);
        });
    }
    // 获取小区房源信息
    _getHaHouseData (callback) {
        let self = this;
        if (self.haAjaxHandle) {
            self._hideLoading();
            self.haAjaxHandle.abort();
            return;
        }

        self._showLoading();
        self.haAjaxHandle = $.ajax({
            url: self._setting.api.haHouseUrl,
            data: self._haParam,
            dataType: 'json',
            success: function(data) {
                self._hideLoading();
                if (data.status == 200) {
                    if (!data.data.totalSize) {
                        self.toast("暂未获取到该小区相关房源信息，请稍后再试！");
                        return false;
                    }
                    callback.call(self, data.data);
                } else {
                    self.toast(data.errmsg);
                }
            },
            complete: function() {
                self._hideLoading();
                self.haAjaxHandle = null;
            }
        })
    }
    _triggerHaCallBack (haCode) {
        if (!this._haData[haCode]) {
            return false;
        }
        if (typeof this._setting.getHaCallBack == 'function') {
            this._setting.getHaCallBack(this._haData[haCode]);
            this._sigGetHaCallBack = true;
            return true;
        }
    }
    //获取 SVGIcon 圆形覆盖物
    _getSVGIconOverlayCircle (diameter, color, text, latlng) {
        let iconOptions = {
            'background': color,
            'width': `${diameter}px`,
            'height': `${diameter}px`,
        };
        return new SVGIconOverlay(latlng, text, iconOptions);
    }
    // 获取复杂覆盖物文字
    _getMarkerText (haName, cnt, price) {
        if (this._setting.mode == 'trade') {
            return `${haName} ${price}元/㎡ ${cnt}套`;
        }

        if (this._setting.mode == 'ha') {
            return haName;
        }

        return '';
    }
    //获取 SVGIcon 多边形覆盖物
    _getSVGIconOverlayPolygon (properties) {
        let ha_name = properties.haName;
        let house_num = properties.cnt ? parseInt(properties.cnt) : 0;
        let price = this._setting.formatPrice(properties.price);
        let text = this._getMarkerText(ha_name, house_num, price);
        let _latlngArr = properties.gps.split(',');
        // 必须 是 BMap.Point， 否则聚合时会聚合不到一起
        let latlng = new BMap.Point(_latlngArr[1], _latlngArr[0]);
        return new SVGIconOverlayPolygon(latlng, text, house_num, properties);
    }
    //暂时删除move 和 zoom 的监听事件
    _temporaryRemoveMapEventListener () {
        this._map.removeEventListener("movestart", this._moveStartHandler);
        this._map.removeEventListener("moveend", this._moveEndHandler);
        this._map.removeEventListener("zoomstart", this._zoomStartHandler);
        this._map.removeEventListener("zoomend", this._zoomEndHandler);
    }
    //缩放监听
    onZoom () {
        let self = this;
        self._zoomStartHandler = function () {
            // self._clearCovers();
            self._triggerRemoveHaCallBack();
            self._checkPrevHaMarker();
        }
        self._zoomEndHandler = function() {
            if (self._sigZoomPan) {
                let _center = new BMap.Point(self._clusterParam.lng, self._clusterParam.lat);
                self._map.panTo(_center);
                return true;
            }
            //如果有聚合，缩放只触发 聚合的缩放事件，这里不作处理
            if (self.isCommunityLevel() && self._cluster) {
                return true;
            }
            self.renderAll();
        };
        this._map.addEventListener('zoomstart', self._zoomStartHandler);
        this._map.addEventListener('zoomend', self._zoomEndHandler);
    }

    //移动监听
    onMove () {
        let self = this;
        self._moveStartHandler = function(){
            self._moveStartPoint = self._map.getCenter();
            self._triggerRemoveHaCallBack();
        };
        self._moveEndHandler = function () {
            self._onChangeCenter();
            // if (self._moveendTimeout) {
            //     clearTimeout(self._moveendTimeout);
            // }
            //这里setTimeout是在 聚合执行完_redraw 事件后，再执行该方法
            self._moveendTimeout = setTimeout(function(){
                if (self._sigHaClick) {
                    self._sigHaClick = false;
                    return true;
                }
                if (self._sigZoomPan) {
                    self._sigZoomPan = false;
                    self.renderAll();
                }

                //是否需要重新渲染moveend事件
                if (self._sigNotNeedLoadMoveEvent) {
                    self._sigNotNeedLoadMoveEvent = false;
                    if (self._cluster) {
                        //弃用聚合插件的moveend事件，在这里实现
                        self._cluster._redraw();
                    }
                    return true;
                } else {
                    self._checkPrevHaMarker();
                }

                //是否需要加载小区信息
                if (self._needLoadMoreHa()) {
                    //清除聚合
                    if (self._cluster) {
                        self._cluster._clearLastClusters();
                        // self._cluster = null;
                    }
                    self.renderAll();
                } else if (self._cluster) {
                    //弃用聚合插件的moveend事件，在这里实现
                    self._cluster._redraw();
                }
            }, 100);
        }
        self._map.addEventListener("movestart", self._moveStartHandler);
        self._map.addEventListener("moveend", self._moveEndHandler);
    }
    //是否需要加载小区
    _needLoadMoreHa () {
        if (this.isCommunityLevel()) {
            let _distance = this._map.getDistance(this._moveStartPoint, this._moveEndPoint);
            return _distance > this._loadMoreHaDistance ? true : false;
        }
        return false;
    }
    renderAll () {
        //清除覆盖物
        this._clearCovers();
        this._onChangeCenter();
        this.renderCover();
    }
    _triggerRemoveHaCallBack () {
        //是否有删除小区回调方法，如果有，则调用该方法
        if (typeof this._setting.removeHaCallBack == 'function' && this._sigGetHaCallBack) {
            this._sigGetHaCallBack = false;
            this._setting.removeHaCallBack();
        }
    }
    _clearCovers () {
        this._triggerRemoveHaCallBack();
        // if (this._centerMarker) {
        //     this._map.removeOverlay(this._centerMarker);
        // }
        //清除聚合
        if (this.isCommunityLevel() && this._cluster) return;
        //清除聚合
        if (this.isDistrictLevel() && this._cluster) {
            this._cluster.clearMarkers();
            this._cluster = null;
        }
        //最后执行清除覆盖物
        this._map.clearOverlays();
    }
    renderCover () {
        let self = this;
        //行政区气泡
        if (self.isDistrictLevel()) {
            self.createBubble();
        } else {
            self.createCluster();//小区聚合
        }
    }
    //弹出信息
    toast (msg) {
        if (!this._setting.toast) {
            return;
        }
        this._setting.toast(msg);
    }
    //是否为小区层级
    isCommunityLevel () {
        return (this._map.getZoom() >= this.levelHaMin && this._map.getZoom() <= this.levelHaMax);
    }
    //是否为行政区层级
    isDistrictLevel () {
        return (this._map.getZoom() >= this.levelDistrictMin && this._map.getZoom() <= this.levelDistrictMax);
    }
    //缩放并且移动
    _zoomPan (zoom, latlng) {
        this._sigZoomPan = true;
        this._clusterParam.lat = latlng.lat;
        this._clusterParam.lng = latlng.lng;
        if (this._map.getZoom() != zoom) {
            this._map.setZoom(zoom);
        } else {
            this._map.panTo(latlng);
        }
    }
    //获取中心点
    _onChangeCenter () {
        let center = this._map.getCenter();
        this._moveEndPoint = center;
        this._clusterParam.lat = center.lat;
        this._clusterParam.lng = center.lng;
        this._clusterParam.gps = center.lng+','+center.lat;
    }
    //获取字符串长度
    _getStrLen (str) {
        let l = str.length;
        let blen = 0;
        for(let i = 0; i < l; i++) {
            if ((str.charCodeAt(i) & 0xff00) != 0) {
                blen ++;
            }
            blen ++;
        }
        return blen;
    }
    //获取气泡半径
    _getBubbleSize (size_key, properties) {
        let scope = this.bubbleSizeScope;
        return this._get_scope_value(properties[size_key],
                    this._mapData['statistics']['minCount'],
                    this._mapData['statistics']['maxCount'],
                    scope);
    }
    //获取气泡颜色
    _getBubbleColor (color_key, properties) {
        let scope = [];
        scope = this.bubbleColorScope;
        return this._get_scope_value(properties[color_key],
                    this._mapData['statistics']['minDataValue'],
                    this._mapData['statistics']['maxDataValue'],
                    scope);
    }
    _get_scope_value (value, min, max, scope) {
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
    }
    //显示加载中
    _showLoading () {
        if (typeof this._setting.csfcLoading == 'function') {
            this._setting.csfcLoading(true);
        }
    }
    _hideLoading () {
        if (typeof this._setting.csfcLoading == 'function') {
            this._setting.csfcLoading(false);
        }
    }
    run () {
        this.onZoom();
        this.onMove();
    }
}

export {coreMap, MyGeoLocationControl, MyScaleControl};