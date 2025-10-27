
import React from 'react';
import { Status } from '../types';

interface ControlsProps {
  status: Status;
  onStart: () => void;
  onStop: () => void;
}

const MicIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
);

const StopIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10h6" />
    </svg>
);


export const Controls: React.FC<ControlsProps> = ({ status, onStart, onStop }) => {
  const isIdle = status === Status.IDLE;
  const isConnecting = status === Status.CONNECTING;
  const isConversing = status === Status.LISTENING || status === Status.SPEAKING;

  return (
    <div className="flex justify-center items-center">
      {isIdle ? (
        <button
          onClick={onStart}
          className="flex items-center justify-center px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-400/50"
        >
          <MicIcon />
          Start Conversation
        </button>
      ) : (
        <button
          onClick={onStop}
          disabled={isConnecting}
          className={`flex items-center justify-center px-8 py-4 font-bold rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 ${
            isConnecting ? 'bg-yellow-500 text-white cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400/50'
          }`}
        >
          <StopIcon/>
          {isConnecting ? 'Connecting...' : 'End Conversation'}
        </button>
      )}
    </div>
  );
};
