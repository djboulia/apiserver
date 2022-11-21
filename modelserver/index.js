const ModelServer = require("./lib/modelserver");

const appInit = function () {
    let modelServer = undefined;

    const models = {};

    const app = {
    };

    app.path = function (baseUrl, staticDir, corsSites) {
        modelServer = new ModelServer(baseUrl,staticDir, corsSites);
    }

    app.explorer = function(name, path, protocols) {
        modelServer.enableExplorer(name, path, protocols);
    }

    app.listen = function(port) {
        modelServer.listen(port);
    }

    app.serverError = function(code, message) {
        return modelServer.serverError(code, message);
    }

    /**
     * set an authorization function to be invoked before a model's REST APIs
     * are called.  if the function throws an error or returns false, 
     * the API method will not be called.  if it returns true, auth is succesful
     * 
     * @param {Function} fn authorization function which receives a context object
     */
    app.auth = function( fn ) {
        modelServer.auth(fn);
    }

    app.addModel = function (baseModel, modelExtender) {
        const modelName = baseModel.getModelName();

        // extend with server methods
        modelServer.extend(baseModel);

        // custom extensions for this model
        modelExtender(baseModel);

        models[modelName] = baseModel;
    };

    app.getModel = function (name) {
        return models[name];
    };

    app.getModels = function () {
        return models;
    };

    return app;
}

const app = module.exports = appInit();
