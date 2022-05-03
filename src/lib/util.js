export function timeout(promise, millis) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error('operation timed out')), millis);

    promise.then(
      result => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      error => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export function delay(millis) {
  return new Promise(resolve => {
    setTimeout(resolve, millis);
  });
}
