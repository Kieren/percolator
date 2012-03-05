const express = require('express');
const should = require('should');
const Router = require('../lib/Router').Router;
const hottap = require('hottap').hottap;
const _ = require('underscore');
const mongoose = require('mongoose');


describe('Router', function(){
	beforeEach(function(){
    this.app = express.createServer();
    this.db = mongoose.connect('mongodb://127.0.0.1:27017/percolator')
    this.simpleRouter = new Router(this.app, __dirname + '/../test_fixtures/resources')
	})
	afterEach(function(){
    try {
      this.app.close();
    } catch (ex){
      // do nothing. assumed already closed.
    }
	})
  

    it ("returns an exception when the resource directory doesn't exist", function(done){
      this.app = express.createServer();
      try {
        var router = new Router(this.app, __dirname + '/../test_fixtures/no_dir_by_this_name')
        should.fail("expected exception was noth thrown")
      } catch (err){
        err.should.match(/resource_dir parameter was not a valid directory:/);
        done();
      }
    });


    it ("responds with a 503 if the server is marked as unavailable", function(done){
      this.simpleRouter.available = false;
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/").request("GET", function(err, result){
          if (!!err){ console.log(err); should.fail("error shouldn't exist. " + err);}
          result.status.should.equal(503)
          JSON.parse(result.body).error.type.should.equal("ServerUnavailable")
          JSON.parse(result.body).error.message.should.equal("The server is currently offline.")
          done();
        });
      });
    });


    it ("responds with a 404 if the resource is entirely unknown", function(done){
      this.app.listen(1338, function(){
        hottap("http://localhost:1338/doesnotexist").request("GET", function(err, result){
          result.status.should.equal(404)
          JSON.parse(result.body).error.type.should.equal("NotFound")
          JSON.parse(result.body).error.message.should.equal("There is no resource with the provided URI.")
          JSON.parse(result.body).error.detail.should.equal('/doesnotexist')
          done();
        });
      });
    });


    it ("responds with a 200 if the resource exists and method is implemented", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/happy").request("GET", function(err, result){
          result.status.should.equal(200)
          result.body.should.equal("this worked")
          done();
        });
      });
    });

    // make it so we can mount the router to a different path
    it ("responds with a 200 for an existing resource on a *mounted* path", function(done){
      this.simpleRouter = new Router(this.app, __dirname + '/../test_fixtures/resources', '/api/')
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/api/happy").request("GET", function(err, result){
          result.status.should.equal(200)
          result.body.should.equal("this worked")
          done();
        });
      });
    });

    it ("responds with a 405 if the resource exists but the method is disallowed", function(done){
      this.app.listen(1338, function(){
        hottap("http://localhost:1338/happy").request("POST", function(err, result){
          result.status.should.equal(405)
          JSON.parse(result.body).error.type.should.equal("MethodNotAllowed")
          JSON.parse(result.body).error.message.should.equal("That method is not allowed for this resource.")
          JSON.parse(result.body).error.detail.should.equal('POST')
          done();
        });
      });
    });

    it ("responds with the Allow header for a simple OPTIONS", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/happy").request("OPTIONS", function(err, result){
          if (!!err){ console.log(err); should.fail("error shouldn't exist. " + err);}
          result.status.should.equal(200)
          should.exist(result.headers['allow'])
          result.headers['allow'].should.equal("GET")
          JSON.parse(result.body)['Allowed'][0].should.equal("GET")
          JSON.parse(result.body)['Allowed'].length.should.equal(1)
          done();
        });
      });
    });

    it ("responds with the Allow header for a OPTIONS on sub-resources of collections", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/many/1234").request("OPTIONS", function(err, result){
          if (!!err){ console.log(err); should.fail("error shouldn't exist. " + err);}
          result.status.should.equal(200)
          should.exist(result.headers['allow'])
          result.headers['allow'].should.equal("GET")
          JSON.parse(result.body)['Allowed'][0].should.equal("GET")
          JSON.parse(result.body)['Allowed'].length.should.equal(1)
          done();
        });
      });
    });

    it ("responds with the Allow header for a OPTIONS on collections", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/many/").request("OPTIONS", function(err, result){
          if (!!err){ console.log(err); should.fail("error shouldn't exist. " + err);}
          result.status.should.equal(200)
          should.exist(result.headers['allow'])
          result.headers['allow'].should.equal("GET")
          JSON.parse(result.body)['Allowed'][0].should.equal("GET")
          JSON.parse(result.body)['Allowed'].length.should.equal(1)
          done();
        });
      });
    });

    it ("responds with a service document when the root is requested", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/").request("GET", function(err, result){
          result.status.should.equal(200)
          var body = JSON.parse(result.body)
          body.links.happy.should.equal('/happy')
          done();
        });
      });
    })

    it ("responds with a service document for the root url, even without a trailing / ", function(done){
      var app = express.createServer();
      var router = new Router(app, __dirname + '/../test_fixtures/resources', '/api')
      app.listen(1337, function(){
        hottap("http://localhost:1337/api").request("GET", function(err, result){
          app.close();
          result.status.should.equal(200)
          var body = JSON.parse(result.body)
          body.links.happy.should.equal('/api/happy')
          done();
        });
      });
    })

    it ("sets up collection routes when possible", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/many").request("GET", function(err, result){
          result.status.should.equal(200)
          var body = JSON.parse(result.body)
          body.items[0].hello.should.equal("collectors")
          done();
        });
      });
    });

    it('should not allow uris that are too long', function(done){
      var url = 'http://localhost:1337/';
      for(var i = 0; i < 500; i++){
        url += '1234567890';
      }
      this.app.listen(1337, function(){
        hottap(url).request("GET", function(err, result){
          result.status.should.equal(414);
          JSON.parse(result.body).error.type.should.equal('RequestUriTooLong');
          done();
        });
      });
    });

    it ("sets up collection sub resource routes when possible", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/many/1234").request("GET", function(err, result){
                          result.status.should.equal(200)
                          result.body.should.eql('1234')
                          done();
                        });
      });
    });

    it ("creates a route tree", function(done){
      // TODO make this dive into deeper dirs for nested resources!
      var router = this.simpleRouter;
      var diff = _.difference( router.resourceTree['/'], ['cars', 'happy', 'artist', 'empty', 'many'])
      diff.length.should.equal(0)
      done();
    })

    it ("sets up collection sub-sub resources when a folder exists with resources", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/artist/1234/album").request("GET", function(err, result){
                          result.status.should.equal(200)
                          done();
                        });
      });
    });

    it ("should 405 on missing methods of a sub-collection", function(done){
      this.app.listen(1337, function(){
        hottap("http://localhost:1337/artist/1234/album/").request("PUT", function(err, result){
                          result.status.should.equal(405)
                          done();
                        });
      });
    });

  // TODO make full urls on all links an option
  // TODO make MongoResource *not* spit full url 
  // TODO is it possible to make the router deny all requests if it hasn't been initialized?

  describe("#handlerIsCollection", function(){
    it ("returns false when the handler is not a collection", function(done){
      this.simpleRouter.handlerIsCollection({"GET" : function(){}}).should.equal(false);
      done();
    });
    it ("returns true when the handler is a collection", function(done){
      this.simpleRouter.handlerIsCollection({"collectionGET" : function(){}}).should.equal(true);
      done();
    });
  });
  
});
