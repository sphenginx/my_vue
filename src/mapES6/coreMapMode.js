/***
 *              ,----------------,              ,---------,
 *         ,-----------------------,          ,"        ,"|
 *       ,"                      ,"|        ,"        ,"  |
 *      +-----------------------+  |      ,"        ,"    |
 *      |  .-----------------.  |  |     +---------+      |
 *      |  |                 |  |  |     | -==----'|      |
 *      |  |  I LOVE DOS!    |  |  |     |         |      |
 *      |  |  Bad command or |  |  |/----|`---=    |      |
 *      |  |  C:\>_          |  |  |   ,/|==== ooo |      ;
 *      |  |                 |  |  |  // |(((( [33]|    ,"
 *      |  `-----------------'  |," .;'| |((((     |  ,"
 *      +-----------------------+  ;;  | |         |,"
 *         /_)______________(_/  //'   | +---------+
 *    ___________________________/___  `,
 *   /  oooooooooooooooo  .o.  oooo /,   \,"-----------
 *  / ==ooooooooooooooo==.o.  ooo= //   ,`\--{)B     ,"
 * /_==__==========__==_ooo__ooo=_/'   /___________,"
 *
 */
/**
  * 地图找房运行模式类
  *
  * @Author     : Sphenginx
  * @DateTime   : 2019-06-11 10:33:57
  * @Version    : 1.0
  *
  */
// 运行模式类
class abstractMode {
    constructor (coreMap) {
        this.coreMap = coreMap;
        this._initParams();
        this._initApi();
        //行政区 ajax 参数信息
        this.coreMap._distParams = {...this.coreMap._setting.params};
        this.coreMap._distParams['pageSize'] = 50; // 要获取所有行政区的数据，这里传 50
        //小区 ajax 参数信息
        this.coreMap._clusterParam = {...this.coreMap._setting.params};
        this.coreMap._clusterParam['pageSize']  = 20;
        this.coreMap._clusterParam['coordType'] = 'bd09ll';
        this.coreMap._clusterParam['distance']  = 1000;
        //房源 ajax 参数信息
        this.coreMap._haParam = {...this.coreMap._setting.params};
        this.coreMap._haParam['pageSize'] = 10; //默认展示10条
    }
    // 初始化参数信息， 子类按需重写该方法
    _initParams () {}
    // 初始化API 信息， 子类按需重写该方法
    _initApi () {}
    // 地区数据的价格key
    get distPriceKey () {
        return 'price';
    }
    // 小区数据的价格key
    get haPriceKey () {
        return 'price';
    }
    // 格式化处理行政区返回的数据
    resultDistHandler (data) {
        data.valid = data.totalSize;
        return data;
    }
    // 小区 gps的 key 是 gps 
    _getPoint (ha) {
        let [lat, lng] = ha['gps'].split(',');
        return {lng, lat};
    }
    // 行政区点击事件
    distClick (dist, distCorePoint) {
        this.coreMap._sigDistrictClick = true;
        // this.coreMap.dist = dist.distCode;
        this.coreMap._zoomPan(this.coreMap._distClickZoom, distCorePoint);
    }
    // 渲染行政区后检测是否有小区信息，有就触发行政区的点击事件
    checkHaParams() {
        if(!this.coreMap._setting.params.ha) return;
        if(this.coreMap._distOverlay.length > 1) return;
        let [{_dist, _latlng}] = this.coreMap._distOverlay;
        // setTimeout(() => {
            this.distClick(_dist, _latlng);
        // }, 100);
    }
    // 渲染小区后检测是否有小区信息，有就删除小区信息
    _checkHaParams() {
        if(this.coreMap._setting.params.ha) {
            delete this.coreMap._setting.params.ha;
        }

        if(this.coreMap._distParams.ha) {
            delete this.coreMap._distParams.ha;
        }

        if(this.coreMap._clusterParam.ha) {
            delete this.coreMap._clusterParam.ha;
        }

        if(this.coreMap._haParam.ha) {
            delete this.coreMap._haParam.ha;
        }
    }
    // 构建小区查询参数信息
    buildClusterParams () {
        if(!this.coreMap._sigDistrictClick) {
            this._checkHaParams();
        }
    }
    // 构建房源查询参数信息
    buildHouseParams () {
        
    }
    // 获取价格信息
    _getHaPrice (ha) {
        return this.coreMap._setting.vue.formatPrice(ha.price)
    }
    // 获取复杂覆盖物文字
    _getMarkerText (haName, cnt, price) {
        return `${haName} ${price}元/㎡ ${cnt}套`;
    }
    // 聚合覆盖物的回调
    _getClusterTextCallBack (markers) {
        let _haNum = markers.length;
        let _houseNum = 0;
        for(let marker of markers) {
            _houseNum += marker.getNum();
        }
        return `<span style="margin-top: 4px;display: block;">${_haNum}个小区<br>${_houseNum}套</span>`;
    }
    // 小区气泡的点击回调方法
    _getMarkerCallBack (marker) {
        let currentHa = marker.getHa();
        if (this._haClickedMarker) {
            let {haCode} = this._haClickedMarker.getHa();
            if (haCode == currentHa['haCode']) {
                return true;
            }
        }
        //更新marker的填充颜色
        marker.setBackGround(this.coreMap._haClickedColor);
        let _position = this._getHalfCenterPoint(marker.getPosition());
        this.coreMap._map.panTo(_position);
        //此时不触发 地图移动超过 500米 加载更多小区的事件
        this.coreMap._sigNotNeedLoadMoveEvent = true;
        // 获取小区房源列表
        this.coreMap.getHaDetail(currentHa);
        //如果有小区图标变了颜色，则把前置的小区图标的颜色回归正常
        this._checkPrevHaMarker(marker);
    }
    // 重置前置小区，及设置当前小区为前置小区
    _checkPrevHaMarker(marker = null) {
        //是否有已点击的小区图标信息
        if (this._haClickedMarker) {
            this._haClickedMarker.setBackGround(this.coreMap._clusterFillColor, 'unset');
        }
        this._haClickedMarker = marker;
    }
    // 产品需求： 小区气泡位于除列表外，地图页面的中央 ！！！
    _getHalfCenterPoint(point) {
        let pixel = this.coreMap._map.pointToOverlayPixel(point);
        pixel.y += document.body.offsetHeight/4;
        return this.coreMap._map.overlayPixelToPoint(pixel);
    }
    // 过滤小区信息
    filterHa (ha) {
        let _hascore = parseFloat(ha.hascore);
        if (_hascore) {
            ha.hascore = _hascore.toFixed(1);
        } else {
            ha.hascore = '';
        }
        return ha;
    }
    // 过滤点击行政区后返回的 firstGps 字段
    filterFirstGps(gps) {
        let lng = null;
        let lat = null;
        if (gps) {
            [lat, lng] = gps.split(',');
        }
        return [lng, lat];
    }
}

