/**
 * implements a base model class with no backing store or CRUD methods
 * 
 * @param {Stringt} modelName name for this model
 * @param {String} modelNamePlural plural name for this model; 
 *                                 if not supplied, an 's' is added to the model name
 */
 const Model = function( modelName, modelNamePlural ) {

    this.getModelName = function() {
        return modelName;
    }
    
    this.getModelNamePlural = function() {
        return (modelNamePlural) ? modelNamePlural : modelName + 's';
    }
}

module.exports = Model;