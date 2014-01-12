var _ = require('underscore'),
    url = require('url'),
    register = {};


function build(config) {
  var item = register[config.type];

  if (item === undefined) {
    throw new Error('Unknown type: ' + config.type);
  }

  delete config.type;
  return new item(config);
};


module.exports = exports = build;


exports.register = function(config) {
  var constructor = config.constructor,
      type = config.type;

  extend(constructor, exports.Base);
  delete config.type;
  delete config.constructor;
  _.extend(constructor.prototype, config);
  register[type] = constructor;
};


function extend(child, parent) {
  function Temp() {}
  Temp.prototype = parent.prototype;

  child.prototype = new Temp;
  child.prototype.constructor = child;
  child.__super__ = parent.prototype;

  return child;
}


module.exports.Base = function() {};

module.exports.Base.prototype.ok = function(out) {
  return {out: out};
};

module.exports.Base.prototype.error = function(message, location) {
  return {error: message, location: location || []};
};

exports.register({
  type: 'array',
  constructor: function(config) {
    this.item = build(config.item);

    if (_.has(config, 'lengths')) {
      this.lengths = config.lengths;
    }
    else if (_.has(config, 'length')) {
      this.lengths = [config.length];
    }
    else {
      this.lengths = [[-Infinity, Infinity]];
    }
  },
  run: function(input) {
    if (!_.isArray(input)) {
      return this.error('array required');
    }

    if (!_.any(this.lengths, function(length) { return input.length >= length[0] && input.length <= length[1]; })) {
      return this.error('invalid length');
    }

    for (var i = 0, len = input.length; i < len; i++) {
      var ret = this.item.run(input[i]);

      if (ret.error) {
        return this.error(ret.error, [i].concat(ret.location));
      }
      else {
        input[i] = ret.out;
      }
    }

    return this.ok(input);
  }
});

exports.register({
  type: 'number',
  constructor: function(config) {
    if (_.has(config, 'ranges')) {
      this.ranges = config.ranges;
    }
    else if (_.has(config, 'range')) {
      this.ranges = [config.range];
    }
    else {
      this.ranges = [[-Infinity, Infinity]];
    }
  },
  run: function(input) {
    if (typeof input != 'number') {
      return this.error('number required');
    }

    if (!_.any(this.ranges, function(range) { return input >= range[0] && input <= range[1]; })) {
      return this.error('not in range');
    }

    return this.ok(input);
  }
});

exports.register({
  type: 'object',
  constructor: function(config) {
    if(config.properties) {
      this.properties = {};

      for(var key in config.properties) { 
        if(_.has(config.properties, key)) {
          this.properties[key] = build(config.properties[key]);
        }
      }
    }
  },
  run: function(input) {
    if (!_.isObject(input)) {
      return this.error('object required'); 
    }

    if (this.properties === undefined) {
      return this.ok(input);
    }

    var properties = _.keys(input);

    for (var i = 0, len = properties.length; i < len; i++) {
      var property = properties[i];

      if (!_.has(this.properties, property)) {
        return this.error('unknown property', [property]);
      }
    }

    properties = _.keys(this.properties).sort();

    for(i = 0, len = properties.length; i < len; i++) {
      property = properties[i];

      if (!_.has(input, property)) {
        return this.error('missing property', [property]);
      }

      var ret = this.properties[property].run(input[property]);

      if (ret.error) {
        return this.error(ret.error, [property].concat(ret.location));
      }
      else {
        input[property] = ret.out;
      }
    }

    return this.ok(input);
  }
});

exports.register({
  type: 'string',
  constructor: function(config) {
    if (_.has(config, 'lengths')) {
      this.lengths = config.lengths;
    }
    else if (_.has(config, 'length')) {
      this.lengths = [config.length];
    }
    else {
      this.lengths = [[-Infinity, Infinity]];
    }
  },
  run: function(input) {
    if (!_.isString(input)) {
      return this.error('string required');
    }

    if (!_.any(this.lengths, function(len) { return input.length >= len[0] && input.length <= len[1]; })) {
      return this.error('invalid length');
    }

    return this.ok(input);
  }
});

exports.register({
  type: 'timestamp',
  constructor: function(config) {
    this.config = _.defaults(config, {toDate: false});
  },
  run: function(input) {
    var date = new Date(input);

    if (isNaN(date)) {
      return this.error('timestamp required');
    }

    return this.ok(this.config.toDate ? date : input);
  }
});

exports.register({
  type: 'url',
  constructor: function(config) {
    this.config = _.defaults(config, {
      hostname: true,
      protocol: true
    });
  },
  run: function(input) {
    if (typeof input != 'string') {
      return this.error('string required');
    }

    var parsedURL = url.parse(input);

    if (this.config.protocol && !parsedURL.protocol) {
      return this.error('protocol missing');
    }

    if (this.config.hostname && !parsedURL.hostname) {
      return this.error('hostname missing');
    }

    return this.ok(input);
  }
});
