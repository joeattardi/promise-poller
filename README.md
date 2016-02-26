# promise-poller
A basic poller built on top of promises. You can use any promise library that is Promises/A+ compliant.

Sometimes, you may perform asynchronous operations that may fail. In many of those cases, you want to retry these operations one or more times before giving up. `promise-poller` handles this elegantly using promises.

# Usage
## Basic usage
The core of `promise-poller` is a *task function*. This is simply a function that starts your asynchronous task and returns a promise. To start polling, pass your task function to the `promisePoller` function:

    var promisePoller = require('promise-poller');

    function myTask() {
      // do some async stuff that returns a promise
      return promise;
    }

    var poller = promisePoller({
      taskFn: myTask
    });

The `promisePoller` function will return a "master promise". This promise will be resolved when your task succeeds, or rejected if your task fails and no retries remain.

The master promise will be resolved with the value that your task promise is resolved with. Similarly, the master promise will be rejected with the *last failure*.

`promise-poller` will attempt your task by calling the function and waiting on the returned promise. If the promise is rejected, `promise-poller` will wait one second and try again. It will attempt to execute your task 3 times before rejecting the master promise.

## Specify polling options
You can specify a different polling interal or number of retries:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500, // milliseconds
      retries: 5
    });

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

`% DEBUG=progressPoller node path/to/app.js`

If you have more than one poller active at a time, and you need to differentiate between them in debug output, you can give the `promisePoller` options a `name` property:

    var poller = promisePoller({
      taskFn: myTask,
      interval: 500,
      retries: 5,
      name: 'App Server Poller'
    )};

When this poller prints debug messages, the poller name will be included:

    promisePoller (App Server Poller) Poll failed. 1 retries remaining. +504ms

# License
The MIT License (MIT)

Copyright (c) 2016 Joe Attardi <joe@attardi.net>

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
