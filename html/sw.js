self.addEventListener('notificationclick', function (e) {
  const notification = e.notification;
  const action = e.action;
  notification.close();

  if (action === 'no') {
    console.log('NoOOOOOOOooo')
    fetch(`/api/calls/${notification.data.room}/${notification.data.id}`, {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({answer: 'no', uuid: notification.data.uuid})
    })
  } else if (action === 'yes'){
    console.log('YAAAAAS')
    fetch(`/api/calls/${notification.data.room}/${notification.data.id}`, {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({answer: 'yes', uuid: notification.data.uuid})
    })
    clients.openWindow('/#' + notification.data.room);
  } else {
    clients.openWindow('/#' + notification.data.room);    
  }
});

self.addEventListener('push', function (e) {
  const data = JSON.parse(e.data.text())
  var options = {
    body: 'Time: ' + data.time,
    icon: 'coffee.png',
    vibrate: [100, 50, 100],
    data: {
      id: data.id,
      time: data.time,
      timestamp: data.timestamp,
      room: data.room,
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