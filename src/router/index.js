import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router);

import MapAsset from '@/map/asset.vue';

export default new Router({
  routes: [
    {
      	path: '/',
      	name: 'index',
      	component:  resolve => require.ensure([], () => resolve(require('@/pages/index.vue')), 'index')
    },
    {
    	path: '/map',
      	name: 'MapAsset',
      	component:  MapAsset
    }
  ]
})
