import promisePoller from '../lib/promise-poller';
import Promise from 'bluebird';

describe('Promise Poller', function() {
  it('returns a promise', function() {
    const fn = () => Promise.resolve('yay');
    const poller = promisePoller(1000, 5, fn);
    expect(poller.then).toBeDefined();
    expect(typeof poller.then).toBe('function');
  });

  it('resolves the master promise when the poll succeeds', function(done) {
    const fn = () => Promise.resolve('yay');
    promisePoller(1000, 5, fn).then((result) => {
      expect(result).toBe('yay');
      done();
    }, () => fail('Master promise was rejected'));
  });

  it('rejects the master promise when the poll fails', function(done) {
    const fn = () => Promise.reject('derp');
    promisePoller(500, 3, fn).then(() => fail('Master promise was resolved'), 
      (err) => {
        expect(err).toBe('derp');
        done();
    });
  });

  it('waits the given interval between attempts', function(done) {
    let last = 0; 
    let now;
    const fn = () => {
      now = Date.now();
      if (last) {
        expect(now - last).toBeGreaterThan(500); 
      }
      last = now;
      return Promise.reject('derp');
    };
    
    promisePoller(500, 3, fn).then(null, done);
  });

  it('tries <retries> times before giving up', function(done) {
    let counter = 0;
    const fn = () => {
      counter++;
      return Promise.reject('derp');
    };

    promisePoller(500, 3, fn).then(null, () => {
      expect(counter).toBe(3);
      done();
    });
  });

  it('calls the progress callback with each failure', function(done) {
    const fn = () => Promise.reject('derp');
    let callback = jasmine.createSpy();
    promisePoller(500, 3, fn, callback).then(null, (err) => {
      expect(callback.calls.count()).toBe(3);
      done();
    });
  });
});
