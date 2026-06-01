import { ChatData } from '../App';

const VAULT_KEY = 'vault_items';

export const vaultDbTools = {
  async getItems(): Promise<{id: string, date: number, data: ChatData}[]> {
    try {
      const items = localStorage.getItem(VAULT_KEY);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      console.warn('localStorage get error', e);
      return [];
    }
  },
  
  async saveItem(item: {id: string, date: number, data: ChatData}) {
    try {
      const items = await this.getItems();
      items.push(item);
      localStorage.setItem(VAULT_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('localStorage save error', e);
    }
  },
  
  async deleteItem(id: string) {
    try {
      const items = await this.getItems();
      const newItems = items.filter(i => i.id !== id);
      localStorage.setItem(VAULT_KEY, JSON.stringify(newItems));
    } catch (e) {
      console.warn('localStorage delete error', e);
    }
  }
};
