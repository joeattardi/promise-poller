import PromisePoller from './lib/promise-poller';
import Promise from 'bluebird';

function error() {
  return Promise.reject('error');
}

let poller = new PromisePoller(error, 1000, 5);
poller.start().then(result => {
  console.log(`Poller resolved with value ${result}`);
}, error => {
  console.log(`Poller rejected with value ${error}`);
});

