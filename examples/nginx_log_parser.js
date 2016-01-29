/**
* http://nginx.org/en/docs/http/ngx_http_log_module.html
* default format $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"
*/

/**
 * Create a log parser.
 *
 * @param {String} format
 */

var Parser = module.exports = function (format) {
    this.directives = {};

    var prefix = format.match(/^[^\$]*/);
    if (prefix) {
        format = this.escape(prefix[0]) + format.slice(prefix[0].length);
    }

    this.parser = format;

    var directive = /\$([a-z_]+)(.)?([^\$]+)?/g
      , match, regex, boundary, i = 1;

    while ((match = directive.exec(format))) {
        this.directives[match[1]] = i++;
        if (match[2]) {
            boundary = this.escape(match[2]);
            regex = '([^' + boundary + ']*?)' + boundary;
            if (match[3]) {
                regex += this.escape(match[3]);
            }
        } else {
            regex = '(.+)$';
        }
        this.parser = this.parser.replace(match[0], regex);
    }
    this.parser = new RegExp(this.parser);
    return this;
};


/**
 * Parse a log line.
 *
 * @param {Buffer|String} line
 * @param {Function} iterator
 */

Parser.prototype.parseLine = function (line) {
    var match = line.toString().match(this.parser);
    if (!match) {
        return;
    }

    var row = {
        msec: null
      , time_iso8601: null // local time in the ISO 8601 standard format
      , remote_addr: null
      , query_string: null
      , http_x_forwarded_for: null
      , http_user_agent: null
      , http_referer: null
      , time_local: null // local time in the Common Log Format
      , request: null
      , status: null //response status
      , request_time: null //request processing time in seconds with a milliseconds resolution; time elapsed between the first bytes were read from the client and the log write after the last bytes were sent to the client
      , request_length: null //request length (including request line, header, and request body)
      , pipe: null //“p” if request was pipelined, “.” otherwise
      , connection: null //connection serial number
      , connection_requests: null //the current number of requests made through a connection (1.1.18)
      , bytes_sent: null //the number of bytes sent to a client
      , body_bytes_sent: null
      , date: null
      , timestamp: null
      , ip: null
      , ip_str: null
      , request_body: {}
    };

    for (var key in this.directives) {
        row[key] = match[this.directives[key]];
        if (row[key] === '-') {
            row[key] = null;
        }
    }

    //Parse the timestamp
    if (row.time_iso8601) {
        row.date = new Date(row.time_iso8601);
    } else if (row.msec) {
        row.date = new Date(Number(row.msec.replace('.', '')));
    }
    if (row.time_local) {
        row.timestamp = new Date(row.time_local.split(' ')[0].replace(':',' ')).getTime();
    }

    //Parse the user's IP
    if (row.http_x_forwarded_for) {
        row.ip_str = row.http_x_forwarded_for;
    } else if (row.remote_addr) {
        row.ip_str = row.remote_addr;
    }
    if (row.ip_str) {
        var ip = row.ip_str.split('.', 4);
        row.ip = Number(ip[0]) * (2 << 23) +
            Number(ip[1]) * (2 << 15) +
            Number(ip[2]) * (2 << 7) +
            Number(ip[3]);
    }

    return row;
};

/**
 * Escape regular expression tokens.
 *
 * @param {String} str
 * @return {String}
 */

Parser.prototype.escape = function (str) {
    return str.replace(new RegExp('[.*+?|()\\[\\]{}]', 'g'), '\\$&');
};
