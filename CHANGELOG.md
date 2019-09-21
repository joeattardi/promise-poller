# Change Log

## 1.9.0 (September 20, 2019)

 * Added async cancellation via `CANCEL_TOKEN`.

## 1.8.0 (September 20, 2019)

 * Removed the dependency on Bluebird. The global `Promise` object is used instead.

## 1.7.0 (November 17, 2018)

 * Fixed some broken tests.
 * Added Prettier.
 * Updated dependencies.

## 1.6.0 (October 12, 2017)

 * Added support for the `showContinue` function.

## 1.5.2 (January 9, 2017)

 * Fixed the master timeout so that it doesn't make the program hang. Contributed by Jason Stitt.

## 1.5.1 (October 6, 2016)

 * Fixed the master timeout so that it fires properly and no subsequent polls are made.

## 1.5.0 (August 17, 2016)
 
 * Added feature to reject the master promise if the task function returns false

## 1.4.0 (April 21, 2016)

 * Added master timeout support.

## 1.3.0 (March 22, 2016)

* Changed master promise rejection to include all errors from all poll rejections.

## 1.2.0 (March 12, 2016)

* Added timeout support.

## 1.1.0 (March 5, 2016)

* Added support for different polling strategies (`fixed-interval`, `linear-backoff`, and `exponential-backoff`).

## 1.0.3 (March 3, 2016)

* Fixed some typos in README.
* Added badges to README.

## 1.0.2 (February 29, 2016)

* Added unique poller number to default debug name.
* Added credit to Reddit user /u/jcready for design idea contribution.

## 1.0.1 (February 26, 2016)

* Fixed broken Travis CI configuration.

## 1.0.0 (February 26, 2016)

* Initial release.
