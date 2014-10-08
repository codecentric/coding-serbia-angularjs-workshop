/*jshint maxstatements:50 */

'use strict';
var util = require('util');
var uuid = require('node-uuid');
var logger = require('log4js').getLogger('routes/actors');

exports = module.exports = function (movieDb, actorDb) {

    if (!movieDb) {
        throw new Error('No movie database configured');
    }
    if (!actorDb) {
        throw new Error('No actor database configured');
    }

    var exports = {};

    // helper function to return the absolute base uri used in the request
    function getAbsoluteUriBase (req) {
        // we use req.get('host') as this also gives us the port
        return req.protocol + '://' + req.get('host');
    }

    /*
     * Return a list of all actors.
     */
    exports.getActors = function (req, res) {
        logger.debug('Retrieving a list of all actors');
        var actors = [];
        actorDb.forEach(function(key, actor) {
            if (typeof actor !== 'undefined' && actor !== null) {
                actors.push(actor);
                addMovies(actor);
            }
        });
        logger.debug('Successfully loaded %d actors.', actors.length);
        return res.send(actors);
    };

    /*
     * Return a single actor identified by url-parameter.
     */
    exports.getActor = function (req, res) {
        // extract the id from the request-object
        var id = req.params.id;
        logger.debug('Retrieving actor#%s from database.', id);

        // actors are indexed by id
        var actor = actorDb.get(id);
        if (!actor) {
            logger.debug('Actor#%s could not be found.', id);
            return res.status(404).send();
        }
        addMovies(actor);

        logger.debug('Found actor#%s with title: %s', id, actor.title);
        return res.send(actor);
    };

    function addMovies(actor) {
        if (actor.movies && util.isArray(actor.movies)) {
            for (var i = 0; i < actor.movies.length; i++) {
                var movie = movieDb.get(actor.movies[i]);
                if (movie) {
                    actor.movies[i] = movie;
                }
            }
        }
    }

    /*
     * Delete an actor.
     */
    exports.deleteActor = function (req, res) {
        var id = req.params.id;
        logger.debug('Deleting actor#%s', id);

        actorDb.rm(id, function (err) {
            if (err) {
                logger.error('Failed to delete actor#%s: %s', id, JSON.stringify(err));
                return res.status(500).send();
            }

            return res.status(204).send();
        });
    };

    // TODO Return 204 or 200 for PUT, not 201
    function upsert(id, actor, req, res) {
        actorDb.set(actor.id, actor, function(err) {
            if (err) {
                logger.error('Failed to add actor: %s', err);
                return res.status(500).send();
            }

            logger.debug('Added new actor with id %s', actor.id);
            return res.status(201)
                .location(getAbsoluteUriBase(req) +
                    '/actors/' + actor.id)
                .send(actor);
        });
    }

    /*
     * Add an actor to the database.
     */
    exports.addActor = function (req, res) {
        var actor = req.body;
        actor.id = uuid.v4();
        logger.debug('Adding a new actor');
        upsert(actor.id, actor, req, res);
    };

    /*
     * Update an actor.
     */
    exports.updateActor = function (req, res) {
        var id = req.params.id;
        logger.debug('Updating actor#%s', id);
        var actor = req.body;
        actor.id = id;
        upsert(actor.id, actor, req, res);
    };

    return exports;
};
