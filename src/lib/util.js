export function delay(millis) {
  return new Promise(resolve => {
    setTimeout(resolve, millis);
  });
}
