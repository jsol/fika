self.addEventListener('notificationclick', function (e) {
  var notification = e.notification;
  var primaryKey = notification.data.primaryKey;
  var action = e.action;

  if (action === 'no') {
    console.log('NoOOOOOOOooo')
    notification.close();
  } else {
    console.log('YAAAAAS')
    notification.close();
  }
});


self.addEventListener('push', function (e) {

  const data = JSON.parse(e.data.text())


  var options = {
    body: 'Time: ' + data.time,
    icon: 'coffee.png',
    vibrate: [100, 50, 100],
    data: {
      time: data.time,
      timestamp: data.timestamp,
      room: data.id,
      uuid: data.uuid
    },
    actions: [
      {
        action: 'yes', title: 'Yes',
        icon: 'yes.png'
      },
      {
        action: 'no', title: 'No',
        icon: 'no.png'
      },
    ]
  };

  e.waitUntil(
    self.registration.showNotification('Fika time!', options)
  );
});