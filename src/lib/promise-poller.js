import debugModule from 'debug';
import strategies from './strategies';
import { timeout, delay } from './util';

const debugMessage = debugModule('promisePoller');

const DEFAULTS = {
  strategy: 'fixed-interval',
  retries: 5,
  shouldContinue: err => {
    return !!err;
  }
};

let pollerCount = 0;

export const CANCEL_TOKEN = {};

export default function promisePoller(options = {}) {
  function debug(message) {
    debugMessage(`(${options.name}): ${message}`);
  }

  if (typeof options.taskFn !== 'function') {
    throw new Error('No taskFn function specified in options');
  }

  options = Object.assign({}, DEFAULTS, options);
  options.name = options.name || `Poller-${pollerCount++}`;
  debug(`Creating a promise poller "${options.name}" with interval=${options.interval}, retries=${options.retries}`);

  if (!strategies[options.strategy]) {
    throw new Error(`Invalid strategy "${options.strategy}". Valid strategies are ${Object.keys(strategies)}`);
  }
  const strategy = strategies[options.strategy];
  debug(`Using strategy "${options.strategy}".`);
  const strategyDefaults = strategy.defaults;
  Object.keys(strategyDefaults).forEach(option => (options[option] = options[option] || strategyDefaults[option]));

  debug('Options:');
  Object.keys(options).forEach(option => {
    debug(`    "${option}": ${options[option]}`);
  });

  return new Promise(function(resolve, reject) {
    let polling = true;
    let retriesRemaining = options.retries;
    let rejections = [];
    let masterTimeoutId = null;

    if (options.masterTimeout) {
      debug(`Using master timeout of ${options.masterTimeout} ms.`);
      masterTimeoutId = setTimeout(() => {
        debug('Master timeout reached. Rejecting master promise.');
        polling = false;
        reject('master timeout');
      }, options.masterTimeout);
    }

    function poll() {
      let task = options.taskFn();

      if (task === false) {
        task = Promise.reject('Cancelled');
        debug('Task function returned false, canceling.');
        reject(rejections);
        polling = false;
      }

      let taskPromise = Promise.resolve(task);

      if (options.timeout) {
        taskPromise = timeout(taskPromise, options.timeout);
      }

      taskPromise.then(
        function(result) {
          debug('Poll succeeded. Resolving master promise.');

          if (options.shouldContinue(null, result)) {
            debug('shouldContinue returned true. Will try again if there are retries remaining.');
            if (!--retriesRemaining) {
              debug('Maximum retries reached. Rejecting master promise.');
              reject(rejections);
            } else if (polling) {
              debug(`${retriesRemaining} retries remaining.`);

              const nextInterval = strategy.getNextInterval(options.retries - retriesRemaining, options);

              debug(`Waiting ${nextInterval}ms to try again.`);
              delay(nextInterval).then(poll);
            }
          } else {
            if (masterTimeoutId !== null) {
              clearTimeout(masterTimeoutId);
            }
            resolve(result);
          }
        },
        function(err) {
          if (err === CANCEL_TOKEN) {
            debug('Task promise rejected with CANCEL_TOKEN, canceling.');
            reject(rejections);
            polling = false;
          }

          rejections.push(err);
          if (typeof options.progressCallback === 'function') {
            options.progressCallback(retriesRemaining, err);
          }

          if (!--retriesRemaining || !options.shouldContinue(err)) {
            debug('Maximum retries reached. Rejecting master promise.');
            reject(rejections);
          } else if (polling) {
            debug(`Poll failed. ${retriesRemaining} retries remaining.`);

            const nextInterval = strategy.getNextInterval(options.retries - retriesRemaining, options);

            debug(`Waiting ${nextInterval}ms to try again.`);
            delay(nextInterval).then(poll);
          }
        }
      );
    }

    poll();
  });
}
