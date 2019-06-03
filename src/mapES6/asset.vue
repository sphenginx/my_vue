<template>
    <div class="MapAsset">
        <div id="allmap"></div>
        <!-- 小区房源信息 -->
        <div class="MapA_popbox" ref="mabox_h" v-if="haHouseList">
            <div class="MapA_cont activeBclick" ref="macont_h" @click="toHaDetail(haHouseList.ha.haCode)">
                <ul class="MapA_cont_info">
                    <li>
                        <h1>{{haHouseList.ha.haName}}</h1>
                        <p>{{haHouseList.ha.distName}} {{haHouseList.ha.streetName}}</p>
                    </li>
                    <li>
                        <span class="red" v-if="haHouseList.ha.hascore">{{haHouseList.ha.hascore}}分</span>
                        <span v-if="!haHouseList.ha.hascore" style="line-height: 0.3rem;">&nbsp;</span>
                        <p v-if="haHouseList.ha.minPrice && haHouseList.ha.maxPrice && flag == 1">
                            <font class="red fb">{{haHouseList.ha.minPrice}}~{{haHouseList.ha.maxPrice}}万元</font>
                        </p>
                        <p v-if="haHouseList.houseList.minPrice && haHouseList.houseList.maxPrice && flag == 2">
                            可套利：<font class="red fb">{{haHouseList.houseList.minPrice}}~{{haHouseList.houseList.maxPrice}}万元</font>
                        </p>
                        <i></i>
                    </li>
                </ul>
            </div>

            <ul class="MapA_list" v-show="haHouseList.houseList" :style="{height: (MA_list ? this.MA_list_h: 'auto')}">
                <li class="activeBclick" v-for="v in haHouseList.houseList.items" @click="toHouseDetail(v.dealCode)">
                    <div>
                        <span class="gray3">{{v.bldgArea}}㎡</span>
                        <template v-if="v.br||v.lr">| {{v.br?v.br+'室':''}}{{v.lr?v.lr+'厅':''}}</template>
                        <template v-if="v.floor">| {{v.floor}}层</template>
                        <template v-if="v.face">| {{v.face}}</template>
                    </div>
                    <div>
                        <span class="red fb">{{formatPrice(v.totalPrice*10000)}}</span>
                        <span v-if="flag==2">可套利 <span class="red fb">{{v.arbitrage?v.arbitrage+'万':'暂无'}}</span></span>
                    </div>
                </li>
                <div class="MapA_more" v-if="haHouseList.houseList.totalSize > haHouseList.houseList.items.length" @click="loadMore(haHouseList.ha.haCode);">加载更多</div>
                <div class="MapA_more" v-else>没有更多信息了~</div>
            </ul>
        </div>
    </div>
