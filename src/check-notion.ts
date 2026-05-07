import { fetchKeywords } from './notion.js';


const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

async function check() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  
  console.log('Fetching database schema...');
  const res = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
    }
  });
  
  if (!res.ok) {
    console.error('Error:', await res.text());
    return;
  }
  
  const data = await res.json();
  console.log('Available properties in your Notion database:');
  for (const [key, value] of Object.entries(data.properties)) {
    console.log(`- Name: "${key}", Type: "${(value as any).type}"`, JSON.stringify(value, null, 2));
  }
}

check();
