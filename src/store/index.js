import Vue from 'vue'
import Vuex from 'vuex';
import VuexPersistence from 'vuex-persist';

const moment = require('moment');

const vuexLocal = new VuexPersistence({
  key: 'todo',
  storage: window.localStorage,
});


Vue.use(Vuex);

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

function genId() {
  return `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;
}

function todayStr() {
  return moment().format('YYYY-MM-DD');
}

export default new Vuex.Store({
  plugins: [ vuexLocal.plugin ],
  state: {
    lists: {},
    schedules: {},
    selectedListName: '',
  },
  getters: {
    appBarTitle: state => {
      if (isDate(state.selectedListName)) {
        const selectedDate = moment(state.selectedListName);
        if (selectedDate.isSame(moment(), 'day')) {
          return 'Today';
        } else if (selectedDate.isSame(moment().add(1, 'days'), 'day')) {
          return 'Tomorrow';
        } else if (selectedDate.isSame(moment().subtract(1, 'days'), 'day')) {
          return 'Yesterday';
        } else {
          const today = moment().hour(0).minute(0).second(0).millisecond(0);
          return selectedDate.from(today);
        }
      } else {
        // Notes mode, just show list name as title
        return state.selectedListName;
      }
    },
    appBarSubtitle: state => {
      if (isDate(state.selectedListName)) {
        return moment(state.selectedListName).format('ddd, MMM D');
      }
      return '';
    },
    selectedList: state => {
      return state.selectedListName !== '' ? state.lists[state.selectedListName] : [];
    },
    nextMonday: () => {
      return moment().day(7 + 1);
    },
    nextSaturday: () => {
      return moment().day(7 + 6);
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
    notCompletedEntryExist: state => {
      // TODO: Potentially slow, since it goes through all past entries in all lists
      //       Should optimize this in near future, by actively flagging past due
      //       with sort of hint/index.
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
            return true;
          }
        }
      }
      return false;
    },
  },
  mutations: {
    loadLists(state, lists) {
      state.lists = lists;
    },
    selectList(state, name) {
      state.selectedListName = name;
    },

    addEntry(state, payload) {
      const { listName, text, isTodo } = payload;

      if (text.length < 1) {
        return;
      }

      const newEntryObj = {
        id: genId(),
        text,
        createdAt: new Date(),
        isTodo,
      };

      // See if this looks like a link
      if (/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(text)) {
        newEntryObj.isLink = true;
      }

      // If it's to do, it's not completed
      if (isTodo) {
        newEntryObj.completed = false;
      }

      const existingEntries = state.lists[listName] || [];

      Vue.set(state.lists, listName, [ ...existingEntries, newEntryObj ]);
    }
    ,
    moveNotCompleted(state) {
      const entriesToMove = [];

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
            // Keep track of how many times this task has been delayed
            const delayCount = entry.delayCount || 0;
            // Clone entries to today's list
            entriesToMove.push({ ...entry, delayCount: delayCount + 1 });
            // Delete old
            Vue.set(
              state.lists,
              listName,
              state.lists[listName].filter(val => val.id !== entry.id),
            );
          }
        }
      }

      const targetListName = todayStr();

      // copy them to today's list
      const existingEntries = state.lists[targetListName] || [];

      Vue.set(
        state.lists,
        targetListName,
        [
          ...existingEntries,
          ...entriesToMove,
        ],
      );
    }
    ,
    deleteEntry(state, payload) {
      const { listName, entryId } = payload;

      Vue.set(
        state.lists,
        listName,
        state.lists[listName].filter(val => val.id !== entryId),
      );
    }
    ,
    moveEntry(state, payload) {
      const { fromListName, toListName, entryId } = payload;

      const entry = state.lists[fromListName].find(v => v.id === entryId);

      if (entry === undefined) {
        alert('Sorry, couldn\'t find item to be moved');
        return;
      }

      // Remove from source
      Vue.set(
        state.lists,
        fromListName,
        state.lists[fromListName].filter(v => v.id !== entryId),
      );

      // Insert to target
      const existingEntries = state.lists[toListName] || [];
      Vue.set(
        state.lists,
        toListName,
        [ ...existingEntries, { ...entry } ],
      );
    }
    ,
    deleteList(state, name) {
      Vue.delete(state.lists, name);
      Vue.delete(state.schedules, name);
    }
    ,
    moveList(state, payload) {
      // WARNING - IF dest EXISTS, IT WILL BE REPLACED.
      // MAKE SURE THIS IS WHAT YOU WANT TO DO BEFORE CALLING THIS FUNC

      const { fromName, toName } = payload;

      const tmp = state.lists[fromName];

      if (typeof tmp === 'undefined') {
        // If nothing exists, nothing to do
        return;
      }

      Vue.set(state.lists, toName, [ ...tmp ]);
      Vue.delete(state.lists, fromName);

      // move any scheduled stuff
      const tmpSchedule = state.schedules[fromName];

      if (typeof tmpSchedule === 'undefined') {
        // nothing to do if there is no schedule
        return;
      }

      Vue.set(state.schedules, toName, { ...tmpSchedule });
      Vue.delete(state.schedules, fromName);
    },
    addList(state, name) {
      Vue.set(state.lists, name, []);
    }
    ,
    setSchedule(state, payload) {
      const { listName, scheduleObj } = payload;
      Vue.set(state.schedules, listName, scheduleObj);
    }
    ,
    deleteSchedule(state, name) {
      Vue.delete(state.schedules, name);
    }
    ,
    copyEntries(state, payload) {
      const { fromListName, toListName } = payload;
      const entries = state.lists[fromListName] || [];
      Vue.set(
        state.lists,
        toListName,
        [
          ...state.lists[toListName],
          ...entries.map(v => { // Re-gen id, and add indication that this entry is repeating
            return { ...v, id: genId(), isRepeating: true };
          }),
        ],
      );
    }
    ,
    toggleTodoEntry(state, payload) {
      const { listName, entryId } = payload;

      const list = state.lists[listName];
      const entry = list.find(v => v.id === entryId);

      if (!entry.isTodo) {
        return;
      }

      entry.completed = !entry.completed;
    }
    ,

  }
  ,
  actions: {}
  ,
})
;
