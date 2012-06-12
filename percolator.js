//var fs = require('fs');
var Router = require('detour').Router;
var Reaper = require('reaper').Reaper;
var StatusManager = require('./StatusManager').StatusManager;
var _ = require('underscore');

Percolator = function(options){
  this.statusman = new StatusManager();
  this.router = new Router();
  this.options = options;
  this.mediaTypes = new Reaper();
  this.port = options.port || 80;
  this.protocol = options.protocol || 'http';
  this.resourceDir = options.resourceDir || './resources';
  this.options = {port : this.port, 
                  protocol : this.protocol, 
                  resourceDir : this.resoourceDir};
  this.assignErrorHandlers();
};

Percolator.prototype._getMethods = function(resource){
  var serverSupportedMethods = ["GET", "POST", 
                                "PUT", "DELETE",
                                "HEAD", "OPTIONS"];
  var moduleMethods = _.functions(resource);
  var methods = _.intersection(moduleMethods, serverSupportedMethods);
  var additionalMethods = ['OPTIONS'];
  if (_.isFunction(resource.GET)){
    additionalMethods.push('HEAD');
  }
  methods = _.union(additionalMethods, methods);
  return methods;
};

Percolator.prototype.setRepresenterMethod = function(resource){
  // set repr() for all resources
  var mediaTypes = this.mediaTypes;
  resource.repr = function(req, res, data){
    var obj = mediaTypes.out(req.headers.accept, data);
    res.setHeader('content-type', obj.type);
    res.send(obj.content);
  };
};


Percolator.prototype.setOptionsHandler = function(resource){
  // tell each resource how to respond to OPTIONS
  if (!!resource.input){
    var that = this;
    resource.input.OPTIONS = function(req, res){
      var responder = that.statusman.createResponder(req, res);
      return responder.OPTIONS(that._getMethods(resource.input));
    };
  }

};

// run the directory router and call the callback afterward
Percolator.prototype.getRoutes = function(cb){
  var that = this;
  this.router.on("route", function(resource){
    that.decorateResource(resource);
  });
  this.router.routeDirectory(this.resourceDir, function(err){
    cb(err);
  });
};


Percolator.prototype.decorateResource = function(resource){

  resource.router = this.router;
  this.setOptionsHandler(resource);
  // PERCOLATOR: tell each resource how to handle 404s.
  // THINK: shouldn't each resource know about all errors?
  if (!resource.handle404){
    resource.handle404 = function(req, res){
      this.router.handle404(req, res);
    };
  }
  // PERCOLATOR: set 'app' for all resources
  resource.app = this.options;
  // PERCOLATOR: set getAbsoluteUrl() for all resources?
  resource.getAbsoluteUrl = function(hostname, path){
    var abs = this.app.protocol + '://' + hostname + path;
    console.log(abs);
    return abs;
  };
  this.setRepresenterMethod(resource);

};

// register error handlers for each content type
Percolator.prototype.assignErrorHandlers = function(){
  // tell the router about the error handlers it can use
  var statusman = this.statusman;
  var router = this.router;

  router.handle414 = function(req, res){
    statusman.createResponder(req, res).requestUriTooLong();
  };

  router.handle404 = function(req, res){
    // TODO fix resource.fetch to use this handle404 instead of default!!!
    console.log("four oh four");
    var responder = statusman.createResponder(req, res);
    console.log('responder.notFound');
    console.log(responder.notFound);
    responder.notFound();
  };

  router.handle405 = function(req, res){
    statusman.createResponder(req, res).methodNotAllowed();
  };

  router.handle501 = function(req, res){
    statusman.createResponder(req, res).notImplemented();
  };

  router.handle500 = function(req, res, ex){
    statusman.createResponder(req, res).internalServerError();
  };


};

Percolator.prototype.registerMediaType = function(type, instr, outobj){
  this.mediaTypes.register(type, instr, outobj);
};

Percolator.prototype.registerStatusResponder = function(type, responder){
  this.statusman.register(type, responder);
};

exports.Percolator = Percolator;