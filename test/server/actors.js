'use strict';
var chai = require('chai');
var dirty = require('dirty');
var expect = chai.expect;
var sinon = require('sinon');
var ResponseMock = require('./helper/response-mock');

describe('getActor', function () {
    var movieDbStub;
    var actorDbStub;
    var routes;
    var actors;
    var responseMock;

    beforeEach(function() {
        // Create stubs for the database APIs
        movieDbStub = sinon.createStubInstance(dirty.Dirty);
        actorDbStub = sinon.createStubInstance(dirty.Dirty);

        // load the routes and inject the d-stub
        routes = require('../../server/routes')(movieDbStub, actorDbStub);
        actors = routes.actors;

        // the ResponseMock behaves like an express.js response object,
        // it stores the data that would normally be sent to the client
        // and can be used to execute verifications on this data
        responseMock = new ResponseMock();
    });

    it('should return an empty list when db has no actors', function (done) {
        responseMock.verify(function(responseData) {
            expect(responseData.status).to.equal(200);
            expect(responseData.body).to.be.instanceOf(Array);
            expect(responseData.body).to.be.empty;
            done();
        });
        actors.getActors({}, responseMock);
    });

    it('should return actors', function (done) {
        actorDbStub.forEach.yields('actor-xyz', {
            name: 'Marilyn Monroe',
        });

        responseMock.verify(function(responseData) {
            expect(responseData.status).to.equal(200);
            expect(responseData.body).to.be.instanceOf(Array);
            expect(responseData.body).to.have.length(1);
            expect(responseData.body[0]).to.have.property('name')
                .that.equals('Marilyn Monroe');
            done();
        });

        actors.getActors({}, responseMock);
    });

    it('should return actors with movies', function (done) {
        actorDbStub.forEach.yields('actor-xyz', {
            name: 'Marilyn Monroe',
            movies: ['movie-abc', 'movie-def'],
        });
        movieDbStub.get.withArgs('movie-abc').returns({ title: 'Movie ABC' });
        movieDbStub.get.withArgs('movie-def').returns({ title: 'Movie DEF' });

        responseMock.verify(function(responseData) {
            expect(responseData.status).to.equal(200);
            expect(responseData.body).to.be.instanceOf(Array);
            expect(responseData.body).to.have.length(1);
            var actor = responseData.body[0];
            expect(actor.movies).to.be.an('array').of.length(2);
            expect(actor.movies[0].title).to.equal('Movie ABC');
            expect(actor.movies[1].title).to.equal('Movie DEF');
            done();
        });

        actors.getActors({}, responseMock);
    });
});
