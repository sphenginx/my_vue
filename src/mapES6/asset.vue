<template>
    <div class="MapAsset">
        <div id="allmap"></div>
        <div class="MapA_popbox" ref="mabox_h" v-if="haHouseList">
            <!-- 小区信息 -->
            <div class="MapA_cont activeBclick" ref="macont_h" @click="toHaDetail(haHouseList.ha.haCode)">
                <ul class="MapA_cont_info">
                    <li>
                        <h1>{{haHouseList.ha.haName}}</h1>
                        <p>{{haHouseList.ha.distName}} {{haHouseList.ha.streetName}}</p>
                    </li>
                    <li v-if="mode=='trade'" key="trade">
                        <span class="red" v-if="haHouseList.ha.hascore">{{haHouseList.ha.hascore}}分</span>
                        <span v-else style="line-height: 0.3rem;">&nbsp;</span>
                        <p v-if="haHouseList.ha.minPrice && haHouseList.ha.maxPrice && $route.query.flag == 1">
                            <font class="red fb">{{formatPrice(haHouseList.ha.minPrice)}}~{{formatPrice(haHouseList.ha.maxPrice)}}万元</font>
                        </p>
                        <p v-if="haHouseList.houseList.minPrice && haHouseList.houseList.maxPrice && $route.query.flag == 2">
                            可套利：<font class="red fb">{{formatPrice(haHouseList.houseList.minPrice)}}~{{formatPrice(haHouseList.houseList.maxPrice)}}万元</font>
                        </p>
                        <i></i>
                    </li>
                    <li v-if="mode=='deal'" key="deal">
                        <span class="red" v-if="haHouseList.ha.hascore">{{haHouseList.ha.hascore}}分</span>
                        <span v-else style="line-height: 0.3rem;">&nbsp;</span>
                        <p v-if="haHouseList.houseList.minPrice && haHouseList.houseList.maxPrice">
                            <font class="red fb">
                                {{formatPrice(haHouseList.houseList.minPrice)}}~{{formatPrice(haHouseList.houseList.maxPrice)}}{{$route.query.saleOrLease == 'forsale' ? '万元' : '元/月'}}
                            </font>
                        </p>
                        <i></i>
                    </li>
                </ul>
            </div>
            <!-- 房源信息 -->
            <ul class="MapA_list" v-show="haHouseList.houseList" :style="{height: this.MA_list_h}">
                <li class="activeBclick" v-for="v in haHouseList.houseList.items" @click="toHouseDetail(v.dealCode)" :key="v.dealCode">
                    <div>
                        <span class="gray3">{{v.bldgArea}}㎡</span>
                        <template v-if="v.br||v.lr">| {{v.br?v.br+'室':''}}{{v.lr?v.lr+'厅':''}}</template>
                        <template v-if="v.floor">| {{v.floor}}层</template>
                        <template v-if="v.face">| {{v.face}}</template>
                    </div>
                    <div v-if="mode == 'trade'">
                        <span class="red fb">{{formatPrice(v.totalPrice*10000)}}</span>
                        <span v-if="$route.query.flag==2">可套利 <span class="red fb">{{v.arbitrage?formatPrice(v.arbitrage)+'万':'暂无'}}</span></span>
                    </div>
                    <div v-if="mode == 'deal'">
                        <span class="red fb">{{formatPrice(v.totalPrice)}}{{v.totalPriceUnit}}</span>
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
                mode: null, //地图模式： trade（房屋置换）、forsale（二手房）、lease(租房)、ha(新楼盘)
                haHouseList: null, //小区及房源信息
                coreMap: null,
                MA_list_h: '', //地图房源列表的高度
                reInitList: [ //需要重新加载地图的来源页面
                    "tradeList", //房屋置换
                    "Ha", //新楼盘
                    "selectHouse", //出售、出租房
                ],
                fullPath: '',
            }
        },
        mounted () {
            this.init();
            this.fullPath = this.$route.fullPath;
        },
        watch: {
            '$route'(to, from) {
                if(this.reInitList.includes(from.name) && this.fullPath == to.fullPath) {
                    this.removeHaHouse();
                    this.init();
                }
            },
        },
        methods: {
            async init() {
                await BaiduMap.init();
                const {coreMap} = await import('./coreMap.js');
                this.mode = this.$route.query.mode;
                let opt = {
                    params: this.$route.query,
                    vue: this,
                    gps: this.$store.getters.getLocation,
                }
                this.coreMap = new coreMap(opt);
                this.coreMap.run();
                this.addMapControl();
            },
            async addMapControl () {
                const {MyScaleControl, MyGeoLocationControl} = await import('./MyBMapControl.js');
                let _mapControl = [
                    {
                        ctrlClass: MyScaleControl, //比例尺控件
                        opt: {
                            anchor: BMAP_ANCHOR_BOTTOM_LEFT,
                            offset: new BMap.Size(10, 10)
                        }
                    }
                ];
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
                let cityParam = this.$route.query.cityCode || this.$route.query.city;
                if (cityParam == this.$store.getters.getCity.code) {
                    let _geoLocation = {
                            ctrlClass: MyGeoLocationControl, //地图定位的控件
                            opt: {
                                anchor: BMAP_ANCHOR_TOP_RIGHT,
                                offset: new BMap.Size(10, 10),
                                showAddressBar: false, //不显示地址相关信息
                                coreMap: this.coreMap, //coreMap 对象
                            }
                        };
                    _mapControl.push(_geoLocation);
                }
                this.coreMap.addMapControl(_mapControl);
            },
            getHaHouse(haHouseList) {
                this.haHouseList = haHouseList;
                this.$nextTick(() => {
                    this.MA_list_h = this.$refs.mabox_h.offsetHeight - this.$refs.macont_h.offsetHeight + "px";
                });
            },
            removeHaHouse() {
                this.haHouseList = null;
            },
            toHaDetail(id) {
                let city = this.$route.query.cityCode || this.$route.query.city;
                this.$router.push({name: 'HaDetail', params: {id, city}});
            },
            toHouseDetail(id) {
                let city = this.$route.query.cityCode || this.$route.query.city;
                let flag = this.coreMap._setting.params.saleOrLease == 'lease' ? 2 : 1;
                this.$router.push({name: 'tradeDetail', params: {id, city, flag}});
            },
            formatPrice(price) {
                return this.$store.getters.mixPrice(price);
            },
            loadMore(haCode) {
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