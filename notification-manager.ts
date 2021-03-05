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
  map,
  share,
  switchMap,
  windowToggle,
  flatMap,
  withLatestFrom,
  scan,
  takeUntil
} from "rxjs/operators";
import { NotificationManagesStates } from "./notificaton-manager-states";

export class NotificationManager<T> {
  private readonly pauseStatus$: Observable<boolean>;
  private readonly pauseOn$;
  private readonly pauseOff$;
  private readonly chunk$;
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

    this.pauseStatus$ = innerSource.pipe(
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
      distinctUntilChanged(),
      share()
    );
    this.pauseOn$ = this.pauseStatus$.pipe(filter(x => !!x));
    this.pauseOff$ = this.pauseStatus$.pipe(filter(x => !x));

    // this.chunk$ = pauseOn$.

    this.pausedNotifications$ = this.pauseStatus$.pipe(
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
