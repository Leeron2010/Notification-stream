import {
  interval,
  merge,
  Observable,
  BehaviorSubject,
  fromEvent,
  Subject,
  EMPTY,
  of
} from "rxjs";
import {
  bufferCount,
  bufferTime,
  bufferToggle,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  share,
  startWith,
  switchMap,
  tap,
  windowToggle,
  flatMap,
  withLatestFrom,
  scan,
  takeUntil,
  repeatWhen
} from "rxjs/operators";

enum NotificationStates {
  auto,
  receive,
  pause
}

class Notification<T> {
  private readonly pauseStatus$: Observable<T>;
  private readonly pauseOn$;
  private readonly pauseOff$;
  private readonly stop$ = new Subject();
  private readonly pausedNotifications$: Observable<T[]>;
  private readonly pausedNotificationsCount$: Observable<number>;
  private readonly source$: Observable<T[]>;
  public readonly manual$ = new BehaviorSubject<NotificationStates>(
    NotificationStates.auto
  );

  constructor(source: Observable<T>) {
    const innerSource = source.pipe(takeUntil(this.stop$));

    // @ts-ignore
    this.pauseStatus$ = innerSource.pipe(
      // @ts-ignore
      bufferTime(250),
      bufferCount(4),
      map((parts: any[][]) => parts.filter(part => part.length).length),
      map(weight => weight > 2),
      withLatestFrom(this.manual$),
      map(([prediction, manual]: [boolean, NotificationStates]) => {
        if (manual === NotificationStates.auto) {
          return prediction;
        } else {
          return manual === NotificationStates.pause;
        }
      }),
      distinctUntilChanged(),
      share()
    );
    // @ts-ignore
    this.pauseOn$ = this.pauseStatus$.pipe(filter(x => !!x));
    // @ts-ignore
    this.pauseOff$ = this.pauseStatus$.pipe(filter(x => !x));

    this.pausedNotifications$ = this.pauseStatus$.pipe(
      switchMap(value => {
        return value
          ? innerSource.pipe(scan((acc, val) => [...acc, val], []))
          : of([]);
      }),
      share()
    );

    this.pausedNotificationsCount$ = this.pausedNotifications$.pipe(
      map((x: any[]) => x.length)
    );

    this.source$ = merge(
      innerSource.pipe(
        // @ts-ignore
        windowToggle(this.pauseOff$, () => this.pauseOn$),
        // @ts-ignore
        flatMap(x => x),
        map(x => [x])
      ),
      innerSource.pipe(bufferToggle(this.pauseOn$, () => this.pauseOff$))
    );
  }

  public forcePause() {
    this.manual$.next(NotificationStates.pause);
  }

  public autoReceive() {
    this.manual$.next(NotificationStates.auto);
  }

  public forceReceive() {
    this.manual$.next(NotificationStates.receive);
  }

  public stop() {
    this.stop$.next();
  }

  public getSource$() {
    return this.source$;
  }

  public getPausedNotifications$() {
    return this.pausedNotifications$;
  }

  public getPausedNotificationsCount$() {
    return this.pausedNotificationsCount$;
  }
}

const notifications$ = interval(5000).pipe(
  // @ts-ignore
  startWith(1),
  switchMap(() => {
    const intervalTimes = [100, 1000];
    const intervalIndex = Math.floor(Math.random() * intervalTimes.length);

    // @ts-ignore
    return interval(intervalTimes[intervalIndex]).pipe(startWith(-1));
  }),
  finalize(() => console.log("finalize")),
  share()
);

const notification = new Notification(notifications$);
let subscription;

fromEvent(document.getElementById("start"), "click").subscribe(() => {
  console.log("start");
  subscription = notification.getSource$().subscribe(console.log);
  // notification.notificationsBufferChange$.subscribe(console.log);
});

fromEvent(document.getElementById("close"), "click").subscribe(() => {
  notification.stop();
  console.log("finish");
});

fromEvent(document.getElementById("auto"), "click").subscribe(() => {
  notification.autoReceive();
});
fromEvent(document.getElementById("pause"), "click").subscribe(() => {
  notification.forcePause();
});

fromEvent(document.getElementById("receive"), "click").subscribe(() => {
  notification.forceReceive();
});
