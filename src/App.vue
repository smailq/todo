<template>
    <v-app>
        <v-app-bar
                app
                color="primary"
                dark
                dense>
            <v-toolbar-title>
                {{ selectedDateStr === todayStr ? 'Today' : null }}
                {{ selectedDateStr === tomorrowStr ? 'Tomorrow' : null }}
                {{ selectedDateStr !== todayStr && selectedDateStr !== tomorrowStr ? selectedDateStr : null }}
            </v-toolbar-title>
            <v-spacer/>
            <v-btn icon v-if="notCompleted.length > 0 && selectedDateStr === todayStr"
                   @click="moveNotCompleted(notCompleted)">
                <v-icon>mdi-application-import</v-icon>
            </v-btn>
        </v-app-bar>

        <v-content>
            <v-container fill-height class="align-content-start pt-0">
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
                                        :class="`${entry.completed && 'completed'}`"
                                        v-model="entry.text"
                                        auto-grow
                                        flat
                                        solo
                                        full-width
                                        dense
                                        :outlined="showEntryMenu === entry.id"
                                        hide-details
                                        rows="1"
                                        @focus="showEntryMenu = entry.id"
                                        @blur="scheduleItemBlur(entry.id)"
                                />
                                <small class="red--text" v-if="showEntryMenu !== entry.id">
                                    {{ entry.delayCount }}
                                </small>
                                <v-list-item-action v-show="showEntryMenu === entry.id" class="ml-0">
                                    <v-btn icon @click="deleteEntry(entry.id)">
                                        <v-icon>mdi-delete-outline</v-icon>
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                        </v-list>
                </v-row>
                <v-row>
                    <v-col class="pt-0">
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
                                    placeholder="New entry ..."
                                    class="font-italic"
                            />
                        </v-list-item>
                    </v-col>
                </v-row>
                <v-bottom-sheet v-model="showDateSelector">
                    <v-date-picker v-model="selectedDateStr"/>
                </v-bottom-sheet>
            </v-container>
        </v-content>
        <v-bottom-navigation
                app
                color="primary"
                mandatory
                v-model="bottomNavSelection"
        >
            <v-btn @click="showDateSelector = true" value="other">
                <span>All dates</span>
            </v-btn>
            <v-btn value="today" @click="selectedDateStr = todayStr">
                <span>Today</span>
            </v-btn>
            <v-btn value="tomorrow" @click="selectedDateStr = tomorrowStr">
                <span>Tomorrow</span>
            </v-btn>
        </v-bottom-navigation>
    </v-app>
</template>

<script>

    function genId() {
        return `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;
    }

    export default {
        name: 'App',
        data: () => ({
            bottomNavSelection: 'today',
            newEntry: '',
            allEntries: {},
            selectedDateStr: '',
            showDateSelector: false,
            showEntryMenu: false,
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
                return `${new Date().getFullYear()}-${("0" + (new Date().getMonth() + 1)).slice(-2)}-${new Date().getDate()}`;
            },
            tomorrowStr() {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                return `${tomorrow.getFullYear()}-${("0" + (tomorrow.getMonth() + 1)).slice(-2)}-${tomorrow.getDate()}`;
            },
            selectedEntries() {
                if (this.selectedDateStr === '') {
                    return [];
                }
                return this.allEntries[this.selectedDateStr];
            }
        },
        watch: {
            'newEntry': 'newEntryUpdated',
        },
        methods: {
            // Questionable hack to mitigate issue where 'blur' event is fired from selected textarea when
            // buttons are clicked in same element - so delay 'de select' for click event to happen before
            // item is de-selected
            scheduleItemBlur(id) {
                // to give other actions to be called, delay blur by some time
                setTimeout(() => {
                    if (id === this.showEntryMenu) {
                        this.showEntryMenu = false;
                    }
                }, 100); // is this enough time? seems to be so...
            },
            deleteEntry(id) {
                this.$set(this.allEntries, this.selectedDateStr, this.selectedEntries.filter((val) => val.id !== id));
                this.persist(this.selectedDateStr);
            },
            moveNotCompleted(toCopyEntries) {
                const newEntries = [];
                for (const {dateStr, entry} of toCopyEntries) {
                    // Keep track of how many times this task has been delayed
                    const delayCount = entry.delayCount || 0;
                    // Clone entries to today's list
                    newEntries.push({...entry, id: genId(), delayCount: delayCount + 1});
                    // Delete old
                    const filteredEntries = this.allEntries[dateStr].filter((val) => {
                        return val.id !== entry.id;
                    });
                    this.$set(this.allEntries, dateStr, filteredEntries);
                }
                this.$set(this.allEntries, this.todayStr, [...this.allEntries[this.todayStr], ...newEntries]);
                this.persist();
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
            }
        }
    };
</script>
<style>
    .v-textarea.completed textarea {
        text-decoration: line-through;
        color: gray!important;
    }
</style>
