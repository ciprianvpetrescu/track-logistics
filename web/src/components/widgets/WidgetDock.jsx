import React from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatWidget from './ChatWidget.jsx';
import NotepadWidget from './NotepadWidget.jsx';
import AiCopilotWidget from './AiCopilotWidget.jsx';

export default function WidgetDock({ activeWidget, onClose, chatMessages, profileName, notepadProps }) {
  return (
    <AnimatePresence>
      {activeWidget === 'chat' && <ChatWidget key="chat" onClose={onClose} messages={chatMessages} profileName={profileName} />}
      {activeWidget === 'notepad' && <NotepadWidget key="notepad" onClose={onClose} {...notepadProps} />}
      {activeWidget === 'ai' && <AiCopilotWidget key="ai" onClose={onClose} profileName={profileName} />}
    </AnimatePresence>
  );
}
