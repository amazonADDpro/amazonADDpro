
import React from 'react';
import { Status } from '../types';

interface AvatarProps {
  status: Status;
}

const getStatusClasses = (status: Status) => {
  switch (status) {
    case Status.LISTENING:
      return 'ring-teal-400 animate-pulse';
    case Status.SPEAKING:
      return 'ring-purple-400 animate-pulse';
    case Status.CONNECTING:
      return 'ring-yellow-400 animate-spin';
    case Status.IDLE:
    default:
      return 'ring-gray-600';
  }
};

const getStatusText = (status: Status) => {
    switch (status) {
      case Status.LISTENING:
        return 'Listening...';
      case Status.SPEAKING:
        return 'Speaking...';
      case Status.CONNECTING:
        return 'Connecting...';
      case Status.IDLE:
      default:
        return 'Ready to Chat';
    }
}

export const Avatar: React.FC<AvatarProps> = ({ status }) => {
  const ringClasses = getStatusClasses(status);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div className={`relative w-full h-full rounded-full overflow-hidden shadow-lg transition-all duration-300 ring-4 ${ringClasses}`}>
        <img
          src="https://picsum.photos/id/237/400/400"
          alt="AI Tutor Avatar"
          className="w-full h-full object-cover filter grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/30 to-purple-600/30"></div>
      </div>
      <div className="absolute -bottom-4 bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300 border border-gray-700">
        {getStatusText(status)}
      </div>
    </div>
  );
};
