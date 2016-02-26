import Promise from 'bluebird';
import debugModule from 'debug';

const debug = debugModule('promisePoller');

const DEFAULTS = {
  interval: 1000,
  retries: 5,
  name: 'Poller'
};

function promisePoller(options = {}) {
  Object.keys(DEFAULTS).forEach(option => options[option] = options[option] || DEFAULTS[option]);
  debug(`Creating a promise poller with interval=${options.interval}, retries=${options.retries}`);

  if (typeof options.taskFn !== 'function') {
    throw new Error('No taskFn function specified in options');
  }

  return new Promise(function(resolve, reject) {
    let retriesRemaining = options.retries;
    function poll() {
      Promise.resolve(options.taskFn()).then(function(result) {
        debug(`(${options.name}) Poll succeeded. Resolving master promise.`);
        resolve(result);
      }, function(err) {
        if (typeof options.progressCallback === 'function') {
          options.progressCallback(retriesRemaining, err);
        }

        if (!--retriesRemaining) {
          debug(`(${options.name}) Maximum retries reached. Rejecting master promise.`);
          reject(err);
        } else {
          debug(`(${options.name}) Poll failed. ${retriesRemaining} retries remaining.`);
          debug(`(${options.name}) Waiting ${options.interval}ms to try again.`);
          Promise.delay(options.interval).then(poll);
        }
      });
    }

    poll();
  });
}

module.exports = promisePoller;
