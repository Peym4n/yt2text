import express from 'express';
const router = express.Router();
import url from 'url';
import yce from "@treeee/youtube-caption-extractor";
const { getSubtitles, getSubtitlesDownloadUrl } = yce;

/* GET home page. */
router.get('/', function (req, res, next) {
  const { text, captionMessage, vidurl, time, join } = req.session;
  const requestedUrl = req.query.url;
  const showResult = !requestedUrl || requestedUrl === vidurl;
  res.render('index', {
    title: 'YT to Text',
    text: showResult ? text : '',
    captionMessage: showResult ? captionMessage : null,
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
  let text = '';
  let captionMessage = null;
  try {
    const captions = await getEnglishCaptions(videoID);
    const lines = captions.map(caption => {
      const captionText = caption.text.replace(/\r\n|\r|\n/g, ' ').trim();
      if (joinLines || !useTime) {
        return captionText;
      }
      const start = Number(caption.start);
      const end = start + Number(caption.dur);
      return `${toHHMMSSsss(start)} -- ${toHHMMSSsss(end)}: ${captionText}`;
    });
    if (lines.length === 0) {
      console.warn(`No English caption track found for YouTube video ${videoID}`);
      captionMessage = 'No English captions were found for this video.';
    } else {
      text = joinLines ? lines.join(' ') : lines.map(line => line + '\r\n').join('');
    }
  } catch (error) {
    console.error(`Failed to retrieve captions for YouTube video ${videoID}`, error);
    captionMessage = 'Could not retrieve captions for this video. Please try again later.';
  }

  Object.assign(req.session, { vidurl, time: useTime, join: joinLines, text, captionMessage });
  req.session.touch().save(error => {
    if (error) {
      return next(error);
    }
    res.redirect('/?url=' + encodeURIComponent(vidurl));
  });
});

async function getEnglishCaptions(videoID) {
  const response = await fetch(`https://m.youtube.com/watch?v=${videoID}`);
  if (!response.ok) {
    throw new Error(`YouTube video page returned HTTP ${response.status}`);
  }
  const pageHtml = await response.text();
  if (!pageHtml.trim()) {
    throw new Error('YouTube returned an empty video page');
  }

  const captionDownloadUrl = await getSubtitlesDownloadUrl({ videoID, lang: 'en', pageHtml });
  if (!captionDownloadUrl) {
    return [];
  }

  const captions = await getSubtitles({ captionDownloadUrl });
  if (!captions.some(caption => caption.text.trim())) {
    throw new Error('YouTube listed an English caption track but returned no usable caption text');
  }
  return captions;
}

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
