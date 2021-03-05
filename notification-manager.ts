import {
  merge,
  Observable,
  BehaviorSubject,
  Subject,
  of,
  interval
} from "rxjs";
import {
  bufferCount,
  bufferTime,
  bufferToggle,
  distinctUntilChanged,
  filter,
  map,
  share,
  switchMap,
  windowToggle,
  flatMap,
  withLatestFrom,
  scan,
  takeUntil,
  startWith,
  mapTo,
  mergeAll
} from "rxjs/operators";
import { NotificationManagesStates } from "./notificaton-manager-states";

export class NotificationManager<T> {
  private readonly stop$ = new Subject();
  private readonly pausedNotifications$: Observable<T[]>;
  private readonly pausedNotificationsCount$: Observable<number>;
  private readonly source$: Observable<T[]>;
  public readonly manual$ = new BehaviorSubject<NotificationManagesStates>(
    NotificationManagesStates.auto
  );

  constructor(source: Observable<T>) {
    const innerSource = source.pipe(
      takeUntil(this.stop$),
      share()
    );

    const pauseStatus$ = innerSource.pipe(
      bufferTime(250),
      bufferCount(4),
      map((parts: any[][]) => parts.filter(part => part.length).length),
      map(weight => weight > 2),
      withLatestFrom(this.manual$),
      map(([prediction, manual]: [boolean, NotificationManagesStates]) => {
        if (manual === NotificationManagesStates.auto) {
          return prediction;
        } else {
          return manual === NotificationManagesStates.pause;
        }
      }),
      startWith(false),
      distinctUntilChanged(),
      share()
    );

    const chunkStatus$ = pauseStatus$.pipe(
      switchMap(isPaused => {
        return isPaused
          ? interval(1000).pipe(
              mapTo([true, false]),
              mergeAll(),
              startWith(true)
            )
          : of(false);
      }),
      share()
    );

    const pauseOn$ = pauseStatus$.pipe(filter(x => !!x));
    const pauseOff$ = pauseStatus$.pipe(filter(x => !x));

    const openChank$ = chunkStatus$.pipe(filter(x => !x));
    const closeChank$ = chunkStatus$.pipe(filter(x => !!x));

    this.pausedNotifications$ = pauseStatus$.pipe(
      switchMap(value => {
        return value
          ? innerSource.pipe(scan((acc: T[], val: T) => [...acc, val], []))
          : of([]);
      }),
      share()
    );

    this.pausedNotificationsCount$ = this.pausedNotifications$.pipe(
      map((x: any[]) => x.length)
    );

    this.source$ = merge(
      innerSource.pipe(
        windowToggle(pauseOff$, () => pauseOn$),
        flatMap(x => x),
        map(x => [x])
      ),
      innerSource.pipe(bufferToggle(openChank$, () => closeChank$))
    );
  }

  public forcePause() {
    this.manual$.next(NotificationManagesStates.pause);
  }

  public autoReceive() {
    this.manual$.next(NotificationManagesStates.auto);
  }

  public forceReceive() {
    this.manual$.next(NotificationManagesStates.receive);
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
