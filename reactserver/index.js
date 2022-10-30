const express = require('express'); // Express web server framework
const cors = require('cors')
const cookieParser = require('cookie-parser');
const session = require("express-session");
const path = require('path');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');

const ServerError = require('./lib/servererror');
const Redirect = require('./lib/redirect');
const { Server } = require('http');

var JsonResponse = function (res) {
    this.send = function (obj) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(obj));
    };

    this.error = function (code, err) {
        res.setHeader('Content-Type', 'application/json');
        res.status(code);
        res.send(JSON.stringify({ code: code, message: err.message }));
    };
}

var HtmlResponse = function (res) {
    this.send = function (obj) {
        res.setHeader('Content-Type', 'text/html');
        res.end(JSON.stringify(obj));
    };

    this.error = function (code, err) {
        res.setHeader('Content-Type', 'text/html');
        res.status(code);
        res.send(JSON.stringify({ code: code, message: err.message }));
    };
}

/**
 * do a bunch of default initialization for a backend/frontend app
 * such as cors support, static dir and session state
 * 
 * @param {String} clientDirStatic directory for client static files
 * @returns an initialized express app
 */
const initExpress = function (clientDirStatic, corsSites) {
    const app = express();

    if (corsSites) {
        app.use(cors({
            origin: corsSites,
            credentials: true
        }))    
    } else {
        app.use(cors());
    }

    app.use(express.static(clientDirStatic))
        .use(cookieParser())
        .use(bodyParser.json());


    app.use(
        session({
            secret: "MyMiddlewareSecretSessionId",
            resave: true,
            saveUninitialized: true
        })
    );

    return app;
}

