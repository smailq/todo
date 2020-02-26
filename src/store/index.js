import Vue from 'vue'
import Vuex from 'vuex';

const moment = require('moment');

Vue.use(Vuex);

const debug = process.env.NODE_ENV !== 'production';

// Checks if the string looks like a date
function isDate(str) {
  return /^\d\d\d\d-\d\d-\d\d$/.test(str);
}

// Returns reverse chronologically sorted dates
function compareDates(b, a) {
  if (new Date(a) < new Date(b)) {
    return -1;
  } else if (new Date(a) > new Date(b)) {
    return 1;
  }
  return 0;
}

// compare two strings and sort alphabetically, ignoring case
function compareAlphabetical(a, b) {
  const nameA = a.toUpperCase(); // ignore upper and lowercase
  const nameB = b.toUpperCase(); // ignore upper and lowercase
  if (nameA < nameB) {
    return -1;
  }
  if (nameA > nameB) {
    return 1;
  }
  return 0;
}

export default new Vuex.Store({
  strict: debug,
  state: {
    lists: {},
    schedules: {},

    selectedListName: '',

    // TODO: Make sure this is updated frequently enough, if the user has the app
    //       open while date changes, we need to reflect that
    today: moment(),
  },
  getters: {
    appBarTitle: state => {
      if (isDate(state.selectedListName)) {
        const dayDiff = moment(state.selectedListName).diff(state.today, 'days');
        if (dayDiff === 0) {
          return 'Today';
        } else if (dayDiff === 1) {
          return 'Tomorrow';
        } else if (dayDiff === -1) {
          return 'Yesterday';
        } else {
          return `${dayDiff > 0 ? 'In ' : ''}${Math.abs(dayDiff)} days${dayDiff < 0 ? ' ago' : ''}`;
        }
      } else {
        return state.selectedListName;
      }
    },
    appBarSubtitle: state => {
      if (isDate(state.selectedListName)) {
        return moment(state.selectedListName).format('ddd, MMM D');
      } else {
        return '';
      }
    },
    selectedList: state => {
      return state.selectedListName !== '' ? state.lists[state.selectedListName] : [];
    },
    nextMonday: state => {
      return state.today.day(7 + 1);
    },
    nextSaturday: state => {
      return state.today.day(7 + 6);
    },
    isDatesMode: state => {
      return isDate(state.selectedListName);
    },
    isNotesMode: state => {
      return !isDate(state.selectedListName);
    },
    datedListNames: state => {
      return Object.keys(state.lists)
                   .filter(key => isDate(key))
                   .sort(compareDates);
    },
    noteListNames: state => {
      return Object.keys(state.lists)
                   .filter(key => !isDate(key))
                   .sort(compareAlphabetical);
    },
    notCompletedEntries: state => {
      // TODO: Potentially slow, since it goes through all past entries in all lists
      //       Should optimize this in near future, by actively flagging past due
      //       with sort of hint/index.
      const notCompleted = [];
      // Search for all to do items that hasn't been completed in the past
      for (const [ listName, entries ] of Object.entries(state.lists)) {
        if (!isDate(listName)) {
          continue; // If the list's name is not a date, ignore
        }
        // Skip today or future
        if (moment(listName).isSameOrAfter(moment(), 'day')) {
          continue;
        }
        // For each not completed entry, save to array along with listName
        for (const entry of entries) {
          if (entry.isTodo && !entry.completed) {
            notCompleted.push({ listName, entry });
          }
        }
      }
      return notCompleted;
    },
  },
  mutations: {},
  actions: {},
});