// 房屋置换模式
export class tradeMode extends abstractMode {
    _initParams () {
        let query = this.coreMap._setting.params;
        let params = {
            saleOrLease: 'forsale', //房屋置换都是出售模式
            propType: 11, //房屋置换只查楼盘小区类型的
            city: query.cityCode,
            flag: query.flag
        }
        // 是否是市区
        params['urban'] = query.urban ? query.urban : 0;
        /*小区得分*/
        if (query.hascore)
            params.score1 = query.hascore;
        if (query.flag == '1') {
            params.totalPrice3 = query.price;
        } else if (query.flag == '2') {
            params.totalPrice2 = query.price;
        }
        /*面积*/
        if (query.bldgArea) {
            params.bldgArea1 = query.bldgArea;
        }
        /*几室 >=  孙产品发现搞错了，这里都传 br1 参数*/
        if (query.br) {
            params.br1 = query.br;
        }
        /*几厅*/
        if (query.lr && query.flag == '1') {
            params.lr1 = query.lr;
        }
        this.coreMap._setting.params = params;
    }

    _initApi () {
        this.coreMap._setting.api = {
            distUrl: "/api/deal/distSearch", //1.2接口
            haListUrl: "/api/deal/haSearch", //1.3接口
            haHouseUrl: "/api/deal/search", //1.5接口
        }
    }

    distClick (dist, distCorePoint) {
        this.coreMap._sigDistrictClick = true;
        this.coreMap._clusterParam['district'] = dist.distCode;
        //改善型置换，需要跳转至该行政区评分最高的小区
        if (this.coreMap._setting.params['flag'] == 1) {
            this.coreMap._clusterParam['orderBy'] = 1;
        }
        //套利型置换, 需要跳转至该行政区平均单价最低的小区
        if (this.coreMap._setting.params['flag'] == 2) {
            this.coreMap._clusterParam['orderBy'] = 3;
        }
        // this.coreMap.dist = dist.distCode;
        this.coreMap._zoomPan(this.coreMap._distClickZoom, distCorePoint);
    }
    buildClusterParams () {
        super.buildClusterParams();
        //如果不是点击行政区加载小区列表，那么不传行政区 及 排序参数
        if (!this.coreMap._sigDistrictClick) {
            delete this.coreMap._clusterParam['district'];
            delete this.coreMap._clusterParam['orderBy'];
            this.coreMap._clusterParam['distance'] = 1000;
        } else {
            delete this.coreMap._clusterParam['gps'];
            delete this.coreMap._clusterParam['lng'];
            delete this.coreMap._clusterParam['lat'];
            delete this.coreMap._clusterParam['distance'];
        }
    }
}

