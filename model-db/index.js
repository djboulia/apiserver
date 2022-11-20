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

    this.create = async function(attributes) {
        const result = await db.create(modelName, attributes);
        return result;
    }

    this.put = async function(obj) {
        const result = await db.put(modelName, obj);
        return result;   
    }

    this.findByIds = async function(ids) {
        const results = await db.findByIds(modelName, ids);
        return results;   
    }

    this.findById = async function(id) {
        const result = await db.findById(modelName, id);
        return result;   
    }

    this.findAll = async function() {
        const results = await db.findAll(modelName);
        return results;   
    }

    this.findByFields = async function (fields) {
        const results = await db.findByFields(modelName, fields);
        return results;
    }

    this.deleteById = async function(id) {
        const result = await db.deleteById(modelName, id);
        return result;   
    }
}

module.exports = DbModel;