/*
Copyright (c) 2013 Will Conant, http://willconant.com/

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

'use strict'

exports.cleanDoc = cleanDoc

function cleanDoc(doc, fn) {
    var copy = {};
    var propsLeft = {}
    Object.keys(doc).forEach(function(key) {
        var value = doc[key]
        if (Array.isArray(value)) {
            copy[key] = []
            value.forEach(function(subdoc, index) {
                if (typeof subdoc === 'object' && subdoc !== null) {
                    copy[key][index] = {}
                    Object.keys(subdoc).forEach(function(subkey) {
                        copy[key][index][subkey] = subdoc[subkey]
                        propsLeft[key + '.' + subkey] = true
                    })
                } else {
                    copy[key][index] = null
                }
            })
        } else {
            copy[key] = value
            propsLeft[key] = true
        }
    })

    fn(function(name) {
        delete propsLeft[name]
        return new Prop(copy, name)
    })

    var propsLeft = Object.keys(propsLeft)
    if (propsLeft.length > 0) {
        if (propsLeft.length > 1) {
            throw new Error('unexpected properties: ' + propsLeft.join(', '))
        } else {
            throw new Error('unexpected property: ' + propsLeft[0])
        }
    }

    return copy
}

function Prop(doc, name) {
    var m = /^(\w+)(\.(\w+))?$/.exec(name)
    if (!m) {
        throw new Error('invalid property name: ' + name)
    }

    this.doc = doc
    this.prop = m[1]
    this.subprop = m[3]
}

Prop.prototype._error = function(index, message) {
    var name = this.prop
    if (index !== null) {
        name += '[' + index + '].' + this.subprop
    }
    throw new Error(name + ' ' + message)
}

Prop.prototype._process = function(fn) {
    var self = this
    if (self.subprop) {
        if (typeof self.doc[self.prop] === 'undefined') {
            self.doc[self.prop] = []
        } else if (!Array.isArray(self.doc[self.prop])) {
            throw new Error(self.prop + ' must be an array of objects')
        }
        self.doc[self.prop].forEach(function(subdoc, i) {
            if (subdoc === null) {
                self._error('must be an object')
            } else {
                subdoc[self.subprop] = fn(i, subdoc[self.subprop])
            }
        })
    } else {
        self.doc[self.prop] = fn(null, self.doc[self.prop])
    }
}

Prop.prototype.string = function(matching) {
    var self = this
    self._process(function(index, value) {
        try {
            return cleanString(value, matching)
        } catch (err) {
            self._error(index, err.message)
        }
    })
}

Prop.prototype.number = function(min, max) {
    var self = this
    self._process(function(index, value) {
        try {
            return cleanNumber(value, min, max)
        } catch (err) {
            self._error(index, err.message)
        }
    })
}

Prop.prototype.integer = function(min, max) {
    var self = this
    self._process(function(index, value) {
        try {
            return cleanInteger(value, min, max)
        } catch (err) {
            self._error(index, err.message)
        }
    })
}

Prop.prototype.boolean = function() {
    var self = this
    self._process(function(index, value) {
        try {
            return cleanBoolean(value)
        } catch (err) {
            self._error(index, err.message)
        }
    })
}

Prop.prototype.set = function(setValue) {
    var self = this
    self._process(function(index, value) {
        return setValue
    })
}

Prop.prototype.init = function(initValue) {
    var self = this
    self._process(function(index, value) {
        if (typeof value === 'undefined') {
            return initValue
        } else {
            return value
        }
    })
    return self
}

function cleanString(value, matching) {
    var type = typeof value

    if (type !== 'string') {
        if (type === 'number') {
            if (!isFinite(value)) {
                throw new TypeError('cannot be Infinity, -Infinity, or NaN')
            }
            value = value.toString(10)
        } else if (type === 'boolean') {
            value = value.toString()
        } else if (type === 'undefined') {
            value = ''
        } else {
            throw new TypeError('cannot be ' + type)
        }
    }

    if (matching && !matching.test(value)) {
        throw new Error('must match ' + matching.toString())
    }

    return value
}

function cleanNumber(value, min, max) {
    var type = typeof value

    if (type !== 'number') {
        if (type === 'string') {
            value = parseFloat(value)
        } else if (type === 'undefined') {
            value = 0
        } else {
            throw new TypeError('cannot be ' + type)
        }
    }

    if (!isFinite(value)) {
        throw new TypeError('cannot be Infinity, -Infinity, or NaN')
    }

    if (typeof min !== 'number') {
        min  -Infinity
    }

    if (typeof max !== 'number') {
        max = Infinity
    }

    if (value < min || value >= max) {
        throw new Error('must be in range [' + min + ', ' + max + ')')
    }

    return value
}

function cleanInteger(value, min, max) {
    var type = typeof value

    if (type !== 'number') {
        if (type === 'string') {
            value = parseFloat(value)
        } else if (type === 'undefined') {
            value = 0
        } else {
            throw new TypeError('cannot be ' + type)
        }
    }

    if (!isFinite(value)) {
        throw new TypeError('cannot be Infinity, -Infinity, or NaN')
    }

    value = Math.round(value)

    if (typeof min !== 'number') {
        min  -Infinity
    }

    if (typeof max !== 'number') {
        max = Infinity
    }

    if (value < min || value >= max) {
        throw new Error('must be in range [' + min + ', ' + max + ')')
    }

    return value
}

function cleanBoolean(value) {
    var type = typeof value

    if (type !== 'boolean') {
        if (type === 'string') {
            if (value === 'true') {
                value = true
            } else if (value === 'false' || value === '') {
                value = false
            } else {
                throw new Error('must be "false", "true", "1", "0", or "" for string conversion')
            }
        } else if (type === 'number') {
            if (value === 1) {
                value = true
            } else if (value === 0) {
                value = false
            } else {
                throw new Error('must be 1 or 0 for number conversion')
            }
        } else if (type === 'undefined') {
            value = false;
        } else {
            throw new TypeError('cannot be ' + type);
        }
    }

    return value
}
