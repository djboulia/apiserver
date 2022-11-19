/**
 * implements a CRUD model backed by a database
 * 
 * @param {Object} db backend database implementation
 * @param {Stringt} modelName name for this model
 * @param {String} modelNamePlural plural name for this model; 
 *                                 if not supplied, an 's' is added to the model name
 */
const DbModel = function( db, modelName, modelNamePlural ) {

    this.getModelName = function() {
        return modelName;
    }
    
    this.getModelNamePlural = function() {
        return (modelNamePlural) ? modelNamePlural : modelName + 's';
    }
    
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
    const flattenModel = function( dbObj ) {
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
    const flattenArray = function( items ) {
        if (!items || items.length === 0) {
            return [];
        }

        const result = [];

        for (let i=0; i<items.length; i++) {
            const item = items[i];

            result.push(flattenModel(item));
        }

        return result;
    }

    const copy = function(obj) {
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
    const restoreModel = function( obj ) {
        const id = obj.id;

        // remove the id field from the object before passing it
        // to the back end database since the dbObj has its own id field
        const attributes = copy(obj);
        attributes.id = undefined;     

        const dbObj = {
            id: obj.id,
            className: modelName,
            attributes: attributes
        }

        return dbObj;
    }

    this.create = async function(data) {
        const obj = restoreModel(data);
        const result = await db.create(modelName, obj.attributes);
        return flattenModel(result);
    }

    this.put = async function(data) {
        const obj = restoreModel(data);
        const result = await db.put(obj);
        return flattenModel(result);
    }

    this.findByIds = async function(ids) {
        const results = await db.findByIds(ids);
        return flattenArray(results);   
    }

    this.findById = async function(id) {
        const result = await db.findById(id);
        return flattenModel(result);
    }

    this.findByFields = async function(fields) {
        const results = await db.findByFields(modelName, fields);
        return flattenArray(results);   
    }

    this.findAll = async function() {
        const results = await db.findAll(modelName);
        return flattenArray(results);   
    }

    this.deleteById = async function(id) {
        const result = await db.deleteById(id);
        return flattenModel(result);
    }
}

module.exports = DbModel;