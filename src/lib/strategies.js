const strategies = {
  'fixed-interval': {
    defaults: {
      interval: 1000
    },
    getNextInterval: function(count, options) {
      return options.interval;
    }
  },

  'linear-backoff': {
    defaults: {
      start: 1000,
      increment: 1000
    },
    getNextInterval: function(count, options) {
      return options.start + (options.increment * (count));
    }
  },

  'exponential-backoff': {
    defaults: {
      min: 1000,
      max: 30000
    },
    getNextInterval: function(count, options) {
     return Math.min(options.max, Math.round(Math.random() * (Math.pow(2, count) * 1000 - options.min) + options.min));
    }
  }
};

module.exports = strategies;
