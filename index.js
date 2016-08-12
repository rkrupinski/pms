'use strict';

const constants = require('keymirror')({
  FULFILLED: null,
  PENDING: null,
  REJECTED: null,
});

const callbacks = new WeakMap();
const states = new WeakMap();
const values = new WeakMap();

class pms {

  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('Nope');
    }

    callbacks.set(this, {
      success: [],
      error: [],
    });

    states.set(this, constants.PENDING);

    const resolve = val => {
      if (states.get(this) !== constants.PENDING) {
        return;
      }

      if (val === this) {
        throw new TypeError('Nope');
      }

      states.set(this, constants.FULFILLED);
      values.set(this, val);

      setTimeout(() => {
        callbacks.get(this).success.forEach(cb => cb(val));
        callbacks.delete(this);
      });
    };

    const reject = reason => {
      if (states.get(this) !== constants.PENDING) {
        return;
      }

      states.set(this, constants.REJECTED);
      values.set(this, reason);

      setTimeout(() => {
        callbacks.get(this).error.forEach(cb => cb(reason));
        callbacks.delete(this);
      });
    };

    try {
      executor(resolve, reject);
    } catch (err) {
      return pms.reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    return new pms((resolve, reject) => {
      setTimeout(() => {
        const handle = (cb, fallback) => {
          if (typeof cb === 'function') {
            try {
              resolve(cb(values.get(this)));
            } catch (err) {
              reject(err);
            }
          } else {
            fallback(values.get(this));
          }
        };

        if (states.get(this) === constants.PENDING) {
          callbacks.get(this).success.push(() =>
              handle(onFulfilled, resolve));

          callbacks.get(this).error.push(() =>
              handle(onRejected, reject));
        }

        if (states.get(this) === constants.FULFILLED) {
          handle(onFulfilled, resolve);
        }

        if (states.get(this) === constants.REJECTED) {
          handle(onRejected, reject);
        }
      });
    });
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  static resolve(val) {
    return new pms(resolve => resolve(val));
  }

  static reject(reason) {
    return new pms((resolve, reject) => reject(reason));
  }

  static deferred() {
    const defer = {};

    defer.promise = new pms((resolve, reject) => {
      defer.resolve = resolve;
      defer.reject = reject;
    });

    return defer;
  }

}

module.exports = pms;
