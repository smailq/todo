<template>
    <v-app>
        <v-app-bar
                app
                color="primary"
                dark
                dense>
            <v-toolbar-title>
                {{ selectedDateStr === todayStr ? 'Today' : selectedDateStr }}
            </v-toolbar-title>
            <v-spacer/>
            <v-btn icon @click="showDateSelector = true">
                <v-icon>mdi-calendar</v-icon>
            </v-btn>
        </v-app-bar>

        <v-content>
            <v-container>
                <v-list dense class="pa-0">
                    <v-list-item v-for="(entry) in selectedEntries" :key="entry.id" class="pl-0" @change="persist">
                        <v-list-item-action class="mr-0" v-if="entry.isTodo">
                            <v-checkbox v-model="entry.completed" />
                        </v-list-item-action>
                        <v-textarea
                                v-model="entry.text"
                                auto-grow
                                flat
                                solo
                                full-width
                                dense
                                hide-details
                                rows="1"
                        />
                    </v-list-item>
                </v-list>
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
                <v-bottom-sheet v-model="showDateSelector">
                    <v-date-picker v-model="selectedDateStr"/>
                </v-bottom-sheet>
            </v-container>
        </v-content>
    </v-app>
</template>

<script>
    export default {
        name: 'App',
        data: () => ({
            newEntry: '',
            allEntries: {},
            selectedDateStr: '',
            showDateSelector: false,
        }),
        mounted() {
            this.selectedDateStr = this.todayStr;

            const myStorage = window.localStorage;
            const keys = Object.entries(myStorage);

            keys.forEach(([key, value]) => {
                if (key.startsWith('TODO_')) {
                    this.$set(this.allEntries, key.slice(5), JSON.parse(value));
                }
            });
        },
        computed: {
            todayStr() {
                return `${new Date().getFullYear()}-${("0" + (new Date().getMonth() + 1)).slice(-2)}-${new Date().getDate()}`;
            },
            selectedEntries() {
                return this.allEntries[this.selectedDateStr];
            }
        },
        watch: {
            'newEntry': 'newEntryUpdated',
        },
        methods: {
            persist() {
                const myStorage = window.localStorage;
                myStorage.setItem(`TODO_${this.selectedDateStr}`, JSON.stringify(this.selectedEntries));
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
                    id: `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`,
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
                this.persist();
            }
        }
    };
</script>
