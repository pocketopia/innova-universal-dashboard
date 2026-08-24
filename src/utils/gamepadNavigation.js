/**
 * Gamepad Navigation Utility
 * Provides navigation-focused gamepad input handling with throttling/debouncing
 * for TV interface navigation
 */

/**
 * Navigation action types
 */
export const NavigationAction = {
  UP: 'ArrowUp',
  DOWN: 'ArrowDown',
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  SELECT: 'Enter',
  BACK: 'Escape',
  MENU: 'Tab',
};

/**
 * Gamepad button to navigation action mapping
 */
const BUTTON_TO_ACTION = {
  0: NavigationAction.SELECT,
  1: NavigationAction.BACK,
  12: NavigationAction.UP,
  13: NavigationAction.DOWN,
  14: NavigationAction.LEFT,
  15: NavigationAction.RIGHT,
  9: NavigationAction.MENU,
};

/**
 * Deadzone threshold for analog sticks
 */
const STICK_DEADZONE = 0.5;

/**
 * Default navigation throttle delay in milliseconds
 */
const DEFAULT_THROTTLE_MS = 180;

/**
 * Throttle state for each direction
 */
class ThrottleState {
  constructor(delay = DEFAULT_THROTTLE_MS) {
    this.delay = delay;
    this.lastTriggerTime = {
      [NavigationAction.UP]: 0,
      [NavigationAction.DOWN]: 0,
      [NavigationAction.LEFT]: 0,
      [NavigationAction.RIGHT]: 0,
    };
  }

  shouldTrigger(action) {
    const now = performance.now();
    const lastTime = this.lastTriggerTime[action] || 0;
    return (now - lastTime) >= this.delay;
  }

  trigger(action) {
    this.lastTriggerTime[action] = performance.now();
  }

  setDelay(delay) {
    this.delay = delay;
  }
}

const globalThrottleState = new ThrottleState();

/**
 * Get navigation action from gamepad input
 */
export function getNavigationAction(gamepad) {
  if (!gamepad) return null;

  for (const [buttonIndex, action] of Object.entries(BUTTON_TO_ACTION)) {
    if (gamepad.buttons[buttonIndex]?.pressed) {
      if (
        action === NavigationAction.UP ||
        action === NavigationAction.DOWN ||
        action === NavigationAction.LEFT ||
        action === NavigationAction.RIGHT
      ) {
        if (globalThrottleState.shouldTrigger(action)) {
          globalThrottleState.trigger(action);
          return action;
        }
        return null;
      }
      return action;
    }
  }

  // Check analog stick input
  if (gamepad.axes.length >= 2) {
    const axisX = gamepad.axes[0];
    const axisY = gamepad.axes[1];

    if (Math.abs(axisY) > STICK_DEADZONE) {
      const action = axisY < 0 ? NavigationAction.UP : NavigationAction.DOWN;
      if (globalThrottleState.shouldTrigger(action)) {
        globalThrottleState.trigger(action);
        return action;
      }
    } else if (Math.abs(axisX) > STICK_DEADZONE) {
      const action = axisX < 0 ? NavigationAction.LEFT : NavigationAction.RIGHT;
      if (globalThrottleState.shouldTrigger(action)) {
        globalThrottleState.trigger(action);
        return action;
      }
    }
  }

  return null;
}

/**
 * Set navigation throttle delay
 */
export function setNavigationThrottle(delay) {
  globalThrottleState.setDelay(delay);
}

/**
 * Get current throttle delay
 */
export function getNavigationThrottle() {
  return globalThrottleState.delay;
}

/**
 * Dispatch a navigation action as a keyboard event
 */
export function dispatchNavigationEvent(action) {
  const event = new KeyboardEvent('keydown', {
    key: action,
    code: action,
    bubbles: true,
    cancelable: true,
  });
  document.activeElement?.dispatchEvent(event) || window.dispatchEvent(event);
}

/**
 * Map gamepad button index to human-readable name
 */
export function getButtonName(buttonIndex) {
  const names = {
    0: 'A / Cross',
    1: 'B / Circle',
    2: 'X / Square',
    3: 'Y / Triangle',
    4: 'LB / L1',
    5: 'RB / R1',
    6: 'LT / L2',
    7: 'RT / R2',
    8: 'Select / Share',
    9: 'Start / Options',
    10: 'Left Stick (L3)',
    11: 'Right Stick (R3)',
    12: 'D-Pad Up',
    13: 'D-Pad Down',
    14: 'D-Pad Left',
    15: 'D-Pad Right',
    16: 'Home / PS Button',
    17: 'Touchpad',
  };
  return names[buttonIndex] || `Button ${buttonIndex}`;
}