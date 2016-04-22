import promisePoller from '../lib/promise-poller';
import Promise from 'bluebird';

describe('Promise Poller', function() {
  it('returns a promise', function() {
    const poller = promisePoller({
      taskFn: () => Promise.resolve('yay')
    });
    expect(poller.then).toBeDefined();
    expect(typeof poller.then).toBe('function');
  });

  it('resolves the master promise when the poll succeeds', function(done) {
    promisePoller({
      taskFn: () => Promise.resolve('yay'),
      interval: 500,
      retries: 3
    }).then(result => {
      expect(result).toBe('yay');
      done();
    }, () => fail('Master promise was rejected'));
  });

  it('rejects the master promise when the poll fails', function(done) {
    promisePoller({
      taskFn: () => Promise.reject('derp'),
      interval: 500,
      retries: 3
    }).then(() => fail('Promise was resolved'),
      () => {
        done();
      });
  });

  it('rejects the master promise with an array of rejections', function(done) {
    let counter = 0;
    promisePoller({
      taskFn: () => Promise.reject(++counter),
      interval: 500,
      retries: 3
    }).then(() => fail('Promise was resolved'),
      (errs) => {
        expect(errs).toEqual([1, 2, 3]);
        done();
      });
  });

  it('fails the poll if the timeout is exceeded', function(done) {
    const taskFn = () => {
      return new Promise(function(resolve) {
        setTimeout(() => resolve('derp'), 5000);
      });
    };

    promisePoller({
      taskFn,
      timeout: 1000,
      interval: 500,
      retries: 3
    }).then(() => {
      fail('Promise was resolved, should have timed out');
      done();
    }, (error) => { 
      expect(error[2].message.indexOf('timed out')).not.toBeLessThan(0);
      done();
    });
  });

  it('rejects the master promise if the master timeout is exceeded', function(done) {
    let numPolls = 0;

    const taskFn = () => {
      return new Promise(function(resolve, reject) {
        numPolls += 1;
        setTimeout(() => reject('derp'), 250);
      });
    };

    promisePoller({
      taskFn,
      masterTimeout: 500,
      retries: 10
    }).then(() => {
      fail('Master promise was resolved, should have hit master timeout');
      done();
    }, () => {
      expect(numPolls).not.toBeGreaterThan(2);
      done();
    });
  });

  it('waits the given interval between attempts', function(done) {
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

  it('uses the default retries of 5 if not specified', function(done) {
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

  it('tries <retries> times before giving up', function(done) {
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

  it ('uses the default interval of 500 if not specified', function(done) {
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

  it('throws an exception if no taskFn was specified', function() {
    const fn = () => promisePoller();
    expect(fn).toThrowError(/No taskFn/);
  });

  it('calls the progress callback with each failure', function(done) {
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

  it('wraps a non-promise task function return in Promise.resolve', function(done) {
    promisePoller({
      taskFn: () => 'foobar',
      interval: 500,
      retries: 3
    }).then(val => {
      expect(val).toEqual('foobar');
      done();
    });
  });

  it('fails the poll if an exception is thrown in the task function', function(done) {
    promisePoller({
      taskFn: () => { throw new Error('oops'); },
      interval: 500,
      retries: 3
    }).then(null, err => {
      expect(err.message).toBe('oops');
      done();
    });
  });
});
