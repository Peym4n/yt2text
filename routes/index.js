import express from 'express';
const router = express.Router();
import url from 'url';
import yce from "@treeee/youtube-caption-extractor";
const getSubtitles = yce.getSubtitles;

/* GET home page. */
router.get('/', function (req, res, next) {
  const { text, vidurl, time, join } = req.session;
  const requestedUrl = req.query.url;
  res.render('index', {
    title: 'YT to Text',
    text: requestedUrl && requestedUrl !== vidurl ? '' : text,
    vidurl: requestedUrl || vidurl,
    time,
    join
  });
});



router.post('/2text', async function (req, res, next) {
  const { vidurl, time, join } = req.body;
  let videoID;
  try {
    if (typeof vidurl === 'string') {
      videoID = url.parse(vidurl, true).query.v;
    }
  } catch {
    return res.redirect('/');
  }
  if (typeof videoID !== 'string' || !/^[A-Za-z0-9_-]{11,}$/.test(videoID)) {
    return res.redirect('/');
  }

  const useTime = Boolean(time);
  const joinLines = Boolean(join);
  let text;
  try {
    const captions = await getSubtitles({ videoID, lang: 'en' });
    const lines = captions.map(caption => {
      const captionText = caption.text.replace(/\r\n|\r|\n/g, ' ').trim();
      if (joinLines || !useTime) {
        return captionText;
      }
      const start = Number(caption.start);
      const end = start + Number(caption.dur);
      return `${toHHMMSSsss(start)} -- ${toHHMMSSsss(end)}: ${captionText}`;
    });
    text = joinLines ? lines.join(' ') : lines.map(line => line + '\r\n').join('');
  } catch (error) {
    console.error(error);
    text = String(error);
  }

  Object.assign(req.session, { vidurl, time: useTime, join: joinLines, text });
  req.session.touch().save(error => {
    if (error) {
      return next(error);
    }
    res.redirect('/?url=' + encodeURIComponent(vidurl));
  });
});

function toHHMMSSsss(seconds) {
  const totalMilliseconds = Math.round(seconds * 1000);
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;

  const parts = [];
  if (hours) parts.push(hours);
  if (hours || minutes) parts.push(minutes);
  parts.push(totalSeconds % 60);

  const time = parts.map(part => String(part).padStart(2, '0')).join(':');
  const milliseconds = String(totalMilliseconds % 1000).padStart(3, '0');
  return `${time}.${milliseconds}`;
}

export default router;
