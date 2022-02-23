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

function requestState() {
  browser.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, {
          command: "readState",
        })
        .then((response) => {
          sendSolveWordleRequest(response);
        }, reportError);
    })
    .catch(reportError);
}

function setLoadingState(state) {
  if (state) {
    document.getElementById("suggestions").classList.add("loading-skeleton");
    let items = Array(5).fill("Loading...").map(addListItem);
    document.getElementById("suggestions").replaceChildren(...items);
  } else {
    document.getElementById("suggestions").classList.remove("loading-skeleton");
  }
}

function getLoadingState() {
  return document.getElementById("suggestions").classList.contains("loading-skeleton");
}

function enterWord(word, tab) {
  setLoadingState(true);
  setTimeout(() => {
    currentState = getLoadingState();
    if (currentState) {
      requestState();
    }
  }, 2000);
  browser.tabs
    .sendMessage(tab.id, {
      command: "enterWord",
      word: word,
    })
    .catch(reportError);
}

function addListItem(name) {
  let element = document.createElement("a");
  element.classList.add("word-entry", "list-group-item", "list-group-item-action");
  element.href = "#";
  element.setAttribute("data-word", name);
  element.textContent = name;
  return element;
}

function sendSolveWordleRequest(state) {
  // Set the possible options as buttons
  browser.storage.sync.get("endpoint").then((settings) => {
    fetch(settings.endpoint, {
      method: "POST",
      body: JSON.stringify(state),
    })
      .then((res) => res.json())
      .then((res) => {
        let options = res.word_suggestions;
        let elements = options.map(addListItem);
        document.getElementById("suggestions").replaceChildren(...elements);
        setLoadingState(false);
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
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  document.addEventListener("click", (e) => {
    /**
     * Get the active tab,
     * then call "beastify()" or "reset()" as appropriate.
     */
    if (e.target.classList.contains("load-suggestions")) {
      requestState();
    } else if (e.target.classList.contains("word-entry")) {
      // Ask the content script to send keyboard inputs for the given word
      browser.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => enterWord(e.target.getAttribute("data-word"), tabs[0]))
        .catch(reportError);
    }
  });

  document.getElementById("settings-form").addEventListener("submit", (_) => setEndpoint());

  document.getElementById("reset-settings").addEventListener("click", (_) => resetSettings());
}

browser.runtime.onMessage.addListener((request) => {
  switch (request.command) {
    case "refresh":
      requestState();
  }
});

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
browser.tabs.executeScript({ file: "/content-scripts/auto-wordle-content.js" }).then(listenForClicks).catch(reportExecuteScriptError);

// Check to see if we have an endpoint configured, then set the page
showPage("main");
browser.storage.sync.get("endpoint").then((settings) => {
  console.log("endpoint", settings);
  if (settings.endpoint == null) {
    showPage("settings");
  } else {
    showPage("main");
  }
});
