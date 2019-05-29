<template>
    <div class="MapAsset">
        <div id="allmap"></div>
    </div>
</template>
<script>
    import BaiduMap from './baidu_Map.js';
    export default {
        name: 'MapAsset',
        data () {
            return {
                coreMap: {}, //地图类
            }
        },
        mounted: function () {
            this.init();
        },
        methods: {
            async init () {
                await BaiduMap.init();
                const {default: coreMap} = await import('./coreMap.js');
                let opt = {
                    mapControl: [
                        {
                            code: "ScaleControl", //比例尺控件
                            opt: {
                                anchor: BMAP_ANCHOR_BOTTOM_LEFT,
                                offset: new BMap.Size(1, 46)
                            }
                        },
                        // {
                        //     code: "GeolocationControl", //地图定位的控件
                        //     opt: {
                        //         anchor: BMAP_ANCHOR_BOTTOM_LEFT,
                        //         offset: new BMap.Size(19, 10),
                        //         // locationIcon: '/static/img/2019/location.png'
                        //     }
                        // }
                    ],
                    toast: this.$toast,
                    cityCode: 'qd',
                    gps: "120.38442818,36.1052149",
                }
                this.coreMap = new coreMap(opt);
                this.coreMap.run();
            }
        }
    };
</script>

<style scoped>
.MapAsset {
    height: 100%
}
#allmap {
    width:100%; 
    height:100%;
}
</style>