import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Standard Gamepad Button Mapping (following the Standard Gamepad layout)
 * https://w3c.github.io/gamepad/#dfn-standard-gamepad
 * 
 * Button indices:
 * 0: A (Cross on PlayStation, A on Xbox)
 * 1: B (Circle on PlayStation, B on Xbox)
 * 2: X (Square on PlayStation, X on Xbox)
 * 3: Y (Triangle on PlayStation, Y on Xbox)
 * 4: LB / L1 (Left Bumper)
 * 5: RB / R1 (Right Bumper)
 * 6: LT / L2 (Left Trigger - analog)
 * 7: RT / R2 (Right Trigger - analog)
 * 8: Select / Share / Back
 * 9: Start / Options / Menu
 * 10: Left Stick Click (L3)
 * 11: Right Stick Click (R3)
 * 12: D-Pad Up
 * 13: D-Pad Down
 * 14: D-Pad Left
 * 15: D-Pad Right
 * 16: Home / PS Button / Xbox Button (if present)
 * 17: Touchpad (if present)
 */

export interface GamepadButtonState {
  pressed: boolean;
  touched?: boolean;
  value: number;
}

export interface GamepadAxes {
  leftStickX: number;
  leftStickY: number;
  rightStickX: number;
  rightStickY: number;
}

export interface GamepadState {
  connected: boolean;
  id: string | null;
  index: number | null;
  timestamp: number;
  buttons: {
    // Face buttons
    a: GamepadButtonState;
    b: GamepadButtonState;
    x: GamepadButtonState;
    y: GamepadButtonState;
    // Bumpers
    leftBumper: GamepadButtonState;
    rightBumper: GamepadButtonState;
    // Triggers (analog)
    leftTrigger: GamepadButtonState;
    rightTrigger: GamepadButtonState;
    // Function buttons
    select: GamepadButtonState;
    start: GamepadButtonState;
    // Stick buttons
    leftStick: GamepadButtonState;
    rightStick: GamepadButtonState;
    // D-Pad
    dpadUp: GamepadButtonState;
    dpadDown: GamepadButtonState;
    dpadLeft: GamepadButtonState;
    dpadRight: GamepadButtonState;
    // Extra buttons (may not be present on all controllers)
    home: GamepadButtonState | null;
    touchpad: GamepadButtonState | null;
  };
  axes: GamepadAxes;
}

const DEFAULT_BUTTON_STATE: GamepadButtonState = {
  pressed: false,
  touched: false,
  value: 0,
};

const DEFAULT_AXES: GamepadAxes = {
  leftStickX: 0,
  leftStickY: 0,
  rightStickX: 0,
  rightStickY: 0,
};

function createDefaultGamepadState(): GamepadState {
  return {
    connected: false,
    id: null,
    index: null,
    timestamp: 0,
    buttons: {
      a: { ...DEFAULT_BUTTON_STATE },
      b: { ...DEFAULT_BUTTON_STATE },
      x: { ...DEFAULT_BUTTON_STATE },
      y: { ...DEFAULT_BUTTON_STATE },
      leftBumper: { ...DEFAULT_BUTTON_STATE },
      rightBumper: { ...DEFAULT_BUTTON_STATE },
      leftTrigger: { ...DEFAULT_BUTTON_STATE },
      rightTrigger: { ...DEFAULT_BUTTON_STATE },
      select: { ...DEFAULT_BUTTON_STATE },
      start: { ...DEFAULT_BUTTON_STATE },
      leftStick: { ...DEFAULT_BUTTON_STATE },
      rightStick: { ...DEFAULT_BUTTON_STATE },
      dpadUp: { ...DEFAULT_BUTTON_STATE },
      dpadDown: { ...DEFAULT_BUTTON_STATE },
      dpadLeft: { ...DEFAULT_BUTTON_STATE },
      dpadRight: { ...DEFAULT_BUTTON_STATE },
      home: null,
      touchpad: null,
    },
    axes: { ...DEFAULT_AXES },
  };
}

function getButtonState(gamepad: Gamepad, index: number): GamepadButtonState | null {
  if (index < gamepad.buttons.length) {
    const btn = gamepad.buttons[index];
    return {
      pressed: btn.pressed,
      touched: btn.touched,
      value: btn.value,
    };
  }
  return null;
}

