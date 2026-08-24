/**
 * ControllerTest Component
 * Developer-only component for testing gamepad controller mappings
 * Displays connected controller status and highlights pressed buttons
 */

import React, { useState, useEffect, useRef } from 'react';
import { useGamepad } from '../hooks/useGamepad';
import { getButtonName } from '../utils/gamepadNavigation';

const BUTTON_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

/**
 * Button visual component
 */
function ButtonIndicator({ index, isPressed, value }) {
  const name = getButtonName(index);
  const isAnalog = index >= 6 && index <= 7; // Triggers are analog

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '4px',
        padding: '8px',
        backgroundColor: isPressed ? '#4CAF50' : '#333',
        borderRadius: '8px',
        minWidth: '60px',
        transition: 'background-color 0.1s ease',
        border: isPressed ? '2px solid #81C784' : '2px solid #555',
      }}
    >
      <span style={{ fontSize: '12px', color: '#fff', marginBottom: '4px' }}>
        {name}
      </span>
      <span style={{ fontSize: '10px', color: '#aaa' }}>
        #{index}
      </span>
      {isAnalog && (
        <span style={{ fontSize: '10px', color: '#4CAF50', marginTop: '2px' }}>
          {Math.round(value * 100)}%
        </span>
      )}
    </div>
  );
}

/**
 * Stick indicator component
 */
function StickIndicator({ label, x, y }) {
  const size = 80;
  const center = size / 2;
  const maxOffset = size / 2 - 10;
  const dotX = center + (x * maxOffset);
  const dotY = center + (y * maxOffset);

  return (
    <div style={{ textAlign: 'center', margin: '10px' }}>
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: '#222',
          border: '2px solid #555',
          position: 'relative',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#4CAF50',
            position: 'absolute',
            left: `${dotX - 10}px`,
            top: `${dotY - 10}px`,
            transition: 'all 0.05s ease',
          }}
        />
        {/* Center crosshair */}
        <div
          style={{
            position: 'absolute',
            left: `${center - 1}px`,
            top: '10%',
            width: '2px',
            height: '80%',
            backgroundColor: '#444',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: `${center - 1}px`,
            left: '10%',
            width: '80%',
            height: '2px',
            backgroundColor: '#444',
          }}
        />
      </div>
      <div style={{ color: '#aaa', fontSize: '12px', marginTop: '4px' }}>
        {label}: X={x.toFixed(2)} Y={y.toFixed(2)}
      </div>
    </div>
  );
}

/**
 * ControllerTest Component
 * Shows controller connection status and button states
 */
export default function ControllerTest({ show = false }) {
  const gamepad = useGamepad();
  const [history, setHistory] = useState([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  // Track button press events
  useEffect(() => {
    if (gamepad.connected) {
      const pressedButtons = [];
      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i]?.pressed) {
          pressedButtons.push(getButtonName(i));
        }
      }
      if (pressedButtons.length > 0) {
        const entry = {
          time: new Date().toLocaleTimeString(),
          buttons: pressedButtons.join(', '),
        };
        setHistory(prev => [entry, ...prev].slice(0, 20)); // Keep last 20 entries
      }
    }
  }, [gamepad]);

  if (!show) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '350px',
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid #4CAF50',
        borderRadius: '12px',
        padding: '16px',
        zIndex: 9999,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: '12px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', color: '#4CAF50', textAlign: 'center' }}>
        🎮 Controller Test
      </h3>

      {/* Connection Status */}
      <div
        style={{
          padding: '8px',
          backgroundColor: gamepad.connected ? '#1B5E20' : '#B71C1C',
          borderRadius: '6px',
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        {gamepad.connected ? (
          <>
            <span style={{ color: '#81C784' }}>● Connected</span>
            <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
              {gamepad.id || 'Unknown Controller'}
            </div>
            <div style={{ fontSize: '10px', color: '#aaa' }}>
              Index: {gamepad.index}
            </div>
          </>
        ) : (
          <span style={{ color: '#EF9A9A' }}>○ No Controller Connected</span>
        )}
      </div>

      {/* Button Layout Visualization */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ color: '#aaa', marginBottom: '8px', textAlign: 'center' }}>
          Button Layout
        </div>
        
        {/* Face buttons (top row) */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {[8, 9, 10, 11].map(i => (
            <ButtonIndicator
              key={i}
              index={i}
              isPressed={gamepad.buttons[i]?.pressed}
              value={gamepad.buttons[i]?.value}
            />
          ))}
        </div>

        {/* Bumpers and triggers */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {[4, 5, 6, 7].map(i => (
            <ButtonIndicator
              key={i}
              index={i}
              isPressed={gamepad.buttons[i]?.pressed}
              value={gamepad.buttons[i]?.value}
            />
          ))}
        </div>

        {/* Face buttons (A, B, X, Y) */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {[0, 2, 1, 3].map(i => (
            <ButtonIndicator
              key={i}
              index={i}
              isPressed={gamepad.buttons[i]?.pressed}
              value={gamepad.buttons[i]?.value}
            />
          ))}
        </div>

        {/* D-Pad */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          {[12, 14, 13, 15].map(i => (
            <ButtonIndicator
              key={i}
              index={i}
              isPressed={gamepad.buttons[i]?.pressed}
              value={gamepad.buttons[i]?.value}
            />
          ))}
        </div>

        {/* Extra buttons */}
        {gamepad.buttons[16] && (
          <div style={{ textAlign: 'center' }}>
            <ButtonIndicator
              index={16}
              isPressed={gamepad.buttons[16]?.pressed}
              value={gamepad.buttons[16]?.value}
            />
          </div>
        )}
      </div>

      {/* Analog Sticks */}
      {gamepad.connected && gamepad.axes.length >= 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '12px' }}>
          <StickIndicator
            label="Left Stick"
            x={gamepad.axes[0]}
            y={gamepad.axes[1]}
          />
          <StickIndicator
            label="Right Stick"
            x={gamepad.axes[2]}
            y={gamepad.axes[3]}
          />
        </div>
      )}

      {/* Event History */}
      {history.length > 0 && (
        <div>
          <div style={{ color: '#aaa', marginBottom: '8px', textAlign: 'center' }}>
            Button Press History
          </div>
          <div
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              backgroundColor: '#111',
              borderRadius: '6px',
              padding: '8px',
            }}
          >
            {history.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  padding: '4px 0',
                  borderBottom: idx < history.length - 1 ? '1px solid #333' : 'none',
                  fontSize: '10px',
                }}
              >
                <span style={{ color: '#666' }}>{entry.time}</span>
                <span style={{ color: '#4CAF50', marginLeft: '8px' }}>
                  {entry.buttons}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: '#1a1a1a',
          borderRadius: '6px',
          fontSize: '10px',
          color: '#888',
        }}
      >
        <strong style={{ color: '#aaa' }}>Mapping:</strong><br />
        • A/Cross (0) → Select/Enter<br />
        • B/Circle (1) → Back/Escape<br />
        • D-Pad (12-15) → Arrow Keys<br />
        • Left Stick → Arrow Keys (with deadzone)<br />
        • Start (9) → Tab (Menu)
      </div>
    </div>
  );
}

/**
 * Hook to toggle controller test visibility
 */
export function useControllerTest() {
  const [show, setShow] = useState(false);

  // Toggle with keyboard shortcut (Ctrl+Shift+C)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setShow(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { show, setShow };
}