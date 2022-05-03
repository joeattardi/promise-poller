import promisePoller, { CANCEL_TOKEN } from '../lib/promise-poller';

describe('Promise Poller', () => {
  it('returns a promise', () => {
    const poller = promisePoller({
      taskFn: () => Promise.resolve('yay')
    });
    expect(poller.then).toBeDefined();
    expect(typeof poller.then).toBe('function');
  });

  it('resolves the master promise when the poll succeeds', done => {
    promisePoller({
      taskFn: () => Promise.resolve('yay'),
      interval: 500,
      retries: 3
    }).then(
      result => {
        expect(result).toBe('yay');
        done();
      },
      () => fail('Master promise was rejected')
    );
  });

  it('rejects the master promise when the poll fails', done => {
    promisePoller({
      taskFn: () => Promise.reject('derp'),
      interval: 500,
      retries: 3
    }).then(() => fail('Promise was resolved'), done);
  });

  it('rejects the master promise with an array of rejections', done => {
    let counter = 0;
    promisePoller({
      taskFn: () => Promise.reject(++counter),
      interval: 500,
      retries: 3
    }).then(
      () => fail('Promise was resolved'),
      errs => {
        expect(errs).toEqual([1, 2, 3]);
        done();
      }
    );
  });

  it('fails the poll if the timeout is exceeded', done => {
    const taskFn = () =>
      new Promise(function(resolve) {
        setTimeout(() => resolve('derp'), 5000);
      });

    promisePoller({
      taskFn,
      timeout: 1000,
      interval: 500,
      retries: 3
    }).then(
      () => {
        fail('Promise was resolved, should have timed out');
        done();
      },
      error => {
        expect(error[2].message.indexOf('timed out')).not.toBeLessThan(0);
        done();
      }
    );
  });

  it('rejects the master promise if the master timeout is exceeded', done => {
    let numPolls = 0;

    const taskFn = () =>
      new Promise(function(resolve, reject) {
        numPolls += 1;
        setTimeout(() => reject('derp'), 250);
      });

    promisePoller({
      taskFn,
      masterTimeout: 500,
      retries: 10
    }).then(
      () => {
        fail('Master promise was resolved, should have hit master timeout');
        done();
      },
      () => {
        expect(numPolls).not.toBeGreaterThan(2);
        done();
      }
    );
  });

  it('waits the given interval between attempts', done => {
    let last = 0;
    let now;
    const taskFn = () => {
      now = Date.now();
      if (last) {
        expect(now - last).not.toBeLessThan(500);
      }
      last = now;
      return Promise.reject('derp');
    };

    promisePoller({
      taskFn,
      interval: 500,
      retries: 3
    }).then(null, done);
  });

  it('uses the default retries of 5 if not specified', done => {
    let counter = 0;
    const taskFn = () => {
      counter++;
      return Promise.reject('derp');
    };

    promisePoller({
      taskFn,
      interval: 500
    }).then(null, () => {
      expect(counter).toBe(5);
      done();
    });
  });

  it('tries <retries> times before giving up', done => {
    let counter = 0;
    const taskFn = () => {
      counter++;
      return Promise.reject('derp');
    };

    promisePoller({
      taskFn,
      interval: 500,
      retries: 3
    }).then(null, () => {
      expect(counter).toBe(3);
      done();
    });
  });

  it('uses the default interval of 500 if not specified', done => {
    let last = 0;
    let now;
    const taskFn = () => {
      now = Date.now();
      if (last) {
        expect(now - last).not.toBeLessThan(500);
      }
      last = now;
      return Promise.reject('derp');
    };

    promisePoller({
      taskFn,
      retries: 3
    }).then(null, done);
  });

  it('throws an exception if no taskFn was specified', () => {
    const fn = () => promisePoller();
    expect(fn).toThrowError(/No taskFn/);
  });

  it('calls the progress callback with each failure', done => {
    let count = 0;
    let callback = function(retriesRemaining, error) {
      expect(error).toEqual('derp');
      expect(retriesRemaining).toEqual(3 - count);
      count++;
    };
    promisePoller({
      taskFn: () => Promise.reject('derp'),
      interval: 500,
      retries: 3,
      progressCallback: callback
    }).then(null, () => {
      expect(count).toEqual(3);
      done();
    });
  });

  it('wraps a non-promise task function return in Promise.resolve', done => {
    promisePoller({
      taskFn: () => 'foobar',
      interval: 500,
      retries: 3
    }).then(val => {
      expect(val).toEqual('foobar');
      done();
    });
  });

  it('fails the poll if an exception is thrown in the task function', done => {
    promisePoller({
      taskFn: () => {
        throw new Error('oops');
      },
      interval: 500,
      retries: 3
    }).then(null, err => {
      expect(err.message).toBe('oops');
      done();
    });
  });

  it('rejects the master promise if false is returned from the task function', done => {
    let counter = 0;
    const taskFn = () => {
      if (++counter === 1) {
        return false;
      } else {
        return Promise.reject('derp');
      }
    };

    promisePoller({
      taskFn,
      interval: 500,
      retries: 3
    }).then(fail, err => {
      expect(err).toEqual(['Cancelled']);
      expect(counter).toEqual(1);
      done();
    });
  });

  it('rejects the master promise if the task promise rejects with the cancel token', done => {
    let counter = 0;
    const taskFn = () => {
      if (++counter === 1) {
        return Promise.reject(CANCEL_TOKEN);
      } else {
        return Promise.reject('derp');
      }
    };

    promisePoller({
      taskFn,
      interval: 500,
      retries: 3
    }).then(fail, err => {
      expect(err).toEqual([CANCEL_TOKEN]);
      expect(counter).toEqual(1);
      done();
    });
  });

  it('clears the master timeout if the master promise resolves', done => {
    const globalObj = jasmine.getGlobal();
    spyOn(globalObj, 'setTimeout').and.callFake(() => 42);
    spyOn(globalObj, 'clearTimeout');
    promisePoller({
      taskFn: () => Promise.resolve('foobar'),
      masterTimeout: 10000
    }).then(val => {
      expect(val).toEqual('foobar');
      expect(globalObj.setTimeout).toHaveBeenCalled();
      expect(globalObj.clearTimeout).toHaveBeenCalledWith(42);
      done();
    });
  });

  it('rejects with correct error message when task fails and timeout is set', done => {
    const errorMessage = 'operation failed';
    const taskFn = () => {
      return Promise.reject(errorMessage);
    };

    promisePoller({
      taskFn,
      interval: 10,
      retries: 2,
      timeout: 10
    }).then(fail, err => {
      expect(err).toEqual([errorMessage, errorMessage]);
      done();
    });
  });

  it('bails out when shouldContinue returns false', done => {
    let counter = 0;
    const taskFn = () => Promise.reject(++counter);

    promisePoller({
      taskFn,
      shouldContinue(err) {
        if (err === 1) {
          return false;
        }
      }
    }).then(fail, err => {
      expect(err).toEqual([1]);
      done();
    });
  });

  it('continues to poll on success if shouldContinue returns true', done => {
    let counter = 0;
    const taskFn = () => Promise.resolve(++counter);

    promisePoller({
      taskFn,
      shouldContinue(err, result) {
        return result < 3;
      }
    }).then(result => {
      expect(result).toEqual(3);
      done();
    });
  });
});