// 楼盘小区模式
export class haMode extends abstractMode {
    _initParams () {
        // 地图页面不传 行政区信息
        if (this.coreMap._setting.params.distcode) {
            delete this.coreMap._setting.params.distcode;
        }
        // 删除附近参数
        if (this.coreMap._setting.params.location) {
            delete this.coreMap._setting.params.location;
        }
    }
    _initApi () {
        this.coreMap._setting.api = {
            distUrl: "/api/deal/distlist", //1.7接口
            haListUrl: "/api/deal/order-newhaSearch", //1.9接口
            // 点击楼盘小区图标直接跳转，不获取房源列表
            // haHouseUrl: "/api/deal/order-newSearch", //1.10接口
        }
    }
    buildClusterParams () {
        super.buildClusterParams();
        let {lng, lat, distance} = this.coreMap._clusterParam;
        // 定义location参数 及 coordType参数
        this.coreMap._clusterParam['location'] = `${lng}|${lat}|${distance}`;
        delete this.coreMap._clusterParam['gps'];
        delete this.coreMap._clusterParam['lng'];
        delete this.coreMap._clusterParam['lat'];
    }
    resultDistHandler (data) {
        data.valid = data.items.length;
        return data;
    }
    get distPriceKey () {
        return 'salePrice';
    }
    // 小区 gps的 key 是 location 
    _getPoint (ha) {
        let [lng, lat] = ha['location'].split(',');
        return {lng, lat};
    }
    // 获取复杂覆盖物文字
    _getMarkerText (haName) {
        return haName;
    }
    // 回聚合覆盖物的回调
    _getClusterTextCallBack (markers) {
        return  `${markers.length}个小区`;
    }
    _getMarkerCallBack (marker) {
        let {haCode} = marker.getHa();
        this.coreMap._setting.vue.toHaDetail(haCode);
    }
    // 过滤点击行政区后返回的 firstGps 字段
    filterFirstGps(gps) {
        let lng = null;
        let lat = null;
        if (gps) {
            [lng, lat] = gps.split(',');
        }
        return [lng, lat];
    }
}

// 房屋交易模式： forsale、lease
export class dealMode extends abstractMode {
    _initParams () {
        // 地图页面不传 行政区信息
        if (this.coreMap._setting.params.district) {
            delete this.coreMap._setting.params.district;
        }
        // 删除附近参数
        if (this.coreMap._setting.params.gps) {
            delete this.coreMap._setting.params.gps;
        }
        if (this.coreMap._setting.params.distance) {
            delete this.coreMap._setting.params.distance;
        }
    }
    _initApi () {
        this.coreMap._setting.api = {
            distUrl: "/api/deal/distSearch", //1.2接口
            haListUrl: "/api/deal/order-haSearch", //1.8接口
            haHouseUrl: "/api/deal/order-newSearch", //1.10接口
        }
    }
    // 小区数据的价格key
    get haPriceKey () {
        let _key = 'price';
        if (this.coreMap._setting.params.saleOrLease == 'lease') {
            _key = 'leasePrice';
        }
        return _key;
    }
    // 获取小区的价格信息
    _getHaPrice (ha) {
        let price = ha.price;
        if (this.coreMap._setting.params.saleOrLease == 'lease') {
            price = ha.leasePrice;
        }
        if (price) {
            return this.coreMap._setting.vue.formatPrice(price)
        } else {
            return '--';
        }
    }
    // 获取复杂覆盖物文字
    _getMarkerText (haName, cnt, price) {
        let unit = '元/㎡';
        if (this.coreMap._setting.params.saleOrLease == 'lease') {
            unit = '元/月/㎡';
        }
        let _text = `${haName} ${price}${unit}`;
        if (cnt) {
            _text += ` ${cnt}套`;
        }
        return _text;
    }
    // 过滤小区信息 （评分）
    filterHa (ha) {
        if (!ha.hascore) {
            return ha;
        }
        let _hascore = parseFloat(ha.hascore.score);
        if (_hascore) {
            ha.hascore = _hascore.toFixed(1);
        } else {
            ha.hascore = '';
        }
        return ha;
    }
}
