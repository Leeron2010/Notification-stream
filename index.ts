import { fromEvent } from "rxjs";
import { NotificationManager } from "./notification-manager";
import { getNotificationStream } from "./notification-stream";
import { NotificationStreamStates } from "./notificaton-stream-states";

const notificationStream = getNotificationStream();
const notification = new NotificationManager(notificationStream, 20000);
let chankTime = 0;

fromEvent(document.getElementById("start"), "click").subscribe(() => {
  notification.setChunkTime(chankTime);
  notification.getSource$().subscribe(console.log.bind(this, "stream"));
  notification.getPausedNotificationsCount$().subscribe((count: number) => {
    document.getElementById("pausedCount").innerText = `${count}`;
  });
  notification.getPausedNotifications$().subscribe((bufferArray: any[]) => {
    document.getElementById("pausedBuffer").innerText = `${bufferArray.length}`;
  });
  notification.getStreamState$().subscribe(selectedId => {
    Object.keys(NotificationStreamStates).map((id: string) => {
      (document.getElementById(id) as HTMLButtonElement).disabled = false;
    });

    (document.getElementById(selectedId) as HTMLButtonElement).disabled = true;
  });
});

fromEvent(document.getElementById("stop"), "click").subscribe(() => {
  notification.stop();
});

fromEvent(document.getElementById("auto"), "click").subscribe(() => {
  notification.auto(chankTime);
});

fromEvent(document.getElementById("pause"), "click").subscribe(() => {
  notification.pause(chankTime);
});

fromEvent(document.getElementById("receive"), "click").subscribe(() => {
  notification.receive();
});

fromEvent(document.getElementById("chank-time"), "change").subscribe(() => {
  chankTime = +(document.getElementById("chank-time") as HTMLInputElement)
    .value;
});
