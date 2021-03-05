import { fromEvent } from "rxjs";
import { NotificationManager } from "./notification-manager";
import { notificationStream } from "./notification-stream";

enum NotificationStates {
  auto,
  receive,
  pause
}

const notification = new NotificationManager(notificationStream);

fromEvent(document.getElementById("start"), "click").subscribe(() => {
  console.log("start");
  notification.getSource$().subscribe(console.log);
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
