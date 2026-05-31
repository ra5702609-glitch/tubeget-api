const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('TubeGet API Running!');
});

app.post('/api/info', (req, res) => {
  const { url } = req.body;
  exec(`yt-dlp --dump-json "${url}" 2>/dev/null || python3 -m yt_dlp --dump-json "${url}"`, { timeout: 30000 }, (err, stdout) => {
    if(err) return res.json({ title: 'YouTube Video', uploader: 'YouTube' });
    try {
      const data = JSON.parse(stdout);
      res.json({ title: data.title || 'YouTube Video', uploader: data.uploader || 'YouTube' });
    } catch(e) {
      res.json({ title: 'YouTube Video', uploader: 'YouTube' });
    }
  });
});

app.post('/api/download', (req, res) => {
  const { url, quality } = req.body;
  const id = Date.now();
  const ext = quality === 'mp3' ? 'mp3' : 'mp4';
  const filePath = path.join('/tmp', `${id}.${ext}`);
  
  let cmd;
  if(quality === 'mp3') {
    cmd = `cd /tmp && yt-dlp -x --audio-format mp3 -o "${filePath}" "${url}" 2>&1 || python3 -m yt_dlp -x --audio-format mp3 -o "${filePath}" "${url}"`;
  } else if(quality === 'best') {
    cmd = `cd /tmp && yt-dlp -f "best" -o "${filePath}" "${url}" 2>&1 || python3 -m yt_dlp -f "best" -o "${filePath}" "${url}"`;
  } else {
    cmd = `cd /tmp && yt-dlp -f "best[height<=${quality}]" -o "${filePath}" "${url}" 2>&1 || python3 -m yt_dlp -f "best[height<=${quality}]" -o "${filePath}" "${url}"`;
  }

  exec(cmd, { timeout: 120000 }, (err) => {
    if(err || !fs.existsSync(filePath)) {
      return res.status(500).json({ error: 'Download failed' });
    }
    res.download(filePath, `tubeget.${ext}`, () => {
      try { fs.unlinkSync(filePath); } catch(e) {}
    });
  });
});

app.listen(PORT, () => console.log(`API running on ${PORT}`));
