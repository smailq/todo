<template>
  <v-app>
    <v-app-bar
        app
        :color="selectedEntryId === false ? (isNotesMode ? 'green' : 'primary') : 'blue-grey'"
        dark
        dense
    >
      <v-btn icon
             v-if="selectedEntryId === false && isDatesMode"
             @click="switchMode()">
        <v-icon>mdi-calendar</v-icon>
      </v-btn>
      <v-btn icon
             v-if="selectedEntryId === false && isNotesMode"
             @click="switchMode()">
        <v-icon>mdi-file-document-outline</v-icon>
      </v-btn>

      <v-toolbar-title class="pl-0" v-if="selectedEntryId === false" @click="titleClicked">
        {{ appBarTitle }}
        <small v-if="appBarSubtitle !== ''">&middot; {{ appBarSubtitle }}</small>
      </v-toolbar-title>

      <v-menu bottom right v-if="selectedEntryId !== false">
        <template v-slot:activator="{ on }">
          <v-btn icon v-on="on">
            <v-icon>mdi-clock</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item two-line @click="moveSelectedEntryTo(nextMonday.format('YYYY-MM-DD'))">
            <v-list-item-content>
              <v-list-item-title>Next week</v-list-item-title>
              <v-list-item-subtitle>{{ nextMonday.format('ddd, MMM Do') }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="moveSelectedEntryTo(nextSaturday.format('YYYY-MM-DD'))">
            <v-list-item-content>
              <v-list-item-title>Next weekend</v-list-item-title>
              <v-list-item-subtitle>{{ nextSaturday.format('ddd, MMM Do') }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-list-item @click="showMoveToDateCalendar = true">
            <v-list-item-content>
              <v-list-item-title>Select date</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn
          icon
          @click="deleteEntry"
          v-if="selectedEntryId !== false">
        <v-icon>mdi-delete-outline</v-icon>
      </v-btn>

      <v-spacer/>

      <v-btn icon
             v-if="selectedEntryId !== false"
             @click="selectedEntryId = false">
        <v-icon>mdi-close</v-icon>
      </v-btn>

      <v-btn icon
             v-if="selectedEntryId === false && isDatesMode && notCompletedEntryExist && selectedListName === todayStr"
             @click="$store.commit('moveNotCompleted')">
        <v-icon>mdi-application-import</v-icon>
      </v-btn>

      <v-btn icon @click="listIconClicked" v-if="selectedEntryId === false">
        <v-icon>mdi-view-headline</v-icon>
      </v-btn>

    </v-app-bar>
    <v-content>
      <v-container fill-height class="align-content-start pt-0"
                   v-touch="{
                     left: () => swipeLeft(),
                     right: () => swipeRight(),
                   }"
      >
        <v-row class="ml-0">
          <v-list dense class="flex-grow-1">
            <v-list-item v-for="(entry) in selectedList" :key="entry.id"
                         class="pl-0 pr-0">
              <v-list-item-action class="mr-0" v-if="entry.isTodo">
                <v-checkbox
                    v-model="entry.completed"
                    @change="checked"
                />
              </v-list-item-action>
              <v-list-item-action v-else-if="entry.isLink" class="mr-0">
                <a :href="entry.text" target="_blank" style="text-decoration: none;">
                  <v-icon color="blue darken-2">mdi-link</v-icon>
                </a>
              </v-list-item-action>
              <v-list-item-action v-else class="mr-0">
                <v-icon>mdi-circle-small</v-icon>
              </v-list-item-action>
              <v-textarea
                  :class="`pr-1 ${entry.completed && 'completed'}`"
                  v-model="entry.text"
                  auto-grow
                  flat
                  solo
                  full-width
                  dense
                  :outlined="selectedEntryId === entry.id"
                  hide-details
                  rows="1"
                  @focus="selectedEntryId = entry.id"
              />
              <small class="red--text" v-if="entry.delayCount">
                {{ entry.delayCount }}
              </small>
              <v-icon small v-if="entry.isRepeating">
                mdi-repeat
              </v-icon>
            </v-list-item>
          </v-list>
        </v-row>
        <!--        <v-row class="justify-end ml-0"-->
        <!--               v-if="schedules[selectedListName] === undefined && isNotesMode && lists[selectedListName] && lists[selectedListName].length > 0">-->
        <!--          <v-btn-->
        <!--              small text class="mt-4"-->
        <!--              color="blue-grey darken-2"-->
        <!--              @click="showAutoRepeatDialog = true"-->
        <!--          >-->
        <!--            Enable auto repeat-->
        <!--          </v-btn>-->
        <!--        </v-row>-->
        <v-card
            class="mt-4"
            color="blue-grey"
            dark
            v-if="isNotesMode && schedules[selectedListName]"
        >
          <v-list-item three-line>
            <v-list-item-content>
              <v-list-item-title><b>Auto Repeat {{ schedules[selectedListName].frequency }}</b>
              </v-list-item-title>
              <v-list-item-subtitle class="white--text">All entries in this note will be added to the calendar on <b>{{
                schedules[selectedListName].nextRepeatOn }}</b>.
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
          <v-card-actions class="justify-space-between">
            <v-btn small text @click="editAutoRepeat()">Edit</v-btn>
            <v-btn small text @click="removeAutoRepeat()">
              Disable
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-container>
      <v-dialog v-model="showNoteSelectionView"
                fullscreen
                hide-overlay
                transition="dialog-bottom-transition">
        <v-card tile>
          <v-toolbar dark color="green" dense>
            <v-toolbar-title>
              All Notes
            </v-toolbar-title>
            <v-spacer/>
            <v-btn icon dark @click="showNoteSelectionView = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
            <v-btn
                fab
                color="pink"
                :style="{left: '50%', transform:'translateX(-50%)'}"
                bottom
                absolute
                small
                @click="showNewNote = true"
            >
              <v-icon>mdi-plus</v-icon>
            </v-btn>
          </v-toolbar>
          <v-list>
            <v-list-item v-for="noteName in noteListNames" :key="noteName" @click="selectNote(noteName)">
              <v-list-item-content>
                <v-list-item-title>
                  {{ noteName }}
                  <v-icon small v-if="schedules[noteName]" class="ml-2">mdi-repeat</v-icon>
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>
          </v-list>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showListView" fullscreen hide-overlay transition="dialog-bottom-transition">
        <v-card tile>
          <v-toolbar dark color="primary" dense>
            <v-toolbar-title>
              All Dates
            </v-toolbar-title>
            <v-spacer/>
            <v-btn icon dark @click="showListView = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-list v-for="dateStr in datedListNames" :key="dateStr">
            <v-divider v-if="dateStr === todayStr"/>
            <v-subheader
                @click="selectDay(dateStr)"
                v-if="lists[dateStr] && lists[dateStr].length > 0"
                :class="`darken-3 ${ dateStr > todayStr ? 'green--text' : ''} ${ dateStr === todayStr ? 'font-weight-bold' : ''}`"
            >
              {{ dateStr | format_moment('ddd, MMM Do, YYYY')}}{{ dateStr === todayStr ? ' &middot;Today'
              : ''}}
            </v-subheader>
            <v-list-item v-for="entry in lists[dateStr]" :key="entry.id">
              <v-list-item-action class="mr-2" v-if="entry.isTodo">
                <v-checkbox disabled v-model="entry.completed"/>
              </v-list-item-action>
              <span v-else class="title pl-2 pr-4">&middot;</span>
              <v-textarea
                  :class="`${entry.completed && 'completed'}`"
                  v-model="entry.text"
                  auto-grow
                  flat
                  solo
                  full-width
                  dense
                  hide-details
                  readonly
                  rows="1"
                  @click="copyContent"
              />
            </v-list-item>
            <v-divider v-if="dateStr === todayStr"/>
          </v-list>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showEditNote" persistent>
        <v-card>
          <div class="pa-4">
            <v-text-field
                label="Title"
                v-model="editingNoteTitle"
                clearable
                autofocus
            />
            <v-btn small text color="warning" @click="deleteNote">
              Delete
            </v-btn>
          </div>
          <v-card-actions>
            <v-spacer/>
            <v-btn color="primary" @click="saveEditingNote">Save</v-btn>
            <v-btn text @click="cancelEditingNote">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showNewNote" persistent>
        <v-card>
          <v-card-title>Create new note</v-card-title>
          <div class="pa-4">
            <v-text-field
                label="Title"
                v-model="newNoteTitle"
                clearable
                autofocus
            />
          </div>
          <v-card-actions>
            <v-spacer/>
            <v-btn color="primary" @click="saveNewNote">Save</v-btn>
            <v-btn text @click="cancelNewNote">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="showAutoRepeatDialog" persistent>
        <v-card>
          <v-card-title>Enable auto repeat</v-card-title>
          <div class="pa-4">
            <p>
              All entries in this note will be added to the calendar date on specified date.
            </p>
            <v-form>
              <v-select
                  prepend-icon="mdi-repeat"
                  class="mt-4"
                  v-model="newNoteRepeatFrequency"
                  :items="['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Bi-annually', 'Annually']"
                  label="Repeat ..."
              />
              <v-menu
                  v-model="showNewNoteDatePicker"
                  :close-on-content-click="false"
                  :nudge-right="40"
                  transition="scale-transition"
                  offset-y
                  min-width="290px"
              >
                <template v-slot:activator="{ on }">
                  <v-text-field
                      v-model="newNoteRepeatFrom"
                      label="Starting ..."
                      prepend-icon="mdi-calendar"
                      readonly
                      v-on="on"
                  />
                </template>
                <v-date-picker v-model="newNoteRepeatFrom" @input="showNewNoteDatePicker = false"/>
              </v-menu>
            </v-form>
          </div>
          <v-card-actions>
            <v-spacer/>
            <v-btn color="primary" @click="saveAutoRepeat">Save</v-btn>
            <v-btn text @click="cancelAutoRepeat">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-bottom-sheet v-model="showMoveToDateCalendar">
        <v-date-picker v-model="moveToDateTargetStr"/>
        <v-row justify="center">
          <v-btn class="ma-3" color="primary" @click="moveSelectedEntryTo(moveToDateTargetStr)">
            Move
          </v-btn>
        </v-row>
      </v-bottom-sheet>
    </v-content>
    <v-snackbar
        v-model="showSnackbar"
        bottom
        :timeout=4000
        color="info">
      {{ snackbarText }}
    </v-snackbar>
    <v-bottom-navigation app v-if="selectedEntryId === false">
      <v-list-item class="pl-0">
        <v-list-item-action class="mr-0" v-if="newEntry.startsWith(' ')">
          <v-checkbox/>
        </v-list-item-action>
        <v-textarea
            v-model="newEntry"
            auto-grow
            flat
            solo
            clearable
            full-width
            dense
            hide-details
            rows="1"
            placeholder="Type new entry here"
            class="font-italic"
            @focus="selectedEntryId = false"
        />
      </v-list-item>
    </v-bottom-navigation>
  </v-app>
</template>

<script>

  // Checks if the string looks like a date
  function isDate(str) {
    return /^\d\d\d\d-\d\d-\d\d$/.test(str);
  }

  import {mapState, mapGetters} from 'vuex';

  const moment = require('moment');

  export default {
    name: 'App',
    data: () => ({
      showSnackbar: false,
      snackbarText: '',

      newEntry: '',

      selectedEntryId: false,

      lastOpenedListBeforeSwitch: '',

      editingNoteTitle: '',

      newNoteTitle: '',

      newNoteRepeatFrequency: '',
      newNoteRepeatFrom: '',
      showNewNoteDatePicker: false,

      bgSchedulerTimerId: null,

      showAutoRepeatDialog: false,
      showListView: false,
      showMoveToDateCalendar: false,
      showEditNote: false,
      showNewNote: false,
      showNoteSelectionView: false,

      moveToDateTargetStr: moment().format('YYYY-MM-DD'),

      todayStr: moment().format('YYYY-MM-DD'),
    }),
    beforeDestroy() {
      // clearInterval(this.bgSchedulerTimerId);
    },
    mounted() {
      this.$store.commit('selectList', this.todayStr);
      this.scheduleRepeats();
      this.registerScheduler();
    },
    computed: {
      ...mapState([
        'lists',
        'schedules',
        'selectedListName',
      ]),
      ...mapGetters([
        'appBarTitle',
        'appBarSubtitle',
        'selectedList',
        'nextMonday',
        'nextSaturday',
        'isDatesMode',
        'isNotesMode',
        'datedListNames',
        'noteListNames',
        'notCompletedEntryExist',
      ]),
    },
    watch: {
      'newEntry': 'newEntryUpdated',
    },
    methods: {
      swipeLeft() {
        if (isDate(this.selectedListName)) {
          const newDate = moment(this.selectedListName).add(1, 'd');
          this.$store.commit('selectList', newDate.format('YYYY-MM-DD'));
        } else {
          const index = this.noteListNames.indexOf(this.selectedListName);
          if (index < this.noteListNames.length - 1) {
            this.$store.commit('selectList', this.noteListNames[index + 1]);
          }
        }
      },
      swipeRight() {
        if (isDate(this.selectedListName)) {
          const newDate = moment(this.selectedListName).subtract(1, 'd');
          this.$store.commit('selectList', newDate.format('YYYY-MM-DD'));
        } else {
          const index = this.noteListNames.indexOf(this.selectedListName);
          if (index > 0) {
            this.$store.commit('selectList', this.noteListNames[index - 1]);
          }
        }
      },
      checked() {
        // console.log('asrerer');
      },
      deleteEntry() {
        this.$store.commit('deleteEntry', { listName: this.selectedListName, entryId: this.selectedEntryId });
        this.selectedEntryId = false;
      },
      scheduleRepeats() {
        console.debug('Checking for rescheduling');
        for (const listName of Object.keys(this.schedules)) {
          const listData = { ...this.schedules[listName] };
          if (moment(listData.nextRepeatOn).isSame(moment(), 'day')) {
            let nextDate = '';
            // Schedule next repeat if it's overdue
            switch (listData.frequency) {
              case 'Daily':
                nextDate = moment(listData.nextRepeatOn).add(1, 'days').format('YYYY-MM-DD');
                break;
              case 'Weekly':
                nextDate = moment(listData.nextRepeatOn).add(1, 'weeks').format('YYYY-MM-DD');
                break;
              case 'Bi-weekly':
                nextDate = moment(listData.nextRepeatOn).add(2, 'weeks').format('YYYY-MM-DD');
                break;
              case 'Monthly':
                nextDate = moment(listData.nextRepeatOn).add(1, 'months').format('YYYY-MM-DD');
                break;
              case 'Quarterly':
                nextDate = moment(listData.nextRepeatOn).add(1, 'quarters').format('YYYY-MM-DD');
                break;
              case 'Bi-annually':
                nextDate = moment(listData.nextRepeatOn).add(6, 'months').format('YYYY-MM-DD');
                break;
              case 'Annually':
                nextDate = moment(listData.nextRepeatOn).add(1, 'years').format('YYYY-MM-DD');
                break;
              default:
                console.error('Unknown frequency');
                return;
            }

            this.$store.commit(
              'copyEntries',
              { fromListName: listName, toListName: listData.nextRepeatOn },
            );

            // Advance next date
            listData.nextRepeatOn = nextDate;
            this.$store.commit('setSchedule', { listName, scheduleObj: listData });
          }
        }
      },
      registerScheduler() {
        this.bgSchedulerTimerId = setInterval(this.scheduleRepeats, 10000);
      },
      removeAutoRepeat() {
        // Add to scheduler
        this.$store.commit('deleteSchedule', this.selectedListName);
        this.cancelAutoRepeat();
      },
      editAutoRepeat() {
        if (this.schedules[this.selectedListName] === undefined) {
          console.debug('Trying to edit non-existing scheduled repeat, this is noop.');
          return;
        }
        this.newNoteRepeatFrequency = this.schedules[this.selectedListName].frequency;
        this.newNoteRepeatFrom = this.schedules[this.selectedListName].nextRepeatOn;
        this.showAutoRepeatDialog = true;
      },
      saveAutoRepeat() {

        if (this.newNoteRepeatFrequency.length < 1) {
          alert('Please select frequency');
          return;
        }
        if (this.newNoteRepeatFrom.length < 1) {
          alert('Please select a date');
          return;
        } else if (moment(this.newNoteRepeatFrom).isBefore(moment(), 'day')) {
          alert('Cannot schedule it in the past');
          return;
        }

        const nextDate = this.newNoteRepeatFrom;

        // Add to scheduler
        this.$store.commit('setSchedule', {
          listName: this.selectedListName,
          scheduleObj: {
            frequency: this.newNoteRepeatFrequency,
            nextRepeatOn: nextDate,
          },
        });

        this.cancelAutoRepeat();
      },
      cancelAutoRepeat() {
        this.newNoteRepeatFrequency = '';
        this.newNoteRepeatFrom = '';
        this.showAutoRepeatDialog = false;
      },
      saveNewNote() {
        const newTitle = typeof this.newNoteTitle === 'string' ? this.newNoteTitle.trim() : '';

        if (/^\d\d\d\d-\d\d-\d\d$/.test(newTitle)) {
          alert('Sorry, your new title looks like a date - this is not supported. Please choose other name.');
          return;
        }

        if (newTitle.length < 1) {
          alert('Sorry, title can not be empty.');
          return;
        }

        if (this.lists[newTitle] !== undefined
          && this.lists[newTitle].length
          && this.lists[newTitle].length > 0) {
          alert('Sorry, the name already exists, this is not supported.');
          return;
        }

        this.$store.commit('addList', newTitle);
        this.$store.commit('selectList', newTitle);

        this.newNoteTitle = '';
        this.showNewNote = false;
        this.showNoteSelectionView = false;
      },
      cancelNewNote() {
        this.newNoteTitle = '';
        this.showNewNote = false;
      },
      deleteNote() {
        const r = confirm(`Are you sure about deleting "${this.selectedListName}"? This can not be undone!`);
        if (r !== true) {
          return;
        }

        this.removeAutoRepeat();
        this.$store.commit('deleteList', this.selectedListName);

        let existingNote = this.noteListNames.length > 0 ? this.noteListNames[0] : false;

        if (existingNote === false) {
          // No other existing note to open, create an untitled one. (without saving)
          existingNote = 'Inbox';
        }

        this.selectedEntryId = false;
        this.showEditNote = false;
        this.$store.commit('selectList', existingNote);
      },
      saveEditingNote() {
        const newTitle = typeof this.editingNoteTitle === 'string' ? this.editingNoteTitle.trim() : '';

        if (newTitle.length < 1) {
          alert('Sorry, title can not be empty.');
          return;
        }

        if (this.lists[newTitle] !== undefined
          && this.lists[newTitle].length
          && this.lists[newTitle].length > 0) {
          alert('Sorry, the name already exists, this is not supported.');
          return;
        }

        this.$store.commit('moveList', { fromName: this.selectedListName, toName: newTitle });
        this.$store.commit('selectList', newTitle);

        this.editingNoteTitle = '';
        this.showEditNote = false;
      },
      cancelEditingNote() {
        this.showEditNote = false;
        this.editingNoteTitle = '';
      },
      listIconClicked() {
        if (this.isDatesMode) {
          this.showListView = true;
        } else if (this.isNotesMode) {
          this.showNoteSelectionView = true;
        }
      },
      titleClicked() {
        if (this.isDatesMode) {
          this.$store.commit('selectList', moment().format('YYYY-MM-DD'));
        } else if (this.isNotesMode) {
          this.$store.commit('selectList', 'Inbox');
        }
      },
      selectNote(name) {
        this.$store.commit('selectList', name);
        this.showNoteSelectionView = false;
      },
      switchMode() {
        const prevList = `${this.lastOpenedListBeforeSwitch}`;
        this.lastOpenedListBeforeSwitch = this.selectedListName;

        if (this.isDatesMode) {
          // If there are no notes, create one called 'Inbox' and open that
          if (this.noteListNames.length < 1) {
            this.$store.commit('selectList', 'Inbox');
          } else if (prevList !== '') {
            // Show last opened note
            this.$store.commit('selectList', prevList);
          } else {
            // Show first note
            this.$store.commit('selectList', this.noteListNames[0]);
          }
        } else {
          if (prevList !== '') {
            this.$store.commit('selectList', prevList);
          } else {
            this.$store.commit('selectList', this.todayStr);
          }
        }
      },
      moveSelectedEntryTo(dateStr) {
        this.$store.commit('moveEntry', {
          fromListName: this.selectedListName,
          toListName: dateStr,
          entryId: this.selectedEntryId,
        });

        // Close calendar picker if open
        this.showMoveToDateCalendar = false;
        this.selectedEntryId = false;

        // Message
        this.showSnackbar = true;
        this.snackbarText = `Moved entry to ${moment(dateStr).format('ddd, MMM Do')}`;
      },
      selectDay(dateStr) {
        this.$store.commit('selectList', dateStr);
        // close dialogs
        this.showListView = false;
        // Clear selections in case
        this.selectedEntryId = false;
      },
      copyContent(event) {
        event.target.select();
        document.execCommand('copy');
        this.showSnackbar = true;
        this.snackbarText = 'Copied to clipboard';
      },
      newEntryUpdated(after, before) {
        // do nothing on empty content
        if (after.length < 1) {
          return;
        }
        // enter means we want to save
        if (after.endsWith('\n')) {

          if (before.length < 1) {
            this.newEntry = '';
            return;
          }

          // Entry with space char is to do item
          const isTodo = before.startsWith(' ');
          const trimmedEntry = before.trim();

          // is it empty to do? then keep the entry as is
          if (isTodo && trimmedEntry.length < 1) {
            this.newEntry = ' ';
            return;
          }

          // Make sure we have something to save
          if (trimmedEntry.length < 1) {
            this.newEntry = '';
            return;
          }

          // save new entry without newline
          this.$store.commit('addEntry', {
            listName: this.selectedListName,
            text: trimmedEntry,
            isTodo,
          });

          this.newEntry = '';
        }
      },
    },
  };
</script>
<style>
  .v-textarea.completed textarea {
    text-decoration: line-through;
    color: gray !important;
  }
</style>
