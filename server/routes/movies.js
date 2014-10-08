/*jshint maxstatements:50 */

'use strict';
var util = require('util');
var uuid = require('node-uuid');
var logger = require('log4js').getLogger('routes/movies');

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
     * Return a list of all movies.
     */
    exports.getMovies = function (req, res) {
        logger.debug('Retrieving a list of all movies');
        var movies = [];
        movieDb.forEach(function(key, movie) {
            if (typeof movie !== 'undefined' && movie !== null) {
                addActors(movie);
                movies.push(movie);
            }
        });
        logger.debug('Successfully loaded %d movies.', movies.length);
        return res.send(movies);
    };

    /*
     * Return a single movie identified by url-parameter.
     */
    exports.getMovie = function (req, res) {
        // extract the id from the request-object
        var id = req.params.id;
        logger.debug('Retrieving movie#%s from database.', id);

        // movies are indexed by id
        var movie = movieDb.get(id);
        if (!movie) {
            logger.debug('Movie#%s could not be found.', id);
            return res.status(404).send();
        }
        addActors(movie);

        logger.debug('Found movie#%s with title: %s', id, movie.title);
        return res.send(movie);
    };

    /* this is horribly inefficient - but just good enough for a workshop app */
    function addActors(movie) {
        movie.actors = [];
        actorDb.forEach(function(key, actor) {
            if (typeof actor !== 'undefined' &&
                actor !== null &&
                actor.movies &&
                util.isArray(actor.movies)) {
                for (var i = 0; i < actor.movies.length; i++) {
                    var movieId = actor.movies[i];
                    if (movieId === movie.id) {
                        movie.actors.push(actor);
                    }
                }
            }
        });
    }

    /*
     * Delete a movie.
     */
    exports.deleteMovie = function (req, res) {
        var id = req.params.id;
        logger.debug('Deleting movie#%s', id);

        movieDb.rm(id, function (err) {
            if (err) {
                logger.error('Failed to delete movie#%s: %s', id, JSON.stringify(err));
                return res.status(500).send();
            }

            return res.status(204).send();
        });
    };

    // TODO Return 204 or 200 for PUT, not 201
    function upsert(id, movie, req, res) {
         // In case the client sends actors related to that movie, we ignore
        // it. The actor db is the single source of truth for actor-movie
        // relations.
        delete movie.actors;
        movieDb.set(movie.id, movie, function(err) {
            if (err) {
                logger.error('Failed to add movie: %s', err);
                return res.status(500).send();
            }

            logger.debug('Added new movie with id %s', movie.id);
            return res.status(201)
                .location(getAbsoluteUriBase(req) +
                    '/movies/' + movie.id)
                .send(movie);
        });
    }

    /*
     * Add a movie to the database.
     */
    exports.addMovie = function (req, res) {
        var movie = req.body;
        movie.id = uuid.v4();
        logger.debug('Adding a new movie');
        upsert(movie.id, movie, req, res);
    };

    /*
     * Update a movie.
     */
    exports.updateMovie = function (req, res) {
        var id = req.params.id;
        logger.debug('Updating movie#%s', id);
        var movie = req.body;
        movie.id = id;
        upsert(movie.id, movie, req, res);
    };

    return exports;
};
