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
class MyGeoLocationControl extends BMap.GeolocationControl {
    constructor(opt) {
        super(opt);
        this._setting = opt;
    }
    // 重写initialize方法，获取 dom 元素
    initialize (map) {
        this._dom = super.initialize(map);
        this._map = map;
        this._draw();
        this._checkEventListener();
        return this._dom;
    }

    // 定位图片换成自己的
    _draw () {
        if (this._dom) {
            let geolocationIconDom = this._dom.getElementsByClassName('BMap_geolocationIcon')[0];
            let _backgroundImage = geolocationIconDom.style['background-image'];
            // 如果定位的图片换过了，则换回来！！！
            if (_backgroundImage.includes('/static/img/2019/map_location.png')) {
                return true;
            }
            geolocationIconDom.style['background-image'] = "url('/static/img/2019/map_location.png')";
        }
    }

    // 在locationSuccess 或者 locationError 事件之后， 需要调用 _draw 方法。 
    // 否则 定位控件的图标会还原成 百度地图默认的图标
    _checkEventListener () {
        // 监听定位成功事件
        if (typeof this._setting['locationSuccess'] == 'function') {
            this.addEventListener('locationSuccess', e => {
                this._setting['locationSuccess'](e);
            });
        }

        // 监听定位失败事件
        if (typeof this._setting['locationError'] == 'function') {
            this.addEventListener('locationError', e => {
                this._setting['locationError'](e);
            });
        }

        // fixed: 百度地图蛇精病， 会把定位控件的图标换成自己的， 这里再换回来！
        this._map.addEventListener('tilesloaded', () => {
            this._draw();
        })
    }
}

// 我的比例尺组件
class MyScaleControl extends BMap.ScaleControl {
    initialize (map) {
        this._dom = super.initialize(map);
        if (this._dom) {
            // 因为系统设置了 anchorBL 是 display: none的，这里设置比例尺显示
            this._dom.style.display = "block";
        }
        return this._dom;
    }
}

export {MyGeoLocationControl, MyScaleControl};
