<template>
    <v-app>
        <v-app-bar
                app
                :color="selectedEntryId === false ? 'primary' : 'grey darken-1'"
                dark
                dense>
            <v-btn icon v-if="selectedEntryId !== false"
                   @click="selectedEntryId = false">
                <v-icon>mdi-close</v-icon>
            </v-btn>
            <v-toolbar-title v-if="selectedEntryId === false" @click="selectedDateStr = todayStr">
                {{ appBarTitle }} <small v-if="appBarSubtitle !== ''">&middot; {{ appBarSubtitle }}</small>
            </v-toolbar-title>
            <v-spacer/>
            <div v-if="selectedEntryId === false">
                <v-btn icon v-if="notCompleted.length > 0 && selectedDateStr === todayStr"
                       @click="moveNotCompleted(notCompleted)">
                    <v-icon>mdi-application-import</v-icon>
                </v-btn>
                <v-btn icon @click="showListView = true">
                    <v-icon>mdi-format-list-bulleted</v-icon>
                </v-btn>
            </div>
            <div v-else>
                <v-menu bottom left>
                    <template v-slot:activator="{ on }">
                        <v-btn icon v-on="on">
                            <v-icon>mdi-clock</v-icon>
                        </v-btn>
                    </template>
                    <v-list>
                        <v-list-item two-line v-if="nextMondayStr !== ''" @click="moveSelectedEntryTo(nextMondayStr)">
                            <v-list-item-content>
                                <v-list-item-title>Next week</v-list-item-title>
                                <v-list-item-subtitle>{{ nextMondayStr | format_moment('ddd, MMM Do') }}
                                </v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item v-if="nextSaturdayStr !== ''" @click="moveSelectedEntryTo(nextSaturdayStr)">
                            <v-list-item-content>
                                <v-list-item-title>Next weekend</v-list-item-title>
                                <v-list-item-subtitle>{{ nextSaturdayStr | format_moment('ddd, MMM Do') }}
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
                <v-btn icon @click="deleteSelectedEntry()">
                    <v-icon>mdi-delete-outline</v-icon>
                </v-btn>
            </div>
        </v-app-bar>

        <v-content>
            <v-container fill-height class="align-content-start pt-0"
                         v-touch="{
                    left: () => selectNextDay(),
                    right: () => selectPrevDay(),
                }"
            >
                <v-row class="ml-0">
                    <v-list dense class="flex-grow-1">
                        <v-list-item v-for="(entry) in selectedEntries" :key="entry.id"
                                     class="pl-0 pr-0"
                                     @change="persist(selectedDateStr)">
                            <v-list-item-action class="mr-0" v-if="entry.isTodo">
                                <v-checkbox v-model="entry.completed"/>
                            </v-list-item-action>
                            <span v-else class="title pl-2 pr-2">
                                    &middot;
                                </span>
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
                            <small class="red--text">
                                {{ entry.delayCount }}
                            </small>
                        </v-list-item>
                    </v-list>
                </v-row>
                <v-row class="ml-0">
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
                                placeholder="New ... (start with a space for todo)"
                                class="font-italic"
                                @focus="selectedEntryId = false"
                        />
                    </v-list-item>
                </v-row>
            </v-container>
            <v-dialog v-model="showListView" fullscreen hide-overlay transition="dialog-bottom-transition">
                <v-card tile>
                    <v-toolbar dark color="secondary">
                        <v-toolbar-title>
                            All Entries
                        </v-toolbar-title>
                        <v-spacer/>
                        <v-btn icon dark @click="showListView = false">
                            <v-icon>mdi-close</v-icon>
                        </v-btn>
                    </v-toolbar>
                    <v-list v-for="dateStr in allDates" :key="dateStr">
                        <v-subheader @click="selectDay(dateStr)" :class="`darken-3 ${ dateStr > todayStr ? 'green--text' : ''} ${ dateStr === todayStr ? 'font-weight-bold' : ''}`">
                            {{ dateStr | format_moment('ddd, MMM Do, YYYY')}}{{ dateStr === todayStr ? ' &middot; Today' : ''}}
                        </v-subheader>
                        <v-list-item v-for="entry in allEntries[dateStr]" :key="entry.id">
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
                        <v-divider v-if="dateStr === todayStr || dateStr === tomorrowStr"/>
                    </v-list>
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
    </v-app>
