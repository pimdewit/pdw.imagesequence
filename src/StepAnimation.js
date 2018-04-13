/**
 * TODO - Random frame flag?
 * TODO - Improve external facing API
 * TODO - variable widths/heights
 * TODO - Tiled support
 * TODO - pre-calculate and store all frames (prevents doing math every frame)
 */


/**
 * @typedef {object} StepAnimationFrameInfo
 *
 * @property {number} width The width of a single frame.
 * @property {number} height The height of a single frame.
 * @property {number} count The amount of frames.
 */

/**
 * @typedef {object} StepAnimationConstants
 *
 * @property {object} CSS_CLASS
 * @property {string} CSS_CLASS.ACTIVE DOM class name to signify the component is active.
 * @property {string} CSS_CLASS.HORIZONTAL DOM class name to signify the sequence is horizontal.
 * @property {string} CSS_CLASS.VERTICAL DOM class name to signify the sequence is vertical.
 * @property {string} CSS_CLASS.REVERSED DOM class name to signify the sequence is reversed.
 * @property {string} CSS_CLASS.REVERSED DOM class name to signify the sequence is reversed.
 * @property {object} DIRECTION
 * @property {string} DIRECTION.AUTO reference to prevent magic.
 * @property {string} DIRECTION.HORIZONTAL reference to prevent magic.
 * @property {string} DIRECTION.VERTICAL reference to prevent magic.
 * @property {string} DIRECTION.DEFAULT The initial/fallback direction.
 * @property {number} INTERVAL The default interval of the animation.
 */


 /**
  * Constants related to this class in order to prevent magic.
  *
  * @since 0.0.3
  *
  * @type {StepAnimationConstants}
  * @readonly
  * @constant
  */
export const CONSTANTS = {
  CSS_CLASS: {
    ACTIVE: 'stepanimation--active',
    HORIZONTAL: 'stepanimation--horizontal',
    VERTICAL: 'stepanimation--vertical',
    REVERSED: 'stepanimation--reversed',
    GRAPHIC: 'stepanimation__graphic',
  },
  DIRECTION: {
    AUTO: 'auto',
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
    DEFAULT: 'vertical'
  },
  INTERVAL: 300
};

/**
 * @author Pim de Wit / https://pdw.io
 * @license {@link https://github.com/pimdewit/stepanimation/blob/master/LICENSE|MIT License}
 *
 * @class StepAnimation
 * @classdesc A small utility class that loops through sprite sheets/images.
 */
export class StepAnimation {

  /**
   * Returns a random integer between min (inclusive) and max (inclusive)
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @static
   * @public
   *
   * @param {number} min The lowest the int can go.
   * @param {number} max The highest the int can go.
   * @returns {number}
   */
  static randomInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Transform (CSS) an element.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @static
   * @public
   *
   * @param {HTMLElement} element The element to transform.
   * @param {string} value CSS Transform property value.
   */
  static transform(element, value) {
    element.style.transform = value;
  }


  /**
   * @constructs StepAnimation
   *
   * @param {HTMLElement} container The overhead element.
   * @param {number=} [opt_interval=300] The interval time in milliseconds.
   * @param {('auto'|'horizontal'|'vertical')} [opt_direction='auto'] Whether the target image is horizontal or vertical.
   * @param {boolean=} [opt_reverse=false] Whether the sequence should animate backwards.
   */
  constructor(container, opt_interval = CONSTANTS.INTERVAL, opt_direction = CONSTANTS.DIRECTION.AUTO, opt_reverse = false) {
    /**
     * Collection of DOM elements related to this instance.
     *
     * @type {object}
     * @property {HTMLElement} container The containing element.
     * @property {?HTMLElement} graphic The graphical element to sequence.
     */
    this.elements = {
      container: container,
      graphic: container.querySelector(`.${CONSTANTS.CSS_CLASS.GRAPHIC}`)
    };

    /**
     * The interval time in milliseconds.
     *
     * @type {number}
     * @private
     */
    this._interval = opt_interval;

    /**
     * The direction of the image.
     *
     * @type {('auto'|'horizontal'|'vertical')}
     * @default 'auto'
     * @private
     */
    this._direction = opt_direction;

    /**
     * Whether the animation should be in reverse.
     *
     * @type {boolean}
     * @default false
     * @private
     */
    this._reversed = opt_reverse;

    /**
     * Whether this instance is currently looping or not.
     *
     * @type {boolean}
     * @readonly
     * @private
     */
    this._active = false;

    /**
     * Timer reference.
     *
     * @type {?null}
     * @private
     */
    this._timer = null;

    // Automatically change the direction if unspecified.
    if (this._direction === CONSTANTS.DIRECTION.AUTO) this._direction = this._getContentDirection(this.elements.graphic);
    if (this._reversed) this.elements.container.classList.add(CONSTANTS.CSS_CLASS.REVERSED);

    if (this._isHorizontal()) {
      this.elements.container.classList.add(CONSTANTS.CSS_CLASS.HORIZONTAL);
    } else {
      this.elements.container.classList.add(CONSTANTS.CSS_CLASS.VERTICAL);
    }

    /**
     * Frame information.
     *
     * @type {StepAnimationFrameInfo}
     * @private
     */
    this._frameInfo = {
      width: container.offsetWidth,
      height: container.offsetHeight,
      count: this._getFrameCount()
    };

    /**
     * The currently active frame.
     *
     * @type {number}
     * @default 0
     * @private
     */
    this._frame = this._initialFrame();
  }


