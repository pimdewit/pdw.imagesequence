/**
 * TODO - Random frame flag?
 * TODO - Improve external facing API
 * TODO - variable widths/heights
 * TODO - Tiled support
 * TODO - pre-calculate and store all frames (prevents doing math every frame)
 */


/**
 * @typedef {object} SpriteSequenceFrameInfo
 *
 * @property {number} width The width of a single frame.
 * @property {number} height The height of a single frame.
 * @property {number} count The amount of frames.
 */

/**
 * @typedef {object} SpriteSequenceConstants
 *
 * @property {string} CLASS_NAME_ACTIVE DOM class name to signify the component is active.
 * @property {string} CLASS_NAME_HORIZONTAL DOM class name to signify the sequence is horizontal.
 * @property {string} CLASS_NAME_VERTICAL DOM class name to signify the sequence is vertical.
 * @property {string} DIRECTION_AUTO reference to prevent magic.
 * @property {string} DIRECTION_HORIZONTAL reference to prevent magic.
 * @property {string} DIRECTION_VERTICAL reference to prevent magic.
 * @property {string} DIRECTION_DEFAULT The initial/fallback direction.
 * @property {string} CLASS_NAME_REVERSED DOM class name to signify the sequence is reversed.
 */

/**
 * @author Pim de Wit <https://pdw.io>
 * @license {@link https://github.com/pimdewit/spritesequencer/blob/master/LICENSE|MIT License}
 *
 * @class SpriteSequence
 * @classdesc A small utility class that loops through sprite sheets/images.
 */
class SpriteSequence {
  /**
   * Constants related to this class in order to prevent magic
   * @returns {SpriteSequenceConstants}
   * @constructor
   */
  static CONSTANTS() {
    return {
      CLASS_NAME_ACTIVE: 'spritesequencer--active',
      CLASS_NAME_HORIZONTAL: 'spritesequencer--horizontal',
      CLASS_NAME_VERTICAL: 'spritesequencer--vertical',
      CLASS_NAME_REVERSED: 'spritesequencer--reversed',
      CLASS_NAME_GRAPHIC: 'spritesequencer__graphic',

      DIRECTION_AUTO: 'auto',
      DIRECTION_HORIZONTAL: 'horizontal',
      DIRECTION_VERTICAL: 'vertical',
      DIRECTION_DEFAULT: 'vertical'
    }
  }

