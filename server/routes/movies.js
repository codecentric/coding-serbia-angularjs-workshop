/*jshint maxstatements:50 */

'use strict';
var uuid = require('node-uuid');
var logger = require('log4js').getLogger('routes/movies');

exports = module.exports = function (movieDb) {

    if (!movieDb) {
        throw new Error('No database configured');
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
        movieDb.forEach(function(key, value) {
            if (typeof value !== 'undefined' && value !== null) {
                movies.push(value);
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
        logger.debug('Found movie#%s with title: %s', id, movie.title);
        return res.send(movie);
    };

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

    function upsert(id, movie, req, res) {
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
        var movie = req.body;
        logger.debug('Updating a movie');
        upsert(movie.id, movie, req, res);
    };

    return exports;
};
