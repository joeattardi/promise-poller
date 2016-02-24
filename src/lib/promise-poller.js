import Promise from 'bluebird';
import debugModule from 'debug';

const debug = debugModule('PromisePoller');

/**
 * A promise-based poller.
 *
 * Attempts one or more times to perform a task.
 *
 * The PromisePoller is given a task-execution function. This function
 * should return a Promise. 
 *
 * When starting the poller, a master promise will be returned. This
 * promise will be resolved once the task promise resolves, or rejected
 * once the poller has exhausting all the specified retries.
 *
 * After constructing the PromisePoller, begin the process by calling
 * the start() method.
 */
export default class PromisePoller {
  /**
   * Constructs a PromisePoller.
   *
   * @param {function} fn The task-executing function. Should return a promise.
   * @param {number} interval The time to wait, in milliseconds, before retrying.
   * @param {number} retries The number of times to try before giving up.
   */
  constructor(fn, interval, retries) {
    debug(`Creating PromisePoller with interval=${interval}, retries=${retries}`);
    this.fn = fn;
    this.interval = interval;
    this.retries = retries;
    this.attemptsRemaining = retries;
  }

  /**
   * Attempts to execute the task.
   */
  poll() {
    debug(`Polling, ${this.attemptsRemaining} attempts remaining`);
    let promise = this.fn();
    promise.then(this.pollSuccess.bind(this), this.pollFail.bind(this));
  }

  /**
   * Handles a failed poll. A retry will be scheduled after the
   * poll interval if attempts are remaining. Otherwise, the master
   * promise will be rejected with the rejection value of the last
   * failure.
   */
  pollFail(error) {
    if (--this.attemptsRemaining) {
      debug(`Poll failed, waiting ${this.interval}ms before retrying`);
      setTimeout(this.poll.bind(this), this.interval);
    } else {
      debug(`No more attempts remaining, rejecting master promise`);
      this.masterReject(error);
    }
  }

  /**
   * Handles a successful poll. Resolves the master promise
   * with whatever the task promise resolves with.
   */
  pollSuccess(result) {
    debug('Poll was successful, resolving master promise');
    this.masterResolve(result);
  }

  /**
   * Starts the polling process.
   * @return {Promise} A promise that will be resolved when the 
   *                   task is successful, or rejected when the
   *                   task fails and all retries are exhausted.
   */
  start() {
    debug('Starting poller');
    return new Promise((resolve, reject) => {
      this.masterResolve = resolve;
      this.masterReject = reject;
      this.poll();
    });
  }
}
