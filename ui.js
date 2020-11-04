var gbl_message_id = 1;

console.log("hello!");
var myStorage = window.localStorage;
var config = JSON.parse(myStorage.localConfig_v2);
var team = config.lastActiveTeamId;
var token = config.teams[team].token;
var users = {};
var team_url = config.teams[team].url;

console.log("config", config);
console.log("token", token);
console.log("team_url", team_url);


var boot_url = team_url + "api/client.boot?_x_id=noversion-1601417315.857&_x_version_ts=noversion&_x_gantry=true";
var oReq = new XMLHttpRequest();
oReq.addEventListener("load", function () {
    console.log("bootListener");
    var resp = JSON.parse(this.responseText);
    console.log(resp);
    var channel_html = "";
    for(var channel of resp.channels) {
      channel_html += `<li data-id="${channel.id}" data-topic="${channel.topic.value}"><span>#</span> ${channel.name}</li>`;
    }
    document.getElementById('channel_list').innerHTML = channel_html;
    document.getElementById('channel_list').addEventListener("click", function(event) {
      console.log("click channel", event);
      console.log("click channel id", event.target.dataset.id);
      // joinChannel(event.target.dataset.id);
    });
    getUsers();
    getConversationHistory(resp.channels[0].id);
});
oReq.withCredentials = true;
oReq.open("POST", boot_url);
var body = new FormData();
body.append("token", token);
body.append("only_self_subteams", 1);
body.append("flannel_api_ver", 4);
body.append("include_min_version_bump_check", 0);
body.append("version_ts", 1601325391);
body.append("_x_reason", "deferred-data");
body.append("_x_sonic", true);
oReq.send(body);



function getWebsocket() {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", function () {
    console.log("getWebsocketListener");
    var resp = JSON.parse(this.responseText);
    console.log(resp);
    gbl_websocket_url = resp.url;
    if(resp.ok) {
      startWebsocket();
    } else {
      console.log("websocket not ok");
    }
  });
  oReq.open("GET", "https://slack.com/api/rtm.connect?token=" + token);
  oReq.send();
}

function websocketMessage(event) {
    var resp = JSON.parse(event.data);
    console.log('Message from server ', resp);
};

function sendSocket(messageObj) {
    gbl_websocket.send(JSON.stringify(messageObj));
}

function websocketPing() {
    sendSocket({type: "ping", id: gbl_message_id++});
}

// function listChannels() {
//   var oReq = new XMLHttpRequest();
//   oReq.addEventListener("load", function () {
//     console.log("listChannelsListener");
//     var resp = JSON.parse(this.responseText);
//     var channel_list = document.getElementById('channel_list');
//     channel_list.innerHTML = "";
//     resp.channels.forEach(function(channel) {
//         if(channel.name == "general") {
//             joinChannel(channel.id);
//             // #channel_list
//             var li = document.createElement('li');
//             li.innerHTML = channel.name;
//             channel_list.appendChild(li);
//             getChannelHistory();
//         }
//     });
//   });
//   oReq.open("GET", "https://slack.com/api/conversations.list?token=" + gbl_bot_access_token);
//   oReq.send();
// }

function startWebsocket() {
    console.log("gbl_websocket_url", gbl_websocket_url);
    gbl_websocket = new WebSocket(gbl_websocket_url);
    gbl_websocket.addEventListener('message', websocketMessage);
    setInterval(websocketPing, 3000);
}


function getConversationHistory(channel) {
    var url = team_url + "api/conversations.history?_x_id=a972d3ce-1604412892.519&_x_csid=NyWRfjihB-o&slack_route=T01B95K8BTQ&_x_version_ts=1604346880&_x_gantry=true";
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", function () {
        console.log("getConversationHistory");
        var resp = JSON.parse(this.responseText);
        console.log(resp);
        renderMessages(resp.messages);
    });
    oReq.withCredentials = true;
    oReq.open("POST", url);
    var body = new FormData();
    body.append("token", token);
    body.append("channel", channel);
    oReq.send(body);
}

function getUsers() {
    var url = "https://edgeapi.slack.com/cache/" + team + "/users/list";
    var oReq = new XMLHttpRequest();
    oReq.addEventListener("load", function () {
        console.log("getUsers");
        var resp = JSON.parse(this.responseText);
        console.log(resp);
        for(var user of resp.results) {
            users[user.id] = user;
        }
    });
    oReq.withCredentials = true;
    oReq.open("POST", url);

    oReq.setRequestHeader('Content-Type', 'application/json');
    var json = {
      token: token,
      // channels
      // filter
      count: 1000,
    };
    oReq.send(JSON.stringify(json));
}

function getAvatar(user, size) {
    return "https://ca.slack-edge.com/" + team + "-" + user + "-" + users[user].profile.avatar_hash  + "-" + size;
}

function renderMessages(messages) {
    var chat = document.getElementById('channel_chat');

    for(var message of messages) {
      if(document.getElementById(message.client_msg_id)) {
        return;
      }
      if(!users[message.user]) {
        console.log("TODO: user not in users")
        continue;
      }
      var avatar = getAvatar(message.user, 48);
      var name = users[message.user].name;
      var date = new Date(new Number(message.ts) * 1000).toString();
      var message_text = message.text;
      if(message.blocks) {
        message_text = "";
        for(var block of message.blocks) {
          for(var element of block.elements) {
            // eg type: rich_text
            for(var sub_element of element.elements) {
              // eg type: rich_text_section
              if(sub_element.type == "text") {
                start_wrap = "";
                end_wrap = "";
                if(sub_element.style) {
                  if(sub_element.style.bold) {
                    start_wrap += "<b>";
                    end_wrap += "</b>";
                  }
                  if(sub_element.style.italic) {
                    start_wrap += "<i>";
                    end_wrap += "</i>";
                  }
                  if(sub_element.style.code) {
                    start_wrap += "<pre>";
                    end_wrap += "</pre>";
                  }
                }
                message_text += start_wrap + sub_element.text + end_wrap;
              }
            }
          }
        }
        message_text = message_text.replace(/\n/g, "<br>")
      }
      var message_html = `
        <img src="${avatar}" class="message_avatar">
        <div class="message_right">
          <div class="message_top">
              <a class="message_user" href="">${name}</a>
              <span class="message_date">${date}</span>
          </div>
          <div class="message_bottom">
            ${message_text}
          </div>
        </div>
      `;
      var message_div = document.createElement('div');
      message_div.id = message.client_msg_id;
      message_div.className = "message";
      message_div.innerHTML = message_html;
      chat.prepend(message_div);
    }
}

// function joinChannel(channel) {
//   var oReq = new XMLHttpRequest();
//   oReq.addEventListener("load", function () {
//     console.log("joinChannel");
//     var resp = JSON.parse(this.responseText);
//     console.log(resp);
//   });
//   oReq.open("GET", "https://slack.com/api/conversations.join?token=" + token + "&channel=" + channel);
//   oReq.send();
// }

