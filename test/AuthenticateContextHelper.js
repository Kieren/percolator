var should = require('should');
var fch = require('../ContextHelpers/Authenticate');

describe("AuthenticateContextHelper", function(done){
  it ("does nothing if the context has no authenticate method", function(done){
    var $ = {};
    fch($, function(err){
      should.not.exist(err);
      should.not.exist($.fetched);
      done();
    });
  });
  it ("runs the object's authenticate method if it has one", function(done){
    var $ = { authenticate : function(context, cb){ done(); }};
    fch($, function(err, fetch){

    });
  });
  it ("sets authenticated on the object", function(done){
    var $ = {
              authenticate : function(context, cb){
                        cb(null, '1234');  // we fetched 1234
                      }
            };
    fch($, function(err){
      should.not.exist(err);
      $.authenticated.should.equal('1234');
      done();
    });
  });
  it ("responds with an unauthenticated status if the err is true", function(done){
    var inputUrl = '';
    var $ = {
              authenticate : function(context, cb){
                        cb(true);  // true is a notFound error
                      },
              status : {
                unauthenticated : function(){ 
                  should.not.exist($.authenticated);
                  done();
                }
              }
            };
    fch($, function(){
      should.fail("this should never get called");
    });
  });
  it ("responds with an internalServerError if the err is non-true/non-falsey", function(done){
    var inputUrl = '';
    var $ = {
              authenticate : function(context, cb){
                        cb({some : 'error'});  // not falsey, not strict true
                      },
              status : {
                internalServerError : function(detail){ 
                  should.not.exist($.fetched);
                  detail.should.eql({some : 'error'});
                  done();
                }
              }
            };
    fch($, function(){
      should.fail("this should never get called");
    });
  });

});