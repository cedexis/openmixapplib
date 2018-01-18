
function ApplicationConfig() {}

ApplicationConfig.prototype.requireProvider = function(alias) { throw 'Stub me!'; };

function OpenmixRequest() {}

OpenmixRequest.prototype.getData = function(name) { throw 'Stub me!'; };

OpenmixRequest.prototype.getProbe = function(name) { throw 'Stub me!'; };

function OpenmixResponse() {}

OpenmixResponse.prototype.respond = function(alias, cname) { throw 'Stub me!' };
OpenmixResponse.prototype.setReasonCode = function(reason) { throw 'Stub me!' };
OpenmixResponse.prototype.setTTL = function(ttl) { throw 'Stub me!' };
