/**
 * 
 * Implements functions to create, read, update, delete our
 * Object Model in a Dynamo Database
 * 
 */
const { v4: uuidv4 } = require('uuid');

// import the aws sdk to use the dynamodb
// libraries in the app
const DBImpl = require('./lib/dbimpl');

const DynamoModel = function (credentials, tableName) {

    const db = new DBImpl(credentials, tableName);

    /**
     * the backend database stores multiple models in one table, using
     * the special className field to classify different models.  the
     * id field uniquely identifies each model in the table.  all user
     * data for the record is stored in the "attributes" field like this:
     * {
     *      id: xxx
     *      className:
     *      attributes: {
     *          modelData1: 'foo', 
     *          modelData2: 'bar'
     *      }
     * }
     * 
     * this class implements a single model representing the data
     * we don't want to expose classNme or attributes, so we simply
     * return the attributes data and insert the "id" field into it.
     * so flatten model takes the structure above and converts it to:
     * 
     * {
     *      id: xxx
     *      modelData1: 'foo',
     *      modelData2: 'bar'
     * }
     * 
     * @param {*} dbObj db model data to flatten
     */
    const flattenModel = function (dbObj) {
        const attributes = dbObj.attributes;
        if (attributes) {
            attributes.id = dbObj.id;
        }

        return attributes;
    }

    /**
     * for methods that return an array of records, 
     * flatten each one and return 
     * 
     * @param {Array} items an array of db records
     * @returns an array of flattened db records
     */
    const flattenArray = function (items) {
        if (!items || items.length === 0) {
            return [];
        }

        const result = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            result.push(flattenModel(item));
        }

        return result;
    }

    const copy = function (obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * for the put operation, we need to restore the flattened data
     * to the format the backend database will recognize, e.g.
     * 
     * { 
     *      id:
     *      className:
     *      attributes: {}
     * }
     * 
     * @param {*} obj flattened model data
     * @returns dbObj
     */
    const restoreModel = function (className, obj) {
        const id = obj.id;

        // remove the id field from the object before passing it
        // to the back end database since the dbObj has its own id field
        const attributes = copy(obj);
        delete attributes.id;

        const dbObj = {
            id: obj.id,
            className: className,
            attributes: attributes
        }

        return dbObj;
    }

    this.create = async function (className, data) {
        const obj = restoreModel(className, data);
        const result = await db.create(className, obj.attributes);
        return flattenModel(result);
    }

    this.put = async function (className, data) {
        const obj = restoreModel(className, data);
        console.log('put object: ', obj);

        const result = await db.put(className, obj);
        return flattenModel(result);
    }

    this.findByIds = async function (className, ids) {
        const results = await db.findByIds(className, ids);
        return flattenArray(results);   
    }

    this.findById = async function (className, id) {
        const result = await db.findById(className, id);
        return flattenModel(result);
    }

    this.findAll = async function (className) {
        const results = await db.findAll(className);
        return flattenArray(results);   
    }

    this.findByFields = async function (className, fields) {
        const results = await db.findByFields(className, fields);
        return flattenArray(results);   
    }

    this.deleteById = async function (className, id) {
        const result = await db.deleteById(className, id);
        return result;
    }
}

module.exports = DynamoModel;



