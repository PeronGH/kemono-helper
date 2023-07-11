// ==UserScript==
// @name         Kemono Helper
// @version      0.6
// @description  Helper to enhance Kemono experience.
// @author       Peron
// @match        https://*.fanbox.cc/*
// @match        https://kemono.su/*
// @match        https://fantia.jp/*
// @match        https://kemono.party/*
// @homepageURL  https://github.com/PeronGH/kemono-helper/
// @downloadURL  https://raw.githubusercontent.com/PeronGH/kemono-helper/main/kemono-helper.user.js
// @updateURL    https://raw.githubusercontent.com/PeronGH/kemono-helper/main/kemono-helper.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=kemono.su
// @grant        none
// ==/UserScript==

(() => {
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
      linkButton.style.bottom = (8 + utils.buttonCount++ * 32) + "px";
      linkButton.style.right = "8px";
      linkButton.style.padding = "4px";
      linkButton.style.borderRadius = "4px";
      linkButton.style.zIndex = "9999";

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
      const result = await provider();
      if (result) return result;
      await utils.sleep();
      return utils.poll(provider);
    },
  };

  const kemono = {
    get isCurrent() {
      return ["kemono.su", "kemono.party"].includes(location.hostname);
    },

    async replaceThumbnailsAndSetMaxHeight() {
      const imgElements = document.body
        .querySelectorAll('a > img[src^="//img.kemono.party/thumbnail/"]');

      for (const img of imgElements) {
        img.src = img.parentElement.href;
        img.setAttribute("data-src", img.src);
        img.style.maxHeight = "calc(100vh - 16px)";
        await new Promise((resolve, reject) => {
          img.addEventListener("load", resolve);
          img.addEventListener("error", reject);
          setTimeout(reject, 1e3);
        })
          .then(() => console.debug("Loaded:", img))
          .catch(() => console.error("Failed to load:", img));
      }
    },

    addPrevAndNextButton() {
      const nextLink = document.body.querySelector("a.next");
      if (nextLink) utils.addButton("Next", nextLink.href);

      const prevLink = document.body.querySelector("a.prev");
      if (prevLink) utils.addButton("Prev", prevLink.href);
    },

    run() {
      kemono.replaceThumbnailsAndSetMaxHeight();
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

    addButtons() {
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

    run() {
      fanbox.addButtons();
    },
  };

  const fantia = {
    MATCH_USER_ID_PATTERN: /\/fanclubs\/(\d+)/,
    MATCH_POST_ID_PATTERN: /\/posts\/(\d+)/,

    get isCurrent() {
      return location.hostname === "fantia.jp";
    },

    getUserId() {
      return location.pathname
        .match(fantia.MATCH_USER_ID_PATTERN)
        ?.[1] ??
        document.body
          .querySelector('a[href^="/fanclubs/"]')
          ?.href
          ?.match(fantia.MATCH_USER_ID_PATTERN)
          ?.[1];
    },

    getPostId() {
      return location.pathname
        .match(fantia.MATCH_POST_ID_PATTERN)
        ?.[1];
    },

    addButtons() {
      const userId = fantia.getUserId();
      if (userId) {
        utils.addButton(
          "Creator on Kemono",
          `https://kemono.su/fantia/user/${userId}`,
        );
      }

      const postId = fantia.getPostId();
      if (postId) {
        utils.addButton(
          "Post on Kemono",
          `https://kemono.su/fantia/user/${userId}/post/${postId}`,
        );
      }
    },

    run() {
      fantia.addButtons();
    },
  };

  [kemono, fanbox, fantia]
    .find((site) => site.isCurrent)
    ?.run();
})();
