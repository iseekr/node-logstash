var base_filter = require('../lib/base_filter'),
  util = require('util'),
  logger = require('log4node');
  var _parser = require('../../examples/nginx_log_parser.js');

function Parser() {
  base_filter.BaseFilter.call(this);
  this.mergeConfig({
    name: 'nginx log parser',
    required_params: ['format'],
    optional_params:['format2'],
    start_hook: this.start,
  });
}

util.inherits(Parser, base_filter.BaseFilter);

Parser.prototype.start = function(callback) {
  logger.info('Initialized nginx log filter with format: ' + this.format);
  this.parsers = this.format.split(',').map(function(one){
    return new _parser(one);
  });
  callback();
};

Parser.prototype.process = function(data) {
  if (data.message) {
    var log;
    for(var i = 0;i<this.parsers.length;i++){
      log = this.parsers[i].parseLine(data.message);
      if(log){
        break;
      }
    }
  }
  return {
    parsed:log,
    raw:data.message
  };
};

exports.create = function() {
  return new Parser();
};
