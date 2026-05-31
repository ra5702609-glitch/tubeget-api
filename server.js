const express = require('express');
const { execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// Install yt-dlp on start
try {
  execSync('pip3 install yt-dlp --quiet 2>/dev/null || pip install yt-dlp --quiet 2>/dev/null || true');
  console.log('yt-dlp ready');
} catch(e) {
  console.log('yt-dlp skip:', e.message);
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TubeGet API Running!');
});

app.post('/api/info', (req, res) => {
  const { url } = req.body;
  const cmd = `python3 -m yt_dlp --dump-json --no-playlist "${url}" 2>/dev/null`;
  exec(cmd, { timeout: 30000 }, (err, stdout) => {
    if(err || !stdout) return res.json({ title: 'YouTube Video', uploader: 'YouTube' });
    try {
      const data = JSON.parse(stdout);
      res.json({ title: data.title || 'Video', uploader: data.uploader || 'YouTube' });
    } catch(e) {
      res.json({ title: 'YouTube Video', uploader: 'YouTube' });
    }
  });
});

app.post('/api/download', (req, res) => {
  const { url, quality } = req.body;
  const id = Date.now();
  const ext = quality === 'mp3' ? 'mp3' : 'mp4';
  const filePath = `/tmp/${id}.${ext}`;
  
  let format;
  if(quality === 'mp3') format = 'bestaudio';
  else if(quality === 'best') format = 'best';
  else format = `best[height<=${quality}]`;
  
  const cmd = `cd /tmp && python3 -m yt_dlp -f "${format}" -o "${filePath}" "${url}" --no-playlist 2>&1`;
  
  console.log('Download cmd:', cmd);

  exec(cmd, { timeout: 180000, maxBuffer: 1024*1024*10 }, (err, stdout, stderr) => {
    console.log('Download output:', stdout?.slice(-200));
    
    if(err || !fs.existsSync(filePath)) {
      console.error('Download error:', stderr);
      return res.status(500).json({ error: 'Download failed. Try different quality.' });
    }
    
    const fileName = `tubeget_${id}.${ext}`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', ext === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(filePath); } catch(e) {}
    });
    stream.on('error', () => {
      res.status(500).json({ error: 'Stream error' });
    });
  });
});

app.listen(PORT, () => console.log(`API running on ${PORT}`));