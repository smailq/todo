import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';
const moment = require('moment');

Vue.config.productionTip = false;

Vue.filter('format_moment', function(dateStr, formatString) {
  // return processed value
  return moment(dateStr).format(formatString);
});

new Vue({
  vuetify,
  render: h => h(App)
}).$mount('#app');
