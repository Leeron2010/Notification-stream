import { EMPTY, interval, Observable } from "rxjs";
import { scan, share, startWith, switchMap, tap } from "rxjs/operators";

let counter = 0;

const getOneOf = (...array: any[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export function getNotificationStream(
  switchInterval = 5000,
  intervals = [0, 100, 150, 300, 1000]
) {
  return interval(switchInterval).pipe(
    startWith(-1),
    switchMap(() => {
      const intervalValue = getOneOf(...intervals);
      document.getElementById("interval").innerText = `${intervalValue}`;
      return intervalValue
        ? interval(intervalValue).pipe(startWith(-1))
        : EMPTY;
    }),
    tap(() => {
      document.getElementById("counter").innerText = `${++counter}`;
    })
  );
}
