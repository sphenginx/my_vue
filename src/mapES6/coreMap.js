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
import * as coreMapMode from './coreMapMode.js'
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
export class coreMap {
    constructor (opt) {
        //气泡颜色列表
        this.bubbleColorScope = [
            '#f17881', '#dd4f51','#ff4848',
            '#d12020', '#9d1212',
        ];
        //气泡大小列表
        this.bubbleSizeScope = [24, 26, 28, 30, 32];
        //自适应zoom
        this._adaptateZoom = true;

        this._haData = {}; //小区数据
        this._centerPoint = []; //中心点信息

        //加载更多小区的移动距离
        this._loadMoreHaDistance = 500;
        // 聚合图标填充色
        this._clusterFillColor = '#ff4848';
        // 点击小区之后的颜色
        this._haClickedColor = '#ff7700';

        // 显示行政区的 zoom 区间
        this.levelDistrictMin = 9;
        this.levelDistrictMax = 14;
        // 显示小区的 zoom 区间
        this.levelHaMin = 15;
        this.levelHaMax = 19;

        this._map = null;
        this._mapData = null;
        this._mode = null; //运行模式
        this._distParams = {};   //行政区参数
        this._distOverlay = [];      // 聚合的行政区信息
        this._clusterParam = {}; //小区列表参数
        this._cluster = null;    // 百度地图聚合对象
        this._clusterHandler = null; //axios 请求句柄
        this._haParam = {};      //小区房源参数

        this._moveStartPoint = null; //移动开始坐标点
        this._moveEndPoint = null; //移动结束坐标点
        this._moveendTimeout = null;
        this._moveStartHandler = null;
        this._moveEndHandler = null;
        this._zoomEndHandler = null;

        // 各种标识
        this._sigGetHaCallBack = false; //回调标识
        this._sigZoomPan = false; //zoom 和 移动标识
        this._sigDistrictClick = false; //是否点击了行政区
        this._sigNotNeedLoadMoveEvent = false; //是否需要重新渲染moveend 事件

        this._defaultZoom = 12; //默认展示级别
        this._distClickZoom = 17; //点击行政区 跳转到 1：100 米的比例尺
        this._distColors = {};
        this.init(opt);
    }
    init (opt) {
        // 默认参数
        let def = {
            mapId: "allmap", //地图Id
            mapOpts: {
                minZoom: 9, //最小9： 1:25公里
                maxZoom: 19, //最大19：1:20米
            }, //地图初始化选项
            gps: "", //gps
            params: "", //参数信息
        };
        this._setting = extend(def, opt, true); //配置参数
        this._initMode();
        this._initMap();
        this.renderCover();
    }
    // 初始化运行模式信息
    _initMode () {
        const mode = coreMapMode[`${this._setting.vue.mode}Mode`];
        if(!mode) {
            this.toast('mode参数错误！');
            throw new Error('mode参数错误！');
        }
        this._mode = new mode(this);
    }
    // 初始化地图信息
    _initMap () {
        this._map = new BMap.Map(this._setting.mapId, this._setting.mapOpts);
        let [lng, lat] =  this._setting.gps.split(',');
        this._centerPoint = new BMap.Point(lng, lat);
        this._map.centerAndZoom(this._centerPoint, this._defaultZoom);
    }
    // 添加地图控件
    addMapControl (mapControl) {
        if (!mapControl.length) {
            return;
        }
        for (let {ctrlClass, opt} of mapControl) {
            let _controlObj = new ctrlClass(opt);
            this._map.addControl(_controlObj);
        }
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
        this._setting.vue.axios.get(this._setting.api.distUrl, {
            params: self._distParams,
            CSFCLoading: true,
            nolazyloading: true,
            withCredentials:true,
        }).then(({status, data}) => {
            if (status == 200 && data.status == 200) {
                let distData = self._mode.resultDistHandler(data.data);
                if (!distData.valid) {
                    self.toast("根据条件未获取到行政区数据！");
                    return false;
                }
                callback.call(self, distData);
            } else {
                self.toast(data.errmsg);
            }
        })
    }
    //渲染气泡
    _renderBubble (data) {
        let self = this;
        let _points = [];
        self._distOverlay = [];
        for (let _dist of data.items) {
            //没有坐标进行下次轮询
            if (!_dist['gpsbd']) {
                continue;
            }
            let radius = 24;
            let color  = '#e4e4e4';
            let priceKey = self._mode.distPriceKey;
            if (_dist[priceKey]) {
                radius = self._getBubbleSize('cnt', _dist);
                color = self._getBubbleColor(priceKey, _dist);
            }
            self._distColors[_dist.distCode] = color;
            const [lat, lng] = _dist['gpsbd'].split(',');
            const _latlng = new BMap.Point(lng, lat);
            //组合坐标信息
            _points.push(_latlng);
            let distOverlay = self._getSVGIconOverlayCircle(radius, color, _dist.distName, _latlng);
            self._map.addOverlay(distOverlay);
            self._distOverlay.push({_dist, _latlng});
            //绑定行政区气泡的点击事件
            EventWrapper.addDomListener(distOverlay._div, "touchend", () => {
                self._mode.distClick(_dist, _latlng);
            });
        }
        //是否自适应缩放级别
        if (self._adaptateZoom) {
            self._adaptateZoom = false;
            self.adaptateZoom(_points);
        }

        // 检测是否有小区信息
        self._mode.checkHaParams();
    }
    //获取 SVGIcon 圆形覆盖物
    _getSVGIconOverlayCircle (radius, color, text, latlng) {
        let diameter = radius * 2; // 宽高需要是直径
        let iconOptions = {
            'background': color,
            'width': `${diameter}px`,
            'height': `${diameter}px`,
            'opacity': 1,
        };
        return new SVGIconOverlay(latlng, text, iconOptions);
    }
    //自适应缩放级别 及 中心点
    adaptateZoom (points) {  
        if(!points.length) return;
        let maxLng = points[0].lng;
        let minLng = points[0].lng;
        let maxLat = points[0].lat;
        let minLat = points[0].lat;
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
        this.run();
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
        if (self._clusterHandler) {
            self._clusterHandler.cancel('cancel repeat request');
        }
        // 检测小区参数信息
        self._mode.buildClusterParams();
        const cancelToken = self._setting.vue.axios.CancelToken;
        const source = cancelToken.source();
        self._clusterHandler = source;
        //获取小区数据
        self._setting.vue.axios.get(self._setting.api.haListUrl, {
            cancelToken: source.token,
            params: self._clusterParam,
            CSFCLoading: true,
            nolazyloading: true,
            withCredentials:true,
        }).then(({status, data}) => {
            if (status == 200 && data.status == 200) {
                if (!data.data.totalSize) {
                    // self.toast("暂未获取到该位置附近小区信息!");
                    return false;
                }
                self._createClusters(data.data);
                self._checkSigDistrictClick(data.data);
            } else {
                self.toast(data.errmsg);
            }
        })
        .catch(err => console.log(err))
        .finally(() => self._clusterHandler = null);
    }
    //检测是否是行政区点击进来的！
    _checkSigDistrictClick (data) {
        if (!this._sigDistrictClick) {
            return;
        }
        // 点击行政区标识 设为 false
        this._sigDistrictClick = false;

        let [lng, lat] = this._mode.filterFirstGps(data.orderByFirstGps);
        if (!lng || !lat) {
            return;
        }
        let position = new BMap.Point(lng, lat);
        // 行政区标识设为true，不重新加载地图移动的事件
        this._sigNotNeedLoadMoveEvent = true;
        this._map.panTo(position);
    }
    _createClusters (data) {
        let self = this;
        let markers = [];
        for (let ha of data.items) {
            let haOverlay = self._getSVGIconOverlayPolygon(ha);
            markers.push(haOverlay);
        }

        // 构造百度地图聚合的参数
        let opts = {
            coreMap: self,
            textCallBack: self._mode._getClusterTextCallBack,
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
    //获取 SVGIcon 多边形覆盖物
    _getSVGIconOverlayPolygon (ha) {
        ha = this._mode.filterHa(ha);
        let ha_name = ha.haName;
        let house_num = ha.cnt ? parseInt(ha.cnt) : 0;
        let price = this._mode._getHaPrice(ha);
        let text = this._mode._getMarkerText(ha_name, house_num, price);
        let {lng, lat} = this._mode._getPoint(ha);
        // 必须 是 BMap.Point， 否则聚合时会聚合不到一起
        let latlng = new BMap.Point(lng, lat);
        return new SVGIconOverlayPolygon(latlng, text, house_num, ha);
    }
    // 复杂覆盖物的点击事件
    _getMarkerCallBack (marker) {
        let self = this._coreMap;
        EventWrapper.addDomListener(marker._div, 'touchend', () => {
            self._mode._getMarkerCallBack(marker);
        });
    }
    // 检测是否有小区点过了
    _checkPrevHaMarker () {
        this._mode._checkPrevHaMarker();
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
            self._haData[_haCode] = {ha, houseList: data}
            self._triggerHaCallBack(_haCode);
        });
    }
    //加载更多房源
    loadMoreHouse (_haCode) {
        let self = this;
        //获取下一页数据
        self._haParam['page'] += 1;
        self._getHaHouseData(data => {
            self._haData[_haCode]['houseList']['items'].push(...data.items);
            self._triggerHaCallBack(_haCode);
        });
    }
    // 获取小区房源信息
    _getHaHouseData (callback) {
        let self = this;
        self._setting.vue.axios.get(self._setting.api.haHouseUrl, {
            params: self._haParam,
            CSFCLoading: true,
            nolazyloading: true,
            withCredentials: true,
        }).then(({status, data}) => {
            if (status == 200 && data.status == 200) {
                if (!data.data.totalSize) {
                    self.toast("暂未获取到该小区相关房源信息，请稍后再试！");
                    return false;
                }
                callback.call(self, data.data);
            } else {
                self.toast(data.errmsg);
            }
        })
    }
    _triggerHaCallBack (haCode) {
        if (!this._haData[haCode]) {
            return false;
        }
        this._setting.vue.getHaHouse(this._haData[haCode]);
        this._sigGetHaCallBack = true;
        return true;
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
                //弃用聚合插件的zoomend事件，在这里实现
                setTimeout(() => {self._cluster._redraw()}, 100);
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
        self._moveStartHandler = () => {
            self._moveStartPoint = self._map.getCenter();
            self._triggerRemoveHaCallBack();
        };
        self._moveEndHandler = () => {
            self._onChangeCenter();
            setTimeout(() => {
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
                        self._cluster.clearMarkers();
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
        if (this._sigGetHaCallBack) {
            this._sigGetHaCallBack = false;
            this._setting.vue.removeHaHouse();
        }
    }
    _clearCovers () {
        this._triggerRemoveHaCallBack();
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
        this._setting.vue.$toast(msg);
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
        this._clusterParam.gps = `${center.lng},${center.lat}`;
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
    run () {
        this.onZoom();
        this.onMove();
    }
}
