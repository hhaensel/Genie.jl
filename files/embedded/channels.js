if (typeof(window.Genie.WebChannels) == 'undefined') {
  Genie.WebChannels = {}
  console.log("Hello");
}

Genie.WebChannels.load_channels = function() {
  var channels = Genie.WebChannels;

  if (typeof(channels.sockets) == 'undefined') {
    channels.sendMessageTo = sendMessageTo;

    channels.sockets = {};
    channels.channels = [];
    channels.messageHandlers = [];
    channels.errorHandlers = [];
    channels.openHandlers = [];
    channels.closeHandlers = [];

    channels.messageHandlers.push(function(event, channel){
      try {
        if (event.data.startsWith('{') && event.data.endsWith('}')) {
          window.parse_payload(JSON.parse(event.data), channel);
        } else {
          window.parse_payload(event.data, channel);
        }
      } catch (ex) {
        console.log(ex);
      }
    });

    channels.errorHandlers.push(function(event, channel) {
      console.log(event.data);
    });

    channels.closeHandlers.push(function(event, channel) {
      console.log("Server closed WebSocket connection");
    });

    channels.openHandlers.push(function(event, channel) {
      if ( Genie.Settings.webchannels_autosubscribe ) {
        subscribe(channel);
      }
    });
  }

  let channel = window.Genie.Settings.webchannels_default_route
  let port = Genie.Settings.websockets_port == Genie.Settings.server_port ? window.location.port : Genie.Settings.websockets_port;
  let socket = new WebSocket(window.location.protocol.replace("http", "ws") + '//' + window.location.hostname + ':' +  port);

  socket.addEventListener('open', function(event) {
    for (var i = 0; i < channels.openHandlers.length; i++) {
      var f = channels.openHandlers[i];
      if (typeof f === 'function') {
        f(event, channel);
      }
    }
  });

  socket.addEventListener('message', function(event) {
    for (var i = 0; i < channels.messageHandlers.length; i++) {
      var f = channels.messageHandlers[i];
      if (typeof f === 'function') {
        f(event, channel);
      }
    }
  });

  socket.addEventListener('error', function(event) {
    for (var i = 0; i < channels.errorHandlers.length; i++) {
      var f = channels.errorHandlers[i];
      if (typeof f === 'function') {
        f(event, channel);
      }
    }
  });

  socket.addEventListener('close', function(event) {
    for (var i = 0; i < channels.closeHandlers.length; i++) {
      var f = channels.closeHandlers[i];
      if (typeof f === 'function') {
        f(event, channel);
      }
    }
  });

  window.addEventListener('beforeunload', function (event) {
    console.log("Preparing to unload " + channel);

    if ( Genie.Settings.webchannels_autosubscribe ) {
      unsubscribe(channel)
    }
    let sock = Genie.WebChannels.sockets[channel]
    if (sock.readyState === 1) {
      sock.close();
    }
  });

  channels.channels.push(window.Genie.Settings.webchannels_default_route);
  channels.sockets[window.Genie.Settings.webchannels_default_route] = socket;

  // A message maps to a channel route so that channel + message = /action/controller
  // The payload is the data made exposed in the Channel Controller
  function sendMessageTo(channel, message, payload = {}) {
    let sock = Genie.WebChannels.sockets[channel]
    if (sock.readyState === 1) {
      sock.send(JSON.stringify({
        'channel': channel,
        'message': message,
        'payload': payload
      }));
    }
  }
};

Genie.WebChannels.load_channels();

console.log("Channel:" + window.Genie.Settings.webchannels_default_route)
console.log(Genie.WebChannels.channels)

function parse_payload(json_data) {
  console.log("Overwrite window.parse_payload to handle messages from the server")
  console.log(json_data);
};

function subscribe(channel) {
  if (document.readyState === "complete" || document.readyState === "interactive") {
    Genie.WebChannels.sendMessageTo(channel, window.Genie.Settings.webchannels_subscribe_channel);
    console.log("Subscription ready (" + channel + ")");
  } else {
    console.log("Queuing subscription");
    setTimeout(()=>subscribe(channel), 1000);
  }
};

function unsubscribe(ch) {
  Genie.WebChannels.sendMessageTo(ch, window.Genie.Settings.webchannels_unsubscribe_channel);
};
