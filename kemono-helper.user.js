// ==UserScript==
// @name         Kemono Helper
// @version      0.4
// @description  Helper to enhance Kemono experience.
// @author       Peron
// @match        https://*.fanbox.cc/*
// @match        https://kemono.su/*
// @match        https://kemono.party/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kemono.su
// @grant        none
// ==/UserScript==

(async () => {
  "use strict";

  const utils = {
    buttonCount: 0,

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    addButton(title, href) {
      const linkButton = document.createElement("a");
      linkButton.textContent = title;
      linkButton.href = href;

      linkButton.style.backgroundColor = "orange";
      linkButton.style.color = "white";
      linkButton.style.position = "fixed";
      linkButton.style.bottom = (16 + this.buttonCount++ * 32) + "px";
      linkButton.style.right = "16px";
      linkButton.style.padding = "4px";
      linkButton.style.borderRadius = "4px";

      document.body.appendChild(linkButton);

      return linkButton;
    },

    async poll(provider, ...args) {
      const result = provider(...args);
      if (result) return result;
      await utils.sleep();
      return this.poll(provider);
    },
  };

  const kemono = {
    isGesturesAdded: false,

    get isCurrent() {
      return location.hostname.startsWith("kemono.");
    },

    replaceThumbnails() {
      return document.body
        .querySelectorAll('a > img[src^="//img.kemono.party/thumbnail/"]')
        .forEach((img) => img.src = img.parentElement.href);
    },

    addGestures() {
      if (kemono.isGesturesAdded) return;

      let initialX = null;

      const handleTouchStart = (event) => initialX = event.touches[0].clientX;

      const handleTouchMove = (event) => {
        if (initialX === null) {
          return;
        }

        const currentX = event.touches[0].clientX;
        const deltaX = currentX - initialX;

        if (deltaX > 0) {
          // Swiped right
          console.log("Swiped right");
        } else if (deltaX < 0) {
          // Swiped left
          console.log("Swiped left");
        }

        initialX = null;
      };

      document.addEventListener("touchstart", handleTouchStart);
      document.addEventListener("touchmove", handleTouchMove);
    },

    addPrevAndNextButton() {
      const nextLink = document.body.querySelector("a.next");
      utils.addButton("Next", nextLink.href);

      const prevLink = document.body.querySelector("a.prev");
      utils.addButton("Prev", prevLink.href);
    },

    run() {
      kemono.replaceThumbnails();
      kemono.addPrevAndNextButton();
    },
  };

  const fanbox = {
    MATCH_CREATOR_ID_PATTERN: /\/creator\/(\d+)/,
    MATCH_POST_ID_PATTERN: /\/posts\/(\d+)/,

    get isCurrent() {
      return location.hostname.endsWith("fanbox.cc");
    },

    getCreatorId() {
      return document.body
        .querySelector('div[style*="/creator/"]')
        ?.getAttribute("style")
        ?.match(fanbox.MATCH_CREATOR_ID_PATTERN)
        ?.[1] ??
        document.body
          .querySelector('a[href^="https://www.pixiv.net/users/"]')
          ?.href
          ?.slice("https://www.pixiv.net/users/".length);
    },

    getPostId() {
      return location.pathname
        .match(fanbox.MATCH_POST_ID_PATTERN)
        ?.[1];
    },

    async run() {
      const creatorId = await utils.poll(fanbox.getCreatorId);
      utils.addButton(
        "Creator on Kemono",
        `https://kemono.su/fanbox/user/${creatorId}`,
      );

      const postId = await utils.poll(fanbox.getPostId);
      utils.addButton(
        "Post on Kemono",
        `https://kemono.su/fanbox/user/${creatorId}/post/${postId}`,
      );
    },
  };

  if (fanbox.isCurrent) fanbox.run();
  else if (kemono.isCurrent) kemono.run();
})();
