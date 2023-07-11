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

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },

    repeat(asyncfn) {
      let latestValue;
      let latestError;

      (async () => {
        for (;;) {
          try {
            latestValue = await asyncfn();
            latestError = undefined;
          } catch (err) {
            latestValue = undefined;
            latestError = err;
          }

          await utils.sleep();
        }
      })();

      return {
        get value() {
          return latestValue;
        },
        get error() {
          return latestError;
        },
      };
    },

    async poll(provider) {
      const result = provider();
      if (result) return result;
      await utils.sleep();
      return this.poll(provider);
    },
  };

  const kemono = {
    get isCurrent() {
      return location.hostname.startsWith("kemono.");
    },

    replaceThumbnails() {
      return document.body
        .querySelectorAll('a > img[src^="//img.kemono.party/thumbnail/"]')
        .forEach((img) => img.src = img.parentElement.href);
    },

    addPrevAndNextButton() {
      const nextLink = document.body.querySelector("a.next");
      if (nextLink) utils.addButton("Next", nextLink.href);

      const prevLink = document.body.querySelector("a.prev");
      if (prevLink) utils.addButton("Prev", prevLink.href);
    },

    run() {
      kemono.replaceThumbnails();
      kemono.addPrevAndNextButton();
    },
  };

  const fanbox = {
    MATCH_CREATOR_ID_PATTERN: /\/creator\/(\d+)/,
    MATCH_POST_ID_PATTERN: /\/posts\/(\d+)/,

    creatorButton: null,
    postButton: null,

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
      const creatorIdPoll = utils.repeat(async () => {
        const creatorId = await utils.poll(fanbox.getCreatorId);
        const creatorLink = `https://kemono.su/fanbox/user/${creatorId}`;

        if (!fanbox.creatorButton) {
          fanbox.creatorButton = utils.addButton(
            "Creator on Kemono",
            creatorLink,
          );
        } else fanbox.creatorButton.href = creatorLink;

        return creatorId;
      });

      const postIdPoll = utils.repeat(async () => {
        const creatorId = creatorIdPoll.value;
        if (!creatorId) return;

        const postId = await utils.poll(fanbox.getPostId);
        const postLink =
          `https://kemono.su/fanbox/user/${creatorId}/post/${postId}`;

        if (!fanbox.postButton) {
          fanbox.postButton = utils.addButton(
            "Post on Kemono",
            postLink,
          );
        } else fanbox.postButton.href = postLink;

        return postId;
      });
    },
  };

  if (fanbox.isCurrent) fanbox.run();
  else if (kemono.isCurrent) kemono.run();
})();