</template>
<script>
    import BaiduMap from './baidu_Map.js';
    export default {
        name: 'MapAsset',
        data () {
            return {
                flag: 1, //类型
                haHouseList: '', //小区及房源信息
                coreMap: {},
                MA_list_h: '',
                MA_list: false,
                mode: this.$route.query.mode || 'trade', //地图模式： trade（我要换房）、forsale（二手房）、lease(租房)、ha(新楼盘)
            }
        },
        mounted () {
            this.init();
        },
        watch: {
            '$route'(to, from) {
                //如果来源页面不是小区详情页则重新加载页面
                if(from.name === 'tradeList' && this.$route.name === 'MapAsset') {
                    this.removeHaHouse();
                    this.init();
                }
            },
            MA_list () {
                //获取MapA_list高度
                this.$nextTick(() => {
                    this.MA_list_h = this.$refs.mabox_h.offsetHeight - this.$refs.macont_h.offsetHeight + "px";
                });
            }
        },
        methods: {
            async init () {
                await BaiduMap.init();
                const {coreMap, MyGeoLocationControl, MyScaleControl} = await import('./coreMap.js');
                const mapControl = this._getMapControl({MyGeoLocationControl, MyScaleControl});
                let params = this.buildParam();
                let opt = {
                    mapControl,
                    mode: this.mode, //运行模式： trade、forsale、lease、 ha
                    toast: this.$toast,
                    cityCode: params.city,
                    gps: this.$store.getters.getLocation,
                    params: params,
                    getHaCallBack: this.getHaHouse,
                    removeHaCallBack: this.removeHaHouse,
                    formatPrice: this.formatPrice,
                    csfcLoading: this.csfcLoading,
                    haMarkerClickCallBack: this.toHaDetail,
                }
                this.coreMap = new coreMap(opt);
                this.coreMap.run();
            },
            //展示城市房产loading信息
            csfcLoading (val) {
                if (val) {
                    this.$store.dispatch('showCSFCloader');
                } else {
                    this.$store.dispatch('hideCSFCloader');
                }
            },
            //获取map控件件
            _getMapControl ({MyGeoLocationControl, MyScaleControl}) {
                let _mapControl = [
                    {
                        ctrlClass: MyScaleControl, //比例尺控件
                        opt: {
                            anchor: BMAP_ANCHOR_BOTTOM_LEFT,
                            offset: new BMap.Size(10, 10)
                        }
                    }
                ]
                // 开发环境为方便调试，展示缩放按钮
                if (process.env.NODE_ENV == 'development') {
                    let _navigationCtrl = {
                            ctrlClass: BMap.NavigationControl, //缩放控件
                            opt: {
                                anchor: BMAP_ANCHOR_TOP_LEFT,
                                type: BMAP_NAVIGATION_CONTROL_ZOOM,
                                showZoomInfo: true
                            }
                        }
                    _mapControl.push(_navigationCtrl);
                }
                //搜索的城市 和 当前城市一样时，才会增加定位组件
                if (this.$route.query.cityCode == this.$store.getters.getCity.code || !this.$store.getters.getCity.code) {
                    let _geoLocation = {
                            ctrlClass: MyGeoLocationControl, //地图定位的控件
                            opt: {
                                anchor: BMAP_ANCHOR_TOP_RIGHT,
                                offset: new BMap.Size(10, 10),
                                showAddressBar: false, //不显示地址相关信息
                                locationSuccess: this.locationSuccess, //定位成功事件
                                locationError: this.locationError, //定位失败事件
                            }
                        };
                    _mapControl.push(_geoLocation);
                }
                return _mapControl;
            },
            // 定位成功事件
            locationSuccess (e) {
                this.coreMap._centerPoint = e.point;
                this.coreMap._sigGeoLocation = true;
                this.coreMap.renderCenter();
            },
            // 定位失败事件
            locationError (e) {
                this.$toast('获取定位信息失败，请稍后再试！');
            },
            buildParam () {
                let me = this;
                let query = me.$route.query;
                let params = {
                    city: query.cityCode,
                    flag: query.flag
                }
                me.flag = params.flag;
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
                if (query.bldgArea)
                    params.bldgArea1 = query.bldgArea;
                /*几室 >=  孙产品发现搞错了，这里都传 br1 参数*/
                if (query.br)
                    params.br1 = query.br;
                /*几厅*/
                if (query.lr && query.flag == '1')
                    params.lr1 = query.lr;
                return params;
            },
            getHaHouse (haHouseList) {
                this.haHouseList = haHouseList;
                let _hascore = parseFloat(this.haHouseList.ha.hascore);
                if (_hascore) {
                    this.haHouseList.ha.hascore = _hascore.toFixed(1);
                } else {
                    this.haHouseList.ha.hascore = '';
                }

                //获取MapA_list高度
                this.MA_list = true;
            },
            removeHaHouse () {
                this.haHouseList = '';
            },
            toHaDetail (haCode) {
                this.$router.push({name: 'HaDetail', params: {id: haCode, city: this.$route.query.cityCode}});
            },
            toHouseDetail (dealCode) {
                this.$router.push({name: 'tradeDetail', params: {id: dealCode, city: this.$route.query.cityCode, flag: 1}});
            },
            formatPrice: function (price) {
                return this.$store.getters.mixPrice(price);
            },
            loadMore: function(haCode) {
                this.coreMap.loadMoreHouse(haCode);
            }
        }
    };
</script>

<style scoped>
    .MapAsset {
        height: 100%
    }

    #allmap {
        width: 100%;
        height: 100%;
    }

    .MapA_popbox {
        position: fixed;
        bottom: 0px;
        width: 100%;
        height: 50%;
        background-color: #fff;
        z-index: 201;
    }

    .MapA_cont {

    }

    .MapA_cont_info {
        display: flex;
        font-size: 0.36rem;
        color: #999;
        padding: 0.3rem;
        border-bottom: 1px solid #e6e6e6;
    }

    .MapA_cont_info li:last-child i {
        /*content: '';*/
        width: 0.4rem;
        height: 0.91rem;
        background: url("~@/assets/images/arrow3-right.png") no-repeat center;
        background-size: 60%;
        /*margin: auto;*/
        position: absolute;
        right: 0;
        top: 0.3rem;
    }

    .MapA_cont_info li {
        flex: 1;
        position: relative;
    }

    .MapA_cont_info li:last-child {
        /*flex: 0.9;*/
    }

    .MapA_cont_info li h1 {
        color: #333;
        font-size: 0.48rem;
        line-height: 0.86rem;
    }

    .MapA_cont_info li span {
        line-height: 0.86rem;
    }

    .MapA_list {
        font-size: 0.36rem;
        color: #999;
        overflow-y: auto;
    }

    .MapA_list li {
        padding: 0.3rem;
        border-bottom: 1px solid #e6e6e6;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .MapA_list li div:first-child {
        /*flex: 0.62;*/
        line-height: 0.56rem;
    }

    .MapA_list li div:last-child {
        /*flex: 0.38;*/
        text-align: right;
    }
    .MapA_more {
        text-align: center;
        /*line-height: 0.84rem;*/
        padding: 0.3rem;
    }
</style>