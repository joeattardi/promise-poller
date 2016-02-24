import PromisePoller from '../lib/promise-poller';
import Promise from 'bluebird';

describe('Promise Poller', function() {
  describe('#start', function() {
    it('returns a master promise', function() {
      let poller = new PromisePoller(() => {Promise.resolve('yay')}, 1000, 5);
      let result = poller.start();
      expect(typeof result.then).toBe('function');
      result.then(() => {}, () => {});
    });
  });

  it('resolves the master promise if the task succeeds', function(done) {
    let taskFn = function() {
      return Promise.resolve('yay');
    };

    let poller = new PromisePoller(taskFn, 1000, 5);
    poller.start().then(done, function() {
      fail('Master promise was rejected');
    });
  });

  it('rejects the master promise if the task fails', function(done) {
    let taskFn = function() {
      return Promise.reject('error');      
    };

    let poller = new PromisePoller(taskFn, 1000, 5);
    poller.start().then(function() {
      fail('Master promise was resolved');
    }, done);
  });
});
