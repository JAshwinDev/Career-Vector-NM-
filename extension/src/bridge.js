// CareerVector auth bridge — runs as a content script on the web app origin
// (http://localhost:3000). The web app and the extension share ONE session by
// keeping the same auth token in the web app's localStorage. This script:
//
//   1. Pushes the web app's current auth state to the extension background.
//   2. Watches the web app for login/logout (same-tab custom event + cross-tab
//      `storage` event) and forwards changes to the background.
//   3. Lets the background read / write the web app's session, so a login or
//      logout in the extension is reflected on the website immediately.

(function () {
  if (window.__cvAuthBridgeLoaded) return;
  window.__cvAuthBridgeLoaded = true;

  var AUTH_TOKEN_KEY = "authToken";
  var USER_KEY = "user";

  function readSession() {
    var token = null;
    var user = null;
    try {
      token = window.localStorage.getItem(AUTH_TOKEN_KEY) || null;
    } catch (err) {
      token = null;
    }
    try {
      user = JSON.parse(window.localStorage.getItem(USER_KEY) || "null");
    } catch (err) {
      user = null;
    }
    return { token: token, user: user };
  }

  function notify(action, token, user) {
    try {
      chrome.runtime.sendMessage(
        { type: "AUTH_SYNC", action: action, token: token, user: user },
        function () {
          void chrome.runtime.lastError;
        }
      );
    } catch (err) {
      // Background may be unavailable mid-reload; ignore.
    }
  }

  // Initial sync: teach the background about the web app session when the page
  // loads already signed in (e.g. the user logged into the website before ever
  // opening the extension). We only report a *login* here — reporting "logout"
  // on a fresh page load would wrongly clear the extension's cached session
  // when the website tab is opened while the extension is still signed in.
  var initial = readSession();
  if (initial.token) {
    notify("login", initial.token, initial.user);
  }

  // Cross-tab: the session changed in another tab of the same origin.
  window.addEventListener("storage", function (event) {
    if (event.key !== AUTH_TOKEN_KEY && event.key !== USER_KEY) return;
    var session = readSession();
    notify(session.token ? "login" : "logout", session.token, session.user);
  });

  // Same-tab: the page itself changed auth state.
  window.addEventListener("cv-auth", function (event) {
    var detail = (event && event.detail) || {};
    var session = readSession();
    notify(detail.type || (session.token ? "login" : "logout"), session.token, session.user);
  });

  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message.type === "BRIDGE_GET_TOKEN") {
      var session = readSession();
      sendResponse({ token: session.token, user: session.user });
      return false;
    }

    if (message.type === "BRIDGE_SET_TOKEN") {
      try {
        if (message.token) {
          window.localStorage.setItem(AUTH_TOKEN_KEY, message.token);
          if (message.user) {
            window.localStorage.setItem(USER_KEY, JSON.stringify(message.user));
          } else {
            window.localStorage.removeItem(USER_KEY);
          }
        }
      } catch (err) {
        // Ignore write failures; the page still gets the event below.
      }
      window.dispatchEvent(
        new CustomEvent("cv-auth", {
          detail: { type: "login", token: message.token || null, user: message.user || null }
        })
      );
      sendResponse({ success: true });
      return false;
    }

    if (message.type === "BRIDGE_CLEAR") {
      try {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
      } catch (err) {
        // Ignore.
      }
      window.dispatchEvent(new CustomEvent("cv-auth", { detail: { type: "logout" } }));
      sendResponse({ success: true });
      return false;
    }

    return false;
  });
})();
