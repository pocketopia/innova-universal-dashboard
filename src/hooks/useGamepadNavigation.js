/**
 * useGamepadNavigation Hook
 * Custom React hook for gamepad-based TV navigation
 * Integrates with the existing useGamepad hook and gamepadNavigation utility
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useGamepad } from './useGamepad';
import {
  getNavigationAction,
  dispatchNavigationEvent,
  setNavigationThrottle,
  NavigationAction,
} from '../utils/gamepadNavigation';

/**
 * @typedef {Object} UseGamepadNavigationOptions
 * @property {number} [throttleMs=180] - Milliseconds between directional repeats
 * @property {boolean} [dispatchKeyboardEvents=true] - Whether to dispatch keyboard events
 * @property {number} [gamepadIndex=-1] - Which gamepad index to track
 */

/**
 * @typedef {Object} UseGamepadNavigationResult
 * @property {boolean} connected - Whether a gamepad is connected
 * @property {string|null} controllerId - The gamepad's ID
 * @property {string|null} lastAction - The last navigation action triggered
 * @property {number} lastActionTime - Timestamp of last action
 * @property {function} setThrottle - Update throttle delay
 * @property {function} focusElement - Programmatically focus an element by selector
 */

/**
 * Custom hook for gamepad navigation in TV interfaces.
 * Listens to gamepad input and translates it into navigation actions.
 * 
 * @param {UseGamepadNavigationOptions} options
 * @returns {UseGamepadNavigationResult}
 */
export function useGamepadNavigation(options = {}) {
  const {
    throttleMs = 180,
    dispatchKeyboardEvents = true,
    gamepadIndex = -1,
  } = options;

  const gamepad = useGamepad({ gamepadIndex });
  const [lastAction, setLastAction] = useState(null);
  const [lastActionTime, setLastActionTime] = useState(0);
  const lastActionRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Set throttle on mount and when it changes
  useEffect(() => {
    setNavigationThrottle(throttleMs);
  }, [throttleMs]);

  // Process gamepad input and dispatch navigation events
  const processGamepadInput = useCallback(() => {
    if (!gamepad.connected) {
      animationFrameRef.current = requestAnimationFrame(processGamepadInput);
      return;
    }

    // Get the raw gamepad for navigation processing
    const gamepads = navigator.getGamepads();
    let rawGamepad = null;

    if (gamepadIndex === -1) {
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          rawGamepad = gamepads[i];
          break;
        }
      }
    } else if (gamepads[gamepadIndex]) {
      rawGamepad = gamepads[gamepadIndex];
    }

    if (rawGamepad) {
      const action = getNavigationAction(rawGamepad);

      if (action) {
        setLastAction(action);
        setLastActionTime(performance.now());
        lastActionRef.current = action;

        // Dispatch as keyboard event for spatial navigation compatibility
        if (dispatchKeyboardEvents) {
          dispatchNavigationEvent(action);
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(processGamepadInput);
  }, [gamepad.connected, gamepadIndex, dispatchKeyboardEvents]);

  // Start/stop polling loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(processGamepadInput);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processGamepadInput]);

  // Focus helper for programmatic navigation
  const focusElement = useCallback((selector) => {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }, []);

  // Set throttle helper
  const setThrottle = useCallback((delay) => {
    setNavigationThrottle(delay);
  }, []);

  return {
    connected: gamepad.connected,
    controllerId: gamepad.id,
    lastAction,
    lastActionTime,
    setThrottle,
    focusElement,
  };
}

/**
 * Higher-order component wrapper for adding gamepad navigation to any component
 * 
 * @param {React.ComponentType} WrappedComponent
 * @param {UseGamepadNavigationOptions} options
 */
export function withGamepadNavigation(WrappedComponent, options = {}) {
  return function GamepadNavigationWrapper(props) {
    const navigation = useGamepadNavigation(options);
    return <WrappedComponent {...props} gamepadNavigation={navigation} />;
  };
}

export default useGamepadNavigation;