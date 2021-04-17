class MildomCarousel {
  #debug = false;
  #status = null;
  #$rootNode = null;
  #rootNodeId = "carouselRoot";
  #numberOfItems = 0;
  #maxNumberOfItemsToDisplay = 5;
  #maxDepth = 2;
  #scale = 0.25;
  #swapInterval = 2;
  #intervalTimer = null;

  constructor({ debug = false, rootNodeId, swapInterval = 2 }) {
    this.#debug = debug;
    this.#rootNodeId = rootNodeId || "carouselRoot";
    this.#$rootNode = $(`#${this.#rootNodeId}`);
    this.#numberOfItems = this.#$rootNode.children().length;
    this.#swapInterval = swapInterval;

    Object.defineProperty(this, `SECONDS`, {
      value: 1000,
    });
    Object.defineProperty(this, `LOG_PREFIX`, {
      value: `[MILDOM_CAROUSEL]`,
    });
    Object.defineProperty(this, `CAROUSEL_ITEM_ATTRIBUTE_NAME`, {
      value: `data-carousel-number`,
    });
    Object.defineProperty(this, `CAROUSEL_STATUS`, {
      value: {
        RUNNING: 0,
        STOPPED: 1,
      },
    });

    this.#status = this.CAROUSEL_STATUS.STOPPED;

    this.#init();

    this.#log(`carousel initialized`);
    this.#log(`number of carousel items: ${this.#numberOfItems}`);
  }

  #init() {
    this.#log(`initializing carousel...`);

    this.#log(`assigning unique attributes...`);
    this.#eachItem((index, element) => {
      const $item = $(element);
      this.#assignCarouselNumber($item, index);
      this.#log(`--> assign`, index, element);
    });

    this.#update();
    this.#showAllNonOverflowedCarousels();
    this.#hideAllOverflowedCarousels();
  }

  #eachItem(_callback) {
    this.#$rootNode.children().each(_callback);
  }

  #getCarousel(value) {
    return $(`[${this.CAROUSEL_ITEM_ATTRIBUTE_NAME}|="${value}"]`);
  }

  #getAssignedCarouselNumber($carousel) {
    return parseInt($carousel.attr(this.CAROUSEL_ITEM_ATTRIBUTE_NAME));
  }

  #assignCarouselNumber($carousel, number) {
    $carousel.attr(this.CAROUSEL_ITEM_ATTRIBUTE_NAME, number);
  }

  #setZIndex(number, zIndex) {
    return this.#getCarousel(number).css(`z-index`, `${zIndex}`);
  }

  #setScale(number, scale) {
    return this.#getCarousel(number).css(
      `transform`,
      `scale(${scale.toFixed(2)})`
    );
  }

  #setLeft(number, value) {
    return this.#getCarousel(number).css(`left`, value);
  }

  #showCarousel($carousel) {
    $carousel.show();
  }

  #hideCarousel($carousel) {
    const carouselNumber = this.#getAssignedCarouselNumber($carousel);
    const scale = 1 - this.#scale * (this.#maxDepth + 1);
    this.#setZIndex(carouselNumber, 0);
    this.#setLeft(carouselNumber, 0);
    this.#setScale(carouselNumber, scale);
  }

  #log() {
    if (this.#debug) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift(`${this.LOG_PREFIX}`);
      console.log.apply(console, args);
    }
  }

  next(clockwise = false) {
    this.#log(`[next] reassigning carousel numbers...`);

    /**
     * We can't change carousel number while
     * calculating next nunmber, so define the temporary prefix
     * This prefix will be removed once the calculation finished
     */
    const VALUE_PREFIX = `__FAKE__`;

    /**
     * Calculate the next number and assign it with prefix
     */
    for (let i = 0; i < this.#numberOfItems; i++) {
      const $item = this.#getCarousel(i);
      const currentNumber = this.#getAssignedCarouselNumber($item);

      /**
       * The next index
       * If it out of range of assignable carousel number,
       * go back to certain number
       *
       * I know this is terrible syntax but not necessary
       * to make it verbose
       */
      const newIndex = clockwise
        ? currentNumber + 1 >= this.#numberOfItems
          ? 0
          : currentNumber + 1
        : currentNumber - 1 < 0
        ? this.#numberOfItems - 1
        : currentNumber - 1;

      this.#log(
        `---> assign ${i} prev: ${currentNumber} next: ${newIndex} with prefix "${VALUE_PREFIX}"`
      );
      this.#assignCarouselNumber($item, `${VALUE_PREFIX}${newIndex}`);
    }

    /**
     * Once the calculation has finished,
     * remove the prefix and reassign actual number
     *
     * For example:
     *      data-carousel-number="__FAKE__0" -> "0"
     */
    for (let i = 0; i < this.#numberOfItems; i++) {
      const $item = this.#getCarousel(`${VALUE_PREFIX}${i}`);
      const currentValue = `${$item.attr(this.CAROUSEL_ITEM_ATTRIBUTE_NAME)}`;
      const value = currentValue.replace(VALUE_PREFIX, ``);
      $item.attr(this.CAROUSEL_ITEM_ATTRIBUTE_NAME, value);
    }

    this.#log(`[next] assigned successfully`);

    this.#update();
  }

  #showAllNonOverflowedCarousels() {
    for (let i = 0; i < this.#maxNumberOfItemsToDisplay; i++) {
      const $item = this.#getCarousel(i);
      this.#showCarousel($item);
    }
  }

  #hideAllOverflowedCarousels() {
    this.#log(`[hide] hiding overflowed carousels...`);

    if (this.#numberOfItems > this.#maxNumberOfItemsToDisplay) {
      for (
        let i = this.#maxNumberOfItemsToDisplay - 0;
        i <
        this.#maxNumberOfItemsToDisplay +
          (this.#numberOfItems - (this.#maxNumberOfItemsToDisplay - 0));
        i++
      ) {
        this.#log(`---> ${i}`);
        const $item = this.#getCarousel(i);
        this.#hideCarousel($item);
      }
    }

    this.#log(`[hide] done`);
  }

  #update() {
    /**
     * Reset the primary carousel style
     */
    this.#setScale(0, 1);
    this.#setLeft(0, 0);
    this.#setZIndex(0, this.#numberOfItems);

    this.#log(`repositioning carousels...`);

    for (let i = 1; i < this.#maxDepth + 1; i++) {
      /**
       * +-------------------------+
       * |                i=1  i=2 |
       * |  3 |  4 |  0  | 1  | 2  |
       * |            n --->       |
       * +-------------------------+
       */
      const positiveNextNumber = i;

      /**
       * +-------------------------+
       * | i=2  i=1                |
       * |  3 |  4 |  0  | 1  | 2  |
       * |       <--- n            |
       * +-------------------------+
       */
      const negativePrevNumber = this.#maxNumberOfItemsToDisplay - i;

      const scale = 1 - this.#scale * i;
      const zIndex = this.#numberOfItems - i;

      this.#log(
        `---> next: ${positiveNextNumber} prev: ${negativePrevNumber} scale: ${scale}`
      );

      this.#setScale(positiveNextNumber, scale);
      this.#setZIndex(positiveNextNumber, zIndex);
      this.#setLeft(positiveNextNumber, `calc(50% - ${i === 1 ? 160 : 0}px)`);

      this.#setScale(negativePrevNumber, scale);
      this.#setZIndex(negativePrevNumber, zIndex);
      this.#setLeft(
        negativePrevNumber,
        `calc(50% - ${i !== 1 ? 1020 : 700}px)`
      );
    }

    this.#showAllNonOverflowedCarousels();
    this.#hideAllOverflowedCarousels();

    this.#log(`reposition done`);
  }

  play({ clockwise }) {
    // already running
    if (this.#status === this.CAROUSEL_STATUS.RUNNING) {
      return false;
    }

    this.#intervalTimer = setInterval(() => {
      this.next(clockwise);
    }, this.#swapInterval * this.SECONDS);

    this.#status = this.CAROUSEL_STATUS.RUNNING;
    return true;
  }

  stop() {
    // already stopped
    if (this.#status === this.CAROUSEL_STATUS.STOPPED) {
      return false;
    }

    clearInterval(this.#intervalTimer);

    this.#status = this.CAROUSEL_STATUS.STOPPED;
    return true;
  }
}

$(() => {
  const carousel = new MildomCarousel({
    debug: true,
    rootNodeId: "carouselRoot",
    swapInterval: 2,
  });

  carousel.play({ clockwise: false });
});
