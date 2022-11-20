'use strict';

const fs = require('fs');

/**
 * Simple file based database mock up.  Useful for prototyping
 * and setting up a data model before committing to a true
 * database.  NOT meant for production environments!
 * 
 * @param {String} path 
 * @param {String} tableName 
 */
const FileDB = function (path, tableName) {

    const filename = path + '/' + tableName + '.json';

    const loadFile = function(filename) {
        const exists = fs.existsSync(filename);

        if (exists) {
            const rawdata = fs.readFileSync(filename);
            return JSON.parse(rawdata);    
        } else {
            // file doesn't exist, create an empty db
            return [];
        }    
    }

    let contents = loadFile(filename);
    // console.log(contents);

    const writeFile = function (filename, contents) {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify(contents, null, 2);

            fs.writeFile(filename, data, (err) => {
                if (err) {
                    console.log('Error: ', err);
                    reject(err);
                    return;
                }

                console.log('Data written to file');
                resolve(contents);
            });
        })
    }

    const fieldsMatch = function (record, fields) {
        for (var name in fields) {
            if (fields.hasOwnProperty(name)) {
                if (fields[name] != record[name]) {
                    // console.log('field ' + name + ' does not match: ' + fields[name] + ', ' + record[name]);
                    return false;
                }
            }
        }

        // console.log('found match: ', record);
        return true;
    }

    const findById = function (id, records) {
        for (let i = 0; i < records.length; i++) {
            const record = records[i];

            if (record.id === id) {
                return record;
            }
        }

        console.log('Error: could not find id ' + id);
        console.log('Records:  ', records);
        return undefined;
    }

    /**
     * Any updates to the database force a complete 
     * rewrite of the underlying file.  Not efficient by any
     * means, but workable for testing purposes.
     * 
     * @param {Object} newContents 
     */
    const rewriteDB = function (newContents) {
        return new Promise((resolve, reject) => {
            contents = newContents;

            writeFile(filename, contents)
                .then((result) => {
                    resolve(contents);
                })
                .catch((e) => {
                    reject(e);
                })
        })
    }


    /**
     * Create a new record in the file store.  Will take
     * entryData as the fields for this record, adding a
     * unique identifier as part of the creation process.
     * 
     * @param {String} className - create a new instance of this class in the table 
     * @param {Object} entryData - data to create
     */
    this.create = function (className, entryData) {
        return new Promise((resolve, reject) => {
            const now = new Date();
            const id = now.getTime().toString();

            const entry = JSON.parse(JSON.stringify(entryData));
            entry.id = id;
            entry.class = className;

            console.log('creating ' + JSON.stringify(entry));

            // add to our content
            contents.push(entry);

            // write to the file system
            rewriteDB(contents)
                .then(() => {
                    resolve(entry);
                })
                .catch((e) => {
                    reject(e);
                })
        })
    }

    /**
     * Update an existing entry in the file store
     * Will look for the id property of updateEntry
     * to find the existing entry.  Underlying file store
     * will be updated if the id is found.
     * 
     * @param {Object} updateEntry 
     */
    this.put = function (className, updateEntry) {
        return new Promise((resolve, reject) => {
            for (let i = 0; i < contents.length; i++) {
                const entry = contents[i];

                if (entry.id === updateEntry.id) {

                    if (entry.class != className) {
                        const msg = `put: ids match but ${className} not equal to entry class ${entry.class}`;
                        console.error(msg);
                        reject(msg);
                        return;
                    }

                    contents[i] = JSON.parse(JSON.stringify(updateEntry));

                    rewriteDB(contents)
                        .then((result) => {
                            resolve(updateEntry);
                        })
                        .catch((e) => {
                            reject(e);
                        })

                    return;
                }
            }

            reject('could not find id ' + updateEntry.id);
        })
    }

    /**
     * Get multiple records by id in one call
     * 
     * @param {Array} ids an array of ids to search for
     */
    this.findByIds = function (className, ids) {
        const self = this;

        return new Promise((resolve, reject) => {
            self.findAll(className)
                .then((records) => {
                    const results = [];

                    for (let i = 0; i < ids.length; i++) {
                        const id = ids[i];

                        const record = findById(id, records);
                        results.push(record);
                    }

                    resolve(results);
                })
                .catch((e) => {
                    reject(e);
                })
        })
    }

    this.findById = function (className, id) {
        return new Promise((resolve, reject) => {
            const result = [];

            for (let i = 0; i < contents.length; i++) {
                const entry = contents[i];

                if (entry.id === id && entry.class === className) {
                    resolve(JSON.parse(JSON.stringify(entry))); // return a copy
                    return;
                }
            }

            reject('could not find id ' + id);
        })
    }

    this.findAll = function (className) {
        return new Promise((resolve, reject) => {
            const items = JSON.parse(JSON.stringify(contents));
            const results = [];

            for (let i=0; i< items.length; i++) {
                const item = items[i];

                if (item.class === className) {
                    results.push(item);
                }
            }
            resolve(results); 
        })
    };

    this.findByFields = function (className, fields) {
        const self = this;

        // console.log('looking for fields: ', fields);

        return new Promise((resolve, reject) => {

            const matches = [];

            self.findAll(className)
                .then((results) => {

                    for (let i = 0; i < results.length; i++) {
                        const result = results[i];

                        if (fieldsMatch(result, fields)) {
                            matches.push(result);
                        }
                    }

                    resolve(matches);
                })
                .catch((e) => {
                    reject(e);
                })
        });
    }

    /**
     * Deletes an object in the database matching the id
     * 
     * @param {String} key the id of the object 
     * @returns true if successful, false otherwise
     */
    this.deleteById = function (className, key) {

        return new Promise((resolve, reject) => {

            for (let i = 0; i < contents.length; i++) {
                const entry = contents[i];

                if (entry.id === key && entry.class === className) {
                    contents.splice(i, 1);

                    rewriteDB(contents)
                        .then((result) => {
                            resolve(true);
                        })
                        .catch((e) => {
                            reject(e);
                        })

                    return;
                }
            }

            reject(false);
        });
    }
}

module.exports = FileDB;