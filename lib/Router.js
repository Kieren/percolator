const Representer = require('./representers/JsonRepresenter').JsonRepresenter;
const fs = require('fs');
const _ = require('underscore');
const fullBodyParser = require('./middleware/fullBodyParser');
const jsonBodyParser = require('./middleware/jsonBodyParser');

function Router(app, resourceDirectory, base_uri){
  this.representer = new Representer();
  this.resourceDirectory = resourceDirectory;
  this.app = app;
  if (base_uri == '') base_uri = null;
  this.base_uri = base_uri || '/';
  this.resourceTree = {}
  this.available = false;
  this.app_methods = {"GET" : "get", 
                      "POST" : "post", 
                      "DELETE" : "del", 
                      "PUT" : "put",
                      };
}

Router.prototype.initialize = function(cb){
  var router = this;
  this.loadResourceTree(function(err){
    if (!!err) return cb(err);
    router.available = true;
    router.app.use(fullBodyParser());
    router.app.use(jsonBodyParser());
    router.app.use(function(req, res, next){ return router.handleRequest(req, res, next)})
    router.generateRoutes();
    cb();
  });
}

Router.prototype.generateRoutes = function(){
  var router = this;
  var root_resources = [];
  _.each(this.resourceTree['/'], function(resourceName){
    root_resources.push(resourceName);
    var filePath = urlJoin(router.resourceDirectory, resourceName);
    var resourceHandler = require(filePath).handler
    var routeString = urlJoin(router.base_uri, resourceName)
    router.setRouteHandlers(routeString, resourceHandler);
  });

  var serviceDocHandler = this.getServiceDocumentHandler(this.base_uri, root_resources)
  this.setRouteHandlers(this.base_uri, serviceDocHandler)
  var base_uri_without_slash = this.base_uri.substring(0, this.base_uri.length - 1);
  if (base_uri_without_slash != ""){
    this.setRouteHandlers(base_uri_without_slash, serviceDocHandler)
  }
  router.app.use(function(req, res, next){ return router.errorNotFound(req, res)})
}

Router.prototype.setRouteHandlers = function(resourcePath, resourceHandler){
  var router = this;
  var isCollection = router.handlerIsCollection(resourceHandler);

  // set GET, POST, PUT, DELETE for this resource file
  if (isCollection){
    _.each(router.app_methods, function(functionName, http_method){
      router._routeToMethodHandler(resourcePath, resourceHandler, http_method, 'collection');
      router._routeToMethodHandler(urlJoin(resourcePath, ':id') , resourceHandler, http_method);
    })
  } else {
    _.each(router.app_methods, function(functionName, http_method){
      router._routeToMethodHandler(resourcePath, resourceHandler, http_method);
    })
  }

  // set OPTIONS for this resource
  if (isCollection){
    this._setOptionsHandler(resourceHandler, resourcePath, true);
    this._setOptionsHandler(resourceHandler, urlJoin(resourcePath, ':id'), false);
  } else {
    this._setOptionsHandler(resourceHandler, resourcePath, false);
  }
}

Router.prototype._routeToMethodHandler = function(resourcePath, resourceHandler, httpMethod, methodPrefix){
    var router = this;
    var methodPrefix = methodPrefix || ''
    var handlerDefault = function(q, s){
                        // default to method not allowed
                        router.errorMethodNotAllowed(q, s)
                      }
    var resourceMethod = methodPrefix + httpMethod;
    if (!!resourceHandler[resourceMethod]){
      var handler = function(q, s){resourceHandler[resourceMethod](q, s)}
    } else {
      var handler = handlerDefault;
    }
    this.setRouteHandler(httpMethod, resourcePath, handler);
}

Router.prototype._setOptionsHandler = function(resourceHandler, resourcePath, isCollection){
  var allowed_methods = [];
  var router = this;
  _.each(router.app_methods, function(functionName, httpMethod){
    var handlerMethod = (isCollection) ? ("collection" + httpMethod) : httpMethod;
    if (!!resourceHandler[handlerMethod]){
      allowed_methods.push(httpMethod)
    }
  });
  this.setRouteHandler("OPTIONS", resourcePath, function(req, res){
    res.header('Allow', allowed_methods.join(","));
    res.send(router.representer.options(allowed_methods));
  })
}



Router.prototype.handlerIsCollection = function(handler){
  // if any collection method is set, it's a collection
  return _.any(_.keys(this.app_methods), function(method){
    return !!handler["collection" + method]
  });
}

Router.prototype.setRouteHandler = function(http_method, path, handler){
  var methods = _.clone(this.app_methods)
  methods["OPTIONS"] = 'options'
  var app_method = methods[http_method]
  this.app[app_method](path, handler)
}

Router.prototype.loadResourceTree = function(cb){
  try {
    this.validateResourceDirectory();
  } catch (ex) {
    return cb(ex);
  }
  var router = this;
  fs.readdir(this.resourceDirectory, function(err, files){
    var resources = [];
    _.each(files, function(file){
      if (endsWith(file, ".js")) {
        resources.push(file.substring(0, file.length - 3));
      };
    });
    router.resourceTree['/'] = resources;
    cb(null);
  });
};

Router.prototype.getServiceDocumentHandler = function(path, root_resources){
  var links = {'self' : path}
  _.each(root_resources, function(resource){
    links[resource] = urlJoin(path, resource);
  });
  var serviceDoc = this.representer.individual({}, links)
  return {
    'GET' : function(req, res){ res.send(serviceDoc); }
  }
}


Router.prototype.validateResourceDirectory =function(){
  var dir = this.resourceDirectory
  try {
    var stats = fs.lstatSync(dir);
  } catch (err){
    if (err.code == 'ENOENT'){
      throw "resource_dir parameter was not a valid directory: " + dir
    } else {
      throw err;
    }
  }
  if (!stats.isDirectory()){
    throw "resource_dir parameter was not a valid directory: " + dir
  }
}


Router.prototype.handleRequest = function(req, res, next){
  if (!this.available){
    return this.errorServerUnavailable(req, res)
  }
  if (req.originalUrl.length > 4096){
    return this.errorRequestUriTooLong(req, res)
  }
  //return this.errorNotFound(req, res);
  return next();
}

Router.prototype.errorServerUnavailable = function(req, res){
  var error_representation = this.representer.error("ServerUnavailable", "The server is currently offline.")
  res.send(error_representation, 503);
}

Router.prototype.errorNotFound = function(req, res){
  var error_representation = this.representer.error("NotFound", "There is no resource with the provided URI.", req.originalUrl)
  res.send(error_representation, 404);
}

Router.prototype.errorRequestUriTooLong = function(req, res){
  var error_representation = this.representer.error("RequestUriTooLong", "The provided URI is too long.", req.originalUrl)
  res.send(error_representation, 414);
}

Router.prototype.errorMethodNotAllowed = function(req, res){
  var error_representation = this.representer.error("MethodNotAllowed", "That method is not allowed for this resource.", req.method)
  res.send(error_representation, 405);
}

exports.Router = Router;

// -- util

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function urlJoin(){
  return _.toArray(arguments)
            .join('/')     // add a path divisor
            .split('//')   // remove duplicate slashes
            .join('/');    // re-join with single slashes
}