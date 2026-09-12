import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

const getAuthHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
});

export const buddyApi = {
  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await axios.get(`${apiUrl}/buddy/conversations`, {
      headers: getAuthHeader(),
    });
    return response.data.data;
  },

  async createConversation(title: string): Promise<Conversation> {
    const response = await axios.post(
      `${apiUrl}/buddy/conversations`,
      { title },
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },

  async updateConversation(id: string, title: string): Promise<Conversation> {
    const response = await axios.patch(
      `${apiUrl}/buddy/conversations?id=${id}`,
      { title },
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },

  async deleteConversation(id: string): Promise<void> {
    await axios.delete(`${apiUrl}/buddy/conversations?id=${id}`, {
      headers: getAuthHeader(),
    });
  },

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    const response = await axios.get(
      `${apiUrl}/buddy/conversations/${conversationId}/messages`,
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },

  async sendMessage(conversationId: string, message: string): Promise<Message> {
    const response = await axios.post(
      `${apiUrl}/buddy/conversations/${conversationId}/messages`,
      { message },
      { headers: getAuthHeader() }
    );
    return response.data.data;
  },
};
