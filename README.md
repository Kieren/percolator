# Percolator
[![Build
Status](https://secure.travis-ci.org/cainus/percolator.png?branch=master)](http://travis-ci.org/cainus/percolator)

Percolator is a framework for quickly and easily building quality http APIs with node.js.  

It is intended for developers who want to build great APIs, but don't want to
have to write tedious boiler plate code over-and-over to achieve it.

It aims to be a great tool for building public-quality APIs, as well as being
better suited for apps that perform all of their view logic on the client-side,
like mobile apps and single-page apps.


## Quick Examples:

### Hello World
To create a simple read-only /helloworld resource that responds with "Hello
World!", create a file in the root 'resources' directory called "helloworld.js"
and put this in it:

```javascript
  exports.handler = {
    GET : function(req, res){
      res.send('Hello World!');
    }
  }
```

"req" and "res" are simply express's request and response objects.


## The "uri" API
Each method you define has access to a 'uri' module that understands the context of each particular request 
that it's used in.  The module makes a number of convenient methods available for dealing with uri's and 
generally making the parsing of uri's simpler and the creation of new uri's simple.  Here are example usages:

# General Usage:

```javascript
  exports.handler = {
    GET : function(req, res){
      res.send(this.uri.self());   // this will return the current url
    }
  }
```

# Api specifics:

```javascript
this.uri.absolute(path)
```
Takes a relative path and returns an absolute path.

```javascript
this.uri.help()
```
returns an object containing a bunch of method names from this module and their values.  Useful for debugging.


```javascript
this.uri.self()
```
returns the current uri (as an absolute uri).

```javascript
this.uri.params()
```
returns an object containing the name/value pairs of variables extracted from the uri's "path" (NOT 
including querystring).  An optional uri may be passed in, but the default is to use the current 
request's uri. 

```javascript
this.uri.param("someparam");
```
Retrieves the specified param value by the input param name from the object returned by this.uri.params() 
(see above).  

```javascript
this.uri.urlEncode(somestr);
```
take a string and return a url-encoded version of it

```javascript
this.uri.urlDecode(someEncodedStr)
```
take a url-encoded string and return a decoded version of it.


```javascript
this.uri.query();
};
```
Get the querystring data off the current url as an object with the name/value pairs in the querystring.  An 
alternative url can optionally be passed in.

```javascript
this.uri.queryString(someObj);
```
Take an input object and create a querystring of the name/value pairs in the object.

```javascript
this.uri.pathJoin("asdf", ["qwer", "tyui"], "1234");
```
Takes a list of strings and arrays of strings and returns a forward-slash-delimited path of all the pieces
in the order that they appear (without a trailing slash).


```javascript
this.uri.links();
```
Returns a dictionary of links that the router knows about for this resource, usually including parent and self
links and possibly child urls.

```javascript
this.uri.parent();
```
Get the parent URI of the current URI.  An optional URI may be passed in to get its' parent's URI instead.


```javascript
this.uri.namedKids();
```
Get a dictionary of all the child urls with their names.


```javascript
this.uri.kids();
```
Get a dictionary of all the child urls with their names if the have names.


```javascript
this.uri.parse();
```
Returns the result of node's url.parse ( http://nodejs.org/docs/v0.9.0/api/url.html#url_url_parse_urlstr_parsequerystring_slashesdenotehost ) 
for the current URI.  An optional URI can be passed to use that one instead.  



```javascript
this.url.get(); = function(nameOrPath, varDict){
```
Gets a url by name, or path.  An optional dictionary may be passed of variables to fille in necessary path variables.


## Values
### Make the hard stuff simple
* Get the HTTP/REST-Nerd stuff (serialization, authentication, hypermedia, status codes) right so 
that the developer doesn't have to.  See http://wiki.basho.com/Webmachine-Diagram.html to see what 
a full featured server should be doing on each request.

### Make the tedious stuff less tedious
* Implicit / Automatic Routing.  Each resource is in its own file (which is just a node.js module) and is routed 
automatically without you having to route explicitly.
* Automatic resource linking where possible, if desired.
* Make creating collections (especially based on databases) as easy as possible.

### Keep the simple stuff simple
* HTTP is simple.  If you know HTTP, you know the names of the methods of a Percolator resource.
* Can't do what you want within the framework?  Percolator is built on express.js, so you can 
drop back to using that framework directly anytime you need to.
* Continue to allow full control of request handling and response generation.
* No magic, and no code generators.

## Current State:
* Percolator is in an experimental stage, but it's built on express.js, so you 
can always fall back to express if something doesn't work for you.  I'd 
love to hear of other people using it and giving feedback/bug reports so I can 
iron out all the wrinkles.  

## Some glaring limitations being worked on:
* Built-in (stateless) authentication methods so the user doesn't have to write her own.
* Other representation formats than just "application/json", and a better factoring to 
allow custom media-types (per resource, even) if the user wishes.

## Automated Tests:
npm test
