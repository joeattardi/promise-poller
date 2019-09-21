# promise-poller
[![](https://travis-ci.org/joeattardi/promise-poller.svg?branch=master)](https://travis-ci.org/joeattardi/promise-poller)
[![](https://badge.fury.io/js/promise-poller.svg)](https://www.npmjs.com/package/promise-poller)
[![](https://david-dm.org/joeattardi/promise-poller.svg)](https://david-dm.org/joeattardi/promise-poller)

A basic poller built on top of promises.

Sometimes, you may perform asynchronous operations that may fail. In many of those cases, you want to retry these operations one or more times before giving up. `promise-poller` handles this elegantly using promises.

# Usage
## Basic usage
The core of `promise-poller` is a *task function*. This is simply a function that starts your asynchronous task and returns a promise. If the task function does not return a promise, it will be wrapped in a promise. To start polling, pass your task function to the `promisePoller` function:

    import promisePoller from 'promise-poller';

    function myTask() {
      // do some async stuff that returns a promise
      return promise;
    }

    var poller = promisePoller({
      taskFn: myTask
    });

The `promisePoller` function will return a "master promise". This promise will be resolved when your task succeeds, or rejected if your task fails and no retries remain.

The master promise will be resolved with the value that your task promise is resolved with. If the poll fails, the master promise will be rejected with an array of all the rejection reasons for each poll attempt.

`promise-poller` will attempt your task by calling the function and waiting on the returned promise. If the promise is rejected, `promise-poller` will wait one second and try again. It will attempt to execute your task 3 times before rejecting the master promise.

### Use in non-ES2015 environments
`promise-poller` is written using ES2015 and transpiled with Babel. The main `promisePoller` function is the default export. If you are using `promise-poller` in an ES5 environment, you will have to specify the `default` property when requiring the library in:

    var promisePoller = require('promise-poller').default;

## Specify polling options
You can specify a different polling interval or number of retries:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500, // milliseconds
      retries: 5
    });

## Specify timeout
If you want each poll attempt to reject after a certain timeout has passed, use the `timeout` option:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500,
      timeout: 2000
    });

In the above example, the poll is considered failed if it isn't resolved after 2 seconds. If there are retries remaining, it will retry the poll as usual.

## Specify "master timeout"
Instead of timing out each poll attempt, you can set a timeout for the entire master polling operation:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500,
      retries: 10,
      masterTimeout: 2000
    });

In the above example, the entire poll operation will fail if there is not a successful poll within 2 seconds. This will reject the master promise.

## Cancel polling
You may want to cancel the polling early. For example, if the poll fails because of an invalid password, that's not likely to change, so it would be a waste of time to continue to poll. To cancel polling early, return `false` from the task function instead of a promise.

Alternatively, if your task function involves async work with promises, you can reject the promise with the `CANCEL_TOKEN` object.

### Cancellation example

```javascript
import promisePoller, { CANCEL_TOKEN } from 'promise-poller';

const taskFn = () => {
  return new Promise((resolve, reject) => {
    doAsyncStuff().then(resolve, error => {
      if (error === 'invalid password') {
        reject(CANCEL_TOKEN); // will cancel polling
      } else {
        reject(error); // will continue polling
      }
    });
  });
}
```

## The `shouldContinue` function
You can specify an optional `shouldContinue` function that takes two arguments. The first argument is a rejection reason when a poll fails, and the second argument is the resolved value when a poll succeeds. 
If the poll attempt failed, and you want to abort further polling, return `false` from this function. On the other hand, if your poll resolved to a value but you want to keep polling, return `true` from this function.

## Select polling strategy
By default, `promise-poller` will use a fixed interval between each poll attempt. For example, with an `interval` option of 500, the poller will poll approximately every 500 milliseconds. This is the `fixed-interval` strategy. There are two other strategies available that may better suit your use case. To select a polling strategy, specify the `strategy` option, e.g.:

    promisePoller({
      taskFn: myTask,
      strategy: 'linear-backoff'
    });

### Linear backoff (`linear-backoff`)
Options:

* `start` - The starting value to use for the polling interval (default = 1000)
* `increment` - The amount to increase the interval by on each poll attempt.

Linear backoff will increase the interval linearly by some constant amount for each poll attempt. For example, using the default options, the first retry will wait 1000 milliseconds. Each successive retry will wait an additional 1000 milliseconds: 1000, 2000, 3000, 4000, etc.

### Exponential backoff with jitter (`exponential-backoff`)
Options:

* `min` - The minimum interval amount to use (default = 1000)
* `max` - The maximum interval amount to use (default = 30000)

Exponential backoff increases the poll interval by a power of two for each poll attempt. `promise-poller` uses exponential backoff with jitter. Jitter takes a random value between `min` and 2^*n* on the *n*th polling interval, not to exceed `max`. 

For more information about exponential backoff with jitter, and its advantages, see [https://www.awsarchitectureblog.com/2015/03/backoff.html](https://www.awsarchitectureblog.com/2015/03/backoff.html).

## Progress notification
You can also specify a progress callback function. Each time the task fails, the progress callback will be called with the number of retries remaining and the error that occurred (the value that the task promise was rejected with):

    function progress(retriesRemaining, error) {
      // log the error?
    }

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500,
      retries: 5,
      progressCallback: progress
    });

## Debugging
`promise-poller` uses the [debug](https://www.npmjs.com/package/debug) library. The debug name is `promisePoller`. To run your program with debug output for the `promise-poller`, set the `DEBUG` environment variable accordingly:

`% DEBUG=promisePoller node path/to/app.js`

If you have more than one poller active at a time, and you need to differentiate between them in debug output, you can give the `promisePoller` options a `name` property:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500,
      retries: 5,
      name: 'App Server Poller'
    });

When this poller prints debug messages, the poller name will be included:

    promisePoller (App Server Poller) Poll failed. 1 retries remaining. +504ms

# Contributors
* Joe Attardi
* /u/jcready
* Jason Stitt
* Emily Marigold Klassen

# License
The MIT License (MIT)

Copyright (c) 2016-2019 Joe Attardi <jattardi@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