</template>

<script>
    const moment = require('moment');

    function genId() {
        return `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;
    }

    export default {
        name: 'App',
        data: () => ({
            showSnackbar: false,
            snackbarText: '',
            newEntry: '',
            allEntries: {},
            selectedDateStr: '',
            selectedEntryId: false,
            showListView: false,
            showMoveToDateCalendar: false,
            moveToDateTargetStr: moment().format('YYYY-MM-DD'),
        }),
        mounted() {
            this.selectedDateStr = this.todayStr;

            console.debug('Start loading from local storage');

            const myStorage = window.localStorage;
            const keys = Object.entries(myStorage);

            keys.forEach(([key, value]) => {
                if (key.startsWith('TODO_')) {
                    this.$set(this.allEntries, key.slice(5), JSON.parse(value));
                }
            });

            console.debug('Finished loading from local storage');
        },
        computed: {
            allDates() {
                // Most recent first
                return Object.keys(this.allEntries).sort((b, a) => {
                    if (new Date(a) < new Date(b)) {
                        return -1;
                    } else if (new Date(a) > new Date(b)) {
                        return 1;
                    }
                    return 0;
                });
            },
            notCompleted() {
                console.debug('Update notCompleted items from past');
                const notCompleted = [];
                // Search for all to do items that hasn't been completed in the past
                for (const [dateStr, entries] of Object.entries(this.allEntries)) {
                    // Skip today or future
                    if (dateStr === this.todayStr || new Date(dateStr) > new Date(this.todayStr)) {
                        continue;
                    }
                    for (const entry of entries) {
                        if (entry.isTodo && !entry.completed) {
                            notCompleted.push({dateStr, entry});
                        }
                    }
                }
                console.debug(`Finished loading ${notCompleted.length} notCompleted items`);
                return notCompleted;
            },
            todayStr() {
                return moment().format('YYYY-MM-DD');
            },
            tomorrowStr() {
                const tomorrow = moment(this.todayStr).add(1, 'd');
                return tomorrow.format('YYYY-MM-DD');
            },
            yesterdayStr() {
                const yesterday = moment(this.todayStr).subtract(1, 'd');
                return yesterday.format('YYYY-MM-DD');
            },
            nextMondayStr() {
                const nextMonday = moment(this.todayStr).day(7 + 1);
                if (nextMonday > moment()) {
                    return nextMonday.format('YYYY-MM-DD');
                }
                // If this friday is past or same day, ignore
                return '';
            },
            nextSaturdayStr() {
                const nextSaturday = moment(this.todayStr).day(7 + 6);
                if (nextSaturday > moment()) {
                    return nextSaturday.format('YYYY-MM-DD');
                }
                // If this friday is past or same day, ignore
                return '';
            },
            appBarTitle() {
                const dayDiff = moment(this.selectedDateStr).diff(moment(this.todayStr), 'days');
                if (dayDiff === 0) {
                    return 'Today';
                } else if (dayDiff === 1) {
                    return 'Tomorrow';
                } else if (dayDiff === -1) {
                    return 'Yesterday';
                } else {
                    return `${dayDiff > 0 ? 'In ' : ''}${Math.abs(dayDiff)} days${dayDiff < 0 ? ' ago' : ''}`
                }
            },
            appBarSubtitle() {
                return moment(this.selectedDateStr).format('ddd, MMM Do');
            },
            selectedEntries() {
                if (this.selectedDateStr === '') {
                    return [];
                }
                return this.allEntries[this.selectedDateStr];
            },
        },
        watch: {
            'newEntry': 'newEntryUpdated',
        },
        methods: {
            moveSelectedEntryTo(dateStr) {
                console.log(`Moving item ${this.selectedEntryId} to ${dateStr}`);

                const entry = this.allEntries[this.selectedDateStr].find((val) => val.id === this.selectedEntryId);

                if (entry === undefined) {
                    alert('Sorry, couldn\'t find item to be moved');
                    return;
                }

                // Remove from source
                this.$set(this.allEntries, this.selectedDateStr, this.allEntries[this.selectedDateStr].filter((val) => val.id !== this.selectedEntryId));

                // Insert to target
                const targetDateEntries = this.allEntries[dateStr] || [];
                this.$set(this.allEntries, dateStr, [...targetDateEntries, {...entry}]);

                this.persist(dateStr);
                this.persist(this.selectedDateStr);

                // Close calendar picker if open
                this.showMoveToDateCalendar = false;
                this.selectedEntryId = false;

                // Message
                this.showSnackbar = true;
                this.snackbarText = `Moved entry to ${moment(dateStr).format('ddd, MMM Do')}`;

                console.log(`Move successful`);
            },
            selectNextDay() {
                const newDate = moment(this.selectedDateStr).add(1, 'd');
                this.selectedDateStr = newDate.format('YYYY-MM-DD');
            },
            selectPrevDay() {
                const newDate = moment(this.selectedDateStr).subtract(1, 'd');
                this.selectedDateStr = newDate.format('YYYY-MM-DD');
            },
            selectDay(dateStr) {
                this.selectedDateStr = dateStr;
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
            deleteSelectedEntry() {
                this.$set(this.allEntries, this.selectedDateStr, this.selectedEntries.filter((val) => val.id !== this.selectedEntryId));
                this.selectedEntryId = false;
                this.persist(this.selectedDateStr);
            },
            moveNotCompleted(toCopyEntries) {
                const newEntries = [];
                for (const {dateStr, entry} of toCopyEntries) {
                    // Keep track of how many times this task has been delayed
                    const delayCount = entry.delayCount || 0;
                    // Clone entries to today's list
                    newEntries.push({...entry, delayCount: delayCount + 1});
                    // Delete old
                    const filteredEntries = this.allEntries[dateStr].filter((val) => {
                        return val.id !== entry.id;
                    });
                    this.$set(this.allEntries, dateStr, filteredEntries);
                }
                const existingEntries = this.allEntries[this.todayStr] || [];
                this.$set(this.allEntries, this.todayStr, [...existingEntries, ...newEntries]);
                this.persist();

                this.snackbarText = 'Moved unfinished todo to today';
                this.showSnackbar = true;
            },
            persist(dateStr) {
                const myStorage = window.localStorage;

                if (dateStr === undefined) {
                    for (const [dateStr, entries] of Object.entries(this.allEntries)) {
                        myStorage.setItem(`TODO_${dateStr}`, JSON.stringify(entries));
                    }
                } else if (typeof dateStr === 'string' && dateStr.length > 0) {
                    myStorage.setItem(`TODO_${dateStr}`, JSON.stringify(this.allEntries[dateStr]));
                }
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
                    this.save(trimmedEntry, isTodo);
                }
            },
            save(text, isTodo) {
                if (text.length < 1) {
                    return;
                }

                const newEntryObj = {
                    // Random id, hope it's unique enough..
                    id: genId(),
                    text,
                    createdAt: new Date(),
                    isTodo,
                };

                if (isTodo) {
                    newEntryObj.completed = false;
                }

                // Save entry to currently selected date
                const existingEntries = this.allEntries[this.selectedDateStr];

                if (existingEntries === undefined) {
                    // Make new one
                    this.$set(this.allEntries, this.selectedDateStr, [newEntryObj]);
                } else {
                    this.$set(this.allEntries, this.selectedDateStr, [...existingEntries, newEntryObj]);
                }

                // Clear entry
                this.newEntry = '';

                // Save entry
                this.persist(this.selectedDateStr);
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