  /** Getters/Setters */

  /**
   * Whether this instance is currently looping or not.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @public
   * @readonly
   *
   * @returns {boolean}
   */
  get active() {
    return this._active;
  }

  /**
   * Get information related to the frames in the sequence.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @public
   * @readonly
   *
   * @returns {StepAnimationFrameInfo}
   */
  get frameInfo() {
    return this._frameInfo;
  }

  /**
   * Whether the animation is reversed or not.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @public
   * @readonly
   *
   * @returns {boolean}
   */
  get reversed() {
    return this._reversed;
  }

  /**
   * Change the interval of this instance.
   *
   * @memberof StepAnimation
   * @since 0.0.2
   * @public
   *
   * @param {number} interval The interval time in milliseconds.
   */
  set interval(interval) {
    this.stop();

    this._interval = interval;

    this.start();
  }



  /** State */

  /**
   * Start the rendering loop.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @public
   *
   * @param {number=} opt_frame The frame to start from.
   */
  start(opt_frame) {
    if (this._active) return;

    this._timer = setInterval(this._nextOrPrevious.bind(this), this._interval);

    this.elements.container.classList.add(CONSTANTS.CSS_CLASS.ACTIVE);
    this._active = true;
  }

  /**
   * Stop the rendering loop.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @public
   */
  stop() {
    if (!this._active) return;

    clearInterval(this._timer);

    this.elements.container.classList.remove(CONSTANTS.CSS_CLASS.ACTIVE);
    this._active = false;
  }


  /** Controls */

  _nextOrPrevious() {
    this._reversed ? this.previous() : this.next();
  }

  /**
   * Go to the previous frame
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @private
   */
  previous() {
    this._frame--;
    this._calculateNextTransform();
  }

  /**
   * Go to the next frame
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @private
   */
  next() {
    this._frame++;
    this._calculateNextTransform();
  }

  /**
   * Calculate the transform value of the next frame.
   *
   * @memberof StepAnimation
   * @since 0.0.2
   * @private
   *
   * @param {number} frame
   */
  _calculateNextTransform() {
    if (!this._frameInRange(this._frame)) this._frame = this._initialFrame();

    const offset = this._frame * this._frameInfo.height;
    const transform = this._isHorizontal() ? `translateX(-${offset}px)` : `translateY(-${offset}px)`;

    StepAnimation.transform(this.elements.graphic, transform);
  }


  /** Helpers */

  /**
   * Determines whether the frame is in range.
   *
   * @memberof StepAnimation
   * @since 0.0.1
   * @private
   *
   * @param {number} frame
   * @returns {boolean}
   */
  _frameInRange(frame) {
    return frame >= 0 && frame <= this._frameInfo.count;
  }

  /**
   * Calculate the amount of frames in the sprite sheet.
   *
   * @memberof StepAnimation
   * @since 0.0.2
   * @private
   *
   * @returns {number}
   */
  _getFrameCount() {
    const {container, graphic} = this.elements;

    let count = 0;

    if (this._isHorizontal()) {
      count = (graphic.offsetWidth / container.offsetWidth) - 1;
    } else {
      count = (graphic.offsetHeight / container.offsetHeight) - 1;
    }

    return count;
  }


  /**
   * Get the direction of the spritesheet.
   *
   * @memberof StepAnimation
   * @since 0.0.3
   * @private
   *
   * @param {HTMLElement} spritesheet The image to check the direction from
   * @returns {string}
   */
  _getContentDirection(spritesheet) {
    let direction;

    if (spritesheet.offsetWidth > spritesheet.offsetHeight) {
      direction = CONSTANTS.DIRECTION.HORIZONTAL;
    } else if (spritesheet.offsetWidth < spritesheet.offsetHeight) {
      direction = CONSTANTS.DIRECTION.VERTICAL;
    } else {
      direction = CONSTANTS.DIRECTION.DEFAULT;
    }

    return direction;
  }

  /**
   * Checks whether the direction is horizontal.
   *
   * @memberof StepAnimation
   * @since 0.0.2
   * @private
   *
   * @returns {boolean}
   */
  _isHorizontal() {
    return this._direction === CONSTANTS.DIRECTION.HORIZONTAL;
  }

  /**
   * Returns the number of the first frame.
   *
   * @memberof StepAnimation
   * @since 0.0.2
   * @private
   *
   * @returns {number}
   */
  _initialFrame() {
    return this._reversed ? this._frameInfo.count : 0;
  }
}
