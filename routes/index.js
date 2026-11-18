import express from 'express';
import { getSubtitles } from 'youtube-caption-extractor';

const router = express.Router();

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
  const { vidurl, time, join } = req.body ?? {};
  let videoID;
  try {
    if (typeof vidurl === 'string') {
      const ids = new URL(vidurl, 'https://www.youtube.com').searchParams.getAll('v');
      if (ids.length === 1) {
        [videoID] = ids;
      }
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
    const captions = await getVideoCaptions(videoID);
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
      console.warn(`No caption track found for YouTube video ${videoID}`);
      captionMessage = 'No captions were found for this video.';
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

async function getVideoCaptions(videoID) {
  let requestedTrack = false;
  const captions = await getSubtitles({
    videoID,
    lang: 'en',
    fetch(input, options) {
      const requestUrl = new URL(input instanceof Request ? input.url : input);
      if (requestUrl.pathname === '/api/timedtext') {
        requestedTrack = true;
      }
      return globalThis.fetch(input, options);
    }
  });

  // The extractor can return [] for both a missing track and an empty track response.
  if (requestedTrack && captions.length === 0) {
    throw new Error('YouTube listed a caption track but returned no usable caption text');
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
