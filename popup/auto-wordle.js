let state = {};

function showPage(page) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.add("hidden");
  document.querySelector("#settings-content").classList.add("hidden");

  switch (page) {
    case "settings":
      document.querySelector("#settings-content").classList.remove("hidden");
      break;
    case "main":
      document.querySelector("#popup-content").classList.remove("hidden");
      break;
    case "error":
      document.querySelector("#error-content").classList.remove("hidden");
      break;
  }
}

function showMessage(message) {
  document.getElementById("current-state").innerHTML = message;
}

function setEndpoint() {
  let value = document.getElementById("endpoint").value;
  browser.storage.sync.set({ endpoint: value }).then(() => {
    showPage("main");
  });
}

function resetSettings() {
  browser.storage.sync.remove("endpoint").then(() => {
    showPage("settings");
  });
}

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  document.addEventListener("click", (e) => {
    function requestState(tab) {
      browser.tabs
        .sendMessage(tab.id, {
          command: "readState",
        })
        .then((response) => {
          state = response;
          document.getElementById("current-state").innerHTML =
            JSON.stringify(response);
        }, reportError);
    }

    function enterWord(word, tab) {
      browser.tabs
        .sendMessage(tab.id, {
          command: "enterWord",
          word: word,
        })
        .catch(reportError);
    }

    function sendSolveWordleRequest() {
      // Set the possible options as buttons
      browser.storage.sync.get("endpoint").then((settings) => {
        fetch(settings.endpoint, {
          method: "POST",
          body: JSON.stringify(state),
        })
          .then((res) => res.json())
          .then((res) => {
            let options = res.word_suggestions;
            let elements = options.map((option) => {
              let element = document.createElement("button");
              element.classList.add("word-entry");
              element.setAttribute("data-word", option);
              element.textContent = option;
              return element;
            });
            document
              .getElementById("current-state")
              .replaceChildren(...elements);
          });
      });
    }

    /**
     * Just log the error to the console.
     */
    function reportError(error) {
      console.error(`Error occured: ${error}`);
    }

    /**
     * Get the active tab,
     * then call "beastify()" or "reset()" as appropriate.
     */
    if (e.target.classList.contains("read-state")) {
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => requestState(tabs[0]))
        .catch(reportError);
    } else if (e.target.classList.contains("send-request")) {
      sendSolveWordleRequest();
    } else if (e.target.classList.contains("word-entry")) {
      // Ask the content script to send keyboard inputs for the given word
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => enterWord(e.target.getAttribute("data-word"), tabs[0]))
        .catch(reportError);
    }
  });

  document
    .getElementById("settings-form")
    .addEventListener("submit", (_) => setEndpoint());

  document
    .getElementById("reset-settings")
    .addEventListener("click", (_) => resetSettings());
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  showPage("error");
  console.error(`Failed to execute beastify content script: ${error.message}`);
}

// Inject the polyfill script
browser.tabs.executeScript({ file: "/popup/browser-polyfill.js" });

// Inject our content script which will listen to messages 
// from us to read the state of the wordle game
browser.tabs
  .executeScript({ file: "/content-scripts/auto-wordle-content.js" })
  .then(listenForClicks)
  .catch(reportExecuteScriptError);

// Check to see if we have an endpoint configured, then set the page
browser.storage.sync.get("endpoint").then((settings) => {
  console.log("endpoint", settings);
  if (settings.endpoint == null) {
    showPage("settings");
  } else {
    showPage("main");
  }
});
