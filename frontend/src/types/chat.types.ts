export interface ChatbotProps {
  activityId: string;
  onClose?: () => void;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  activityId: string;
}

export interface QuickSuggestion {
  id: string;
  text: string;
  displayText: string;
}

export interface ChatMessageRequest {
  message: string;
  activityId: string;
}

export interface ChatMessageResponse {
  message: string;
  timestamp: string;
  success: boolean;
}