  /**
   * Returns a random integer between min (inclusive) and max (inclusive)
   *
   * @memberof SpriteSequence
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
   * @memberof SpriteSequence
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
   * @constructs SpriteSequence
   *
   * @param {HTMLElement} container The overhead element.
   * @param {number=} [opt_interval=300] The interval time in milliseconds.
   * @param {('auto'|'horizontal'|'vertical')} [opt_direction='auto'] Whether the target image is horizontal or vertical.
   * @param {boolean=} [opt_reverse=false] Whether the sequence should animate backwards.
   */
  constructor(container, opt_interval = 300, opt_direction = 'auto', opt_reverse = false) {
    /**
     * Collection of DOM elements related to this instance.
     *
     * @type {object}
     * @property {HTMLElement} container The containing element.
     * @property {?HTMLElement} graphic The graphical element to sequence.
     */
    this.elements = {
      container: container,
      graphic: container.querySelector(`.${SpriteSequence.CONSTANTS().CLASS_NAME_GRAPHIC}`)
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
    if (this._direction === SpriteSequence.CONSTANTS().DIRECTION_AUTO) this._direction = this._calculateDirection();
    if (this._reversed) this.elements.container.classList.add(SpriteSequence.CONSTANTS().CLASS_NAME_REVERSED);

    if (this._isHorizontal()) {
      this.elements.container.classList.add(SpriteSequence.CONSTANTS().CLASS_NAME_HORIZONTAL);
    } else {
      this.elements.container.classList.add(SpriteSequence.CONSTANTS().CLASS_NAME_VERTICAL);
    }

    /**
     * Frame information.
     *
     * @type {SpriteSequenceFrameInfo}
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
   * @memberof SpriteSequence
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
   * @memberof SpriteSequence
   * @since 0.0.1
   * @public
   * @readonly
   *
   * @returns {SpriteSequenceFrameInfo}
   */
  get frameInfo() {
    return this._frameInfo;
  }

  /**
   * Whether the animation is reversed or not.
   *
   * @memberof SpriteSequence
   * @since 0.0.1
   * @public
   * @readonly
   *
   * @returns {SpriteSequenceFrameInfo}
   */
  get reversed() {
    return this._reversed;
  }

  /**
   * Change the interval of this instance.
   *
   * @memberof SpriteSequence
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
   * @memberof SpriteSequence
   * @since 0.0.1
   * @public
   *
   * @param {number=} opt_frame The frame to start from.
   */
  start(opt_frame) {
    if (this._active) return;

    this._timer = setInterval(this._nextOrPrevious.bind(this), this._interval);

    this.elements.container.classList.add(SpriteSequence.CONSTANTS().CLASS_NAME_ACTIVE);
    this._active = true;
  }

  /**
   * Stop the rendering loop.
   *
   * @memberof SpriteSequence
   * @since 0.0.1
   * @public
   */
  stop() {
    if (!this._active) return;

    clearInterval(this._timer);

    this.elements.container.classList.remove(SpriteSequence.CONSTANTS().CLASS_NAME_ACTIVE);
    this._active = false;
  }


  /** Controls */

  _nextOrPrevious() {
    this._reversed ? this.previous() : this.next();
  }

  /**
   * Go to the previous frame
   *
   * @memberof SpriteSequence
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
   * @memberof SpriteSequence
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
   * @memberof SpriteSequence
   * @since 0.0.2
   * @private
   *
   * @param {number] frame
   */
  _calculateNextTransform() {
    if (!this._frameInRange(this._frame)) this._frame = this._initialFrame();

    const offset = this._frame * this._frameInfo.height;
    const transform = this._isHorizontal() ? `translateX(-${offset}px)` : `translateY(-${offset}px)`;

    SpriteSequence.transform(this.elements.graphic, transform);
  }


  /** Helpers */

  /**
   * Determines whether the frame is in range.
   *
   * @memberof SpriteSequence
   * @since 0.0.1
   * @private
   *
   * @param {number] frame
   * @returns {boolean}
   */
  _frameInRange(frame) {
    return frame >= 0 && frame <= this._frameInfo.count;
  }

  /**
   * Checks whether the graphic element is horizontal or vertical.
   *
   * @memberof SpriteSequence
   * @since 0.0.1
   * @private
   *
   * @returns {string}
   */
  _calculateDirection() {
    let direction = SpriteSequence.CONSTANTS().DIRECTION_DEFAULT;

    // Set our animation direction to horizontal if the width of the graphic element is larger than its height.
    if (this.elements.graphic.offsetWidth > this.elements.graphic.offsetHeight) {
      direction = SpriteSequence.CONSTANTS().DIRECTION_HORIZONTAL;
    } else {
      direction = SpriteSequence.CONSTANTS().DIRECTION_VERTICAL;
    }

    return direction;
  }

  /**
   * Calculate the amount of frames in the sprite sheet.
   *
   * @memberof SpriteSequence
   * @since 0.0.2
   * @returns {number}
   * @private
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
   * Checks whether the direction is horizontal.
   *
   * @memberof SpriteSequence
   * @since 0.0.2
   * @returns {boolean}
   * @private
   */
  _isHorizontal() {
    return this._direction === SpriteSequence.CONSTANTS().DIRECTION_HORIZONTAL;
  }

  /**
   * Returns the number of the first frame.
   *
   * @memberof SpriteSequence
   * @since 0.0.2
   * @returns {number}
   * @private
   */
  _initialFrame() {
    return this._reversed ? this._frameInfo.count : 0;
  }
}
