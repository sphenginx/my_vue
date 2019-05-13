import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

// page group
const Slide = () => import(/* webpackChunkName: "page" */ '@/pages/slide.vue');

// map group
const MapAsset = () => import(/* webpackChunkName: "map" */ '@/map/asset.vue');

export default new Router({
  routes: [
    {
        path: '/',
        name: 'index',
        component:  Slide
    },
    {
        path: '/map',
        name: 'MapAsset',
        component:  MapAsset
    }
  ]
})
