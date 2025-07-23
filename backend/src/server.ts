import express from 'express';
import cors from 'cors';
import { URLShortenerService } from './service';
import { CreateURLRequest, StatsResponse } from './types';
import { Logger, LogLevel, Log } from '../../logging-middleware/logger';

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const logger = Logger.getLogger('server');
const urlService = new URLShortenerService(BASE_URL);

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  Log('backend', LogLevel.INFO, 'handler', `${req.method} ${req.path}`);
  next();
});

app.post('/api/shorten', async (req, res) => {
  try {
    await Log('backend', LogLevel.INFO, 'handler', 'Processing URL shortening request');
    
    const { urls }: { urls: CreateURLRequest[] } = req.body;
    
    if (!urls || !Array.isArray(urls)) {
      await Log('backend', LogLevel.WARN, 'handler', 'Invalid request body - urls array required');
      return res.status(400).json({ error: 'urls array is required' });
    }

    if (urls.length > 5) {
      await Log('backend', LogLevel.WARN, 'handler', `Too many URLs requested: ${urls.length}`);
      return res.status(400).json({ error: 'Maximum 5 URLs allowed' });
    }

    const results = [];
    for (const urlRequest of urls) {
      try {
        const result = await urlService.createShortURL(urlRequest);
        results.push(result);
      } catch (error) {
        await Log('backend', LogLevel.ERROR, 'handler', `Failed to create short URL: ${error}`);
        results.push({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          originalUrl: urlRequest.originalUrl 
        });
      }
    }

    await Log('backend', LogLevel.INFO, 'handler', `Successfully processed ${results.length} URLs`);
    res.json({ results });

  } catch (error) {
    await Log('backend', LogLevel.ERROR, 'handler', `Unexpected error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    await Log('backend', LogLevel.INFO, 'handler', 'Fetching URL statistics');
    
    const urls = await urlService.getAllURLStats();
    const stats: StatsResponse[] = urls.map(url => ({
      shortCode: url.shortCode,
      shortUrl: `${BASE_URL}/${url.shortCode}`,
      originalUrl: url.originalUrl,
      createdAt: url.createdAt.toISOString(),
      expiresAt: url.expiresAt?.toISOString(),
      accessCount: url.accessCount,
      isActive: url.isActive
    }));

    await Log('backend', LogLevel.INFO, 'handler', `Returning ${stats.length} URL statistics`);
    res.json({ stats });

  } catch (error) {
    await Log('backend', LogLevel.ERROR, 'handler', `Error fetching stats: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    await Log('backend', LogLevel.INFO, 'handler', `Redirect request for: ${shortCode}`);

    const originalUrl = await urlService.getOriginalURL(shortCode);
    
    if (!originalUrl) {
      await Log('backend', LogLevel.WARN, 'handler', `Short URL not found: ${shortCode}`);
      return res.status(404).json({ error: 'Short URL not found or expired' });
    }

    await Log('backend', LogLevel.INFO, 'handler', `Redirecting to: ${originalUrl}`);
    res.redirect(originalUrl);

  } catch (error) {
    await Log('backend', LogLevel.ERROR, 'handler', `Redirect error: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.use((req, res) => {
  Log('backend', LogLevel.WARN, 'handler', `404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

app.use((error: any, req: any, res: any, next: any) => {
  Log('backend', LogLevel.ERROR, 'handler', `Unhandled error: ${error.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  Log('backend', LogLevel.INFO, 'handler', `Server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  Log('backend', LogLevel.INFO, 'handler', 'Shutting down server...');
  urlService.close();
  process.exit(0);
});
