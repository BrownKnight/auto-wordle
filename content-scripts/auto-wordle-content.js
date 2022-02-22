(function () {
  /**
   * Check and set a global guard variable.
   * If this content script is injected into the same page again,
   * it will do nothing next time.
   */
  if (window.hasRun) {
    return;
  }
  window.hasRun = true;

  function enterWord(word) {
    // In case there are any letters already entered, remove them before entering the new one
    for (var i = 0; i < 5; i++) {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Backspace",
          metaKey: false,
          ctrlKey: false,
        })
      );
    }

    // Enter the letters of the word
    for (const letter of word) {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: letter,
          metaKey: false,
          ctrlKey: false,
        })
      );
    }

    // Submit the word
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: false,
        ctrlKey: false,
      })
    );
  }

  /**
   * Remove every beast from the page.
   */
  function readState() {
    // Each row is a collection of 5 elements, 1 per letter
    let gameRows = document
      .querySelector("game-app")
      .shadowRoot.querySelectorAll("game-row");
    // Take the rows and map each to a word with the letter and it's evalution
    let words = [...gameRows].map((row) =>
      [...row.shadowRoot.querySelectorAll("game-tile")].map((x) => ({
        letter: x.getAttribute("letter"),
        evaluation: x.getAttribute("evaluation"),
      }))
    );

    // Read the state of all the letters from the games keyboard
    let letters = [
      ...document
        .querySelector("game-app")
        .shadowRoot.querySelector("game-keyboard")
        .shadowRoot.querySelectorAll("button"),
    ].map((x) => ({
      letter: x.getAttribute("data-key"),
      evaluation: x.getAttribute("data-state"),
    }));

    // Return an object which will be sent directly as the request body
    return {
      current_state:
        words
          .map((x) =>
            x.map((x) => (x.evaluation == "correct" ? x.letter : "_")).join("")
          )
          .filter((x) => x !== "_____")
          .slice(-1)[0] ?? "_____",
      excluded_letters: letters
        .filter((x) => x.evaluation == "absent")
        .map((x) => x.letter),
      unplaced_letters: letters
        .filter((x) => x.evaluation == "present")
        .map((x) => x.letter),
      excluded_placements: words
        .map((x) =>
          x
            .map((x) =>
              x.evaluation == "absent" || x.evaluation == "present"
                ? x.letter
                : "_"
            )
            .join("")
        )
        .filter((x) => x !== "_____"),
      // incorrectPositions: words.map((x) =>
      //   x.map((x) => (x.evaluation == "present" ? x.letter : "_")).join("")
      // ),
      //   correctLetters: letters
      //   .filter((x) => x.evaluation == "correct")
      //   .map((x) => x.letter),
      // attemptedWords: words.map((x) => x.map((x) => x.letter ?? "_").join("")),
      // correctPositions: words.map((x) =>
      //   x.map((x) => (x.evaluation == "correct" ? x.letter : "_")).join("")
      // ),
    };
  }

  function handleMessage(request, sender, sendResponse) {
    console.log(`content script sent a message: ${request.command}`);
    if (request.command == "readState") {
      sendResponse(readState());
    }
    if (request.command == "enterWord") {
      enterWord(request.word);
    }
  }

  browser.runtime.onMessage.addListener(handleMessage);
})();
