import Promise from 'bluebird';
import debugModule from 'debug';
import strategies from './strategies';

const debug = debugModule('promisePoller');

const DEFAULTS = {
  strategy: 'fixed-interval',
  retries: 5
};

let pollerCount = 0;

export default function promisePoller(options = {}) {
  if (typeof options.taskFn !== 'function') {
    throw new Error('No taskFn function specified in options');
  }

  Object.keys(DEFAULTS).forEach(option => options[option] = options[option] || DEFAULTS[option]);
  options.name = options.name || `Poller-${pollerCount++}`;
  debug(`Creating a promise poller "${options.name}" with interval=${options.interval}, retries=${options.retries}`);

  if (!strategies[options.strategy]) {
    throw new Error(`Invalid strategy "${options.strategy}". Valid strategies are ${Object.keys(strategies)}`);
  }
  const strategy = strategies[options.strategy];
  debug(`(${options.name}) Using strategy "${options.strategy}".`);
  const strategyDefaults = strategy.defaults;
  Object.keys(strategyDefaults).forEach(option => options[option] = options[option] || strategyDefaults[option]);

  debug(`(${options.name}) Options:`);
  Object.keys(options).forEach(option => {
    debug(`    "${option}": ${options[option]}`);
  });

  return new Promise(function(resolve, reject) {
    let retriesRemaining = options.retries;
    let rejections = [];

    if (options.masterTimeout) {
      setTimeout(() => reject('master timeout'), options.globalTimeout);
    }

    function poll() {
      let task = options.taskFn();

      if (task === false) {
        task = Promise.reject('Cancelled');
        retriesRemaining = 1;
      }

      let taskPromise = Promise.resolve(task);

      if (options.timeout) {
        taskPromise = taskPromise.timeout(options.timeout);
      }

      taskPromise.then(function(result) {
        debug(`(${options.name}) Poll succeeded. Resolving master promise.`);
        resolve(result);
      }, function(err) {
        rejections.push(err);
        if (typeof options.progressCallback === 'function') {
          options.progressCallback(retriesRemaining, err);
        }

        if (!--retriesRemaining) {
          debug(`(${options.name}) Maximum retries reached. Rejecting master promise.`);
          reject(rejections);
        } else {
          debug(`(${options.name}) Poll failed. ${retriesRemaining} retries remaining.`);

          const nextInterval = strategy.getNextInterval(options.retries - retriesRemaining, options);

          debug(`(${options.name}) Waiting ${nextInterval}ms to try again.`);
          Promise.delay(nextInterval).then(poll);
        }
      });
    }

    poll();
  });
}