function mapGamepadToState(gamepad: Gamepad): GamepadState {
  return {
    connected: true,
    id: gamepad.id,
    index: gamepad.index,
    timestamp: gamepad.timestamp,
    buttons: {
      // Face buttons
      a: getButtonState(gamepad, 0) || { ...DEFAULT_BUTTON_STATE },
      b: getButtonState(gamepad, 1) || { ...DEFAULT_BUTTON_STATE },
      x: getButtonState(gamepad, 2) || { ...DEFAULT_BUTTON_STATE },
      y: getButtonState(gamepad, 3) || { ...DEFAULT_BUTTON_STATE },
      // Bumpers
      leftBumper: getButtonState(gamepad, 4) || { ...DEFAULT_BUTTON_STATE },
      rightBumper: getButtonState(gamepad, 5) || { ...DEFAULT_BUTTON_STATE },
      // Triggers (analog)
      leftTrigger: getButtonState(gamepad, 6) || { ...DEFAULT_BUTTON_STATE },
      rightTrigger: getButtonState(gamepad, 7) || { ...DEFAULT_BUTTON_STATE },
      // Function buttons
      select: getButtonState(gamepad, 8) || { ...DEFAULT_BUTTON_STATE },
      start: getButtonState(gamepad, 9) || { ...DEFAULT_BUTTON_STATE },
      // Stick buttons
      leftStick: getButtonState(gamepad, 10) || { ...DEFAULT_BUTTON_STATE },
      rightStick: getButtonState(gamepad, 11) || { ...DEFAULT_BUTTON_STATE },
      // D-Pad
      dpadUp: getButtonState(gamepad, 12) || { ...DEFAULT_BUTTON_STATE },
      dpadDown: getButtonState(gamepad, 13) || { ...DEFAULT_BUTTON_STATE },
      dpadLeft: getButtonState(gamepad, 14) || { ...DEFAULT_BUTTON_STATE },
      dpadRight: getButtonState(gamepad, 15) || { ...DEFAULT_BUTTON_STATE },
      // Extra buttons (may not be present on all controllers)
      home: getButtonState(gamepad, 16),
      touchpad: getButtonState(gamepad, 17),
    },
    axes: {
      leftStickX: gamepad.axes.length > 0 ? gamepad.axes[0] : 0,
      leftStickY: gamepad.axes.length > 1 ? gamepad.axes[1] : 0,
      rightStickX: gamepad.axes.length > 2 ? gamepad.axes[2] : 0,
      rightStickY: gamepad.axes.length > 3 ? gamepad.axes[3] : 0,
    },
  };
}

export interface UseGamepadOptions {
  /**
   * Index of the gamepad to track. If -1, tracks the first connected gamepad.
   * @default -1
   */
  gamepadIndex?: number;
}

/**
 * Custom hook for HTML5 Gamepad API integration.
 * Provides a standardized state object mapping all standard gamepad buttons and axes.
 * 
 * @param options - Configuration options for the gamepad hook
 * @returns Current gamepad state
 * 
 * @example
 * ```tsx
 * import { useGamepad } from '@/hooks/useGamepad';
 * 
 * function GameComponent() {
 *   const gamepad = useGamepad();
 *   
 *   useEffect(() => {
 *     if (gamepad.connected && gamepad.buttons.a.pressed) {
 *       // Handle A button press
 *     }
 *   }, [gamepad]);
 *   
 *   return <div>{gamepad.connected ? `Controller: ${gamepad.id}` : 'No controller'}</div>;
 * }
 * ```
 */
export function useGamepad(options: UseGamepadOptions = {}): GamepadState {
  const { gamepadIndex = -1 } = options;
  
  const [gamepadState, setGamepadState] = useState<GamepadState>(createDefaultGamepadState());
  const [isConnected, setIsConnected] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const gamepadRef = useRef<Gamepad | null>(null);

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads();
    
    let targetGamepad: Gamepad | null = null;
    
    if (gamepadIndex === -1) {
      // Find the first connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          targetGamepad = gamepads[i];
          break;
        }
      }
    } else if (gamepads[gamepadIndex]) {
      targetGamepad = gamepads[gamepads[gamepadIndex].index];
    }

    if (targetGamepad) {
      gamepadRef.current = targetGamepad;
      const state = mapGamepadToState(targetGamepad);
      setGamepadState(state);
    } else if (isConnected) {
      // Gamepad was disconnected
      gamepadRef.current = null;
      setGamepadState(createDefaultGamepadState());
      setIsConnected(false);
    }

    animationFrameId.current = requestAnimationFrame(pollGamepad);
  }, [gamepadIndex, isConnected]);

  const handleGamepadConnected = useCallback((event: GamepadEvent) => {
    if (gamepadIndex === -1 || event.gamepad.index === gamepadIndex) {
      gamepadRef.current = event.gamepad;
      setIsConnected(true);
      setGamepadState(mapGamepadToState(event.gamepad));
    }
  }, [gamepadIndex]);

  const handleGamepadDisconnected = useCallback((event: GamepadEvent) => {
    if (gamepadRef.current && event.gamepad.index === gamepadRef.current.index) {
      gamepadRef.current = null;
      setIsConnected(false);
      setGamepadState(createDefaultGamepadState());
    }
  }, []);

  useEffect(() => {
    // Add event listeners
    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    // Start polling loop
    animationFrameId.current = requestAnimationFrame(pollGamepad);

    // Cleanup
    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected);
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [handleGamepadConnected, handleGamepadDisconnected, pollGamepad]);

  return gamepadState;
}
