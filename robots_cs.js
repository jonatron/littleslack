var browser = browser || chrome;

var url = browser.runtime.getURL("ui.html");
var js_url = browser.runtime.getURL("ui.js");
console.log("url", url);

var oReq = new XMLHttpRequest();
oReq.addEventListener("load", function() {
    var ui_html = this.responseText;
    document.documentElement.innerHTML = ui_html;
    var newScript = document.createElement("script");
    newScript.src = js_url;
    document.head.appendChild(newScript);
});
oReq.open("GET", url);
oReq.send();




