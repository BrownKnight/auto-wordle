let state = {};

function showMessage(message) {
  document.getElementById("current-state").innerHTML = message;
}

/**
 * Listen for clicks on the buttons, and send the appropriate message to
 * the content script in the page.
 */
function listenForClicks() {
  document.addEventListener("click", (e) => {
    function requestState(tab) {
      const sending = browser.tabs.sendMessage(tab.id, {
        command: "readState",
      });
      sending.then((response) => {
        state = response;
        document.getElementById("current-state").innerHTML =
          JSON.stringify(response);
      }, reportError);
    }

    function enterWord(word, tab) {
      const sending = browser.tabs.sendMessage(tab.id, {
        command: "enterWord",
        word: word,
      });
      sending.catch(reportError);
    }

    function sendSolveWordleRequest() {
      // TODO: fetch the response from the server

      // Set the possible options as buttons
      fetch(
        "https://e6ee25qtw1.execute-api.eu-west-2.amazonaws.com/dev/generate-guesses",
        {
          method: "POST",
          body: JSON.stringify(state),
        }
      )
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
          document.getElementById("current-state").replaceChildren(...elements);
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
    console.error("hi2");
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
}

/**
 * There was an error executing the script.
 * Display the popup's error message, and hide the normal UI.
 */
function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(`Failed to execute beastify content script: ${error.message}`);
}

/**
 * When the popup loads, inject a content script into the active tab,
 * and add a click handler.
 * If we couldn't inject the script, handle the error.
 */
console.error("alive");
browser.tabs.executeScript({ file: "/popup/browser-polyfill.js" });
browser.tabs
  .executeScript({ file: "/content-scripts/auto-wordle-content.js" })
  .then(listenForClicks)
  .catch(reportExecuteScriptError);
