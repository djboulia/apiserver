/**
 * 
 * Implements functions to create, read, update, delete our
 * Object Model in a Dynamo Database
 * 
 */
 const { v4: uuidv4 } = require('uuid');

 // import the aws sdk to use the dynamodb
 // libraries in the app
 const AWS = require('aws-sdk');
 
 const DynamoModel = function (credentials, tableName) {
     // update the region to 
     // where dynamodb is hosted
     AWS.config.update({
         region: "us-east-1",
         accessKeyId: credentials.accessKeyId,
         secretAccessKey: credentials.secretAccessKey
     });
 
     // create a new dynamodb client
     // which provides connectivity between the app and the db instance
     const client = new AWS.DynamoDB.DocumentClient();
 
     /**
      * Create a new object in the database.  Format will be:
      * id: unique id
      * className: the className supplied
      * attributes: the user data for this object
      * 
      * @param {String} className 
      * @param {Object} attributes the data for this object
      * @returns the object created
      */
     this.create = function (className, attributes) {
         return new Promise((resolve, reject) => {
             const obj = {};
 
             obj.id = uuidv4();
             obj.className = className;
             obj.attributes = attributes;
 
             const params = {
                 TableName: tableName,
                 Item: obj
             };
 
             client.put(params, (err, data) => {
                 if (err) {
                     console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                     reject(err);
                 } else {
                     resolve(obj);
                 }
             });
         });
     }
 
     /**
      * Update an existing object in the database
      * 
      * @param {Object} obj 
      * @returns the object updated
      */
     this.put = function (obj) {
 
         return new Promise((resolve, reject) => {
             // validate that we have the necessary parameters
             if (!obj || !obj.id || !obj.className || !obj.attributes) {
                 reject('put: invalid object: ', obj);
                 return;
             }
 
             const params = {
                 TableName: tableName,
                 Item: obj
             };
 
             client.put(params, (err, data) => {
                 if (err) {
                     console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                     reject(err);
                 } else {
                     resolve(obj);
                 }
             });
         });
     }
 
     /**
      * Find a set of objects by their identifiers
      * 
      * @param {Array} ids the list of ids to search for
      * @returns an array of objects
      */
     this.findByIds = function (ids) {
         return new Promise((resolve, reject) => {
 
             const idObject = {};
             let index = 0;
             ids.forEach(function (value) {
                 index++;
                 const idKey = ":idvalue" + index;
                 idObject[idKey.toString()] = value;
             });
 
             const params = {
                 TableName: tableName,
                 FilterExpression: "id IN (" + Object.keys(idObject).toString() + ")",
                 ExpressionAttributeValues: idObject
             };
 
             client.scan(params, (err, data) => {
                 if (err) {
                     console.log(err);
                     reject(err);
                 } else {
                     var items = [];
                     for (var i in data.Items)
                         items.push(data.Items[i]);
 
                     resolve(items);
                 }
             });
         });
     }
 
     /**
      * Find an object in the database by its id
      * 
      * @param {String} key the id to search for
      * @returns an object
      */
     this.findById = function (key) {
 
         return new Promise((resolve, reject) => {
 
             const params = {
                 TableName: tableName,
                 Key: {
                     'id': key
                 }
             };
 
             client.get(params, (err, data) => {
                 if (err) {
                     console.log(err);
                     reject(err);
                 } else {
                     // var items = [];
                     // for (var i in data.Items)
                     //     items.push(data.Items[i]);
 
                     resolve(data.Item);
                 }
             });
         });
     }

     /**
      * Find all objects of the specified className
      * 
      * @param {String} className 
      * @returns an array of objects
      */
     this.findAll = function (className) {
         return new Promise((resolve, reject) => {
             const params = {
                 TableName: tableName,
                 FilterExpression: "className = :className",
                 ExpressionAttributeValues: { ':className': className }
             };
 
             client.scan(params, (err, data) => {
                 if (err) {
                     console.log(err);
                     reject(err);
                 } else {
                     var items = [];
                     for (var i in data.Items)
                         items.push(data.Items[i]);
 
                     resolve(items);
                 }
             });
         });
     }
 
     /**
      * Search the class for a specific attributes containing
      * exactly the value specified.  For instance, to search for all
      * records where admin = true, fields would be { "admin" : true }
      * To search for a specific username attribute, 
      * use { "username" : "djboulia@gmail.com"}
      * 
      * @param {String} className 
      * @param {Object} fields object properties will be the fields to match object value
      * @returns an array of objects that match
      */
     this.findByFields = function (className, fields) {

        let filterExpression = "className = :className";
        let expressionAttributeValues = { ':className' : className };

        return new Promise((resolve, reject) => {

            for (var name in fields) {
                if (fields.hasOwnProperty(name)) {
                    const filterName = `:${name}`;

                    filterExpression += ` AND attributes.${name} = ${filterName}`;
                    expressionAttributeValues[filterName] = fields[name];
                }
            }

            // console.log('filter :', filterExpression);
            // console.log('expresssion: ', expressionAttributeValues);

            const params = {
                TableName: tableName,
                FilterExpression: filterExpression,
                ExpressionAttributeValues: expressionAttributeValues
            };

        
            client.scan(params, (err, data) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else {
                    var items = [];
                    for (var i in data.Items)
                        items.push(data.Items[i]);

                    resolve(items);
                }
            });
        });
    }

    /**
     * Deletes an object in the database matching the id
     * 
     * @param {String} key the id of the object 
     * @returns true if successful, false otherwise
     */
    this.deleteById = function (key) {
 
         return new Promise((resolve, reject) => {
 
             const params = {
                 TableName: tableName,
                 Key: {
                     'id': key
                 }
             };
 
             client.delete(params, (err, data) => {
                 if (err) {
                     console.log(err);
                     reject(err);
                 } else {
                     resolve(true);
                 }
             });
         });
     }
 }
 
 module.exports = DynamoModel;
 
 
 
 