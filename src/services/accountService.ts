import axios from 'axios';

const API_URL = '/api/account';

export const accountService = {
  /** Fetches the signed-in user's own data and saves it as a JSON file in the browser. */
  async downloadMyData(): Promise<void> {
    const res = await axios.get(`${API_URL}/export`);
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schemesetu-my-data.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  /** Deletes the signed-in user's account, profile and bookmarks on the server. Throws if that did not happen. */
  async deleteMyAccount(): Promise<void> {
    const res = await axios.delete(API_URL);
    if (!res.data?.success) throw new Error('The server did not confirm the deletion');
  },
};