const ReactServer = function (clientDirStatic, corsSites) {
    const app = initExpress(clientDirStatic, corsSites);

    this.serverError = function (code, message) {
        return new ServerError(code, message);
    }

    this.redirect = function (url) {
        return new Redirect(url);
    }

    /**
     * start the server on the specified port
     * 
     * @param {Number} port 
     */
    this.listen = function (port) {
        // catch all other non-API calls and redirect back to our REACT app
        app.get('/*', function (req, res) {
            console.log('no handler for request ', req.path);

            const defaultFile = path.join(clientDirStatic, 'index.html');
            res.sendFile(defaultFile);
        });

        app.listen(port);
    }

    /**
     * Add paths for serving static files
     * 
     * @param {String} path the path specified in the url, e.g. /public
     * @param {String} dir the directory on the local file system
     */
    this.static = function (path, dir) {
        app.use(path, express.static(dir));
    }

    /**
     * Add an endpoint for exploring the server side APIs
     * 
     * options parameter can contain:
     * {
     *      protocols: Array - an array of one or both of ['http', 'https'] 
     *                         supported by this server for API calls 
     * }
     * 
     * @param {String} path the path that the explorer will be accessed from
     * @param {String} swaggerDoc the json swagger doc
     * @param {Object} options see above
     */
    this.explorer = function (path, swaggerDoc, options) {
        var swaggerOptions = {
            explorer: false,    // no explorer search bar
            customCss: '.swagger-ui .topbar { display: none }' // don't show the smartbear logo
        };

        app.use(path,
            function (req, res, next) {
                // dynamically set the host, http/https for the swagger doc
                // if options are specified, they override the default
                const protocols = options.protocols || [req.protocol];

                swaggerDoc.host = req.get('host');
                swaggerDoc.schemes = protocols;

                req.swaggerDoc = swaggerDoc;

                next();
            },
            swaggerUi.serveFiles(swaggerDoc, swaggerOptions),
            swaggerUi.setup(null, swaggerOptions));
    }

    /**
     * Kills any current session data, effectively resetting user state
     * 
     * @param {Object} session 
     * @returns true if the session was destroyed
     */
    this.reset = function (session) {

        return new Promise(function (resolve, reject) {
            if (session) {
                session.destroy(err => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(true);
                    }
                });
            }
        });

    }

    const processError = function (method, response, e) {
        // errors are processed as 500 errors with a message
        if (e instanceof ServerError) {
            console.log(`DEBUG: ${method} caught error ${e.code}: ${e.message}`);
            response.error(e.code, e);
        }
        else if (e instanceof Error) {
            console.log(`DEBUG: ${method} caught error: ${e.message}`);
            console.log(`DEBUG: ${e.stack}`);
            response.error(500, e);
        } else {
            // if it's not an error object, just return the raw error
            console.log(`DEBUG: ${method} caught error:`, e);
            response.error(500, e);
        }
    }

    /**
     * call the registered function and process the result
     */
    const callFn = async function (fn, authFn, jsonResponse, req, res) {
        const context = { session: req.session, query: req.query, params: req.params, body: req.body }

        // if authFn is supplied, we check it for a positive result before
        // calling fn.  if an error is thrown from the auth function or it 
        // retuns a non-true value, we exit without calling fn
        if (authFn) {
            const result = await authFn(context)
                .catch((e) => {
                    console.log('auth failed for: ', fn);
                })

            if (!result) {

                const e = new ServerError(401, 'Authentication Failed');
                processError(`auth function `, jsonResponse, e);
                return;
            }
        }

        const result = await fn(context);

        // if result is an instance of a special object (like a redirect)
        // we handle that here.  Otherwise we assume it's a JSON response and
        // send that back

        if (result instanceof Redirect) {
            console.log('DEBUG: found redirect!');

            const url = result.getUrl();
            res.redirect(url);
        } else {
            jsonResponse.send(result);
        }
    }

    /**
     * main function for defining REST methods for this server
     * 
     * @param {String} path path for this method
     * @param {String} verb GET, POST (for now)
     * @param {Function} fn function called when this method is invoked
     * @param {Function} authFn optional authentication function to validate before calling fn
     */
    this.method = function (path, verb, fn, authFn) {

        const handler = function (req, res) {
            const jsonResponse = new JsonResponse(res);

            // call the function supplied and process the result
            console.log(`DEBUG: ${verb} handler for ${path} called.`);

            callFn(fn, authFn, jsonResponse, req, res)
                .catch((e) => {
                    processError(`${verb} method`, jsonResponse, e);
                })
        }

        switch (verb.toUpperCase()) {
            case 'GET':
                return app.get(path, handler);

            case 'POST':
                return app.post(path, handler);

            case 'PUT':
                return app.put(path, handler);

            case 'DELETE':
                return app.delete(path, handler);

            default:
                throw new Error(`invalid verb ${verb} supplied to method`)
        }
    }

    /**
     * call the registered function.  since this is "raw" we don't presume
     * a JSON result, instead we expect the returned object to be of the form:
     * 
     * {
     *      type : content type of the data, e.g text/html
     *      data : data to send back
     * }
     * 
    */
    const callRawFn = async function (fn, req, res) {
        const result = await fn({ session: req.session, query: req.query, params: req.params, body: req.body });

        // if result is an instance of a special object (like a redirect)
        // we handle that here.  Otherwise we assume it's a response with
        // content type and data.

        if (result instanceof Redirect) {
            console.log('DEBUG: found redirect!');

            const url = result.getUrl();
            res.redirect(url);
        } else {
            if (!result || !result.type || !result.data) throw new Error('callRawFn: Invalid result');

            res.setHeader('Content-Type', result.type);
            res.end(result.data);
        }
    }

    /**
     * raw methods for non REST/json end points
     * 
     * @param {String} path path for this method
     * @param {String} verb GET, POST (for now)
     * @param {Function} fn function called when this method is invoked
     */
    this.rawMethod = function (path, verb, fn) {
        const handler = function (req, res) {
            // call the function supplied and process the result
            console.log(`DEBUG: ${verb} handler for ${path} called.`);

            callRawFn(fn, req, res)
                .catch((e) => {
                    const htmlResponse = new HtmlResponse(res);

                    processError(`${verb} method`, htmlResponse, e);
                })
        }

        switch (verb.toUpperCase()) {
            case 'GET':
                return app.get(path, handler);

            case 'POST':
                return app.post(path, handler);

            case 'PUT':
                return app.put(path, handler);

            case 'DELETE':
                return app.delete(path, handler);

            default:
                throw new Error(`invalid verb ${verb} supplied to rawMethod`)
        }
    }
}

module.exports = ReactServer;