/***
 *  .--,       .--,
 * ( (  \.---./  ) )
 *  '.__/o   o\__.'
 *     {=  ^  =}
 *      >  -  <
 *     /       \
 *    //       \
 *   //|   .   |\
 *   "'\       /'"_.-~^`'-.
 *      \  _  /--'         `
 *    ___)( )(___
 *   (((__) (__)))    高山仰止,景行行止.虽不能至,心向往之。
 */
/**
  * 我的定位控件
  *
  * @Author     : Sphenginx
  * @DateTime   : 2019-05-31 16:38:50
  * @Version    : 2.0
  *
  */
// 我的定位组件
export class MyGeoLocationControl extends BMap.GeolocationControl {
    constructor(opt) {
        super(opt);
        this._setting = opt;
        this._geoLocationMarker = null;
    }
    // 重写initialize方法，获取 dom 元素
    initialize (map) {
        this._dom = super.initialize(map);
        this._map = map;
        this._redraw();
        this._addEventListener();
        return this._dom;
    }
    // 定位控件背景图片换成自己的
    _redraw () {
        if (this._dom) {
            let geolocationIconDom = this._dom.getElementsByClassName('BMap_geolocationIcon')[0];
            let _backgroundImage = geolocationIconDom.style['background-image'];
            // 如果定位控件的背景图片被换成了百度的默认图标，则换回来！！！
            if (_backgroundImage.includes('/static/img/2019/map_location.png')) {
                return true;
            }
            geolocationIconDom.style['background-image'] = "url('/static/img/2019/map_location.png')";
        }
    }
    // 添加事件监听
    _addEventListener () {
        // 监听定位成功事件
        this.addEventListener('locationSuccess', e => {
            let point = e.point;
            if (!point['lat'] || !point['lng']) {
                return false;
            }
            //为了防止多个marker同时出现，先移除之前的marker
            if (this._geoLocationMarker) {
                this._map.removeOverlay(this._geoLocationMarker);
            }
            let icon = new BMap.Symbol(BMap_Symbol_SHAPE_CIRCLE, {
                scale: 10,
                fillColor: "#0a7fff",
                fillOpacity: 1,
                strokeColor: "#0a7fff",
                strokeOpacity: 0.2,
                strokeWeight: 40,
            });
            this._geoLocationMarker = new BMap.Marker(point, {icon});
            this._map.addOverlay(this._geoLocationMarker);
            this._geoLocationMarker.addEventListener('click', () => {
                this._setting.coreMap.toast('我的位置');
            });
        });

        // 监听定位失败事件
        this.addEventListener('locationError', e => {
            this._setting.coreMap.toast('获取定位信息失败，请稍后再试！');
        });

        // fixed: 百度地图蛇精病， 会把定位控件的图标换成自己的， 这里再换回来！
        this._map.addEventListener('tilesloaded', () => {
            this._redraw();
        })
    }
}

// 我的比例尺组件
export class MyScaleControl extends BMap.ScaleControl {
    initialize (map) {
        this._dom = super.initialize(map);
        if (this._dom) {
            // 因为系统设置了 anchorBL 是 display: none的，这里设置比例尺显示
            this._dom.style.display = "block";
        }
        return this._dom;
    }
}
