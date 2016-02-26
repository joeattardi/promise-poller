import Promise from 'bluebird';
import debugModule from 'debug';

const debug = debugModule('promisePoller');


export default function promisePoller(interval, retries, taskFn, progressCallback) {
  debug(`Creating a promise poller with interval=${interval}, retries=${retries}`);

  return new Promise(function(resolve, reject) {
    let retriesRemaining = retries;

    function poll() {
      let task = taskFn();
      task.then(function(result) {
        debug(`Poll succeeded. Resolving master promise.`);
        resolve(result);
      }, function(err) {
        if (typeof progressCallback === 'function') {
          progressCallback(err);
        }

        if (!--retriesRemaining) {
          debug('Maximum retries reached. Rejecting master promise.');
          reject(err);
        } else {
          debug(`Poll failed. ${retriesRemaining} retries remaining.`);
          debug(`Waiting ${interval}ms to try again.`);
          Promise.delay(interval).then(poll);
        }
      });
    }

    poll();
  });
}

