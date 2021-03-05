import { EMPTY, interval, Observable } from "rxjs";
import { scan, startWith, switchMap, tap } from "rxjs/operators";

let counter = 0;

const getOneOf = (...array: any[]) => {
  return array[Math.floor(Math.random() * array.length)];
};

export const notificationStream = new Observable(subscriber => {
  interval(5000)
    .pipe(
      startWith(-1),
      switchMap(() => {
        const intervalValue = getOneOf(0, 100, 150, 300, 1000);
        document.getElementById("interval").innerText = `${intervalValue}`;
        return intervalValue
          ? interval(intervalValue).pipe(startWith(-1))
          : EMPTY;
      }),
      tap(v => subscriber.next(v))
    )
    .pipe(
      tap(() => {
        document.getElementById("counter").innerText = `${++counter}`;
      })
    )
    .subscribe();
});

export function getNotificationStream(
  switchInterval = 5000,
  intervals = [0, 100, 150, 300, 1000]
) {
  return new Observable(subscriber => {
    interval(switchInterval)
      .pipe(
        startWith(-1),
        switchMap(() => {
          const intervalValue = getOneOf(...intervals);
          document.getElementById("interval").innerText = `${intervalValue}`;
          return intervalValue
            ? interval(intervalValue).pipe(startWith(-1))
            : EMPTY;
        }),
        tap(v => subscriber.next(v))
      )
      .pipe(
        tap(() => {
          document.getElementById("counter").innerText = `${++counter}`;
        })
      )
      .subscribe();
  });
}
