import Promise from "bluebird";
import debugModule from "debug";
import strategies from "./strategies";

const debug = debugModule("promisePoller");

const DEFAULTS = {
  strategy: "fixed-interval",
  retries: 5,
  shouldContinue: err => {
    return !!err;
  }
};

let pollerCount = 0;

/**
 *
 * 
 * @export
 * @param {Object} options that contains polling options
 * @param {function} options.taskFn a function that must resolve or reject a promise or return false to stop polling.
 * @param {Number} options.interval number of ms until taskFn runs again.
 * @param {Number} [options.retries=5] number of times taskFn is attempted.
 * @param {String} [options.strategy='fixed-interval'] one of 'fixed-interval', 'linear-backoff', 'exponential-backoff'.
 * @param {Number} [options.masterTimeout=null] ms to reject taskFns promise regardless of retries.
 * @returns {Promise} returns taskFn's resolved promise or array of rejections
 * @example 
 * promisePoller({
 *   taskFn: yourFn(),
 *   interval: 500,
 *   retries: 10,
 * })
 * .then(poll => //poll is your taskFn's promise value)
 * .catch(err => //err is an array of rejected values)
 */
export default function promisePoller(options = {}) {
  if (typeof options.taskFn !== "function") {
    throw new Error("No taskFn function specified in options");
  }

  Object.keys(DEFAULTS).forEach(
    option => (options[option] = options[option] || DEFAULTS[option])
  );
  options.name = options.name || `Poller-${pollerCount++}`;
  debug(
    `Creating a promise poller "${options.name}" with interval=${
      options.interval
    }, retries=${options.retries}`
  );

  if (!strategies[options.strategy]) {
    throw new Error(
      `Invalid strategy "${
        options.strategy
      }". Valid strategies are ${Object.keys(strategies)}`
    );
  }
  const strategy = strategies[options.strategy];
  debug(`(${options.name}) Using strategy "${options.strategy}".`);
  const strategyDefaults = strategy.defaults;
  Object.keys(strategyDefaults).forEach(
    option => (options[option] = options[option] || strategyDefaults[option])
  );

  debug(`(${options.name}) Options:`);
  Object.keys(options).forEach(option => {
    debug(`    "${option}": ${options[option]}`);
  });

  return new Promise(function(resolve, reject) {
    let polling = true;
    let retriesRemaining = options.retries;
    let rejections = [];
    let timeoutId = null;

    if (options.masterTimeout) {
      debug(
        `(${options.name}) Using master timeout of ${options.masterTimeout} ms.`
      );
      timeoutId = setTimeout(() => {
        debug(
          `(${options.name}) Master timeout reached. Rejecting master promise.`
        );
        polling = false;
        reject("master timeout");
      }, options.masterTimeout);
    }

    function poll() {
      let task = options.taskFn();

      if (task === false) {
        task = Promise.reject("Cancelled");
        debug(`(${options.name}) Task function returned false, canceling.`);
        reject(rejections);
        polling = false;
      }

      let taskPromise = Promise.resolve(task);

      if (options.timeout) {
        taskPromise = taskPromise.timeout(options.timeout);
      }

      taskPromise.then(
        function(result) {
          debug(`(${options.name}) Poll succeeded. Resolving master promise.`);

          if (options.shouldContinue(null, result)) {
            debug(`(${options.name}) shouldContinue returned true. Retrying.`);
            const nextInterval = strategy.getNextInterval(
              options.retries - retriesRemaining,
              options
            );
            debug(`(${options.name}) Waiting ${nextInterval}ms to try again.`);
            Promise.delay(nextInterval).then(poll);
          } else {
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
            resolve(result);
          }
        },
        function(err) {
          rejections.push(err);
          if (typeof options.progressCallback === "function") {
            options.progressCallback(retriesRemaining, err);
          }

          if (!--retriesRemaining || !options.shouldContinue(err)) {
            debug(
              `(${
                options.name
              }) Maximum retries reached. Rejecting master promise.`
            );
            reject(rejections);
          } else if (polling) {
            debug(
              `(${
                options.name
              }) Poll failed. ${retriesRemaining} retries remaining.`
            );

            const nextInterval = strategy.getNextInterval(
              options.retries - retriesRemaining,
              options
            );

            debug(`(${options.name}) Waiting ${nextInterval}ms to try again.`);
            Promise.delay(nextInterval).then(poll);
          }
        }
      );
    }

    poll();
  });
}