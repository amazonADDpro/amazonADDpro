
import React, { useRef, useEffect } from 'react';
import { type ConversationTurn } from '../types';

interface TranscriptionDisplayProps {
  transcription: ConversationTurn[];
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcription }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcription]);

  return (
    <div className="w-full h-64 sm:h-80 bg-gray-900/50 rounded-lg p-4 overflow-y-auto border border-gray-700/50 flex flex-col space-y-4">
      {transcription.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          <p>Your conversation will appear here...</p>
        </div>
      ) : (
        transcription.map((turn, index) => (
          <div
            key={index}
            className={`flex flex-col ${turn.speaker === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-2xl ${
                turn.speaker === 'user'
                  ? 'bg-teal-600 text-white rounded-br-none'
                  : 'bg-gray-700 text-gray-200 rounded-bl-none'
              }`}
            >
              <p className="text-sm">{turn.text}</p>
            </div>
             <p className={`text-xs mt-1 ${turn.speaker === 'user' ? 'text-teal-400' : 'text-purple-400'}`}>
                {turn.speaker === 'user' ? 'You' : 'Aria'}
            </p>
          </div>
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
